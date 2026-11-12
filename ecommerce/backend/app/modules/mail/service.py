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
from datetime import datetime
from email.message import EmailMessage

import httpx

from app.core import clock
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


def _sign_in(server: smtplib.SMTP, user: str, password: str) -> None:
    """Logs in with AUTH PLAIN alone when the server offers it. smtplib's login() tries LOGIN after a refused PLAIN,
    and Gmail hangs up on that second try, so the log would say "Connection unexpectedly closed" instead of Gmail's
    own reason ("Username and Password not accepted")."""
    server.ehlo()
    if 'PLAIN' in server.esmtp_features.get('auth', '').upper().split():
        server.user, server.password = user, password
        server.auth('PLAIN', server.auth_plain)
    else:
        server.login(user, password)


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
            _sign_in(server, settings.smtp_user, settings.smtp_password.get_secret_value())
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


# The brand in an email: the website's evergreen, antique gold, ivory and ink. Every style is inline and the layout
# is tables, which is what Gmail, Outlook and phone mail apps all show the same way.
GREEN = '#0f3d2e'
GOLD = '#a8823a'
GOLD_LIGHT = '#e3c98b'
IVORY = '#f4efe4'
CREAM = '#fbf8f1'
INK = '#26302a'
MUTED = '#6b6457'
LINE = '#e8dcc4'
SERIF = "Georgia,'Times New Roman',serif"
SANS = 'Arial,Helvetica,sans-serif'


def _logo_url() -> str:
    """The logo as a PNG on this API (mail apps don't show SVG): GET /brand/email-logo.png."""
    settings = get_settings()
    return f'{settings.public_url}{settings.api_prefix}/brand/email-logo.png'


def _button(label: str, url: str, *, outline: bool = False) -> str:
    look = (
        f'background:#ffffff;color:{GREEN};border:2px solid {GREEN}'
        if outline
        else f'background:{GREEN};color:#fdf6e3;border:2px solid {GREEN}'
    )
    return (
        f'<a href="{html.escape(url)}" style="{look};display:inline-block;margin:6px 5px;padding:13px 26px;'
        f'border-radius:8px;font-family:{SANS};font-size:15px;font-weight:bold;text-decoration:none">'
        f'{html.escape(label)}</a>'
    )


def _page(
    title: str,
    paragraphs: list[str],
    button: tuple[str, str] | None = None,
    extra: str = '',
    second: tuple[str, str] | None = None,
    *,
    eyebrow: str = 'Raave’s Evergreen',
    preheader: str = '',
    after: str = '',
) -> str:
    """A branded HTML email: the logo, an evergreen band with a gold eyebrow and the title, the paragraphs (already
    escaped HTML), `extra` (an order's summary), the buttons (`second` is an outlined one beside the main one, the
    invoice), `after` (small print under them), and the shop's footer. `preheader` is the line inboxes show beside
    the subject."""
    site = get_settings().site_url
    body = ''.join(f'<p style="margin:0 0 14px">{p}</p>' for p in paragraphs)
    buttons = ''
    if button:
        buttons = (
            f'<tr><td align="center" style="padding:6px 28px 26px">'
            f'{_button(*button)}{_button(*second, outline=True) if second else ""}</td></tr>'
        )
    small = (
        f'<tr><td style="padding:0 32px 26px;font-family:{SANS};font-size:12px;line-height:1.6;color:{MUTED}">'
        f'{after}</td></tr>'
        if after
        else ''
    )
    hidden = (
        f'<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">{html.escape(preheader)}'
        '</div>'
        if preheader
        else ''
    )
    return (
        '<!doctype html><html><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>'
        f'<body style="margin:0;padding:0;background:{IVORY}">{hidden}'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{IVORY}">'
        '<tr><td align="center" style="padding:28px 12px 32px">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">'
        # the logo
        f'<tr><td align="center" style="padding:0 0 20px"><a href="{html.escape(site)}" style="text-decoration:none">'
        f'<img src="{html.escape(_logo_url())}" width="190" alt="Raave’s Evergreen" '
        f'style="display:block;width:190px;max-width:60%;height:auto;border:0;background:#ffffff;'
        f'border-radius:6px;padding:6px"></a></td></tr>'
        # the card
        f'<tr><td style="background:#ffffff;border:1px solid {LINE};border-radius:14px;overflow:hidden">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        f'<tr><td align="center" style="background:{GREEN};padding:26px 28px 24px;border-radius:13px 13px 0 0">'
        f'<div style="font-family:{SANS};font-size:11px;letter-spacing:3px;text-transform:uppercase;'
        f'color:{GOLD_LIGHT}">&#10022;&nbsp; {html.escape(eyebrow)} &nbsp;&#10022;</div>'
        f'<div style="font-family:{SERIF};font-size:25px;line-height:1.3;color:#fdf6e3;margin-top:8px">'
        f'{html.escape(title)}</div></td></tr>'
        f'<tr><td style="height:4px;background:{GOLD};font-size:0;line-height:0">&nbsp;</td></tr>'
        f'<tr><td style="padding:28px 32px 6px;font-family:{SANS};font-size:15px;line-height:1.65;color:{INK}">'
        f'{body}{extra}</td></tr>'
        f'{buttons}{small}'
        '</table></td></tr>'
        # the footer
        f'<tr><td align="center" style="padding:24px 16px 0;font-family:{SANS};font-size:12px;line-height:1.8;'
        f'color:{MUTED}">'
        f'<div style="font-family:{SERIF};font-size:15px;color:{GREEN};margin-bottom:2px">Raave’s Evergreen</div>'
        f'<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:{GOLD}">India’s No. 1 in '
        'Christmas &middot; Since 1997</div>'
        'European-standard Christmas trees, lights, baubles, décor, wreaths &amp; garlands<br>'
        f'<a href="tel:{SHOP_PHONE.replace(" ", "")}" style="color:{GREEN};text-decoration:none;font-weight:bold">'
        f'{SHOP_PHONE}</a> &nbsp;&middot;&nbsp; '
        f'<a href="{html.escape(site)}" style="color:{GREEN};text-decoration:none;font-weight:bold">Visit our shop</a>'
        f' &nbsp;&middot;&nbsp; <a href="{html.escape(site)}/showrooms" style="color:{GREEN};text-decoration:none;'
        'font-weight:bold">Find a store</a></td></tr>'
        '</table></td></tr></table></body></html>'
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
                    'We received a request to reset the password of your Raave’s Evergreen account. Tap the button '
                    f'below to choose a new one. The link works once and expires in <b>{minutes} minutes</b>.'
                ),
                'Didn’t ask for this? You can safely ignore this email: your password stays as it is.',
            ],
            ('Choose a new password', url),
            eyebrow='Your account',
            preheader=f'Choose a new password: the link works for {minutes} minutes.',
            after=(
                'Button not working? Copy this link into your browser:<br>'
                f'<a href="{html.escape(url)}" style="color:{GREEN};word-break:break-all">{html.escape(url)}</a>'
            ),
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


def _date(value: datetime | str | None) -> str:
    """12 Nov 2026, in India's time."""
    if not value:
        return ''
    at = datetime.fromisoformat(value) if isinstance(value, str) else value
    return at.astimezone(clock.IST).strftime('%d %b %Y').lstrip('0')


def _order_table(order: dict) -> str:
    """The order's summary card: its number and date, each line, delivery and the total, then where it goes."""
    cell = f'font-family:{SANS};font-size:14px;color:{INK};padding:10px 0;border-bottom:1px solid {LINE}'
    rows = ''.join(
        f'<tr><td style="{cell}">{html.escape(line["name"])}'
        f'<div style="font-size:12px;color:{MUTED};margin-top:2px">Qty {line["qty"]} &times; {_rupees(line["price"])}'
        f'</div></td><td align="right" style="{cell};white-space:nowrap;vertical-align:top">'
        f'{_rupees(line["amount"])}</td></tr>'
        for line in order['lines']
    )
    small = f'font-family:{SANS};font-size:13px;color:{MUTED};padding:8px 0 0'
    delivery = order['delivery']
    totals = (
        f'<tr><td style="{small}">Delivery</td><td align="right" style="{small}">'
        f'{_rupees(delivery) if delivery else "Free"}</td></tr>'
        f'<tr><td style="font-family:{SANS};font-size:16px;font-weight:bold;color:{GREEN};padding:10px 0 2px">Total '
        f'paid</td><td align="right" style="font-family:{SANS};font-size:16px;font-weight:bold;color:{GREEN};'
        f'padding:10px 0 2px;white-space:nowrap">{_rupees(order["total"])}</td></tr>'
        f'<tr><td colspan="2" style="font-family:{SANS};font-size:11px;color:{MUTED};padding:0">Prices include GST'
        '</td></tr>'
    )
    a = order['address']
    where = '<br>'.join(
        html.escape(p)
        for p in (
            a.get('name'),
            a.get('line1'),
            a.get('line2'),
            ', '.join(x for x in (a.get('city'), a.get('state')) if x) + f' – {a.get("pincode", "")}',
            f'Phone: {a.get("phone", "")}',
        )
        if p
    )
    placed = _date(order.get('created_at') or order.get('createdAt'))
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        f'style="border:1px solid {LINE};border-radius:10px;border-collapse:separate;margin:8px 0 14px">'
        f'<tr><td style="background:{CREAM};border-bottom:1px solid {LINE};border-radius:10px 10px 0 0;'
        f'padding:12px 18px;font-family:{SANS};font-size:13px;color:{MUTED}">Order '
        f'<b style="color:{INK}">{html.escape(order["number"])}</b>'
        f'{f" &nbsp;&middot;&nbsp; placed {placed}" if placed else ""}</td></tr>'
        f'<tr><td style="padding:4px 18px 14px"><table role="presentation" width="100%" cellpadding="0" '
        f'cellspacing="0" border="0">{rows}{totals}</table></td></tr></table>'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        f'style="background:{CREAM};border-radius:10px;margin:0 0 10px"><tr><td style="padding:14px 18px;'
        f'font-family:{SANS};font-size:13px;line-height:1.6;color:{INK}">'
        f'<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:{GOLD};margin-bottom:4px">'
        f'Delivering to</div>{where}</td></tr></table>'
    )


# An order's journey, as the emails show it.
STEPS = ('Confirmed', 'Shipped', 'Delivered')


def _tracker(done: int) -> str:
    """The three steps, the first `done` of them ticked in evergreen and the rest grey."""
    cells = []
    for i, label in enumerate(STEPS):
        reached = i < done
        dot = (
            f'background:{GREEN};color:#ffffff;border:2px solid {GREEN}'
            if reached
            else f'background:#ffffff;color:{LINE};border:2px solid {LINE}'
        )
        cells.append(
            f'<td align="center" width="33%" style="font-family:{SANS};font-size:12px;'
            f'color:{GREEN if reached else MUTED};font-weight:{"bold" if reached else "normal"}">'
            f'<div style="{dot};width:26px;height:26px;line-height:26px;border-radius:50%;margin:0 auto 6px;'
            f'font-size:14px;font-weight:bold">{"&#10003;" if reached else i + 1}</div>{label}</td>'
        )
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        f'style="margin:4px 0 18px"><tr>{"".join(cells)}</tr></table>'
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
            'Thank you for your order!',
            [
                f'Hello {first},',
                'We’ve received your payment and your order is confirmed. Our team is getting it ready, and we’ll '
                + 'email you again the moment it is on its way.',
            ]
            + ([html.escape(invoice)] if invoice else []),
            ('View your order', url),
            _tracker(1) + _order_table(order),
            ('Download invoice', invoice_url) if invoice else None,
            eyebrow='Order confirmed',
            preheader=f'Order {order["number"]} is confirmed: {_rupees(order["total"])} paid.',
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
            f'New order {order["number"]}',
            [f'<b>{html.escape(c["name"])}</b> paid {_rupees(order["total"])} online.', html.escape(who)]
            + ([f'<b>Customer’s note:</b> {html.escape(order["notes"])}'] if order['notes'] else []),
            extra=_order_table(order),
            eyebrow='New paid order',
            preheader=f'{c["name"]} paid {_rupees(order["total"])}.',
        ),
        text=f'New paid order {order["number"]} from {who}\n\n{_order_text(order)}\n\nNote: {order["notes"] or "-"}',
    )


def _update(
    order: dict,
    url: str,
    note: str,
    *,
    subject: str,
    eyebrow: str,
    title: str,
    says: str,
    done: int | None,
    **extra,
) -> Email:
    """An email about a step in the order's life: what happened, where the order is now (`done` steps of
    Confirmed, Shipped, Delivered; None for a cancelled one), the admin's note (a courier's tracking number, say),
    and a link to the order."""
    name, first = _first_name(order)
    paragraphs = [f'Hello {first},', html.escape(says)]
    box = ''
    if note:
        box = (
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
            f'style="margin:2px 0 16px"><tr><td style="background:{CREAM};border-left:4px solid {GOLD};'
            f'border-radius:6px;padding:12px 16px;font-family:{SANS};font-size:14px;color:{INK}">'
            f'<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:{GOLD};'
            f'margin-bottom:4px">A note from us</div>{html.escape(note)}</td></tr></table>'
        )
    return Email(
        to=order['customer']['email'],
        subject=f'{subject} – Raave’s Evergreen',
        html=_page(
            title,
            paragraphs,
            ('View your order', url),
            (_tracker(done) if done is not None else '') + box,
            eyebrow=eyebrow,
            preheader=says,
            **extra,
        ),
        text=f'Hello {name},\n\n{says}\n' + (f'Note from us: {note}\n' if note else '') + f'\nSee it at {url}',
    )


def order_shipped(order: dict, url: str, note: str) -> Email:
    number = order['number']
    return _update(
        order,
        url,
        note,
        subject=f'Order {number} is on its way',
        eyebrow='Order shipped',
        title='Your order is on its way!',
        says=f'Good news: your order {number} has been shipped and is on its way to you.',
        done=2,
    )


def order_delivered(order: dict, url: str, invoice_url: str, note: str) -> Email:
    number = order['number']
    return _update(
        order,
        url,
        note,
        subject=f'Order {number} delivered',
        eyebrow='Order delivered',
        title='Your order has arrived',
        says=f'Your order {number} has been delivered. We hope it brings a merry Christmas to your home!',
        done=3,
        second=('Download invoice', invoice_url) if order.get('invoice') else None,
    )


def order_cancelled(order: dict, url: str, note: str) -> Email:
    number = order['number']
    return _update(
        order,
        url,
        note,
        subject=f'Order {number} cancelled',
        eyebrow='Order cancelled',
        title='Your order has been cancelled',
        says=(
            f'Your order {number} has been cancelled. The amount you paid will be refunded to the way you paid. '
            f'If you have any questions, call us on {SHOP_PHONE}.'
        ),
        done=None,
    )
