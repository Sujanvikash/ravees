# billing/frontend

Billing, stock and reporting for the five Raave's Evergreen showrooms. Each showroom signs in to bill customers with a barcode scanner, request stock and count deliveries in. The admin signs in to see every showroom's sales, profit and stock, and to approve and send purchase orders. The stack is React 19, Vite 8, Tailwind CSS v4 and lucide-react in plain JSX, the same as `ecommerce/frontend`.

```bash
npm install
npm run dev       # http://localhost:5174 (5173 is the website)
npm run build     # production build to dist/
npm run lint
```

## Logins (demo)

| Login | Password | Sees |
|---|---|---|
| Chennai, Bengaluru, Goa, Mumbai, Pune | `chennai@2026`, `bengaluru@2026`, `goa@2026`, `mumbai@2026`, `pune@2026` | Billing, its own sales, its own inventory, its own purchase orders |
| Admin | `admin@2026` | Dashboard, all sales with purchase cost and profit, every showroom's inventory, all purchase orders |

These are **demo logins**. Only SHA-256 hashes are kept in `src/lib/auth.js`, but anyone with the app's code can get in. Real logins come with the billing backend.

The admin can set a new password for any login, or put it back to the default, under **Logins** in the menu. Showroom logins cannot change passwords. Like everything else for now, a changed password is kept in this browser, so it only applies on the computer where the admin set it.

## Quotations

**Quotations** (under Selling) work like the billing counter but end in a saved quotation instead of a payment. A quotation never changes stock or the sales figures. It is numbered per showroom (`QT-CHN/26-27/00001`), has a customer name (mobile optional), a validity of 7, 15 or 30 days and an optional note. It prints on A4 with a large diagonal QUOTATION watermark, "NOT A BILL · NOT A TAX INVOICE", and a boxed notice that no payment is to be made against it. **Bill this** loads a saved quotation's items into the billing counter when the customer buys. The admin sees every showroom's quotations (under Reports) and, in **Settings**, can turn printing quotations on or off.

## The season list

Which products are "Season 2026" starts from the product Excel. The admin can change it in Inventory: the **In season** tick box on each row (use "All products" and search to find older products). Changes are kept on top of the Excel's list, so billing search, the season filter, purchase-order suggestions and low-stock all follow them.

## How stock moves

Stock goes up through a **purchase order** or an **Excel stock import**, and only goes down through a **sale**.

1. **Showroom requests stock** (Purchase orders → Request stock). Products can be searched or scanned, added with **Add low stock** (season products at 5 units or fewer, topped up to 10), or imported from an Excel. The request goes to the admin.
2. **Admin reviews** (Purchase orders → To review → Review & send). The admin can change quantities, set purchase rates, add or remove products, or import the supplier's Excel. It is then **approved and sent to the showroom**, or rejected with a reason. Only showrooms raise orders; the admin reviews them.
3. **Showroom counts it in** when the goods arrive (Purchase orders → To count in → Count in). Counting starts from the sent quantities, or **Count with scanner** starts at zero and each scan adds one. What is counted is added to stock, and any shortfall or extra is kept on the order with a note.
4. **Billing** takes sold items off that showroom's stock. The counter shows stock on every line and warns when a bill goes beyond what is in stock, but still lets it through.

**Excel stock import** (Inventory → Import stock) adds stock straight from a sheet, for opening stock or goods that came without a purchase order. It uses the same Excel format as purchases. A showroom imports into its own stock; the admin picks the showroom. The window shows each product's stock now and after, and nothing changes until it is confirmed.

**Shop products** (Inventory → New product) are for items without a barcode. The showroom enters the name, category, MRP, offer and cost price, GST and HSN, and the code is made from its bill prefix and a running number (`CHN-0001`, `BLR-0001`…), so two showrooms never create the same code. Units already in the shop can be entered too, and show in the history as "New product". The product can then be billed by typing its code, and found in search, purchase orders and imports. "Shop-added" in Inventory lists them, with who added each.

**History** (Inventory → History) is the audit trail of stock coming in: every import and every purchase order counted in, with when, which showroom, who added it, and the file or order number. Each entry opens to list its products. The admin sees all showrooms; a showroom sees its own. Imported units are counted in the Received column.

The menu shows a red badge when something needs doing: requests to review for the admin, deliveries to count in for a showroom.

**Purchase Excel format:** one row per product, with a `Code` column and a `Qty` column, plus an optional `Purchase rate` (or `Rate` / `Cost`). If there is no rate, the product's cost price is used. The header row is found by name, so a title row above it, extra columns or a different column order are fine. A code that appears twice is added up. Unknown codes and bad quantities are listed and skipped. It must be an `.xlsx` file: re-save old `.xls` files from Excel.

- `public/purchase-template.xlsx` is a blank template (also linked from the app).
- `billing/backend/seed/sample-purchase-2026.xlsx` is a sample with the 25 season products, for testing.

## Data

There is no billing backend yet, so **everything is kept in this browser's localStorage, per computer**. The admin therefore only sees sales and orders made on the same computer. All reads and writes go through `src/context/StoreContext.jsx`, which is the one place the backend will replace.

| Key | What it holds |
|---|---|
| `billing-sales` | completed sales from every showroom, each with its showroom and each line's cost price |
| `billing-stock` | `{ showroom: { code: units } }` |
| `billing-orders` | purchase orders and their history |
| `billing-stock-imports` | Excel stock imports: `{ id, at, by, username, location, file, lines }`, kept for the history |
| `billing-shop-products` | products the showrooms added themselves: catalogue fields plus `shop: { location, by, at }` |
| `billing-quotes` | saved quotations |
| `billing-settings` | the admin's settings: `{ quotePrint }` |
| `billing-season-edits` | the admin's changes to the season list: `{ code: true/false }` |
| `billing-passwords` | passwords the admin has changed: `{ login: { hash, at } }` (logins not listed use the default) |
| `billing-current-<showroom>`, `billing-held-<showroom>`, `billing-seq-<showroom>` | the bill in progress, held bills and the next bill number, per showroom |
| `billing-session` | who is signed in |

- **Products** come from `src/data/products.json`, generated from the Excel files in `billing/backend/seed/`:
  ```bash
  cd billing/backend/seed
  python export_products.py products-clean.xlsx ../../frontend/src/data/products.json
  ```
  Re-run it after editing `products-clean.xlsx`. The **In Season 2026** column is `Y` for 25 sample products for now; mark the real season list there. The JSON includes the cost price for the admin's figures. Showroom logins never display it, but until the backend exists anyone with browser developer tools could read it.
- **Showrooms** (address, phone, GSTIN, UPI ID, bill prefix) are in `src/config.js`. GSTIN and UPI ID are blank and must be filled in before real use. Bills are numbered per showroom, like `CHN/26-27/00001` and `BLR/26-27/00001`.
- **Demo sales:** the admin dashboard can add a month of sample sales across all showrooms, to preview the charts. They are marked DEMO, use bill numbers from 90001, don't touch stock, and **Remove** deletes them.

## Figures

- Prices are treated as GST-inclusive (`PRICES_INCLUDE_GST` in `src/config.js`). GST is taken out and split into CGST + SGST.
- **Purchase cost** is each product's cost price (the old system's D.Rate), captured on the bill when it was sold. **Gross profit** = sales without GST − purchase cost, which assumes cost prices are also without GST. **Margin** = gross profit ÷ sales without GST.

## Using it at the counter

- **Scanner:** a USB barcode scanner types the code and presses Enter, so the scan box needs focus. It has focus on load, after every sale, and whenever F2 is pressed.
- **Shortcuts:** F2 scan, F4 customer, F8 hold, F9 held bills, F12 pay, Esc closes a dialog, Enter completes the sale and then starts the next bill. F12 opens developer tools in a normal Chrome or Edge window, so run the counter in kiosk or app mode.
- **Customer:** a mobile number and a name are required on every bill.
- **Printing:** only the 80mm receipt prints. Set the thermal printer as the default and turn off headers and footers in the print dialog; `--kiosk-printing` skips the dialog.
- **Menu:** **Collapse** shrinks it to icons (remembered per computer). On small screens it opens from the ☰ button.

## Code map

| Path | What it is |
|---|---|
| `src/App.jsx` | sign-in, then the shell: menu and the current page |
| `src/pages/` | Login, Counter (billing), Sales, Inventory, PurchaseOrders, Dashboard (admin) |
| `src/components/` | Sidebar, PageHeader, ScanBar, BillTable, OrderPanel, PaymentDialog, DoneDialog, HeldDialog, OrderEditor, CountInDialog, DayChart, StatTile, Filters, Receipt, plus Dialog, PaymentMethods and Kbd |
| `src/context/StoreContext.jsx` | sales, stock and purchase orders: the data layer the backend will replace |
| `src/lib/orders.js` | purchase-order statuses, numbering, on-order and received counts |
| `src/lib/purchaseFile.js` | reading a purchase Excel into order lines |
| `src/lib/reports.js` | totals, cost, profit, by day, by showroom, top products, payment methods |
| `src/lib/auth.js` | the demo logins |
| `src/lib/bill.js`, `catalogue.js`, `customer.js`, `money.js`, `payment.js`, `demo.js` | bill totals and numbers, product lookup, customer checks, ₹ formatting, payment methods, demo sales |
| `src/styles/index.css` | the Tailwind theme: neutral greys with the logo's green for the main action and its red for small accents; Geist type; animations |

## Not done yet

- **The billing backend:** central logins, sales, stock and orders shared by all five showrooms and the admin. Until then, each computer only has its own data.
- Bill numbers don't restart on 1 April.
- HSN codes are almost all blank in the product data, and the receipt doesn't print them yet.
- No returns, exchanges, bill discount, stock transfers between showrooms, or editing of product prices in the app.
- UPI is confirmed by hand. There is no QR code or payment-gateway check.
