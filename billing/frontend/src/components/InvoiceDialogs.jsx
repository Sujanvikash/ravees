import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Eye, FileText, Minus, PackageCheck, Pencil, Plus, Printer, ScanBarcode, Search, Upload, X } from 'lucide-react';
import { activeLocations, locationById, SELLER, WAREHOUSE } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { useScanner } from '../hooks/useScanner.js';
import { api } from '../lib/api.js';
import { boxUnits, findBox } from '../lib/boxes.js';
import { findProduct, searchProducts } from '../lib/catalogue.js';
import { GST_STATES, sellerState, stateName, stateOfGstin } from '../lib/gst.js';
import { invoiceLine, STATUS, storeBuyer } from '../lib/invoices.js';
import { inr } from '../lib/money.js';
import Dialog from './Dialog.jsx';

const MAX_PDF = 2 * 1024 * 1024;

const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const ACTION = {
  raised: 'Invoice raised',
  documents: 'E-way bill recorded',
  paid: 'Marked paid',
  stocked: 'Added to store stock',
  cancelled: 'Cancelled',
};

const field =
  'h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm transition-shadow placeholder:text-ink-3 focus:border-evergreen-800/50 focus:shadow-[0_0_0_3px_rgba(23,92,38,0.10)]';
const primary =
  'inline-flex h-10 items-center gap-2 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white hover:bg-evergreen-900 disabled:bg-line disabled:text-ink-3';
const secondary =
  'inline-flex h-10 items-center gap-2 rounded-xl border border-evergreen-800/25 bg-white px-4 text-[13px] font-semibold text-evergreen-900 hover:border-evergreen-800/50 hover:bg-evergreen-50 disabled:opacity-50';
const quiet = 'inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink';

/** The products of some boxes and single products added together, priced as the server will:
 *  [{ code, name, qty, cost, rate, amount, gst, tax }]. */
const linesOf = (boxes, singles) => {
  const sum = new Map();
  const add = (l) => sum.set(l.code, { code: l.code, name: l.name, qty: (sum.get(l.code)?.qty ?? 0) + l.qty });
  for (const b of boxes) b.lines.forEach(add);
  singles.forEach(add);
  return [...sum.values()].map((l) => invoiceLine(l, findProduct(l.code)));
};

const Notice = ({ tone = 'warn', children }) => (
  <p role={tone === 'warn' ? 'alert' : 'status'} className={`animate-pop rounded-xl px-4 py-2.5 text-[13px] font-medium ${tone === 'warn' ? 'bg-ruby-50 text-ruby-ink' : 'bg-ok-50 text-ok-ink'}`}>
    {children}
  </p>
);

/** The lines of an invoice: each product at its cost price (D.Rate) with its GST on top, and the totals under them.
 *  Invoices raised before GST was added this way have no GST on their lines (their rate was cost + 18%). */
const LinesTable = ({ lines, total }) => {
  const taxable = lines.reduce((s, l) => s + l.amount, 0);
  const tax = lines.reduce((s, l) => s + (l.tax ?? 0), 0);
  const sum = total ?? taxable + tax;
  return (
    <div className="overflow-hidden rounded-xl border border-line-soft">
      <div className="max-h-[36vh] overflow-auto">
        <table className="w-full min-w-[38rem] text-[13px] tabular-nums">
          <thead className="sticky top-0 bg-mist-2 text-left text-xs text-ink-3">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Product</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Qty</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Rate (D.Rate)</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Amount</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">GST</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.code} className="border-t border-line-soft">
                <td className="px-3 py-1.5">
                  <span className="mr-2 rounded-md bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{l.code}</span>
                  {l.name}
                </td>
                <td className="px-3 py-1.5 text-right">{l.qty}</td>
                <td className="px-3 py-1.5 text-right text-ink-2">{inr(l.rate)}</td>
                <td className="px-3 py-1.5 text-right">{inr(l.amount)}</td>
                <td className="px-3 py-1.5 text-right text-ink-2">{l.gst == null ? '—' : `${l.gst}% · ${inr(l.tax)}`}</td>
                <td className="px-3 py-1.5 text-right font-medium">{inr(l.amount + (l.tax ?? 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-1 border-t border-line-soft bg-surface px-3 py-2 text-[13px] tabular-nums">
        <div className="flex justify-between text-ink-2">
          <span>Taxable value (D.Rate)</span>
          <span>{inr(taxable)}</span>
        </div>
        <div className="flex justify-between text-ink-2">
          <span>GST</span>
          <span>{inr(tax)}</span>
        </div>
        {Math.abs(sum - taxable - tax) >= 0.005 && (
          <div className="flex justify-between text-ink-2">
            <span>Round off</span>
            <span>{inr(sum - taxable - tax)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-line-soft pt-1 font-semibold">
          <span>Total</span>
          <span>{inr(sum)}</span>
        </div>
      </div>
    </div>
  );
};

/** The single products on an invoice: its lines less what its boxes hold. */
const singlesOf = (invoice, boxes) => {
  const inBoxes = new Map();
  for (const b of boxes) if (invoice.boxIds.includes(b.id)) for (const l of b.lines) inBoxes.set(l.code, (inBoxes.get(l.code) ?? 0) + l.qty);
  return invoice.lines.map((l) => ({ code: l.code, name: l.name, qty: l.qty - (inBoxes.get(l.code) ?? 0) })).filter((l) => l.qty > 0);
};

/**
 * A new invoice, or changes to one not paid yet (`invoice`). Choose the showroom and check its details as the invoice
 * will name it: filled in from its Settings, and anything changed here can be saved back as its own. Then scan what
 * goes to it: box labels (or tick the boxes) and single products' barcodes (or search them by code or name). Every
 * product is billed at its cost price (D.Rate) with 18% GST on top: CGST + SGST to a showroom in Tamil Nadu, IGST to
 * any other state. It all leaves the admin's stock when the invoice is raised (an edit changes it by the difference),
 * and reaches the showroom's stock only when the invoice is paid and the admin adds it. `order` is a showroom's
 * request a new invoice fulfils, if it comes from one: its lines, as the admin reviewed them, start on the invoice as
 * single products.
 */
export const InvoiceEditor = ({ order, invoice, onClose, onDone }) => {
  const { boxes, saveInvoice, updateInvoice, stockOf, settings } = useStore();
  const editing = Boolean(invoice);
  const [location, setLocation] = useState(invoice?.location ?? order?.location ?? '');
  const [buyer, setBuyer] = useState(invoice?.buyer ?? null); // { name, address, phone, gstin, state } once loaded
  const [keep, setKeep] = useState(false); // also save the details as the showroom's own
  const [picked, setPicked] = useState(() => new Set(invoice?.boxIds ?? []));
  const [singles, setSingles] = useState(() => (invoice ? singlesOf(invoice, boxes) : (order?.lines ?? []).map(({ code, name, qty }) => ({ code, name, qty })))); // [{ code, name, qty }]
  const [query, setQuery] = useState('');
  const [scan, setScan] = useState('');
  const [note, setNote] = useState(invoice?.note ?? '');
  const [from, setFrom] = useState(invoice?.sellerAddress || SELLER.addresses[0].text); // the admin's address it is from
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [detailsOf, setDetailsOf] = useState(invoice?.buyer ? invoice.location : null); // whose details are in the form

  // choosing a showroom fills in its details (an invoice being edited keeps its own until the showroom changes)
  useEffect(() => {
    if (!location || detailsOf === location) return undefined;
    let live = true;
    storeBuyer(location).then((details) => {
      if (!live) return;
      setDetailsOf(location);
      setBuyer(details);
      setKeep(false);
    });
    return () => {
      live = false;
    };
  }, [location, detailsOf]);

  const shop = locationById(location);
  const city = shop?.city ?? 'the showroom';
  const home = sellerState(settings);
  const gstinState = stateOfGstin(buyer?.gstin);
  const ready = Boolean(buyer) && detailsOf === location;

  const free = useMemo(() => boxes.filter((b) => b.status === 'in_stock' || (editing && b.invoiceId === invoice.id)), [boxes, editing, invoice]);
  const q = query.trim().toLowerCase();
  const shown = free.filter((b) => !q || `${b.boxNo} ${b.stockNo} ${b.shipment} ${b.lines.map((l) => l.code).join(' ')}`.toLowerCase().includes(q));
  const chosen = free.filter((b) => picked.has(b.id));
  const lines = useMemo(() => linesOf(chosen, singles), [chosen, singles]);
  // what the admin can put on it: its stock, plus what this invoice already holds (an edit gives that back first)
  const had = useMemo(() => new Map((invoice?.lines ?? []).map((l) => [l.code, l.qty])), [invoice]);
  const available = (code) => stockOf(WAREHOUSE.id, code) + (had.get(code) ?? 0);
  const short = lines.filter((l) => l.qty > available(l.code));
  // a showroom's own products (p.shop) never come from the admin
  const matches = useMemo(() => searchProducts(scan, { limit: 12 }).filter((p) => !p.shop).slice(0, 6), [scan]);

  const setField = (name, value) =>
    setBuyer((b) => {
      const next = { ...b, [name]: value };
      if (name === 'gstin' && stateOfGstin(value)) next.state = stateOfGstin(value); // a GSTIN says its state
      return next;
    });

  const toggle = (id) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const setQty = (code, qty) => setSingles((s) => (qty > 0 ? s.map((l) => (l.code === code ? { ...l, qty } : l)) : s.filter((l) => l.code !== code)));

  const addSingle = (product, qty = 1) => {
    const now = (singles.find((l) => l.code === product.code)?.qty ?? 0) + qty;
    setSingles((s) =>
      s.some((l) => l.code === product.code)
        ? s.map((l) => (l.code === product.code ? { ...l, qty: l.qty + qty } : l))
        : [...s, { code: product.code, name: product.name, qty }],
    );
    setNotice({ tone: 'ok', text: `${product.code} · ${product.name}: ${now} on this invoice, ${available(product.code)} in the admin stock.` });
  };

  // A box label first, then a product's barcode or code; a typed name adds the first product it finds.
  const onScan = (code, typed = false) => {
    setScan('');
    const box = findBox(boxes, code);
    if (box) {
      const ours = editing && box.invoiceId === invoice.id;
      if (box.status !== 'in_stock' && !ours) return setNotice({ tone: 'warn', text: `Box ${box.boxNo} is not in the warehouse any more (${STATUS_OF_BOX[box.status]}).` });
      if (picked.has(box.id)) return setNotice({ tone: 'warn', text: `Box ${box.boxNo} is already on this invoice.` });
      setPicked((s) => new Set(s).add(box.id));
      return setNotice({ tone: 'ok', text: `Box ${box.boxNo} added: ${boxUnits(box.lines)} units.` });
    }
    const product = findProduct(code) ?? (typed ? matches[0] : undefined);
    if (!product) return setNotice({ tone: 'warn', text: `No box or product “${code.trim()}”.` });
    if (product.shop) return setNotice({ tone: 'warn', text: `${product.code} is a showroom’s own product; it doesn’t come from the admin.` });
    addSingle(product);
  };
  useScanner(onScan, true);

  const save = async () => {
    if (!location) return setError('Choose the showroom this invoice is for.');
    if (!ready || !buyer.name.trim()) return setError(`Enter ${city}’s name as the invoice should show it.`);
    if (!buyer.state) return setError(`Choose ${city}’s state: it decides between IGST and CGST + SGST.`);
    if (!chosen.length && !singles.length) return setError('Scan a box or a product to put on this invoice.');
    setSaving(true);
    setError('');
    const details = { ...buyer, name: buyer.name.trim(), address: buyer.address.trim(), phone: buyer.phone.trim(), gstin: buyer.gstin.trim().toUpperCase() };
    const body = {
      location,
      buyer: details,
      boxIds: chosen.map((b) => b.id),
      lines: singles.map((l) => ({ code: l.code, qty: l.qty })),
      note: note.trim(),
      sellerAddress: from,
    };
    try {
      if (keep) {
        const own = { storeName: details.name, storeAddress: details.address, storePhone: details.phone, gstin: details.gstin };
        await api(`/settings?location=${encodeURIComponent(location)}`, { method: 'PATCH', body: own });
      }
      onDone(editing ? await updateInvoice(invoice.id, body) : await saveInvoice({ ...body, orderId: order?.id }));
    } catch (err) {
      setSaving(false);
      setError(err.message);
    }
  };

  // the addresses it can be from: the two built in, the one in Settings, and the one an older invoice already has
  const froms = [
    ...SELLER.addresses,
    { label: 'Business address in Settings', text: settings.bizAddress?.trim() },
    { label: 'As on this invoice', text: invoice?.sellerAddress?.trim() },
  ].filter((o, i, all) => o.text && all.findIndex((x) => x.text === o.text) === i);

  const supply = !buyer?.state
    ? { text: 'Choose the state', className: 'bg-mist text-ink-3' }
    : buyer.state === home
      ? { text: `Inside ${stateName(home)}: CGST + SGST`, className: 'bg-evergreen-50 text-evergreen-900' }
      : { text: `Inter-state to ${stateName(buyer.state)}: IGST`, className: 'bg-warn-50 text-warn-ink' };

  return (
    <Dialog
      id="invoice-editor"
      title={editing ? `Edit ${invoice.number}` : 'New invoice'}
      subtitle={
        editing
          ? 'Change the showroom’s details, the boxes or the products. The admin stock changes by the difference.'
          : order
            ? `For ${order.number}, requested by ${locationById(order.location)?.city}. The products as reviewed are on it: check them and raise it.`
            : 'Choose the showroom, then scan the boxes or single products that go to it.'
      }
      onClose={onClose}
      size="max-w-5xl"
    >
      <div className="flex flex-col gap-4 border-t border-line-soft px-6 pt-4 pb-5">
        <div className="grid gap-3 sm:grid-cols-[16rem_minmax(0,1fr)]">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">
            Showroom
            <select value={location} onChange={(e) => setLocation(e.target.value)} disabled={Boolean(order || invoice?.orderId)} className={field}>
              <option value="">Choose a showroom</option>
              {activeLocations().map((l) => (
                <option key={l.id} value={l.id}>
                  {l.city} · {l.area}
                </option>
              ))}
            </select>
          </label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (scan.trim()) onScan(scan, true);
            }}
            className="relative flex flex-col gap-1.5 text-[13px] font-medium"
          >
            <label htmlFor="invoice-scan">Scan a box or a product</label>
            <div className="flex h-10 items-center gap-2 rounded-xl border border-line px-3 focus-within:border-evergreen-800/50">
              <ScanBarcode size={16} className="text-ink-3" aria-hidden="true" />
              <input
                id="invoice-scan"
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                placeholder="Scan a box label or a product barcode, or type a code or name and press Enter"
                autoComplete="off"
                autoFocus
                className="min-w-0 flex-1 bg-transparent text-sm font-normal placeholder:text-ink-3"
              />
            </div>
            {matches.length > 0 && (
              <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-80 animate-pop overflow-y-auto rounded-xl border border-line bg-surface p-1 font-normal shadow-[0_16px_40px_-8px_rgba(9,9,11,0.18)]">
                {matches.map((p) => (
                  <li key={p.code}>
                    <button
                      type="button"
                      onClick={() => {
                        addSingle(p);
                        setScan('');
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] hover:bg-mist"
                    >
                      <span className="rounded-md bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{p.code}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                      <span className={`text-xs tabular-nums ${available(p.code) > 0 ? 'text-ink-3' : 'text-ruby-ink'}`}>{available(p.code)} in admin stock</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>
        </div>

        <fieldset className="flex flex-col gap-2 rounded-xl border border-line-soft p-4">
          <legend className="px-1 text-[13px] font-semibold">From: {settings.bizName?.trim() || SELLER.name}’s address on the invoice</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {froms.map((o) => (
              <label
                key={o.text}
                className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-[13px] ${from === o.text ? 'border-evergreen-800/50 bg-evergreen-50' : 'border-line hover:bg-mist'}`}
              >
                <input type="radio" name="invoice-from" checked={from === o.text} onChange={() => setFrom(o.text)} className="mt-0.5 size-4 shrink-0 accent-evergreen-800" />
                <span className="min-w-0">
                  <span className="block font-medium">{o.label}</span>
                  <span className="block text-xs whitespace-pre-line text-ink-3">{o.text}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {location && (
          <section aria-label={`${city} on the invoice`} className="flex flex-col gap-3 rounded-xl border border-line-soft p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold">Bill to: {city}’s details on the invoice</h3>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${supply.className}`}>{supply.text}</span>
            </div>
            {!ready ? (
              <p className="text-xs text-ink-3">Loading {city}’s details…</p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-[13px] font-medium">
                    Name on the invoice
                    <input value={buyer.name} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Spark Christmas" maxLength={120} className={field} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-[13px] font-medium">
                    GSTIN
                    <input
                      value={buyer.gstin}
                      onChange={(e) => setField('gstin', e.target.value.toUpperCase())}
                      placeholder="e.g. 29ABCDE1234F1Z5"
                      maxLength={20}
                      className={`${field} font-mono uppercase`}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-[13px] font-medium">
                    Phone
                    <input value={buyer.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="Optional" maxLength={80} className={field} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-[13px] font-medium">
                    State (place of supply)
                    <select value={buyer.state} onChange={(e) => setField('state', e.target.value)} className={field}>
                      <option value="">Choose the state</option>
                      {GST_STATES.map(([code, name]) => (
                        <option key={code} value={code}>
                          {name} ({code})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="flex flex-col gap-1.5 text-[13px] font-medium">
                  Address
                  <textarea
                    rows={2}
                    value={buyer.address}
                    onChange={(e) => setField('address', e.target.value)}
                    maxLength={300}
                    placeholder="Street, city, PIN"
                    className="resize-none rounded-xl border border-line px-3 py-2 text-sm font-normal placeholder:text-ink-3 focus:border-evergreen-800/50"
                  />
                </label>
                {gstinState && gstinState !== buyer.state && (
                  <Notice>
                    The GSTIN starts with {gstinState} ({stateName(gstinState)}), but the state chosen is {stateName(buyer.state) || 'none'}.
                  </Notice>
                )}
                <label className="flex items-center gap-2 text-xs text-ink-2">
                  <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} className="size-4 accent-evergreen-800" />
                  Also save these as {city}’s own details (its bills and the next invoices use them)
                </label>
              </>
            )}
          </section>
        )}

        {order && (
          <p className="rounded-xl bg-mist-2 px-4 py-2.5 text-xs text-ink-2">
            The {order.lines.length} products reviewed on {order.number} are on this invoice as single products. A box scanned here adds its products on top
            of them, so scan boxes only for what isn&rsquo;t listed.
          </p>
        )}
        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <section className="flex min-h-0 flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold">Boxes in the warehouse · {free.length}</h3>
              <label className="flex h-8 items-center gap-1.5 rounded-lg border border-line px-2">
                <Search size={13} className="text-ink-3" aria-hidden="true" />
                <span className="sr-only">Search boxes</span>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-28 bg-transparent text-xs placeholder:text-ink-3" />
              </label>
            </div>
            <ul className="max-h-72 overflow-y-auto rounded-xl border border-line-soft bg-surface p-1">
              {shown.length === 0 && (
                <li className="px-3 py-6 text-center text-[13px] text-ink-3">{free.length ? 'No box matches.' : 'No boxes in the warehouse. Single products can still be scanned.'}</li>
              )}
              {shown.map((b) => (
                <li key={b.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] hover:bg-mist">
                    <input type="checkbox" checked={picked.has(b.id)} onChange={() => toggle(b.id)} className="size-4 accent-evergreen-800" />
                    <span className="font-mono text-xs font-semibold">{b.boxNo}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-ink-3">{b.shipment || b.stockNo}</span>
                    <span className="text-xs text-ink-2 tabular-nums">{boxUnits(b.lines)} units</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
          <section className="flex min-h-0 flex-col gap-2">
            <h3 className="text-[13px] font-semibold">
              On this invoice · {chosen.length} {chosen.length === 1 ? 'box' : 'boxes'}, {singles.length} single{' '}
              {singles.length === 1 ? 'product' : 'products'}
            </h3>
            {singles.length > 0 && (
              <ul aria-label="Single products" className="max-h-44 overflow-y-auto rounded-xl border border-line-soft bg-surface p-1">
                {singles.map((l) => (
                  <li key={l.code} className="flex items-center gap-2.5 rounded-lg px-2.5 py-1 text-[13px]">
                    <span className="rounded-md bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{l.code}</span>
                    <span className="min-w-0 flex-1 truncate">{l.name}</span>
                    <div className="flex h-8 w-28 shrink-0 items-center overflow-hidden rounded-lg border border-line">
                      <button
                        type="button"
                        onClick={() => setQty(l.code, l.qty - 1)}
                        aria-label={`One less ${l.name}`}
                        className="inline-flex size-8 items-center justify-center text-ink-2 hover:bg-mist"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        inputMode="numeric"
                        aria-label={`Quantity of ${l.name}`}
                        value={l.qty}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
                          if (n > 0) setQty(l.code, n);
                        }}
                        className="h-full min-w-0 flex-1 border-x border-line bg-transparent text-center font-medium tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() => setQty(l.code, l.qty + 1)}
                        aria-label={`One more ${l.name}`}
                        className="inline-flex size-8 items-center justify-center text-ink-2 hover:bg-mist"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQty(l.code, 0)}
                      aria-label={`Remove ${l.name}`}
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-3 hover:bg-ruby-50 hover:text-ruby"
                    >
                      <X size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {lines.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-[13px] text-ink-3">Scanned boxes and products show up here with their prices.</p>
            ) : (
              <LinesTable lines={lines} />
            )}
            {short.length > 0 && (
              <Notice>
                More than the admin stock holds:{' '}
                {short
                  .slice(0, 6)
                  .map((l) => `${l.code} (have ${Math.max(available(l.code), 0)}, on this invoice ${l.qty})`)
                  .join(', ')}
                {short.length > 6 ? ` and ${short.length - 6} more` : ''}. Add stock under Inventory or lower the quantities.
              </Notice>
            )}
          </section>
        </div>

        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-2">
          Note <span className="sr-only">(optional)</span>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional"
            className="resize-none rounded-xl border border-line px-3 py-2 font-normal text-ink placeholder:text-ink-3 focus:border-evergreen-800/50"
          />
        </label>
        {error && <Notice>{error}</Notice>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft bg-mist-2 px-6 py-4">
        <span className="text-[13px] text-ink-3 tabular-nums">
          {lines.length} products · {lines.reduce((s, l) => s + l.qty, 0).toLocaleString('en-IN')} units ·{' '}
          {inr(Math.round(lines.reduce((s, l) => s + l.amount + l.tax, 0)))} with GST
        </span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} className={quiet}>
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving} className={primary}>
            <FileText size={15} aria-hidden="true" /> {editing ? (saving ? 'Saving…' : 'Save changes') : saving ? 'Raising…' : 'Raise invoice'}
          </button>
        </div>
      </div>
    </Dialog>
  );
};

const STATUS_OF_BOX = { invoiced: 'on an invoice', stocked: 'already added to a store' };

/** Reads a chosen PDF as base64 (without the data: prefix). */
const readPdf = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error(`${file.name} could not be read.`));
    reader.readAsDataURL(file);
  });

/**
 * One invoice: what is on it and who it is to. While it is raised it can be edited, and marked paid. From the moment
 * it is raised the admin records its e-way bill (made by hand on the GST portal before the goods go): the number,
 * and its PDF to view again any time; then, once paid, adds the products to the store's stock. Raised and paid
 * invoices can still be cancelled: their products go back to the admin stock and their boxes to the warehouse.
 * `focus` 'eway' opens it at the e-way bill (Attach e-way bill in the invoices list).
 */
export const InvoiceDetail = ({ id, focus, onClose, onPreview, onPrint, onEdit }) => {
  const { invoices, saveInvoiceDocuments, payInvoice, stockInvoice, cancelInvoice, downloadInvoiceDocument, viewInvoiceDocument } = useStore();
  const invoice = invoices.find((i) => i.id === id);
  const [form, setForm] = useState(() => ({ ewayNo: invoice?.ewayNo ?? '', billNo: invoice?.billNo ?? '' }));
  const [pdf, setPdf] = useState(null); // { name, base64 }
  const [payRef, setPayRef] = useState('');
  const [payNote, setPayNote] = useState('');
  const [confirm, setConfirm] = useState(null); // 'stock' | 'cancel'
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const ewayRef = useRef(null);

  useEffect(() => {
    if (focus === 'eway') ewayRef.current?.scrollIntoView({ block: 'center' });
  }, [focus]);

  if (!invoice) return null;
  const open = invoice.status === 'raised' || invoice.status === 'paid'; // can still be cancelled
  const docsOpen = invoice.status !== 'cancelled'; // the e-way bill is made before the goods go, paid or not
  const changed = form.ewayNo.trim() !== invoice.ewayNo || form.billNo.trim() !== invoice.billNo || Boolean(pdf);
  const shop = locationById(invoice.location);
  const buyer = invoice.buyer;

  const run = async (step, done) => {
    setBusy(true);
    setMessage(null);
    try {
      await step();
      if (done) setMessage({ tone: 'ok', text: done });
    } catch (err) {
      setMessage({ tone: 'warn', text: err.message });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const pick = async (file) => {
    if (!file) return;
    if (file.size > MAX_PDF) return setMessage({ tone: 'warn', text: 'The PDF is over 2 MB. Choose a smaller file.' });
    try {
      setPdf({ name: file.name, base64: await readPdf(file) });
      setMessage(null);
    } catch (err) {
      setMessage({ tone: 'warn', text: err.message });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const saveDocs = () =>
    run(async () => {
      await saveInvoiceDocuments(invoice.id, {
        ewayNo: form.ewayNo.trim(),
        billNo: form.billNo.trim(),
        ...(pdf ? { docName: pdf.name, docBase64: pdf.base64 } : {}),
      });
      setPdf(null);
    }, 'E-way bill saved.');

  return (
    <Dialog
      id="invoice-detail"
      title={invoice.number}
      subtitle={
        <>
          {shop?.city} · {when.format(new Date(invoice.createdAt))}{' '}
          <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS[invoice.status].className}`}>{STATUS[invoice.status].label}</span>
        </>
      }
      onClose={onClose}
      size="max-w-4xl"
    >
      <div className="flex flex-col gap-4 border-t border-line-soft px-6 pt-4 pb-5">
        <LinesTable lines={invoice.lines} total={invoice.total} />

        {buyer && (
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-mist-2 px-4 py-3 text-[13px]">
            <div className="min-w-0">
              <div className="text-xs text-ink-3">Bill to</div>
              <div className="font-semibold">{buyer.name}</div>
              <div className="text-xs text-ink-2">
                {[buyer.gstin && `GSTIN ${buyer.gstin}`, stateName(buyer.state) && `${stateName(buyer.state)} (${buyer.state})`].filter(Boolean).join(' · ')}
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${invoice.interState ? 'bg-warn-50 text-warn-ink' : 'bg-evergreen-50 text-evergreen-900'}`}>
              {invoice.interState ? 'Inter-state: IGST' : 'Inside the state: CGST + SGST'}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-ink-3">An A4 tax invoice with your business details, the showroom’s details and GSTIN, and HSN codes.</p>
          <div className="flex flex-wrap gap-2">
            {invoice.status === 'raised' && onEdit && (
              <button type="button" onClick={() => onEdit(invoice)} disabled={busy} className={secondary}>
                <Pencil size={15} aria-hidden="true" /> Edit invoice
              </button>
            )}
            {onPreview && (
              <button type="button" onClick={() => run(() => onPreview(invoice))} disabled={busy} className={secondary}>
                <Eye size={15} aria-hidden="true" /> Preview
              </button>
            )}
            {onPrint && (
              <button type="button" onClick={() => run(() => onPrint(invoice))} disabled={busy} className={secondary}>
                <Printer size={15} aria-hidden="true" /> Print invoice
              </button>
            )}
          </div>
        </div>

        {docsOpen && (
          <section ref={ewayRef} aria-label="E-way bill" className="flex flex-col gap-3 rounded-xl border border-line-soft p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold">E-way bill</h3>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${invoice.ewayNo || invoice.hasDocument ? 'bg-evergreen-50 text-evergreen-900' : 'bg-warn-50 text-warn-ink'}`}>
                {invoice.ewayNo || invoice.hasDocument ? 'Recorded' : 'Not recorded yet'}
              </span>
            </div>
            <p className="text-xs text-ink-3">
              Make the e-way bill on the GST portal (ewaybillgst.gov.in) before the goods leave, then record its number and attach its PDF here. It can be viewed
              again any time, here or from the invoices list.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-[13px] font-medium">
                E-way bill number
                <input value={form.ewayNo} onChange={(e) => setForm((f) => ({ ...f, ewayNo: e.target.value }))} placeholder="12-digit number" className={`${field} font-mono`} />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] font-medium">
                Bill number
                <input value={form.billNo} onChange={(e) => setForm((f) => ({ ...f, billNo: e.target.value }))} placeholder="Optional: your regular bill’s number" className={field} />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className={`${secondary} cursor-pointer`}>
                <Upload size={15} aria-hidden="true" /> {pdf ? 'Choose another PDF' : invoice.hasDocument ? 'Replace the e-way bill PDF' : 'Attach the e-way bill PDF'}
                <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => pick(e.target.files[0])} />
              </label>
              {pdf && <span className="text-xs text-ink-2">{pdf.name} ready to save</span>}
              {invoice.hasDocument && !pdf && (
                <>
                  <button type="button" onClick={() => run(() => viewInvoiceDocument(invoice))} className={secondary}>
                    <Eye size={15} aria-hidden="true" /> View e-way bill
                  </button>
                  <button type="button" onClick={() => run(() => downloadInvoiceDocument(invoice))} className={secondary} title={invoice.docName}>
                    <Download size={15} aria-hidden="true" /> Download
                  </button>
                </>
              )}
              <button type="button" onClick={saveDocs} disabled={busy || !changed} className={`${primary} ml-auto`}>
                Save
              </button>
            </div>
          </section>
        )}

        {invoice.status === 'raised' && (
          <section className="flex flex-col gap-3 rounded-xl border border-line-soft p-4">
            <h3 className="text-[13px] font-semibold">Payment</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-[13px] font-medium">
                Reference <span className="sr-only">(optional)</span>
                <input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="e.g. UTR or cheque number" className={field} />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] font-medium">
                Note <span className="sr-only">(optional)</span>
                <input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Optional" className={field} />
              </label>
            </div>
            <div>
              <button
                type="button"
                onClick={() =>
                  run(
                    () => payInvoice(invoice.id, { ref: payRef.trim(), note: payNote.trim() }),
                    'Marked paid. Add the products to the store stock once they reach it.',
                  )
                }
                disabled={busy}
                className={primary}
              >
                Mark paid
              </button>
            </div>
          </section>
        )}

        {invoice.status === 'paid' && (
          <section className="flex flex-wrap items-center gap-3 rounded-xl border border-evergreen-800/20 bg-evergreen-50 p-4">
            <div className="mr-auto text-[13px]">
              <div className="font-semibold text-evergreen-900">Paid{invoice.paidAt ? ` on ${when.format(new Date(invoice.paidAt))}` : ''}</div>
              <div className="text-ink-2">{invoice.paidRef ? `Reference ${invoice.paidRef}. ` : ''}Add the products to {shop?.city}’s stock now.</div>
            </div>
            {confirm === 'stock' ? (
              <button
                type="button"
                onClick={() => run(() => stockInvoice(invoice.id), `Added to ${shop?.city}’s stock.`)}
                disabled={busy}
                className={primary}
              >
                <PackageCheck size={15} aria-hidden="true" /> Yes, add to {shop?.city} stock
              </button>
            ) : (
              <button type="button" onClick={() => setConfirm('stock')} disabled={busy} className={primary}>
                <PackageCheck size={15} aria-hidden="true" /> Add to store stock
              </button>
            )}
          </section>
        )}

        {message && <Notice tone={message.tone}>{message.text}</Notice>}

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
          <ol aria-label="History" className="flex flex-col gap-2 text-xs">
            {invoice.history.map((h) => (
              <li key={h.at + h.action} className="flex gap-2">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-evergreen-800" aria-hidden="true" />
                <span>
                  <span className="font-medium text-ink">{ACTION[h.action] ?? h.action}</span>
                  <span className="text-ink-3">
                    {' '}
                    · {h.by} · {when.format(new Date(h.at))}
                  </span>
                  {h.note && <span className="block text-ink-2">“{h.note}”</span>}
                </span>
              </li>
            ))}
          </ol>
          {open && (
            <div className="flex items-end">
              {confirm === 'cancel' ? (
                <button type="button" onClick={() => run(() => cancelInvoice(invoice.id), 'Invoice cancelled; its products are back in the admin stock.')} disabled={busy} className="h-10 rounded-xl bg-ruby px-4 text-[13px] font-semibold text-white hover:bg-ruby-ink">
                  Cancel this invoice?
                </button>
              ) : (
                <button type="button" onClick={() => setConfirm('cancel')} disabled={busy} className="h-10 rounded-xl px-3.5 text-[13px] font-medium text-ruby-ink hover:bg-ruby-50">
                  Cancel invoice
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};
