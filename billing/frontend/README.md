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
| Chennai (Egmore), Palavakkam (Chennai), Cochin, Mumbai, Pune | `chennai@2026`, `palavakkam@2026`, `cochin@2026`, `mumbai@2026`, `pune@2026` | Billing, returns, its own sales, inventory, purchase orders and cash close |
| Admin | `admin@2026` | Dashboard, all sales with purchase cost and profit, every showroom's inventory, all purchase orders, every cash close |

Each store bills under its own business (Sianna Collection for both Chennai stores, Christmas Celebrations in Cochin, Christmas Mart in Mumbai, Sparkel Christmas in Pune), with its address, phone and GSTIN built in (`src/config.js`); a store's **Settings → Shop on the bill** can change any of them. The admin is Tree Classics Trader, the seller on every tax invoice to a store. The first list's Bengaluru and Goa are gone: on the server, `python -m app.cli seed` adds the new stores and takes those two off.

Logins are checked by the billing API (`billing/backend`), which keeps the passwords hashed. The admin can set a new password for any login, or put it back to the default, under **Logins**; it works on every computer straight away. Showroom logins cannot change passwords.

## Demo

The **Demo** switch at the top right of the sign-in screen shows the same five showrooms and the admin. One click signs in, with no password, to the **demo**: its own copy of everything (a separate schema in the database) with the same showrooms, logins and product list, and the season's quantities in the admin's own stock (from `billing/backend/seed/admin-stock-2026.xlsx`), and nothing else: no showroom stock, sales, customers, orders or quotations, so every workflow can be tried from its first step. Nothing done in the demo touches the real data, and the menu shows a DEMO tag. The demo admin can start it again from scratch under **Settings → Demo data → Reset demo**. On the server it is built by `python -m app.cli demo` (and by `seed` the first time).

## Quotations

**Quotations** (under Selling) work like the billing counter but end in a saved quotation instead of a payment. A quotation never changes stock or the sales figures. It is numbered per showroom (`QT-CHN/26-27/00001`), needs the customer's name and mobile number, the date it is valid until (25 December unless another is picked) and an optional note. A product's photo (the **Add photo** box beside it, click or drop a picture) prints with it. It comes out on A4 with a large diagonal QUOTATION watermark, "NOT A BILL · NOT A TAX INVOICE", and a boxed notice that no payment is to be made against it, in evergreen, red, gold, navy or black and white (picked on the preview, remembered per computer). **Preview** shows it page by page, a new one before it is saved too; from there it can be printed, downloaded as a PDF or shared (a phone's share sheet: WhatsApp, mail…). **Bill this** loads a saved quotation's items into the billing counter when the customer buys. The admin sees every showroom's quotations (under Reports) and, in **Settings**, can turn printing, downloading and sharing quotations on or off. An invoice has a **Preview** too, with the same print, download and share, and its own colour choice (Evergreen unless another is picked). A long quotation or invoice runs on over pages, its table heading repeated on each.

## The season list

Which products are "Season 2026" starts from the product Excel. The admin can change it in Inventory: the **In season** tick box on each row (use "All products" and search to find older products). Changes are kept on top of the Excel's list, so billing search, the season filter, purchase-order suggestions and low-stock all follow them.

## How stock moves

**Admin stock.** The admin has its own stock (the warehouse), next to the five showrooms. In Inventory, choose **Admin stock**, or **Everywhere** to see it as the first column. The admin adds to it from an Excel (**Import stock**, which goes to Admin stock by default) or by hand (**+ Add stock** on a product's row when Admin stock is chosen), for any product. Stock the showrooms send back goes into it when the admin counts it in. **Invoices come out of it:** when the admin raises one, its products leave the admin stock. An invoice can't hold more than the admin has; the purchase order review and the invoice both mark anything short. The history shows "Sent to showroom" and "Returned by showroom".

Stock goes up through a **purchase order** or an **Excel stock import**, and only goes down through a **sale**.

1. **Showroom requests stock** (Purchase orders → Request stock). Products can be searched or scanned, added with **Add low stock** (season products at 5 units or fewer, topped up to 10), or imported from an Excel. The request goes to the admin.
2. **Admin reviews** (Purchase orders → To review → **Review**). The list opens to edit first: change quantities, add or remove products, or import an Excel, with the showroom's stock and the **Admin stock** beside each line (anything more than the admin holds is marked). **Save review** keeps the changes on the order for later; **Raise invoice** saves them and opens a new invoice with those products already on it. Changes are kept in the order's history as "Reviewed and changed", with the admin's note. Or the request is rejected with a reason. Only showrooms raise orders; the admin reviews them.
3. **The invoice brings the stock** (Invoices): once it is raised the products leave the admin stock, and once it is paid the admin adds them to the showroom's stock.
4. **Billing** takes sold items off that showroom's stock. The counter shows stock on every line and warns when a bill goes beyond what is in stock, but still lets it through.

**A showroom's own products** (items without a barcode, coded `CHN-0001`…, added with Inventory → New product) get their stock from the showroom itself: the units in the shop when the product is added, and later **+ Add stock** on the product's row in Inventory whenever more come in. This works only for that showroom's own products; catalogue products come in through purchase orders or an Excel import. It shows in the history as "Added by hand".

**Excel stock import** (Inventory → Import stock) adds stock straight from a sheet, for opening stock or goods that came without a purchase order. It uses the same Excel format as purchases. A showroom imports into its own stock; the admin picks the showroom. The window shows each product's stock now and after, and nothing changes until it is confirmed.

**Shop products** (Inventory → New product) are for items without a barcode. The showroom enters the name, category, MRP, offer and cost price, GST and HSN, and the code is made from its bill prefix and a running number (`CHN-0001`, `PLK-0001`…), so two showrooms never create the same code. Units already in the shop can be entered too, and show in the history as "New product". The product can then be billed by typing its code, and found in search, purchase orders and imports. "Shop-added" in Inventory lists them, with who added each.

**History** (Inventory → History) is the audit trail of stock coming in: every import and every purchase order counted in, with when, which showroom, who added it, and the file or order number. Each entry opens to list its products. The admin sees all showrooms; a showroom sees its own. Imported units are counted in the Received column.

The menu shows a red badge when something needs doing: requests to review for the admin, deliveries to count in for a showroom.

**Purchase Excel format:** one row per product, with a `Code` column and a `Qty` column, plus an optional `Purchase rate` (or `Rate` / `Cost`). If there is no rate, the product's cost price is used. The header row is found by name, so a title row above it, extra columns or a different column order are fine. A code that appears twice is added up. Unknown codes and bad quantities are listed and skipped. It must be an `.xlsx` file: re-save old `.xls` files from Excel.

- `public/purchase-template.xlsx` is a blank template (also linked from the app). `public/invoice-template.xlsx` is the same for the admin's invoices (Code, Product name, Qty), and `public/box-template.xlsx` for packing lists.
- `billing/backend/seed/sample-purchase-2026.xlsx` is a sample with 25 of the season's products, for testing.
- `billing/backend/seed/opening-stock-2026/` has one sample opening-stock file per showroom (60 of the season's products each). Import each in Inventory → Import stock, choosing that showroom.

## Returns and exchanges

At the counter, **Return / exchange** finds the original bill (scan or type the bill number, or search by mobile or name). Pick what comes back. Only items on that bill, and not returned already, can come back, within the admin's return window (**Settings**: off, 7, 15 or 30 days; 15 by default).

- **Refund:** the items go back into stock and their value is **refunded in cash**, whatever the bill was paid with. A UPI or card payment is refunded in cash too. A **credit note** (`CN-CHN/26-27/00001`) is saved and can be printed (black and white, 80mm) for the customer to sign.
- **Exchange:** the returned value becomes a credit on the bill at the counter. Scan what the customer takes instead and collect as usual: the credit comes off first. If the new bill is bigger, the customer pays the rest by any method; if it is smaller, the difference is refunded in cash. The return and the new bill are saved together, and the receipt shows the credit note number.

The refunded value is the price paid on the original bill, rounded to the rupee. Sales show **Returns** and **net sales**; the cash close counts cash refunds.

## Cash close

Each showroom closes its day under **Cash close**. It counts the drawer note by note (or types the total), confirms the opening float (filled in from what was kept at the last close) and how much stays in the drawer for tomorrow. The server works out what should be there:

  expected = opening float + cash from bills (cash, and the cash part of split payments) − cash refunds
  difference = counted − expected (below 0: short, above 0: over)

A note is asked for when it doesn't balance. The admin's **Cash check** has a period picker (today, 7 days, 30 days, all time). It shows the period's short and over totals and which showrooms haven't closed today. **Showrooms compared** puts all five side by side: total sales as a bar to one scale with the cash part in green, cash sales and their share, UPI and card, cash refunds, short, over, net, and how many closed days didn't balance. Below that, every close with its difference. The bottom of the dashboard shows the last week's days that didn't balance.

## Purchase returns

**Purchase returns** (under Stock in the menu, like Purchase orders) is how stock goes back from a showroom, and it **only goes to the admin**: what's left at the end of the season, items another showroom needs, or damaged goods. The showroom picks the products and units (it can't send more than it has) and a reason. The units **leave its stock when it sends them**. The admin sees them under **To receive** (with a count on the menu) and **counts them in** when they arrive; any shortfall is kept on the return with a note. Each return is numbered `PR-CHN-0001`, keeps its history, and shows in the inventory history as "Purchase return".

## Invoices and e-way bills

**Invoices** (admin, under Stock) bill a showroom for the boxes and products sent to it, as Tree Classics Trader, numbered `ICC000008` onwards (ICC000004 to ICC000007 were issued before the app and brought in as printed). The admin picks the address it is from (the Manali warehouse or the Madhavaram registered office) on each one. The new-invoice window fills the screen: the showroom and the scan box at the top, with **Import Excel** beside them (the purchase Excel format: a `Code` and a `Qty` column; **Template** downloads `public/invoice-template.xlsx`), and everything on the invoice listed right under them, the product added last on top and marked, with its admin stock, quantity and price. The warehouse boxes, the showroom's details, the address it is from and the note are in the column beside it. **E-way bills** are made by hand on the GST portal (ewaybillgst.gov.in) before the goods leave; from the moment an invoice is raised its e-way bill number and PDF can be recorded on it. The Invoices list (all invoices by default) has on each row the **Invoice** to preview and the **E-way bill** to view, or **Attach e-way bill** where it is still missing.

## Product performance and the sales report

**Product performance** (on Sales and on the admin's Dashboard) shows one bar per product, season to date: the green part is units sold, the grey part units still in stock, with the numbers and the share sold. Sort by most sold, slowest or most left, and search by code or name. It follows the showroom picker: one showroom, or all five added together. Returned units count as back in stock. **Export to Excel** downloads the sales report for the chosen period and showroom from the server: a summary per showroom (with cost, profit and margin for the admin), every bill with how it was paid, every item, the returns and the cash closes.

## Customers

**Customers** (under Selling for a showroom, Reports for the admin) lists everyone who has bought, from the bills: one customer per mobile number, with the name from their latest bill. For each: bills, amount spent, returns, net, average bill, first and last visit, a **Repeat** tag for those who came back, and, for the admin, the showrooms they bought at. Sort by top spenders, most recent or most visits; search by name or mobile. Open a customer to see every bill with its items, and anything they brought back. A showroom sees its own customers; the admin sees everyone, or one showroom's.

## Printing

The bill and the credit note print on the 80mm thermal (POS) roll, 72mm wide and only as long as the bill (the page length is measured just before printing, in `src/lib/print.js`), **black and white only**, and every bill ends with a Christmas wish. The same bill always gets the same wish. A quotation prints on A4, in the colours picked on its preview, with a QUOTATION watermark. If it is sent to the narrow receipt printer, it prints only "QUOTATION · NOT A BILL · print this on A4", so it can never pass for a bill. **Quotation** at the counter loads a saved quotation into the bill (at today's prices) when the customer buys.

## Data

Everything comes from the billing API (`VITE_API_URL`, see `.env.example`; default `http://localhost:8000/api/v1`): logins, the catalogue, sales, returns, stock, purchase orders, quotations, purchase returns, cash closes and the admin's settings. It is the same on every computer. `src/context/StoreContext.jsx` loads it all after sign-in, refreshes it every 30 seconds and when the window comes back into focus, and sends every change to the server first. Bill, quotation, credit-note and order numbers are given by the server; the number shown while billing is the next one it will most likely give.

Only what belongs to one counter stays in the browser: `billing-current-<showroom>` (the bill in progress), `billing-held-<showroom>` (held bills), `billing-quote-<showroom>` (the quotation being written), `billing-session` and `billing-token` (who is signed in), and `billing-settings` (the last settings seen, so the theme is right before the server answers). The demo keeps its own (`billing-demo-…`).

A bill, return or import carries an id made at the counter, so if the connection drops and it is sent again, the server saves it once. If the server can't be reached, the bill stays on the counter with a message, and Collect can be pressed again.

- **Showrooms** (address, phone, GSTIN, UPI ID, bill prefix) are in `src/config.js`. GSTIN and UPI ID are blank and must be filled in before real use.

## Figures

- **Show GST** (admin's Settings, on by default): when off, GST isn't shown anywhere: no GST summary, taxable value or GSTIN on bills, credit notes and quotations (the bill is headed INVOICE), nothing at the counter or in payment, no GST figures on Sales, the Dashboard or the Excel report, and the new-product form doesn't ask for the rate. Prices are the selling price, unchanged, and gross profit is the selling price less purchase cost. For shops that handle GST outside this app.

- Prices are treated as GST-inclusive (`PRICES_INCLUDE_GST` in `src/config.js`). GST is taken out and split into CGST + SGST.
- **Purchase cost** is each product's cost price (the old system's D.Rate), captured on the bill when it was sold. **Gross profit** = sales without GST − purchase cost, which assumes cost prices are also without GST. **Margin** = gross profit ÷ sales without GST.

## Using it at the counter

- **Scanner:** a USB barcode scanner types the code and presses Enter, so the scan box needs focus. It has focus on load, after every sale, and whenever F2 is pressed.
- **Shortcuts:** F2 scan, F4 customer, F8 hold, F9 held bills, F12 pay, Esc closes a dialog, Enter completes the sale and then starts the next bill. F12 opens developer tools in a normal Chrome or Edge window, so run the counter in kiosk or app mode.
- **Customer:** a mobile number and a name are required on every bill.
- **Older seasons:** every product in the list can be billed, whatever its season. Leftover stock from earlier years scans and bills as usual; the note just says it is from an earlier season.
- **Not in the list:** when a scanned barcode or typed name finds nothing, the scan box offers **Add as new product**. The New product screen opens with the barcode (or name) already filled in. Once saved, the product goes onto the bill, and its barcode scans from then on.
- **Printing:** only the 80mm receipt prints. Set the thermal printer as the default and turn off headers and footers in the print dialog; `--kiosk-printing` skips the dialog.
- **Menu:** **Collapse** shrinks it to icons (remembered per computer). On small screens it opens from the ☰ button.

## Code map

| Path | What it is |
|---|---|
| `src/App.jsx` | sign-in, then the shell: menu and the current page, inside the store for that login |
| `src/pages/` | Login, Counter (billing, returns, exchanges), Quotations, Sales, CashClose, Inventory, PurchaseOrders, Dashboard, Logins, Settings |
| `src/components/` | Sidebar, ScanBar, BillTable, OrderPanel, PaymentDialog, DoneDialog, HeldDialog, QuotePickerDialog, ReturnDialog, OrderEditor, CountInDialog, SendBackDialog, ProductPerformance, CashDifferences, Receipt, CreditNotePrint, QuotationPrint and more |
| `src/context/StoreContext.jsx` | every record from the API, kept fresh, and every change sent to it |
| `src/lib/api.js`, `auth.js`, `uid.js` | calls to the API with the login token, file downloads, sign-in (and the demo's), ids for retries |
| `src/lib/bill.js`, `orders.js`, `reports.js`, `stockLog.js`, `cash.js` | bill totals and numbers, purchase-order statuses, report figures, the inventory history, cash differences |
| `src/styles/index.css` | the Tailwind theme, and the print rules for the bill, credit note and quotation |

## Not done yet

- HSN codes are almost all blank in the product data, and the receipt doesn't print them yet.
- No bill discount, direct transfers between showrooms (they go through the admin: send back, then a purchase order), or editing of product prices in the app.
- UPI is confirmed by hand. There is no QR code or payment-gateway check.
- The counter needs the server to save a bill: there is no offline queue yet.
