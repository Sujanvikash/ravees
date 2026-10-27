# Raave's Evergreen

| Folder | What it is |
|---|---|
| `ecommerce/frontend` | Public website: landing page, online shop and admin (React + Vite). |
| `ecommerce/backend` | API for the e-commerce site (not built yet). |
| `billing/frontend` | Billing counter screen for the showrooms: barcode scanning, payment, 80mm receipts (React + Vite). |
| `billing/backend` | Billing API (Python, FastAPI, PostgreSQL): logins and the product catalogue so far. `seed/` holds the full product list. See its README to set it up. |

Each app has its own backend and its own database. Their product lists are separate on purpose: billing has the full multi-year catalogue, while the website's products (with photos and descriptions) are added on their own.

## Run the website

```bash
cd ecommerce/frontend
npm install
npm run dev
```

## Run the billing counter

Start the billing API first (see `billing/backend/README.md`), then:

```bash
cd billing/frontend
npm install
npm run dev       # http://localhost:5174
```
