"""
Razorpay, through its HTTP API (no SDK): making an order to pay, and checking the signatures that prove a payment
(from the browser after Checkout, and on the webhook). https://razorpay.com/docs/api/orders/
"""

import hashlib
import hmac

import httpx

from app.core.config import get_settings
from app.core.errors import PaymentProblem

ORDERS_URL = 'https://api.razorpay.com/v1/orders'


def create_order(amount_paise: int, receipt: str, notes: dict[str, str]) -> str:
    """Makes the Razorpay order the customer pays, and returns its id (order_...)."""
    settings = get_settings()
    try:
        response = httpx.post(
            ORDERS_URL,
            json={'amount': amount_paise, 'currency': 'INR', 'receipt': receipt, 'notes': notes},
            auth=(settings.razorpay_key_id, settings.razorpay_key_secret.get_secret_value()),
            timeout=20,
        )
        response.raise_for_status()
        return response.json()['id']
    except (httpx.HTTPError, KeyError, ValueError) as error:
        raise PaymentProblem() from error


def _signed(secret: str, message: bytes, signature: str) -> bool:
    expected = hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()
    return bool(secret) and hmac.compare_digest(expected, signature or '')


def payment_signature_ok(razorpay_order_id: str, payment_id: str, signature: str) -> bool:
    """Checkout's razorpay_signature: HMAC-SHA256 of "order_id|payment_id" with the key secret."""
    secret = get_settings().razorpay_key_secret.get_secret_value()
    return _signed(secret, f'{razorpay_order_id}|{payment_id}'.encode(), signature)


def webhook_signature_ok(body: bytes, signature: str) -> bool:
    """X-Razorpay-Signature: HMAC-SHA256 of the raw body with the webhook's secret."""
    return _signed(get_settings().razorpay_webhook_secret.get_secret_value(), body, signature)
