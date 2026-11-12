"""
The catalogue: categories, products and their photos. The storefront sees the visible ones in the admin's order;
the admin sees and edits everything. A category shows at most MAX_PER_CATEGORY products: the shop keeps each one
to a short, chosen range (the admin hides or moves one to make room for another).
"""

import re
import unicodedata
import uuid
from collections import Counter
from collections.abc import Sequence
from datetime import datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core import clock
from app.core.config import get_settings
from app.core.errors import Conflict, InvalidInput, NotFound

from . import images
from .models import Category, Image, Product
from .schemas import CategoryIn, CategoryPatch, ProductIn, ProductPatch

MAX_PER_CATEGORY = 10


def slugify(text: str) -> str:
    """christmas-trees from "Christmas Trees!": lower-case ASCII letters and digits joined by hyphens."""
    ascii_text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', ascii_text.lower()).strip('-')[:70] or 'item'


def _free_id(session: Session, model: type[Category] | type[Product], name: str) -> str:
    base = slugify(name)
    taken = set(session.scalars(select(model.id).where(model.id.like(f'{base}%'))))
    if base not in taken:
        return base
    n = 2
    while f'{base}-{n}' in taken:
        n += 1
    return f'{base}-{n}'


def image_url(image_id: uuid.UUID | str, size: str = 'large') -> str:
    settings = get_settings()
    url = f'{settings.public_url}{settings.api_prefix}/media/{image_id}.webp'
    return f'{url}?size=card' if size == 'card' else url


def _money(value: Decimal | None) -> float | None:
    return None if value is None else float(value)


def category_out(category: Category, count: int, *, admin: bool = False) -> dict:
    out = {
        'id': category.id,
        'name': category.name,
        'icon': category.icon,
        'image': image_url(category.image_id, 'card') if category.image_id else None,
        'count': count,
    }
    if admin:
        out |= {
            'image_id': category.image_id,
            'position': category.position,
            'visible': category.visible,
            'hsn': category.hsn,
        }
    return out


def product_out(product: Product, names: dict[str, str], *, admin: bool = False) -> dict:
    out = {
        'id': product.id,
        'name': product.name,
        'category': product.category_id,
        'category_label': names.get(product.category_id, ''),
        'description': product.description,
        'specs': product.specs,
        'sizes': product.sizes,
        'images': [image_url(i) for i in product.image_ids],
        'image': image_url(product.image_ids[0], 'card') if product.image_ids else None,
        'in_stock': product.in_stock,
        'price': _money(product.price),
        'mrp': _money(product.mrp),
        'price_on_request': product.price is None,
        'featured': product.featured,
        'store_only': product.store_only,
    }
    if admin:
        out |= {'visible': product.visible, 'position': product.position, 'image_ids': product.image_ids}
    return out


def _categories(session: Session) -> Sequence[Category]:
    return session.scalars(select(Category).order_by(Category.position, Category.name)).all()


def _products(session: Session) -> Sequence[Product]:
    return session.scalars(select(Product).order_by(Product.position, Product.name)).all()


def on_website(product: Product) -> bool:
    """Whether the storefront shows a visible product: one for sale has a price; a store exclusive (sold only in
    the stores) is shown with or without one."""
    return product.visible and (product.price is not None or product.store_only)


def storefront(session: Session) -> dict:
    """The visible categories (with how many products each shows) and their products: visible, and with a price
    or a store exclusive. A product without a price isn't for sale yet, so the shop doesn't show it."""
    categories = [c for c in _categories(session) if c.visible]
    shown = {c.id for c in categories}
    products = [p for p in _products(session) if on_website(p) and p.category_id in shown]
    counts = Counter(p.category_id for p in products)
    names = {c.id: c.name for c in categories}
    return {
        'categories': [category_out(c, counts[c.id]) for c in categories],
        'products': [product_out(p, names) for p in products],
    }


def admin_catalogue(session: Session) -> dict:
    categories = _categories(session)
    products = _products(session)
    counts = Counter(p.category_id for p in products)
    names = {c.id: c.name for c in categories}
    return {
        'categories': [category_out(c, counts[c.id], admin=True) for c in categories],
        'products': [product_out(p, names, admin=True) for p in products],
    }


def _next_position(session: Session, model: type[Category] | type[Product]) -> int:
    return (session.scalar(select(func.max(model.position))) or 0) + 1


def check_images(session: Session, ids: Sequence[uuid.UUID]) -> list[str]:
    unique = list(dict.fromkeys(ids))
    found = set(session.scalars(select(Image.id).where(Image.id.in_(unique)))) if unique else set()
    if len(found) != len(unique):
        raise InvalidInput('One of the photos is no longer there. Upload it again.')
    return [str(i) for i in unique]


def _category(session: Session, category_id: str) -> Category:
    category = session.get(Category, category_id)
    if not category:
        raise NotFound('No such category.')
    return category


def _product(session: Session, product_id: str) -> Product:
    product = session.get(Product, product_id)
    if not product:
        raise NotFound('No such product.')
    return product


def _admin_category(session: Session, category: Category) -> dict:
    count = session.scalar(select(func.count()).select_from(Product).where(Product.category_id == category.id)) or 0
    return category_out(category, count, admin=True)


def _admin_product(session: Session, product: Product) -> dict:
    return product_out(product, {product.category_id: _category(session, product.category_id).name}, admin=True)


def create_category(session: Session, data: CategoryIn) -> dict:
    if data.image_id:
        check_images(session, [data.image_id])
    category = Category(
        id=_free_id(session, Category, data.name),
        name=data.name,
        icon=(data.icon or '').strip(),
        image_id=data.image_id,
        position=_next_position(session, Category),
        visible=True if data.visible is None else data.visible,
        hsn=(data.hsn or '').strip(),
    )
    session.add(category)
    session.commit()
    return _admin_category(session, category)


def update_category(session: Session, category_id: str, data: CategoryPatch) -> dict:
    category = _category(session, category_id)
    changes = data.model_dump(by_alias=False, exclude_unset=True)
    if changes.get('image_id'):
        check_images(session, [changes['image_id']])
    for field in ('name', 'icon', 'visible', 'hsn'):
        if changes.get(field) is not None:
            setattr(category, field, changes[field].strip() if field in ('icon', 'hsn') else changes[field])
    if 'image_id' in changes:
        category.image_id = changes['image_id']
    session.commit()
    return _admin_category(session, category)


def delete_category(session: Session, category_id: str) -> None:
    category = _category(session, category_id)
    count = session.scalar(select(func.count()).select_from(Product).where(Product.category_id == category.id))
    if count:
        raise Conflict(
            f'{category.name} still has {count} product{"s" if count > 1 else ""}. Move or delete them first.'
        )
    session.delete(category)
    session.commit()


def reorder(session: Session, model: type, ids: Sequence[str]) -> None:
    """Puts the rows in the given order; any not listed keep their place after them."""
    rows = {str(row.id): row for row in session.scalars(select(model))}
    listed = [i for i in dict.fromkeys(ids) if i in rows]
    rest = sorted((r for i, r in rows.items() if i not in listed), key=lambda r: r.position)
    for position, row in enumerate([rows[i] for i in listed] + rest, start=1):
        row.position = position
    session.commit()


def _apply_product(session: Session, product: Product, changes: dict, at: datetime) -> None:
    if changes.get('category') is not None:
        product.category_id = _category(session, changes['category']).id
    if changes.get('image_ids') is not None:
        product.image_ids = check_images(session, changes['image_ids'])
    if changes.get('specs') is not None:
        product.specs = [{'label': s['label'].strip(), 'value': s['value'].strip()} for s in changes['specs']]
    for field in ('name', 'description', 'sizes', 'in_stock', 'visible', 'featured', 'store_only'):
        if changes.get(field) is not None:
            setattr(product, field, changes[field].strip() if field == 'description' else changes[field])
    for field in ('price', 'mrp'):
        if field in changes:
            value = changes[field]
            setattr(product, field, None if value is None else Decimal(str(value)))
    if product.price is not None and product.mrp is not None and product.mrp < product.price:
        raise InvalidInput('The MRP can’t be below the price.')
    product.updated_at = at


def _check_room(session: Session, product: Product) -> None:
    """A visible product needs room in its category: at most MAX_PER_CATEGORY visible ones each."""
    if not product.visible:
        return
    others = session.scalar(
        select(func.count())
        .select_from(Product)
        .where(Product.category_id == product.category_id, Product.visible, Product.id != product.id)
    )
    if others >= MAX_PER_CATEGORY:
        name = _category(session, product.category_id).name
        raise Conflict(
            f'{name} already shows {MAX_PER_CATEGORY} products, the most a category can have. '
            'Hide or move one of them first, or save this one hidden.'
        )


def create_product(session: Session, data: ProductIn) -> dict:
    at = clock.now()
    product = Product(
        id=_free_id(session, Product, data.name),
        name=data.name,
        category_id=_category(session, data.category).id,
        description='',
        specs=[],
        sizes=[],
        in_stock=True,
        visible=True,
        featured=False,
        store_only=False,
        position=_next_position(session, Product),
        image_ids=[],
        created_at=at,
        updated_at=at,
    )
    _apply_product(session, product, data.model_dump(by_alias=False, exclude_unset=True), at)
    _check_room(session, product)
    session.add(product)
    session.commit()
    return _admin_product(session, product)


def update_product(session: Session, product_id: str, data: ProductPatch) -> dict:
    product = _product(session, product_id)
    _apply_product(session, product, data.model_dump(by_alias=False, exclude_unset=True), clock.now())
    _check_room(session, product)
    session.commit()
    return _admin_product(session, product)


def delete_product(session: Session, product_id: str) -> None:
    session.delete(_product(session, product_id))
    session.commit()


def save_image(session: Session, data: bytes) -> dict:
    processed = images.process(data)
    image = Image(
        large=processed.large,
        card=processed.card,
        width=processed.width,
        height=processed.height,
        created_at=clock.now(),
    )
    session.add(image)
    session.commit()
    return {'id': image.id, 'url': image_url(image.id), 'card_url': image_url(image.id, 'card')}


def image_bytes(session: Session, image_id: str, size: str) -> bytes:
    try:
        key = uuid.UUID(image_id)
    except ValueError as error:
        raise NotFound('No such photo.') from error
    column = Image.card if size == 'card' else Image.large
    data = session.scalar(select(column).where(Image.id == key))
    if data is None:
        raise NotFound('No such photo.')
    return data
