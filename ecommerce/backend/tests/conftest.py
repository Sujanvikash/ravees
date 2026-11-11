"""
Settings for the whole test run, applied before the app is imported.

The app never sees your real DATABASE_URL here: it points at TEST_DATABASE_URL when that is set, and otherwise at an
address nothing listens on. The API tests in tests/api create their tables on TEST_DATABASE_URL and are skipped when
it isn't set or can't be reached. Razorpay and Resend are never called: payments use test keys and a stand-in for
making the Razorpay order, and emails go to mail.OUTBOX.
"""

import os

from dotenv import dotenv_values

from app.core.config import BACKEND_DIR

UNUSED_DATABASE = 'postgresql+psycopg://unused:unused@localhost:1/unused'


def _test_database_url() -> str | None:
    if 'TEST_DATABASE_URL' in os.environ:
        return os.environ['TEST_DATABASE_URL'] or None
    return dotenv_values(BACKEND_DIR / '.env').get('TEST_DATABASE_URL') or None


TEST_DATABASE_URL = _test_database_url()

os.environ['DATABASE_URL'] = TEST_DATABASE_URL or UNUSED_DATABASE
os.environ['JWT_SECRET'] = 'test-secret-not-for-production-use-0123456789'
os.environ['ENVIRONMENT'] = 'test'
os.environ['PUBLIC_URL'] = 'http://shop-api.test'
os.environ['SITE_URL'] = 'http://shop.test'
os.environ['RESEND_API_KEY'] = ''
os.environ['ADMIN_EMAIL'] = 'orders@shop.test'
os.environ['RAZORPAY_KEY_ID'] = 'rzp_test_key'
os.environ['RAZORPAY_KEY_SECRET'] = 'razorpay-test-secret'
os.environ['RAZORPAY_WEBHOOK_SECRET'] = 'razorpay-webhook-secret'
os.environ['ADMIN_USERNAME'] = 'admin'
os.environ['ADMIN_PASSWORD'] = 'admin-test-pass'
