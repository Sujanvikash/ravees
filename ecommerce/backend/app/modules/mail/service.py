"""
Emails to customers (and a copy of each paid order to the shop): the password reset link, and every step of an
order (paid with its invoice, shipped, delivered, cancelled).

They go out through the shop's own mailbox by SMTP when SMTP_HOST is set (raaves@christmasraave.in on Zoho Mail:
smtp.zoho.in, port 465), otherwise through Resend's HTTP API when RESEND_API_KEY is. With neither (on a computer, in
the tests) nothing is sent: each email is written to the log and kept in OUTBOX, so the reset link can still be
followed. A failed send is logged and never fails the request that caused it: the order is paid, or the reset link
made, either way.
"""

import html
import logging
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage

import httpx

from app.core.config import Settings, get_settings

RESEND_URL = 'https://api.resend.com/emails'
# the shop's number, at the foot of every email
SHOP_PHONE = '+91 80154 32248'

log = logging.getLogger('shop.mail')


@dataclass(frozen=True, slots=True)
class Email:
    to: str
    subject: str
    html: str
    text: str


# the emails "sent" with no way to send them, newest last (the tests read the reset link from here)
OUTBOX: list[Email] = []


def _by_smtp(email: Email, settings: Settings) -> bool:
    """Through the mailbox's own server: SSL from the start on port 465, STARTTLS on any other (587)."""
    message = EmailMessage()
    message['From'] = settings.mail_from
    message['To'] = email.to
    message['Subject'] = email.subject
    if settings.mail_reply_to:
        message['Reply-To'] = settings.mail_reply_to
    message.set_content(email.text)
    message.add_alternative(email.html, subtype='html')
    context = ssl.create_default_context()
    try:
        if settings.smtp_port == 465:
            server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=20, context=context)
        else:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20)
            server.starttls(context=context)
        with server:
            server.login(settings.smtp_user, settings.smtp_password.get_secret_value())
            server.send_message(message)
    except (smtplib.SMTPException, OSError) as error:
        log.error('Email to %s (%s) failed: %s', email.to, email.subject, error)
        return False
    return True


def send(email: Email) -> bool:
    """Sends one email. Returns whether it went (or, with no way to send it, was logged)."""
    settings = get_settings()
    if settings.smtp_host:
        return _by_smtp(email, settings)
    key = settings.resend_api_key.get_secret_value()
    if not key:
        OUTBOX.append(email)
        del OUTBOX[:-50]
        log.warning(
            'Email not sent (no SMTP_HOST or RESEND_API_KEY) to %s: %s\n%s', email.to, email.subject, email.text
        )
        return True
    body = {
        'from': settings.mail_from,
        'to': [email.to],
        'subject': email.subject,
        'html': email.html,
        'text': email.text,
    }
    if settings.mail_reply_to:
        body['reply_to'] = [settings.mail_reply_to]
    try:
        response = httpx.post(RESEND_URL, json=body, headers={'Authorization': f'Bearer {key}'}, timeout=15)
        response.raise_for_status()
    except httpx.HTTPError as error:
        detail = error.response.text[:300] if isinstance(error, httpx.HTTPStatusError) else str(error)
        log.error('Email to %s (%s) failed: %s', email.to, email.subject, detail)
        return False
    return True


def _button(label: str, url: str, *, outline: bool = False) -> str:
    look = (
        'background:#ffffff;color:#0f3d2e;border:1px solid #0f3d2e'
        if outline
        else 'background:#0f3d2e;color:#f5e6c4;border:1px solid #0f3d2e'
    )
    return (
        f'<a href="{html.escape(url)}" style="{look};display:inline-block;margin:0 8px 8px 0;padding:11px 20px;'
        f'border-radius:6px;text-decoration:none;font-weight:600">{html.escape(label)}</a>'
    )


def _page(
    title: str,
    paragraphs: list[str],
    button: tuple[str, str] | None = None,
    extra: str = '',
    second: tuple[str, str] | None = None,
) -> str:
    """A plain, branded HTML email: the paragraphs are already escaped HTML. `second` is an outlined button
    beside the main one (the invoice)."""
    action = ''
    if button:
        action = (
            f'<p style="margin:26px 0 20px">{_button(*button)}{_button(*second, outline=True) if second else ""}</p>'
        )

    body = ''.join(f'<p style="margin:0 0 14px">{p}</p>' for p in paragraphs)
    return (
        '<div style="background:#f6f1e7;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;color:#1f2a24">'
        '<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:10px;padding:32px">'
        '<div style="font-family:Georgia,serif;font-size:22px;color:#0f3d2e;margin-bottom:18px">Raave’s Evergreen</div>'
        f'<h1 style="font-size:18px;margin:0 0 16px">{html.escape(title)}</h1>{body}{action}{extra}'
        '<p style="margin:28px 0 0;font-size:12px;color:#6b7280">Raave’s Evergreen · No. 1 in Christmas · '
        f'Christmas trees and decorations · {SHOP_PHONE}</p>'
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


def _first_name(order: dict) -> tuple[str, str]:
    """The customer's name, and their first name ready for HTML."""
    name = order['customer']['name']
    return name, html.escape(name.split()[0] if name else 'there')


def _invoice_line(order: dict) -> str:
    invoice = order.get('invoice')
    return f'Your tax invoice {invoice["number"]} is ready to download.' if invoice else ''


def order_paid(order: dict, url: str, invoice_url: str) -> Email:
    """To the customer once an order is paid (ordered), with its invoice. `order` is the order as the API answers
    it (OrderOut, dumped)."""
    name, first = _first_name(order)
    invoice = _invoice_line(order)
    return Email(
        to=order['customer']['email'],
        subject=f'Order {order["number"]} confirmed – Raave’s Evergreen',
        html=_page(
            f'Thank you for your order {order["number"]}',
            [
                f'Hello {first},',
                'We’ve received your payment and your order is confirmed. We’ll email you again when it is on '
                + 'its way.',
            ]
            + ([html.escape(invoice)] if invoice else []),
            ('See your order', url),
            _order_table(order),
            ('Download invoice', invoice_url) if invoice else None,
        ),
        text=(
            f'Hello {name},\n\nThank you: your order {order["number"]} is paid and confirmed.\n\n'
            f'{_order_text(order)}\n\nSee it at {url}\n'
            + (f'{invoice} {invoice_url}\n' if invoice else '')
            + 'We’ll email you again when it is on its way.'
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


def _update(order: dict, url: str, note: str, *, subject: str, title: str, says: str, **extra) -> Email:
    """An email about a step in the order's life: what happened, the admin's note (a courier's tracking number,
    say), and a link to the order."""
    name, first = _first_name(order)
    paragraphs = [f'Hello {first},', html.escape(says)]
    if note:
        paragraphs.append(f'<b>Note from us:</b> {html.escape(note)}')
    return Email(
        to=order['customer']['email'],
        subject=f'{subject} – Raave’s Evergreen',
        html=_page(title, paragraphs, ('See your order', url), **extra),
        text=f'Hello {name},\n\n{says}\n' + (f'Note from us: {note}\n' if note else '') + f'\nSee it at {url}',
    )


def order_shipped(order: dict, url: str, note: str) -> Email:
    number = order['number']
    return _update(
        order,
        url,
        note,
        subject=f'Order {number} is on its way',
        title='Your order is on its way',
        says=f'Your order {number} has been shipped and is on its way to you.',
    )


def order_delivered(order: dict, url: str, invoice_url: str, note: str) -> Email:
    number = order['number']
    return _update(
        order,
        url,
        note,
        subject=f'Order {number} delivered',
        title='Your order has been delivered',
        says=f'Your order {number} has been delivered. We hope it brings a merry Christmas to your home!',
        second=('Download invoice', invoice_url) if order.get('invoice') else None,
    )


def order_cancelled(order: dict, url: str, note: str) -> Email:
    number = order['number']
    return _update(
        order,
        url,
        note,
        subject=f'Order {number} cancelled',
        title='Your order has been cancelled',
        says=(
            f'Your order {number} has been cancelled. The amount you paid will be refunded to the way you paid. '
            f'If you have any questions, call us on {SHOP_PHONE}.'
        ),
    )
