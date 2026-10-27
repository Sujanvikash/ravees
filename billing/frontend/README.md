# billing/frontend

Billing, stock and reporting for the five Raave's Evergreen showrooms. Each showroom signs in to bill customers with a barcode scanner, request stock and count deliveries in. The admin signs in to see every showroom's sales, profit and stock, and to approve and send purchase orders. The stack is React 19, Vite 8, Tailwind CSS v4 and lucide-react in plain JSX, the same as `ecommerce/frontend`.

```bash
npm install
npm run dev       # http://localhost:5174 (5173 is the website)
npm run build     # production build to dist/
npm run lint
```

## Logins

| Login | Password | Sees |
|---|---|---|
| Chennai, Bengaluru, Goa, Mumbai, Pune | `chennai@2026`, `bengaluru@2026`, `goa@2026`, `mumbai@2026`, `pune@2026` | Billing, returns, its own sales, inventory, purchase orders and cash close |
| Admin | `admin@2026` | Dashboard, all sales with purchase cost and profit, every showroom's inventory, all purchase orders, every cash close |

Logins are checked by the billing API (`billing/backend`), which keeps the passwords hashed. The admin can set a new password for any login, or put it back to the default, under **Logins**; it works on every computer straight away. Showroom logins cannot change passwords.

## Demo

The **Demo** switch at the top right of the sign-in screen shows the same five showrooms and the admin. One click signs in, with no password, to the **demo**: its own copy of everything (a separate schema in the database) filled with a month of sample sales, returns, stock, purchase orders in every state, quotations, stock sent back and cash closes. Nothing done in the demo touches the real data, and the menu shows a DEMO tag. The demo admin can start it again from scratch under **Settings → Demo data → Reset demo**. On the server it is built by `python -m app.cli demo` (and by `seed` the first time).

## Quotations

**Quotations** (under Selling) work like the billing counter but end in a saved quotation instead of a payment. A quotation never changes stock or the sales figures. It is numbered per showroom (`QT-CHN/26-27/00001`), needs the customer's name and mobile number, a validity of 7, 15 or 30 days and an optional note. It prints on A4 with a large diagonal QUOTATION watermark, "NOT A BILL · NOT A TAX INVOICE", and a boxed notice that no payment is to be made against it. **Bill this** loads a saved quotation's items into the billing counter when the customer buys. The admin sees every showroom's quotations (under Reports) and, in **Settings**, can turn printing quotations on or off.

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
- `billing/backend/seed/opening-stock-2026/` has one sample opening-stock file per showroom (all 25 season products, a few left out as out of stock). Import each in Inventory → Import stock, choosing that showroom.

## Returns and exchanges

At the counter, **Return / exchange** finds the original bill (scan or type the bill number, or search by mobile or name). Pick what comes back. Only items on that bill, and not returned already, can come back, within the admin's return window (**Settings**: off, 7, 15 or 30 days; 15 by default).

- **Refund:** the items go back into stock and their value is **refunded in cash**, whatever the bill was paid with. A UPI or card payment is refunded in cash too. A **credit note** (`CN-CHN/26-27/00001`) is saved and can be printed (black and white, 80mm) for the customer to sign.
- **Exchange:** the returned value becomes a credit on the bill at the counter. Scan what the customer takes instead and collect as usual: the credit comes off first. If the new bill is bigger, the customer pays the rest by any method; if it is smaller, the difference is refunded in cash. The return and the new bill are saved together, and the receipt shows the credit note number.

The refunded value is the price paid on the original bill, rounded to the rupee. Sales show **Returns** and **net sales**; the cash close counts cash refunds.

## Cash close

Each showroom closes its day under **Cash close**. It counts the drawer note by note (or types the total), confirms the opening float (filled in from what was kept at the last close) and how much stays in the drawer for tomorrow. The server works out what should be there:

  expected = opening float + cash from bills (cash, and the cash part of split payments) − cash refunds
  difference = counted − expected (below 0: short, above 0: over)

A note is asked for when it doesn't balance. The admin's **Cash check** lists every close with its difference, the month's short and over totals, and which showrooms haven't closed today. The dashboard shows the last week's days that didn't balance.

## Stock sent back to the admin

From **Inventory → Send back to admin**, a showroom sends items back: at the end of the season, when another showroom needs them, or when damaged. Stock returns **only go to the admin**. The units leave the showroom's stock when it sends them (it can't send more than it has). The admin sees them under Inventory as on their way and **counts them in** when they arrive; any shortfall is kept on the return. They show in the inventory history as "Sent to admin", numbered `SR-CHN-0001`.

## Sell-through and the sales report

**Sales** shows a battery for each showroom (the admin sees all five): units sold so far this season against units sold plus units still in stock. Returned units count as back in stock. **Export to Excel** downloads the sales report for the chosen period and showroom from the server: a summary per showroom (with cost, profit and margin for the admin), every bill with how it was paid, every item, the returns and the cash closes.

## Printing

The bill and the credit note print on the 80mm thermal roll, **black and white only**, and every bill ends with a Christmas wish. The same bill always gets the same wish. A quotation prints on A4, black and white, with a QUOTATION watermark. If it is sent to the narrow receipt printer, it prints only "QUOTATION · NOT A BILL · print this on A4", so it can never pass for a bill. **Quotation** at the counter loads a saved quotation into the bill (at today's prices) when the customer buys.

## Data

Everything comes from the billing API (`VITE_API_URL`, see `.env.example`; default `http://localhost:8000/api/v1`): logins, the catalogue, sales, returns, stock, purchase orders, quotations, stock returns, cash closes and the admin's settings. It is the same on every computer. `src/context/StoreContext.jsx` loads it all after sign-in, refreshes it every 30 seconds and when the window comes back into focus, and sends every change to the server first. Bill, quotation, credit-note and order numbers are given by the server; the number shown while billing is the next one it will most likely give.

Only what belongs to one counter stays in the browser: `billing-current-<showroom>` (the bill in progress), `billing-held-<showroom>` (held bills), `billing-quote-<showroom>` (the quotation being written), `billing-session` and `billing-token` (who is signed in), and `billing-settings` (the last settings seen, so the theme is right before the server answers). The demo keeps its own (`billing-demo-…`).

A bill, return or import carries an id made at the counter, so if the connection drops and it is sent again, the server saves it once. If the server can't be reached, the bill stays on the counter with a message, and Collect can be pressed again.

- **Showrooms** (address, phone, GSTIN, UPI ID, bill prefix) are in `src/config.js`. GSTIN and UPI ID are blank and must be filled in before real use.

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
| `src/App.jsx` | sign-in, then the shell: menu and the current page, inside the store for that login |
| `src/pages/` | Login, Counter (billing, returns, exchanges), Quotations, Sales, CashClose, Inventory, PurchaseOrders, Dashboard, Logins, Settings |
| `src/components/` | Sidebar, ScanBar, BillTable, OrderPanel, PaymentDialog, DoneDialog, HeldDialog, QuotePickerDialog, ReturnDialog, OrderEditor, CountInDialog, SendBackDialog, SellThrough, CashDifferences, Receipt, CreditNotePrint, QuotationPrint and more |
| `src/context/StoreContext.jsx` | every record from the API, kept fresh, and every change sent to it |
| `src/lib/api.js`, `auth.js`, `uid.js` | calls to the API with the login token, file downloads, sign-in (and the demo's), ids for retries |
| `src/lib/bill.js`, `orders.js`, `reports.js`, `stockLog.js`, `cash.js` | bill totals and numbers, purchase-order statuses, report figures, the inventory history, cash differences |
| `src/styles/index.css` | the Tailwind theme, and the print rules for the bill, credit note and quotation |

## Not done yet

- HSN codes are almost all blank in the product data, and the receipt doesn't print them yet.
- No bill discount, direct transfers between showrooms (they go through the admin: send back, then a purchase order), or editing of product prices in the app.
- UPI is confirmed by hand. There is no QR code or payment-gateway check.
- The counter needs the server to save a bill: there is no offline queue yet.
