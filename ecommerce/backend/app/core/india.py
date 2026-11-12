"""
India's states and union territories with their GST state codes (the first two digits of a GSTIN), and amounts in
words the way an Indian invoice writes them.
"""

import re
from decimal import ROUND_HALF_UP, Decimal

STATES = {
    '01': 'Jammu and Kashmir',
    '02': 'Himachal Pradesh',
    '03': 'Punjab',
    '04': 'Chandigarh',
    '05': 'Uttarakhand',
    '06': 'Haryana',
    '07': 'Delhi',
    '08': 'Rajasthan',
    '09': 'Uttar Pradesh',
    '10': 'Bihar',
    '11': 'Sikkim',
    '12': 'Arunachal Pradesh',
    '13': 'Nagaland',
    '14': 'Manipur',
    '15': 'Mizoram',
    '16': 'Tripura',
    '17': 'Meghalaya',
    '18': 'Assam',
    '19': 'West Bengal',
    '20': 'Jharkhand',
    '21': 'Odisha',
    '22': 'Chhattisgarh',
    '23': 'Madhya Pradesh',
    '24': 'Gujarat',
    '26': 'Dadra and Nagar Haveli and Daman and Diu',
    '27': 'Maharashtra',
    '29': 'Karnataka',
    '30': 'Goa',
    '31': 'Lakshadweep',
    '32': 'Kerala',
    '33': 'Tamil Nadu',
    '34': 'Puducherry',
    '35': 'Andaman and Nicobar Islands',
    '36': 'Telangana',
    '37': 'Andhra Pradesh',
    '38': 'Ladakh',
}

# other ways people write a state, by its letters only (lower case)
_ALIASES = {
    'tn': '33',
    'tamilnad': '33',
    'newdelhi': '07',
    'nctofdelhi': '07',
    'orissa': '21',
    'pondicherry': '34',
    'pondy': '34',
    'jk': '01',
    'jammukashmir': '01',
    'up': '09',
    'mp': '23',
    'ap': '37',
    'wb': '19',
    'ka': '29',
    'kl': '32',
    'mh': '27',
    'ts': '36',
    'damananddiu': '26',
    'dadraandnagarhaveli': '26',
    'andamanandnicobar': '35',
    'uttaranchal': '05',
}


def _letters(text: str) -> str:
    return re.sub(r'[^a-z]', '', text.lower().replace('&', 'and'))


_BY_LETTERS = {_letters(name): code for code, name in STATES.items()} | _ALIASES


def state_code(state: str) -> str | None:
    """The GST code of a state as a person typed it ("Tamil Nadu", "tamilnadu", "TN" → "33"), or None."""
    return _BY_LETTERS.get(_letters(state or ''))


# fmt: off
_ONES = [
    'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
    'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
]
_TENS = ['Zero', 'Ten', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
# fmt: on


def _below_thousand(n: int) -> str:
    words = []
    if n >= 100:
        words.append(f'{_ONES[n // 100]} Hundred')
        n %= 100
    if n >= 20:
        words.append(_TENS[n // 10] + (f' {_ONES[n % 10]}' if n % 10 else ''))
    elif n:
        words.append(_ONES[n])
    return ' '.join(words)


def _whole_in_words(n: int) -> str:
    """12,34,567 → "Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven" (the Indian lakh and crore)."""
    if n == 0:
        return 'Zero'
    parts = []
    for size, name in ((10_000_000, 'Crore'), (100_000, 'Lakh'), (1000, 'Thousand')):
        if n >= size:
            parts.append(f'{_whole_in_words(n // size) if size == 10_000_000 else _below_thousand(n // size)} {name}')
            n %= size
    if n:
        parts.append(_below_thousand(n))
    return ' '.join(parts)


def rupees_in_words(amount: Decimal) -> str:
    """₹12,500.50 → "Rupees Twelve Thousand Five Hundred and Fifty Paise Only"."""
    value = Decimal(amount).quantize(Decimal('0.01'), ROUND_HALF_UP)
    whole, paise = divmod(int(value * 100), 100)
    words = f'Rupees {_whole_in_words(whole)}'
    if paise:
        words += f' and {_below_thousand(paise)} Paise'
    return f'{words} Only'
