import { activeLocations, SELLER } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { CONTENT_WIDTH } from '../lib/docPages.js';
import { QUOTE_COLOURS } from '../lib/quoteColour.js';
import CreditNotePrint from './CreditNotePrint.jsx';
import { InvoiceDocument } from './InvoicePrint.jsx';
import { OrderDocument } from './OrderPrint.jsx';
import PaymentReceiptPrint from './PaymentReceiptPrint.jsx';
import { QuotationDocument } from './QuotationPrint.jsx';
import { A4Bill, ThermalReceipt } from './Receipt.jsx';
import { ReturnDocument } from './ReturnPrint.jsx';

// Made-up documents for the previews on Settings → Documents: the season's own products, the first showroom (Chennai
// Egmore) and its customers, and the figures worked out the way each document works them out.
const paise = (n) => Math.round(n * 100) / 100;
const AT = '2026-12-12T10:41:00+05:30';

const PRODUCTS = [
  {
    code: 'MS26025',
    name: '10CM GLITTER BALL, 2PCS/PET BOX,ONE COLOR PER BOX, 2 COLORS ASSORTED IN CARTON: GOLD, RED BARCODE:',
    rate: 83.03,
    mrp: 280,
    price: 220,
  },
  { code: 'FD26055', name: 'VELVET SIGNATURE STOCKING', rate: 46.27, mrp: 160, price: 160 },
  { code: 'SR26056', name: 'WINTER LAMP, WARM WHITE, BATTERY OPERATED', rate: 163.16, mrp: 650, price: 520 },
  { code: 'SR26010', name: 'WINTER SANTA 30CM', rate: 352.98, mrp: 1250, price: 1250 },
  { code: 'FD26108', name: 'WONDERLAND PINE', rate: 53.67, mrp: 190, price: 170 },
];
const HSN = '95051000';

const INVOICE_LINES = PRODUCTS.map((p, i) => {
  const qty = [10, 24, 12, 6, 20][i];
  const amount = paise(qty * p.rate);
  return { code: p.code, name: p.name, hsn: HSN, qty, cost: p.rate, rate: p.rate, amount, gst: 18, tax: paise(amount * 0.18) };
});
const INVOICE = {
  number: 'ICC000009',
  status: 'raised',
  createdAt: AT,
  interState: false,
  note: '',
  ewayNo: '',
  sellerAddress: SELLER.addresses[0].text,
  lines: INVOICE_LINES,
  total: Math.round(INVOICE_LINES.reduce((s, l) => s + l.amount + l.tax, 0)),
};
const BUYER = {
  name: 'SIANNA COLLECTION',
  address: 'New No. 54, Old No. 18, Casa Major Road,\nEgmore, Chennai – 600 008',
  phone: '9751665555',
  gstin: '33AFUPE5958A1ZF',
  state: '33',
};

/** A customer's bill: the lines and their totals as lib/bill.js works them out (prices include GST at 18%). */
const billOf = (picks, discountPct = 0) => {
  const lines = picks.map(([i, qty]) => ({ code: PRODUCTS[i].code, name: PRODUCTS[i].name, qty, mrp: PRODUCTS[i].mrp, price: PRODUCTS[i].price }));
  const mrpTotal = lines.reduce((s, l) => s + l.mrp * l.qty, 0);
  const gross = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const discount = paise((gross * discountPct) / 100);
  const exact = gross - discount;
  const payable = Math.round(exact);
  const taxable = paise(payable / 1.18);
  return {
    lines,
    totals: {
      count: lines.length,
      qty: lines.reduce((s, l) => s + l.qty, 0),
      mrpTotal,
      savings: mrpTotal - gross,
      discount,
      discountKind: discountPct ? 'percent' : null,
      discountValue: discountPct,
      roundOff: paise(payable - exact),
      payable,
      taxable,
      gstRows: [{ rate: 18, taxable, tax: paise(payable - taxable) }],
    },
  };
};

const SALE = {
  billNo: 'CHN262700001',
  at: AT,
  name: 'Priya Raman',
  phone: '9876543210',
  ...billOf(
    [
      [0, 2],
      [1, 1],
      [2, 1],
    ],
    5,
  ),
};
SALE.payment = { method: 'cash', received: Math.ceil(SALE.totals.payable / 100) * 100, credit: 0, later: 0 };
SALE.payment.change = SALE.payment.received - SALE.totals.payable;

const QUOTE = {
  quoteNo: 'QT-CHN262700012',
  at: AT,
  validUntil: '2026-12-24T23:59:00+05:30',
  name: 'Anand Krishnan',
  company: 'Brightlights Events',
  phone: '9840012345',
  by: 'Chennai Egmore',
  note: 'Deliver to the hall before the 20th.',
  ...billOf([
    [3, 4],
    [2, 6],
    [4, 10],
  ]),
};

const ORDER = {
  number: 'PO-CHN-0007',
  status: 'requested',
  createdAt: AT,
  note: 'Running low on stockings before the weekend.',
  lines: [1, 2, 4].map((i, n) => ({ code: PRODUCTS[i].code, name: PRODUCTS[i].name, qty: [48, 12, 30][n], rate: PRODUCTS[i].rate })),
};

// a purchase return at the end of the season: one product sent back in part, one kept entirely; D.Rate, no GST
const RETURN_LINES = [
  [0, 18, 18],
  [1, 30, 24],
  [3, 5, 5],
].map(([i, held, qty]) => ({
  code: PRODUCTS[i].code,
  name: PRODUCTS[i].name,
  hsn: HSN,
  qty,
  held,
  rate: PRODUCTS[i].rate,
  amount: paise(qty * PRODUCTS[i].rate),
}));
const RETURN = {
  number: 'PR-CHN-0001',
  status: 'sent',
  reason: 'end-of-season',
  createdAt: '2027-01-10T11:00:00+05:30',
  note: 'Six stockings sold over the counter after the count.',
  lines: RETURN_LINES,
  kept: [{ code: PRODUCTS[4].code, name: PRODUCTS[4].name, qty: 4, rate: PRODUCTS[4].rate, amount: paise(4 * PRODUCTS[4].rate) }],
  subtotal: paise(RETURN_LINES.reduce((s, l) => s + l.amount, 0)),
  lrNo: 'LR 4471',
  vehicleNo: 'TN01AB1234',
  cartons: 3,
  ewayNo: '331012345678',
  history: [],
};

const NOTE = {
  returnNo: 'CN-CHN262700003',
  at: '2026-12-14T17:20:00+05:30',
  billNo: SALE.billNo,
  name: SALE.name,
  phone: SALE.phone,
  kind: 'return',
  lines: [{ code: PRODUCTS[0].code, name: PRODUCTS[0].name, qty: 1, price: PRODUCTS[0].price }],
  amount: PRODUCTS[0].price,
  refund: PRODUCTS[0].price,
  reason: 'Wrong colour',
};

const CREDIT_SALE = { billNo: 'CHN262700015', at: '2026-12-10T12:05:00+05:30', name: QUOTE.name, phone: QUOTE.phone, ...billOf([[3, 3]]) };
const COLLECTION = {
  receiptNo: 'RC-CHN262700001',
  at: '2026-12-15T16:30:00+05:30',
  amount: 2000,
  by: 'Chennai Egmore',
  payment: { method: 'upi', received: 2000, before: CREDIT_SALE.totals.payable, after: CREDIT_SALE.totals.payable - 2000 },
};

/**
 * A sample of a document of `kind` (lib/docLook.js DOC_KINDS) in `look` (the admin's choice for it when not given),
 * shown on screen as it prints, for Settings: an A4 document at its printed width on white (scale it to fit), a
 * thermal slip at 72mm. `colour` is the A4 colours (Evergreen unless given; the A4 bill is always black and white).
 * `location` is the showroom the sample is from (the first one unless given). On a bill (thermalBill, bill), `shop`
 * ({ storeName, storeAddress, storePhone, gstin, composition }, as in settings) stands in for that showroom's saved
 * details, a blank field falling back to its built-in ones: Settings → Shop on the bill shows the details being typed.
 */
const DocSample = ({ kind, look, colour = QUOTE_COLOURS[0], location: at, shop }) => {
  const { settings } = useStore();
  const location = at ?? activeLocations()[0]?.id ?? 'chennai';
  const a4 = (doc) => (
    <div className="bg-white" style={{ width: CONTENT_WIDTH }}>
      {doc}
    </div>
  );
  const slip = (doc) => <div className="inline-block bg-white p-[4mm]">{doc}</div>;

  switch (kind) {
    case 'invoice':
      return a4(<InvoiceDocument invoice={INVOICE} seller={settings} buyer={BUYER} colour={colour} look={look} />);
    case 'purchaseOrder':
      return a4(<OrderDocument doc={{ ...ORDER, location }} colour={colour} look={look} />);
    case 'purchaseReturn':
      return a4(<ReturnDocument doc={{ ...RETURN, location }} seller={settings} colour={colour} look={look} />);
    case 'quotation':
      return a4(<QuotationDocument quote={{ ...QUOTE, location }} colour={colour} look={look} />);
    case 'bill':
      return a4(<A4Bill sale={{ ...SALE, location }} look={look} own={shop} screen />);
    case 'thermalBill':
      return slip(<ThermalReceipt sale={{ ...SALE, location }} look={look} own={shop} screen />);
    case 'creditNote':
      return slip(<CreditNotePrint note={{ ...NOTE, location }} look={look} screen />);
    case 'paymentReceipt':
      return slip(<PaymentReceiptPrint sale={{ ...CREDIT_SALE, location }} collection={COLLECTION} look={look} screen />);
    default:
      return null;
  }
};

export default DocSample;
