# billing/frontend

The billing counter screen for Raave's Evergreen showrooms: staff scan products with a barcode scanner, take payment and print an 80mm thermal receipt. React 19, Vite 8, Tailwind CSS v4 and lucide-react, in plain JSX, the same stack as `ecommerce/frontend`.

```bash
npm install
npm run dev       # http://localhost:5174 (5173 is the website)
npm run build     # production build to dist/
npm run lint
```

## How it works today

There is no billing backend yet, so:

- **Products** come from `src/data/products.json`, which is generated from the Excel files in `billing/backend/seed/`:
  ```bash
  cd billing/backend/seed
  python export_products.py products-clean.xlsx ../../frontend/src/data/products.json
  ```
  Re-run it after editing `products-clean.xlsx`, for example after marking the **In Season 2026** column with `Y`. Until some products are marked, the "Season 2026" filter is switched off and search covers all products. Cost price and purchase details are left out of the JSON on purpose.
- **Shop details** (address, GSTIN, UPI ID, counter name, bill prefix, receipt note) live in `src/config.js`. The GSTIN and UPI ID are blank and must be filled in before real use.
- **Everything else is in the browser's localStorage, per computer:**

  | Key | What it holds |
  |---|---|
  | `billing-current` | the bill being rung up (survives a refresh) |
  | `billing-held` | held bills |
  | `billing-seq` | the next bill number |
  | `billing-sales` | completed sales |

  Clearing the browser's site data loses them. Moving these to the billing backend is the next step.

## Using it at the counter

- **Scanner:** a USB barcode scanner types the code and presses Enter, so the scan box needs focus. It has focus on load, after every sale, and whenever F2 is pressed. Typing a name lists matches; ↑ ↓ choose and Enter adds.
- **Shortcuts:** F2 scan, F4 customer number, F8 hold, F9 held bills, F12 pay, Esc closes a dialog, Enter completes the sale and then starts the next bill. F12 opens the browser's developer tools in normal Chrome and Edge windows, so run the counter in kiosk or app mode.
- **Prices** are treated as GST-inclusive (`PRICES_INCLUDE_GST` in `src/config.js`). GST is taken out of the price and split into CGST + SGST on the summary and receipt.
- **Printing:** the receipt is the only thing that prints (`@page` is 80mm wide). Set the thermal printer as the default printer, and in Chrome or Edge turn off headers and footers in the print dialog. Kiosk printing (`--kiosk-printing`) skips the dialog.

## Code map

| Path | What it is |
|---|---|
| `src/App.jsx` | the screen: state, shortcuts, hold/recall, completing a sale, printing |
| `src/components/` | ScanBar, BillTable, CustomerCard, SummaryCard, PaymentDialog, DoneDialog, HeldDialog, Receipt, Header, ShortcutBar, plus the shared Dialog, PaymentMethods and Kbd |
| `src/lib/catalogue.js` | product lookup by code or barcode, and search |
| `src/lib/bill.js` | totals, GST split, bill numbers (`CHN/26-27/00001`) |
| `src/lib/money.js` | ₹ formatting with Indian digit grouping |
| `src/hooks/useBill.js` | the current bill (items and last scanned), kept in localStorage |
| `src/styles/index.css` | the Tailwind theme: the logo's evergreen green and red, on a light background |

## Not done yet

- Bill numbers don't restart on 1 April, and each computer counts its own numbers. The backend should issue them.
- HSN codes are almost all blank in the product data, and the receipt doesn't print them yet.
- No returns, exchanges, bill discount, staff login or reports.
- UPI is confirmed by hand. There is no QR code or payment-gateway check.
