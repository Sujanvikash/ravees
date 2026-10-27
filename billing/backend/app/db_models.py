"""
Every table, imported in one place so Base.metadata is complete. Alembic (migrations/env.py), the demo builder and
the tests' create_all read the metadata from here; add a new module's models to this list.
"""

from app.core.database import Base
from app.modules.cash.models import CashClose
from app.modules.locations.models import Location
from app.modules.numbering.models import NumberSeries
from app.modules.orders.models import PurchaseOrder
from app.modules.products.models import Product
from app.modules.quotes.models import Quote
from app.modules.returns.models import SaleReturn
from app.modules.sales.models import Sale, SaleLine
from app.modules.stock.models import StockImport, StockLevel
from app.modules.system.models import AppSetting
from app.modules.transfers.models import StockReturn
from app.modules.users.models import User

__all__ = [
    'AppSetting',
    'Base',
    'CashClose',
    'Location',
    'NumberSeries',
    'Product',
    'PurchaseOrder',
    'Quote',
    'Sale',
    'SaleLine',
    'SaleReturn',
    'StockImport',
    'StockLevel',
    'StockReturn',
    'User',
]
