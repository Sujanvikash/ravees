from decimal import Decimal
from pathlib import Path

import pytest
from openpyxl import Workbook

from app.modules.products.importer import (
    DEFAULT_EXCEL,
    REQUIRED_COLUMNS,
    CatalogueFileError,
    read_catalogue,
    sentence_case,
)


@pytest.fixture(scope='module')
def catalogue():
    return read_catalogue(DEFAULT_EXCEL)


def test_reads_the_real_product_excel(catalogue):
    assert catalogue.season == '2026'
    assert len(catalogue.products) == 2922
    assert sum(p['in_season'] for p in catalogue.products) == 25
    assert len({p['code'] for p in catalogue.products}) == 2922


def test_a_product_row(catalogue):
    ta = next(p for p in catalogue.products if p['code'] == 'TA275')
    assert ta == {
        'code': 'TA275',
        'name': 'Acrylic Soldier Horse',
        'type': 'Product',
        'dept': 'Acrylic',
        'barcode': '',
        'hsn': '',
        'mrp': Decimal(430),
        'offer': Decimal(350),
        'cost': Decimal(79),
        'gst': Decimal(18),
        'in_season': False,
    }
    tr = next(p for p in catalogue.products if p['code'] == 'TR0232')
    assert tr['dept'] == 'Trees' and tr['mrp'] > 0


def test_departments_are_sentence_case(catalogue):
    assert sentence_case('TREE HANGINGS') == 'Tree hangings'
    assert all(p['dept'] == sentence_case(p['dept']) for p in catalogue.products)


def _excel(tmp_path: Path, header: list[str], *rows: list[object]) -> Path:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = 'Products'
    sheet.append(header)
    for row in rows:
        sheet.append(row)
    path = tmp_path / 'products.xlsx'
    workbook.save(path)
    return path


def test_a_small_file(tmp_path):
    header = [*REQUIRED_COLUMNS, 'In Season 2027']
    path = _excel(
        tmp_path,
        header,
        ['ab1', ' Bauble ', None, 'BAUBLES', 8901, None, 120.5, 99, 40, 12, 'yes'],
        [None, 'blank code is skipped', None, None, None, None, None, None, None, None, None],
        ['AB2', 'Star', 'Service', 'stars', None, '9505', 'n/a', None, None, None, None],
    )
    result = read_catalogue(path)
    assert result.season == '2027'
    first, second = result.products
    assert first['code'] == 'AB1' and first['name'] == 'Bauble' and first['type'] == 'Product'
    assert first['dept'] == 'Baubles' and first['barcode'] == '8901'
    assert first['mrp'] == Decimal('120.5') and first['in_season'] is True
    assert second['mrp'] == Decimal(0) and second['hsn'] == '9505' and second['in_season'] is False


def test_a_missing_column(tmp_path):
    path = _excel(tmp_path, ['Code', 'Name', 'In Season 2026'])
    with pytest.raises(CatalogueFileError, match='missing columns'):
        read_catalogue(path)


def test_a_missing_season_column(tmp_path):
    path = _excel(tmp_path, list(REQUIRED_COLUMNS))
    with pytest.raises(CatalogueFileError, match='In Season'):
        read_catalogue(path)


def test_a_repeated_code(tmp_path):
    row = ['AB1', 'Bauble', None, 'BAUBLES', None, None, 10, 10, 1, 18, None]
    path = _excel(tmp_path, [*REQUIRED_COLUMNS, 'In Season 2026'], row, row)
    with pytest.raises(CatalogueFileError, match='AB1 more than once'):
        read_catalogue(path)
