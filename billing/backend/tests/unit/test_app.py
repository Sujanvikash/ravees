"""The app builds without a database, and its routes are where the frontend expects them."""

from app.main import create_app

EXPECTED_ROUTES = {
    ('POST', '/api/v1/auth/login'),
    ('GET', '/api/v1/auth/me'),
    ('GET', '/api/v1/users'),
    ('PUT', '/api/v1/users/{username}/password'),
    ('POST', '/api/v1/users/{username}/password/reset'),
    ('GET', '/api/v1/products'),
    ('POST', '/api/v1/products'),
    ('PATCH', '/api/v1/products/{code}'),
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
