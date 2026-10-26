import json
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.modules.locations.models import Location
from app.modules.products.models import Product
from app.modules.products.schemas import NewProductIn, ProductOut, SeasonIn
from app.modules.users.models import User
from app.modules.users.schemas import UserOut


def test_requests_accept_camel_case_and_snake_case():
    assert SeasonIn.model_validate({'inSeason': True}).in_season is True
    assert SeasonIn.model_validate({'in_season': False}).in_season is False


def test_user_out_is_camel_case():
    changed = datetime(2026, 10, 26, 10, 0, tzinfo=UTC)
    user = User(username='pune', role='location', location_id='pune', password_hash='x', password_changed_at=changed)
    data = json.loads(UserOut.from_model(user).model_dump_json())
    assert data == {
        'username': 'pune',
        'role': 'location',
        'location': 'pune',
        'passwordChangedAt': '2026-10-26T10:00:00Z',
    }


def test_product_out_has_numbers_and_shop():
    at = datetime(2026, 10, 26, 10, 0, tzinfo=UTC)
    product = Product(
        code='CHN-0001',
        name='Wreath',
        type='Product',
        dept='Wall decoration',
        barcode='',
        hsn='',
        mrp=Decimal('1200.00'),
        offer=Decimal('999.50'),
        cost=Decimal('400.00'),
        gst=Decimal('18.00'),
        in_season=True,
        shop_location_id='chennai',
        shop_location=Location(id='chennai', city='Chennai', area='Egmore', bill_prefix='CHN'),
        created_by=None,
        created_at=at,
    )
    data = json.loads(ProductOut.from_model(product).model_dump_json())
    assert data['inSeason'] is True
    assert data['mrp'] == 1200 and data['offer'] == 999.5 and isinstance(data['gst'], float)
    assert data['shop'] == {'location': 'chennai', 'by': 'Chennai', 'at': '2026-10-26T10:00:00Z'}


def test_new_product_tidies_text():
    body = NewProductIn.model_validate({'name': '  Handmade  wreath 12 inch ', 'dept': ' Trees ', 'mrp': 1200})
    assert body.name == 'Handmade wreath 12 inch' and body.dept == 'Trees'
    assert body.offer is None and body.cost is None and body.gst == 18 and body.hsn == ''


@pytest.mark.parametrize(
    'change',
    [
        {'name': ' a '},
        {'name': 'x' * 201},
        {'dept': ''},
        {'mrp': 0},
        {'offer': 0},
        {'cost': -1},
        {'mrp': '12.345'},
        {'hsn': '1' * 17},
    ],
)
def test_new_product_rejects(change):
    with pytest.raises(ValidationError):
        NewProductIn.model_validate({'name': 'Wreath', 'dept': 'Trees', 'mrp': 100, **change})
