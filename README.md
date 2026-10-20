# Raave's Evergreen

| Folder | What it is |
|---|---|
| `ecommerce/frontend` | Public website: landing page, online shop and admin (React + Vite). |
| `ecommerce/backend` | API for the e-commerce site (not built yet). |
| `billing/frontend` | Billing counter screen for the showrooms: barcode scanning, payment, 80mm receipts (React + Vite). |
| `billing/backend` | Billing API (not built yet). `seed/` holds the full product list and the scripts that clean and export it. |

Each app has its own backend and its own database. Their product lists are separate on purpose: billing has the full multi-year catalogue, while the website's products (with photos and descriptions) are added on their own.

## Run the website

```bash
cd ecommerce/frontend
npm install
npm run dev
```

## Run the billing counter

```bash
cd billing/frontend
npm install
npm run dev       # http://localhost:5174
```
