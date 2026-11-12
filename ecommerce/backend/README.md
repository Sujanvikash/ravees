# ecommerce/backend

The shop API for the Raave's Evergreen website: the catalogue (five categories of at most 10 products each, store
exclusives, photos), customer accounts with password reset by email, the admin, enquiries, orders paid with
Razorpay with a GST tax invoice and an email at every step, the stores (with photos) and testimonials. Python 3.13, FastAPI, SQLAlchemy 2, PostgreSQL and Alembic, managed with [uv](https://docs.astral.sh/uv/),
built the same way as `billing/backend` (it is a separate app with its own database).

```bash
uv sync
uv run alembic upgrade head          # the tables
uv run python -m app.cli seed        # the admin login and, the first time, the catalogue, showrooms and testimonials
uv run uvicorn app.main:app --reload --port 8001
uv run pytest                        # API tests need TEST_DATABASE_URL (see .env.example)
uv run ruff check . && uv run ruff format --check .
```

Copy `.env.example` to `.env` first. On a computer whose PostgreSQL user can't create databases, a schema in an
existing database works too: add `?options=-csearch_path%3Dshop` to the URL (and create the schema once).

## Settings (environment)

| Name | What it is |
|---|---|
| `DATABASE_URL` | PostgreSQL, `postgresql+psycopg://user:password@host:5432/db` |
| `JWT_SECRET` | signs the sign-in tokens, 32+ characters |
| `CORS_ORIGINS` | the website's address(es), comma-separated |
| `PUBLIC_URL` | this API's own public address (photo links are made from it), e.g. `https://shop-api.example.com` |
| `SITE_URL` | the website's address, for the links in emails (`/reset-password?token=…`, `/account/orders/…`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | a mailbox to send the emails through (the shop's: `smtp.zoho.in`, 465, `raaves@christmasraave.in`); port 465 is SSL, any other STARTTLS. Used when `SMTP_HOST` is set |
| `RESEND_API_KEY` | otherwise Resend's API key. With neither, emails are printed to the log instead (setup: `ecommerce/deploy/README.md`) |
| `MAIL_FROM` | the sender, e.g. `Raave's Evergreen <raaves@christmasraave.in>` (with SMTP, the mailbox itself) |
| `MAIL_REPLY_TO` | optional: where a customer's reply to an email goes, e.g. `raaves@christmasraave.in` |
| `ADMIN_EMAIL` | optional: gets a copy of every paid order |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay's API keys (test keys start `rzp_test_`) |
| `RAZORPAY_WEBHOOK_SECRET` | the secret set on the webhook in Razorpay's dashboard |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | the admin login `seed` creates when there is none (it never changes an existing one) |

## The API

Everything is under `/api/v1` and speaks JSON in camelCase. A signed-in request sends `Authorization: Bearer <token>`.
Errors come back as `{"detail": "a sentence for the person"}` with 4xx (422 for bad input, 401 not signed in, 403 not
allowed, 404, 409 conflict).

### The storefront

`GET /storefront` (public) is everything the website shows, in one call:

```json
{
  "categories": [{ "id": "trees", "name": "Trees", "icon": "🎄", "image": "https://…/media/<id>.webp?size=card", "count": 6 }],
  "products": [{
    "id": "french-pine-christmas-tree", "name": "French Pine Christmas Tree",
    "category": "trees", "categoryLabel": "Trees",
    "description": "…", "specs": [{ "label": "Height", "value": "7 ft" }], "sizes": ["6 ft", "7 ft"],
    "images": ["https://…/media/<id>.webp"], "image": "https://…/media/<id>.webp?size=card",
    "inStock": true, "price": 12500, "mrp": 15000, "priceOnRequest": false, "featured": true, "storeOnly": false
  }],
  "showrooms": [{ "id": "…", "city": "Chennai", "isFlagship": true, "title": "…", "address": "…", "phone": "…", "timing": "…", "features": ["…"], "mapQuery": "…",
                  "stores": [{ "name": "Egmore", "address": "…", "phone": "…", "timing": "9:30 AM – 10:30 PM", "mapUrl": "https://www.google.com/maps?cid=…", "imageIds": ["<id>"], "images": ["https://…/media/<id>.webp"] }] }],
  "testimonials": [{ "id": "…", "author": "…", "location": "…", "quote": "…", "rating": 5, "treeModel": "…" }],
  "settings": { "deliveryFee": 0, "freeDeliveryOver": 0 }
}
```

Only visible categories and the products for sale, in the admin's order. `price` and `mrp` are rupees, GST included.
A product without a price isn't for sale: the storefront leaves it out (the admin still sees it). The exception is a
**store exclusive** (`storeOnly: true`): it is shown with or without a price (`priceOnRequest` true when it has none),
and can't be ordered online (`POST /orders` refuses it). `images` are the large photos (1600px), `image` the first one
at card size (600px), or null.

A category shows at most **10** visible products: making an 11th visible (new, shown again, or moved in) is a 409
naming the category. The shop sells five: Trees, Lights, Baubles, Décor Items, Wreath & Garlands (migration 0002 set
them up on the live shop; `seed` loads them on a new one).

`GET /media/<imageId>.webp` serves a photo (`?size=card` for 600px); cached for a year.

`GET /brand/email-logo.png` is the logo the emails show (a PNG: mail apps don't show SVG). The emails' links all
start from `SITE_URL`, so it must be the address where the new website is live (until christmasraave.in points
there, `https://ravees-ecommerce.pages.dev`).

### Customers

| Request | Body | Answer |
|---|---|---|
| `POST /auth/signup` | `{ name, email, phone, password }` (password 8+) | `{ token, customer }` |
| `POST /auth/login` | `{ email, password }` | `{ token, customer }` (10 wrong tries in 15 minutes: 429) |
| `GET /auth/me` | | `customer`: `{ id, name, email, phone, createdAt }` |
| `PATCH /auth/me` | `{ name?, phone? }` | `customer` |
| `POST /auth/change-password` | `{ current, password }` | `{ token }` (other devices are signed out) |
| `POST /auth/forgot-password` | `{ email }` | 204 whether or not the email has an account; if it has, a link `SITE_URL/reset-password?token=…` valid 30 minutes is emailed |
| `POST /auth/reset-password` | `{ token, password }` | `{ token, customer }` (signs in; the link works once) |

A customer token lasts 30 days, or until the password changes.

### Enquiries

`POST /enquiries` (public; a customer token, if sent, links it to the account):
`{ type: "contact" | "quote-request" | "consult" | "product", name, email, phone, city?, message?, details? }`.
`details` is any other JSON the form has (the items of a quote request, the showroom, the timeline…). Answer: the enquiry.

### Orders and payment

1. `POST /orders` (customer): `{ id: <uuid made by the website>, lines: [{ productId, qty }], address: { name, phone, email, line1, line2, city, state, pincode }, notes }`.
   `address.state` must be one of India's states or union territories (any spelling of its name, or TN; it comes back
   as the proper name): it is the invoice's place of supply.
   The server prices it from the catalogue (refusing hidden, out-of-stock, store-exclusive or price-less products), adds the
   delivery fee (`deliveryFee`, free at or above `freeDeliveryOver` when that is above 0), creates the Razorpay order
   and answers `{ order, payment: { keyId, razorpayOrderId, amount, currency, name, description, prefill: { name, email, contact } } }`
   (`amount` in paise). The same `id` sent again returns the same order (and payment, while it is unpaid).
2. The website opens Razorpay Checkout (`https://checkout.razorpay.com/v1/checkout.js`) with `key: keyId, order_id: razorpayOrderId, amount, currency, name, description, prefill`.
3. On success: `POST /orders/<id>/verify` `{ razorpayOrderId, razorpayPaymentId, razorpaySignature }` → the order, now
   `paid`, with its tax invoice. The customer gets an order email with a link to the invoice. Razorpay's webhook (`POST /payments/razorpay/webhook`, set in Razorpay's
   dashboard for `payment.captured` and `order.paid`) marks it paid too, if the browser closed before step 3.

`GET /orders` (customer): their orders, newest first. `GET /orders/<id>`: one of theirs.

An order: `{ id, number: "RE-2627-00001", status, lines: [{ productId, name, image, price, qty, amount }], subtotal,
delivery, total, address, notes, createdAt, paidAt, history: [{ at, status, note }], customer: { name, email, phone },
invoice }`. Status: `pending` (waiting for payment) → `paid` → `shipped` → `delivered`; or `cancelled`.

**The tax invoice** (`invoice`, null until paid; `app/modules/orders/invoice.py`): numbered `INV-2627-00001` in its own
series per financial year, from the seller the admin set (Settings; by default the Egmore store's business, SIANNA
COLLECTION, GSTIN 33AFUPE5958A1ZF; copied onto the order, so later edits don't change it). Prices include GST at 18%: each line's taxable value is `amount × 100 / 118` and the tax the rest, so the invoice
adds up to what was paid. Delivered within the seller's state: CGST 9% + SGST 9%; elsewhere IGST 18%. The delivery
charge is a line of its own (SAC 9965) at the same rate. HSN per line comes from the product's category (empty: 9505).

```json
{ "number": "INV-2627-00001", "date": "…", "orderNumber": "RE-2627-00001",
  "seller": { "name", "address", "gstin", "state", "stateCode", "phone", "email" },
  "buyer": { "name", "lines": ["…"], "phone", "email" }, "placeOfSupply": "Tamil Nadu (33)", "intraState": true,
  "gstRate": 18, "lines": [{ "description", "hsn", "qty", "rate", "taxable", "tax", "amount" }],
  "taxable": 2161.02, "cgst": 194.49, "sgst": 194.49, "igst": 0, "total": 2550,
  "amountInWords": "Rupees Two Thousand Five Hundred Fifty Only", "paymentId": "pay_…", "paidAt": "…" }
```

**Emails** (the shop's Zoho mailbox by SMTP, or Resend): the customer is emailed at every change of status: paid (the confirmation, with the invoice
link `SITE_URL/account/orders/<id>/invoice`; the shop's `ADMIN_EMAIL` gets a copy), shipped, delivered (with the
invoice), and cancelled (only once it was paid). Each carries the admin's note. A note without a change of status
isn't emailed.

### Admin

`POST /admin/login` `{ username, password }` → `{ token, admin: { username } }` (12 hours). `GET /admin/me`.
`POST /admin/change-password` `{ current, password }` → `{ token }`. Every other `/admin/…` request needs the admin token.

| Request | Body | Answer |
|---|---|---|
| `GET /admin/catalogue` | | `{ categories, products }` as on the storefront, hidden ones too, each with `visible`, `position` and `imageIds` (product) / `imageId` (category) |
| `POST /admin/categories` | `{ name, icon, imageId, visible, hsn }` (hsn: 4, 6 or 8 digits, or empty) | category (its id is made from the name) |
| `PATCH /admin/categories/<id>` | any of those | category |
| `DELETE /admin/categories/<id>` | | 204; 409 while it has products |
| `PUT /admin/categories/order` | `{ ids: [...] }` | 204 |
| `POST /admin/products` | `{ name, category, description, specs, sizes, price, mrp, inStock, visible, featured, storeOnly, imageIds }` | product (id from the name); 409 when its category already shows 10 |
| `PATCH /admin/products/<id>` | any of those | product |
| `DELETE /admin/products/<id>` | | 204 (past orders keep their copy) |
| `PUT /admin/products/order` | `{ ids: [...] }` | 204 |
| `POST /admin/images` | multipart, field `file` (JPEG, PNG or WebP, up to 15 MB) | `{ id, url, cardUrl }` |
| `GET/POST /admin/showrooms`, `PATCH/DELETE /admin/showrooms/<id>`, `PUT /admin/showrooms/order` | a showroom as on the storefront | |
| `GET/POST /admin/testimonials`, `PATCH/DELETE /admin/testimonials/<id>`, `PUT /admin/testimonials/order` | a testimonial | |
| `GET /admin/enquiries` | | newest first, each with `status`: `new` / `contacted` / `closed` and `createdAt` |
| `PATCH /admin/enquiries/<id>` | `{ status }` | enquiry |
| `DELETE /admin/enquiries/<id>` | | 204 |
| `GET /admin/orders` | | every order, newest first |
| `GET /admin/orders/<id>` | | one order (its invoice page) |
| `PATCH /admin/orders/<id>` | `{ status, note }` | order (the customer is emailed at every change of status; paid by hand gets its invoice) |
| `GET /admin/customers` | | `[{ id, name, email, phone, createdAt, orders, spent }]` |
| `GET /admin/settings`, `PATCH /admin/settings` | `{ deliveryFee, freeDeliveryOver }` | settings |
| `GET /admin/settings/invoice`, `PUT /admin/settings/invoice` | `{ name, address, gstin, state, phone, email }` (the GSTIN's first two digits must be the state's code) | the invoices' seller |
