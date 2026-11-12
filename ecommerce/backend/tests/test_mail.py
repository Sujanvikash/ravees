"""Sending through the shop's mailbox by SMTP, with a stand-in for the mail server (no database needed)."""

import smtplib
from typing import ClassVar

import pytest

from app.core.config import get_settings
from app.modules.mail import service as mail


class FakeServer:
    """Records what the shop's code does with an SMTP connection."""

    sent: ClassVar[list] = []
    logins: ClassVar[list] = []
    tls: ClassVar[list] = []

    def __init__(self, host, port, timeout=None, context=None):
        self.address = (host, port)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def starttls(self, context=None):
        FakeServer.tls.append(self.address)

    def login(self, user, password):
        if password != 'app-password':
            raise smtplib.SMTPAuthenticationError(535, b'Authentication failed')
        FakeServer.logins.append((self.address, user))

    def send_message(self, message):
        FakeServer.sent.append(message)


@pytest.fixture
def mailbox(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, 'smtp_host', 'smtp.zoho.in')
    monkeypatch.setattr(settings, 'smtp_user', 'raaves@christmasraave.in')
    monkeypatch.setattr(settings, 'smtp_password', type(settings.smtp_password)('app-password'))
    monkeypatch.setattr(settings, 'mail_from', "Raave's Evergreen <raaves@christmasraave.in>")
    monkeypatch.setattr(settings, 'mail_reply_to', 'raaves@christmasraave.in')
    monkeypatch.setattr(smtplib, 'SMTP_SSL', FakeServer)
    monkeypatch.setattr(smtplib, 'SMTP', FakeServer)
    for log in (FakeServer.sent, FakeServer.logins, FakeServer.tls):
        log.clear()
    mail.OUTBOX.clear()
    return settings


def test_an_email_goes_through_the_shops_mailbox(mailbox):
    email = mail.password_reset('asha@example.com', 'Asha Mathew', 'http://shop.test/reset-password?token=x', 30)
    assert mail.send(email) is True
    [message] = FakeServer.sent
    assert FakeServer.logins == [(('smtp.zoho.in', 465), 'raaves@christmasraave.in')] and FakeServer.tls == []
    assert message['To'] == 'asha@example.com' and message['Reply-To'] == 'raaves@christmasraave.in'
    assert 'raaves@christmasraave.in' in message['From'] and message['Subject'] == email.subject
    # both the plain text and the HTML go, and nothing is only logged
    kinds = [part.get_content_type() for part in message.iter_parts()]
    assert kinds == ['text/plain', 'text/html'] and mail.OUTBOX == []


def test_port_587_starts_tls(mailbox, monkeypatch):
    monkeypatch.setattr(mailbox, 'smtp_port', 587)
    assert mail.send(mail.Email('a@example.com', 'Hi', '<p>Hi</p>', 'Hi')) is True
    assert FakeServer.tls == [('smtp.zoho.in', 587)]


def test_a_failed_send_is_logged_not_raised(mailbox, monkeypatch, caplog):
    monkeypatch.setattr(mailbox, 'smtp_password', type(mailbox.smtp_password)('wrong'))
    assert mail.send(mail.Email('a@example.com', 'Hi', '<p>Hi</p>', 'Hi')) is False
    assert FakeServer.sent == [] and 'Authentication failed' in caplog.text
