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
    assert len(catalogue.products) == 2922 + 477
    assert len({p['code'] for p in catalogue.products}) == 2922 + 477
    # the season is exactly the 2026 list (seed/products-2026.xls), whose codes all carry the year
    season = [p['code'] for p in catalogue.products if p['in_season']]
    assert len(season) == 477 and all('26' in code for code in season)


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
    assert tr['dept'] == 'Trees' and tr['mrp'] > 0 and not tr['in_season']


def test_a_2026_product_row(catalogue):
    ct = next(p for p in catalogue.products if p['code'] == 'CT26020')
    assert ct == {
        'code': 'CT26020',
        'name': '120 CM PINE NEEDLE +PVC CONE TREE',
        'type': 'Product',
        'dept': '',
        'barcode': '',
        'hsn': '95051000',
        'mrp': Decimal(7300),
        'offer': Decimal(6600),
        'cost': Decimal('1930.48'),
        'gst': Decimal(18),
        'in_season': True,
    }


def test_2026_prices_are_the_client_s_final_list(catalogue):
    by_code = {p['code']: p for p in catalogue.products}

    def price(code):
        p = by_code[code]
        return p['mrp'], p['offer'], p['cost']

    assert price('FD26001') == (140, 120, Decimal('40.72'))  # the S.Price, though its DiscP gave 113.68
    assert price('SR26015') == (7650, 6200, Decimal('1882.58'))  # the D.Rate put back on its own row
    assert price('SR26005') == (1750, 1440, Decimal('423.58'))  # 14.4 in the list, 1440 as the client confirmed
    assert price('SR26039')[1] == 0  # an S.Price above the MRP: sells at the MRP
    assert price('LL2601') == (1600, 1440, Decimal('394.45'))  # its cells were a column to the left in the list
    assert by_code['LL2612']['name'] == by_code['LL2611']['name']  # one merged cell names both


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
