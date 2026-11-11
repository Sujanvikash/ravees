"""Every table, imported in one place so Base.metadata is complete (for Alembic and the tests)."""

from app.core.database import Base
from app.modules.accounts.models import Admin, Customer, PasswordReset
from app.modules.catalogue.models import Category, Image, Product
from app.modules.enquiries.models import Enquiry
from app.modules.orders.models import NumberSeries, Order
from app.modules.site.models import ShopSetting, Showroom, Testimonial

__all__ = [
    'Admin',
    'Base',
    'Category',
    'Customer',
    'Enquiry',
    'Image',
    'NumberSeries',
    'Order',
    'PasswordReset',
    'Product',
    'ShopSetting',
    'Showroom',
    'Testimonial',
]
