# Raave's Evergreen

| Folder | What it is |
|---|---|
| `ecommerce/frontend` | Public website: landing page, online shop and admin (React + Vite). |
| `ecommerce/backend` | Shop API (Python, FastAPI, PostgreSQL): catalogue and photos, customer accounts with password reset by email (Resend), orders paid with Razorpay, enquiries and the admin. See its README. |
| `billing/frontend` | Billing counter screen for the showrooms: barcode scanning, payment, 80mm receipts (React + Vite). |
| `billing/backend` | Billing API (Python, FastAPI, PostgreSQL): logins and the product catalogue so far. `seed/` holds the full product list. See its README to set it up. |

Each app has its own backend and its own database. Their product lists are separate on purpose: billing has the full multi-year catalogue, while the website's products (with photos and descriptions) are added on their own.

Both are deployed with Docker on the same AWS server (the APIs, behind billing's Caddy) and Cloudflare Pages (the frontends), with CI/CD in GitHub Actions: see `billing/deploy/README.md` and `ecommerce/deploy/README.md`.

## Run the website

Start the shop API first (see `ecommerce/backend/README.md`; it runs on port 8001), then:

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
