# ecommerce/backend

The shop API for the Raave's Evergreen website: the catalogue (categories, products and their photos), customer
accounts with password reset by email (Resend), the admin, enquiries, orders paid with Razorpay, showrooms and
testimonials. Python 3.13, FastAPI, SQLAlchemy 2, PostgreSQL and Alembic, managed with [uv](https://docs.astral.sh/uv/),
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
| `RESEND_API_KEY`, `MAIL_FROM` | Resend's API key and the sender, e.g. `Raave's Evergreen <no-reply@mail.example.com>`. Without a key, emails are printed to the log instead |
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
  "categories": [{ "id": "christmas-trees", "name": "Christmas Trees", "icon": "🎄", "image": "https://…/media/<id>.webp?size=card", "count": 6 }],
  "products": [{
    "id": "french-pine-christmas-tree", "name": "French Pine Christmas Tree",
    "category": "christmas-trees", "categoryLabel": "Christmas Trees",
    "description": "…", "specs": [{ "label": "Height", "value": "7 ft" }], "sizes": ["6 ft", "7 ft"],
    "images": ["https://…/media/<id>.webp"], "image": "https://…/media/<id>.webp?size=card",
    "inStock": true, "price": 12500, "mrp": 15000, "priceOnRequest": false, "featured": true
  }],
  "showrooms": [{ "id": "…", "city": "Chennai", "isFlagship": true, "title": "…", "address": "…", "phone": "…", "timing": "…", "features": ["…"], "mapQuery": "…", "stores": [{ "name": "Egmore", "address": "…", "phone": "…" }] }],
  "testimonials": [{ "id": "…", "author": "…", "location": "…", "quote": "…", "rating": 5, "treeModel": "…" }],
  "settings": { "deliveryFee": 0, "freeDeliveryOver": 0 }
}
```

Only visible categories and products, in the admin's order. `price` and `mrp` are rupees, GST included; `price: null`
means "Enquire for price" (`priceOnRequest: true`) and such a product can't be paid for online. `images` are the
large photos (1600px), `image` the first one at card size (600px), or null.

`GET /media/<imageId>.webp` serves a photo (`?size=card` for 600px); cached for a year.

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
   The server prices it from the catalogue (refusing hidden, out-of-stock or price-on-request products), adds the
   delivery fee (`deliveryFee`, free at or above `freeDeliveryOver` when that is above 0), creates the Razorpay order
   and answers `{ order, payment: { keyId, razorpayOrderId, amount, currency, name, description, prefill: { name, email, contact } } }`
   (`amount` in paise). The same `id` sent again returns the same order (and payment, while it is unpaid).
2. The website opens Razorpay Checkout (`https://checkout.razorpay.com/v1/checkout.js`) with `key: keyId, order_id: razorpayOrderId, amount, currency, name, description, prefill`.
3. On success: `POST /orders/<id>/verify` `{ razorpayOrderId, razorpayPaymentId, razorpaySignature }` → the order, now
   `paid`. The customer gets an order email. Razorpay's webhook (`POST /payments/razorpay/webhook`, set in Razorpay's
   dashboard for `payment.captured` and `order.paid`) marks it paid too, if the browser closed before step 3.

`GET /orders` (customer): their orders, newest first. `GET /orders/<id>`: one of theirs.

An order: `{ id, number: "RE-2627-00001", status, lines: [{ productId, name, image, price, qty, amount }], subtotal,
delivery, total, address, notes, createdAt, paidAt, history: [{ at, status, note }], customer: { name, email, phone } }`.
Status: `pending` (waiting for payment) → `paid` → `shipped` → `delivered`; or `cancelled`.

### Admin

`POST /admin/login` `{ username, password }` → `{ token, admin: { username } }` (12 hours). `GET /admin/me`.
`POST /admin/change-password` `{ current, password }` → `{ token }`. Every other `/admin/…` request needs the admin token.

| Request | Body | Answer |
|---|---|---|
| `GET /admin/catalogue` | | `{ categories, products }` as on the storefront, hidden ones too, each with `visible`, `position` and `imageIds` (product) / `imageId` (category) |
| `POST /admin/categories` | `{ name, icon, imageId, visible }` | category (its id is made from the name) |
| `PATCH /admin/categories/<id>` | any of those | category |
| `DELETE /admin/categories/<id>` | | 204; 409 while it has products |
| `PUT /admin/categories/order` | `{ ids: [...] }` | 204 |
| `POST /admin/products` | `{ name, category, description, specs, sizes, price, mrp, inStock, visible, featured, imageIds }` | product (id from the name) |
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
| `PATCH /admin/orders/<id>` | `{ status, note }` | order (the customer is emailed when it ships) |
| `GET /admin/customers` | | `[{ id, name, email, phone, createdAt, orders, spent }]` |
| `GET /admin/settings`, `PATCH /admin/settings` | `{ deliveryFee, freeDeliveryOver }` | settings |
