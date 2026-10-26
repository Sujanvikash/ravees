"""
Every table, imported in one place so Base.metadata is complete. Alembic (migrations/env.py) and the tests'
create_all read the metadata from here; add a new module's models to this list.
"""

from app.core.database import Base
from app.modules.locations.models import Location
from app.modules.products.models import Product
from app.modules.system.models import AppSetting
from app.modules.users.models import User

__all__ = ['AppSetting', 'Base', 'Location', 'Product', 'User']
