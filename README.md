# Raave's Evergreen

| Folder | What it is |
|---|---|
| `ecommerce/frontend` | Public website: landing page, online shop and admin (React + Vite). |
| `ecommerce/backend` | API for the e-commerce site (not built yet). |
| `billing/frontend` | Billing UI (not built yet). |
| `billing/backend` | Billing API (not built yet). |

Each app has its own backend and its own database. When one app needs the other's data, it calls that app's API.

## Run the website

```bash
cd ecommerce/frontend
npm install
npm run dev
```
