"""
Emails to customers (and a copy of each paid order to the shop), sent through Resend's HTTP API.

Without RESEND_API_KEY (on a computer, in the tests) nothing is sent: each email is written to the log and kept in
OUTBOX, so the reset link can still be followed. A failed send is logged and never fails the request that caused it:
the order is paid, or the reset link made, either way.
"""

import html
import logging
from dataclasses import dataclass

import httpx

from app.core.config import get_settings

RESEND_URL = 'https://api.resend.com/emails'

log = logging.getLogger('shop.mail')


@dataclass(frozen=True, slots=True)
class Email:
    to: str
    subject: str
    html: str
    text: str


# the emails "sent" without a Resend key, newest last (the tests read the reset link from here)
OUTBOX: list[Email] = []


def send(email: Email) -> bool:
    """Sends one email. Returns whether it went (or, without a key, was logged)."""
    settings = get_settings()
    key = settings.resend_api_key.get_secret_value()
    if not key:
        OUTBOX.append(email)
        del OUTBOX[:-50]
        log.warning('Email not sent (no RESEND_API_KEY) to %s: %s\n%s', email.to, email.subject, email.text)
        return True
    body = {
        'from': settings.mail_from,
        'to': [email.to],
        'subject': email.subject,
        'html': email.html,
        'text': email.text,
    }
    try:
        response = httpx.post(RESEND_URL, json=body, headers={'Authorization': f'Bearer {key}'}, timeout=15)
        response.raise_for_status()
    except httpx.HTTPError as error:
        detail = error.response.text[:300] if isinstance(error, httpx.HTTPStatusError) else str(error)
        log.error('Email to %s (%s) failed: %s', email.to, email.subject, detail)
        return False
    return True


def _page(title: str, paragraphs: list[str], button: tuple[str, str] | None = None, extra: str = '') -> str:
    """A plain, branded HTML email: the paragraphs are already escaped HTML."""
    action = ''
    if button:
        label, url = button
        action = (
            f'<p style="margin:28px 0"><a href="{html.escape(url)}" style="background:#0f3d2e;color:#f5e6c4;'
            'padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600">'
            f'{html.escape(label)}</a></p>'
        )
    body = ''.join(f'<p style="margin:0 0 14px">{p}</p>' for p in paragraphs)
    return (
        '<div style="background:#f6f1e7;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;color:#1f2a24">'
        '<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:10px;padding:32px">'
        '<div style="font-family:Georgia,serif;font-size:22px;color:#0f3d2e;margin-bottom:18px">Raave’s Evergreen</div>'
        f'<h1 style="font-size:18px;margin:0 0 16px">{html.escape(title)}</h1>{body}{action}{extra}'
        '<p style="margin:28px 0 0;font-size:12px;color:#6b7280">Raave’s Evergreen · Christmas trees and decorations</p>'
        '</div></div>'
    )


def password_reset(to: str, name: str, url: str, minutes: int) -> Email:
    first = html.escape(name.split()[0] if name else 'there')
    return Email(
        to=to,
        subject='Reset your Raave’s Evergreen password',
        html=_page(
            'Reset your password',
            [
                f'Hello {first},',
                (
                    f'Someone (we hope you) asked to reset the password of your Raave’s Evergreen account. '
                    f'The link below works once, for the next {minutes} minutes.'
                ),
                'If you didn’t ask for this, you can ignore this email: your password stays as it is.',
            ],
            ('Choose a new password', url),
        ),
        text=(
            f'Hello {name},\n\nTo choose a new password for your Raave’s Evergreen account, open this link '
            f'(it works once, for {minutes} minutes):\n{url}\n\nIf you didn’t ask for this, ignore this email.'
        ),
    )


def _rupees(value: float) -> str:
    whole, paise = f'{value:.2f}'.split('.')
    # Indian grouping: 12,34,567
    head, tail = whole[:-3], whole[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    grouped = ','.join([*groups, tail]) if groups else tail
    return f'₹{grouped}' if paise == '00' else f'₹{grouped}.{paise}'


def _order_table(order: dict) -> str:
    rows = ''.join(
        f'<tr><td style="padding:6px 0">{html.escape(line["name"])} × {line["qty"]}</td>'
        f'<td style="padding:6px 0;text-align:right">{_rupees(line["amount"])}</td></tr>'
        for line in order['lines']
    )
    delivery = order['delivery']
    totals = (
        f'<tr><td style="padding:6px 0;border-top:1px solid #e5e7eb">Delivery</td>'
        f'<td style="padding:6px 0;border-top:1px solid #e5e7eb;text-align:right">'
        f'{_rupees(delivery) if delivery else "Free"}</td></tr>'
        f'<tr><td style="padding:6px 0;font-weight:700">Total paid</td>'
        f'<td style="padding:6px 0;text-align:right;font-weight:700">{_rupees(order["total"])}</td></tr>'
    )
    a = order['address']
    where = ', '.join(html.escape(p) for p in (a.get('line1'), a.get('line2'), a.get('city'), a.get('state')) if p)
    return (
        f'<table style="width:100%;border-collapse:collapse;font-size:14px;margin:8px 0 18px">{rows}{totals}</table>'
        f'<p style="margin:0 0 14px;font-size:14px"><b>Delivering to</b><br>{html.escape(a.get("name", ""))}, '
        f'{where} – {html.escape(a.get("pincode", ""))}<br>Phone: {html.escape(a.get("phone", ""))}</p>'
    )


def _order_text(order: dict) -> str:
    lines = '\n'.join(f'  {line["name"]} x {line["qty"]}: {_rupees(line["amount"])}' for line in order['lines'])
    delivery = _rupees(order['delivery']) if order['delivery'] else 'Free'
    return f'{lines}\n  Delivery: {delivery}\n  Total paid: {_rupees(order["total"])}'


def order_paid(order: dict, url: str) -> Email:
    """To the customer once an order is paid. `order` is the order as the API answers it (OrderOut, dumped)."""
    name = order['customer']['name']
    first = html.escape(name.split()[0] if name else 'there')
    return Email(
        to=order['customer']['email'],
        subject=f'Order {order["number"]} confirmed – Raave’s Evergreen',
        html=_page(
            f'Thank you for your order {order["number"]}',
            [f'Hello {first},', 'We’ve received your payment. We’ll email you again when your order is on its way.'],
            ('See your order', url),
            _order_table(order),
        ),
        text=(
            f'Hello {name},\n\nThank you: your order {order["number"]} is paid.\n\n{_order_text(order)}\n\n'
            f'See it at {url}\nWe’ll email you again when it is on its way.'
        ),
    )


def order_for_shop(order: dict, to: str) -> Email:
    """The shop's copy of a paid order."""
    c = order['customer']
    who = f'{c["name"]} ({c["email"]}, {c["phone"] or "no phone"})'
    return Email(
        to=to,
        subject=f'New paid order {order["number"]}: {_rupees(order["total"])}',
        html=_page(
            f'New paid order {order["number"]}',
            [html.escape(who)] + ([f'Note: {html.escape(order["notes"])}'] if order['notes'] else []),
            extra=_order_table(order),
        ),
        text=f'New paid order {order["number"]} from {who}\n\n{_order_text(order)}\n\nNote: {order["notes"] or "-"}',
    )


def order_shipped(order: dict, url: str, note: str) -> Email:
    name = order['customer']['name']
    first = html.escape(name.split()[0] if name else 'there')
    paragraphs = [f'Hello {first},', f'Your order {html.escape(order["number"])} is on its way.']
    if note:
        paragraphs.append(html.escape(note))
    return Email(
        to=order['customer']['email'],
        subject=f'Order {order["number"]} is on its way – Raave’s Evergreen',
        html=_page('Your order is on its way', paragraphs, ('See your order', url)),
        text=f'Hello {name},\n\nYour order {order["number"]} is on its way.\n{note}\n\nSee it at {url}',
    )
