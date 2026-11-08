"""The app builds without a database, and its routes are where the frontend expects them."""

from app.main import create_app

EXPECTED_ROUTES = {
    ('POST', '/api/v1/auth/login'),
    ('GET', '/api/v1/auth/me'),
    ('GET', '/api/v1/users'),
    ('PUT', '/api/v1/users/{username}/password'),
    ('POST', '/api/v1/users/{username}/password/reset'),
    ('GET', '/api/v1/locations'),
    ('POST', '/api/v1/locations'),
    ('DELETE', '/api/v1/locations/{location_id}'),
    ('POST', '/api/v1/locations/{location_id}/reactivate'),
    ('GET', '/api/v1/products'),
    ('POST', '/api/v1/products'),
    ('PATCH', '/api/v1/products/{code}'),
    ('GET', '/api/v1/products/images'),
    ('PUT', '/api/v1/products/{code}/image'),
    ('DELETE', '/api/v1/products/{code}/image'),
    ('POST', '/api/v1/auth/demo'),
    ('POST', '/api/v1/auth/check-password'),
    ('GET', '/api/v1/sales'),
    ('POST', '/api/v1/sales'),
    ('POST', '/api/v1/sales/customer'),
    ('POST', '/api/v1/sales/offline-counter'),
    ('POST', '/api/v1/sales/{sale_id}/collections'),
    ('GET', '/api/v1/returns'),
    ('POST', '/api/v1/returns'),
    ('GET', '/api/v1/returns/bill'),
    ('GET', '/api/v1/stock'),
    ('GET', '/api/v1/stock/imports'),
    ('POST', '/api/v1/stock/imports'),
    ('GET', '/api/v1/boxes'),
    ('POST', '/api/v1/boxes'),
    ('DELETE', '/api/v1/boxes/{box_id}'),
    ('GET', '/api/v1/transfer-invoices'),
    ('POST', '/api/v1/transfer-invoices'),
    ('PUT', '/api/v1/transfer-invoices/{invoice_id}/documents'),
    ('GET', '/api/v1/transfer-invoices/{invoice_id}/document'),
    ('POST', '/api/v1/transfer-invoices/{invoice_id}/pay'),
    ('POST', '/api/v1/transfer-invoices/{invoice_id}/stock'),
    ('POST', '/api/v1/transfer-invoices/{invoice_id}/cancel'),
    ('GET', '/api/v1/purchase-returns'),
    ('POST', '/api/v1/purchase-returns'),
    ('POST', '/api/v1/purchase-returns/{return_id}/receive'),
    ('GET', '/api/v1/orders'),
    ('POST', '/api/v1/orders'),
    ('PUT', '/api/v1/orders/{order_id}'),
    ('POST', '/api/v1/orders/{order_id}/reject'),
    ('POST', '/api/v1/orders/{order_id}/cancel'),
    ('GET', '/api/v1/quotes'),
    ('POST', '/api/v1/quotes'),
    ('POST', '/api/v1/quotes/{quote_id}/archive'),
    ('POST', '/api/v1/quotes/{quote_id}/unarchive'),
    ('GET', '/api/v1/cash/day'),
    ('GET', '/api/v1/cash/closes'),
    ('POST', '/api/v1/cash/closes'),
    ('DELETE', '/api/v1/cash/closes/{close_id}'),
    ('GET', '/api/v1/reports/sales.xlsx'),
    ('GET', '/api/v1/reports/final-sales.xlsx'),
    ('GET', '/api/v1/settings'),
    ('PATCH', '/api/v1/settings'),
    ('POST', '/api/v1/demo/reset'),
    ('GET', '/health'),
}


def test_routes():
    schema = create_app().openapi()
    routes = {(method.upper(), path) for path, ops in schema['paths'].items() for method in ops}
    assert routes == EXPECTED_ROUTES


def test_response_bodies_are_camel_case():
    components = create_app().openapi()['components']['schemas']
    assert 'passwordChangedAt' in components['UserOut']['properties']
    assert 'inSeason' in components['ProductOut']['properties']
