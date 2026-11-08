import { useMemo, useRef, useState } from 'react';
import { CircleAlert, Download, FileText, PackageCheck, Printer, ScanBarcode, Search, Upload } from 'lucide-react';
import { activeLocations, locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { useScanner } from '../hooks/useScanner.js';
import { boxUnits, findBox } from '../lib/boxes.js';
import { findProduct } from '../lib/catalogue.js';
import { MARKUP_PCT, rateOf, STATUS } from '../lib/invoices.js';
import { inr } from '../lib/money.js';
import Dialog from './Dialog.jsx';

const MAX_PDF = 2 * 1024 * 1024;

const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const ACTION = {
  raised: 'Invoice raised',
  documents: 'Bill details saved',
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

/** The products of some boxes added together: [{ code, name, qty, cost, rate, amount }]. */
const linesOf = (boxes) => {
  const sum = new Map();
  for (const b of boxes) for (const l of b.lines) sum.set(l.code, { code: l.code, name: l.name, qty: (sum.get(l.code)?.qty ?? 0) + l.qty });
  return [...sum.values()].map((l) => {
    const cost = findProduct(l.code)?.cost ?? 0;
    const rate = rateOf(cost);
    return { ...l, cost, rate, amount: Math.round(l.qty * rate * 100) / 100 };
  });
};

const Notice = ({ tone = 'warn', children }) => (
  <p role={tone === 'warn' ? 'alert' : 'status'} className={`animate-pop rounded-xl px-4 py-2.5 text-[13px] font-medium ${tone === 'warn' ? 'bg-ruby-50 text-ruby-ink' : 'bg-ok-50 text-ok-ink'}`}>
    {children}
  </p>
);

/** The lines of an invoice with cost, the +18% rate and the amounts, and the totals under them. */
const LinesTable = ({ lines, total }) => {
  const cost = lines.reduce((s, l) => s + l.qty * l.cost, 0);
  const sum = total ?? lines.reduce((s, l) => s + l.amount, 0);
  return (
    <div className="overflow-hidden rounded-xl border border-line-soft">
      <div className="max-h-[36vh] overflow-auto">
        <table className="w-full min-w-[34rem] text-[13px] tabular-nums">
          <thead className="sticky top-0 bg-mist-2 text-left text-xs text-ink-3">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Product</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Qty</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Cost</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Rate (+{MARKUP_PCT}%)</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Amount</th>
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
                <td className="px-3 py-1.5 text-right text-ink-2">{inr(l.cost)}</td>
                <td className="px-3 py-1.5 text-right">{inr(l.rate)}</td>
                <td className="px-3 py-1.5 text-right font-medium">{inr(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-1 border-t border-line-soft bg-surface px-3 py-2 text-[13px] tabular-nums">
        <div className="flex justify-between text-ink-2">
          <span>Cost price</span>
          <span>{inr(cost)}</span>
        </div>
        <div className="flex justify-between text-ink-2">
          <span>Plus {MARKUP_PCT}%</span>
          <span>{inr(sum - cost)}</span>
        </div>
        <div className="flex justify-between border-t border-line-soft pt-1 font-semibold">
          <span>Total</span>
          <span>{inr(sum)}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * A new transfer invoice: choose the showroom, then scan the boxes (or tick them) that go to it. Every product is
 * billed at its cost price plus 18%. The boxes leave the admin's stock when the invoice is raised, and reach the
 * showroom's stock only when the invoice is paid and the admin adds them. `order` is a showroom's request this
 * invoice fulfils, if it comes from one.
 */
export const NewInvoice = ({ order, onClose, onDone }) => {
  const { boxes, saveInvoice } = useStore();
  const [location, setLocation] = useState(order?.location ?? '');
  const [picked, setPicked] = useState(() => new Set());
  const [query, setQuery] = useState('');
  const [scan, setScan] = useState('');
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const scanRef = useRef(null);

  const free = useMemo(() => boxes.filter((b) => b.status === 'in_stock'), [boxes]);
  const q = query.trim().toLowerCase();
  const shown = free.filter((b) => !q || `${b.boxNo} ${b.stockNo} ${b.shipment} ${b.lines.map((l) => l.code).join(' ')}`.toLowerCase().includes(q));
  const chosen = free.filter((b) => picked.has(b.id));
  const lines = useMemo(() => linesOf(chosen), [chosen]);
  const requested = order ? new Map(order.lines.map((l) => [l.code, l.qty])) : null;

  const toggle = (id) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onScan = (code) => {
    setScan('');
    const box = findBox(boxes, code);
    if (!box) return setNotice({ tone: 'warn', text: `No box “${code.trim()}” is entered.` });
    if (box.status !== 'in_stock') return setNotice({ tone: 'warn', text: `Box ${box.boxNo} is not in the warehouse any more (${STATUS_OF_BOX[box.status]}).` });
    if (picked.has(box.id)) return setNotice({ tone: 'warn', text: `Box ${box.boxNo} is already on this invoice.` });
    setPicked((s) => new Set(s).add(box.id));
    setNotice({ tone: 'ok', text: `Box ${box.boxNo} added: ${boxUnits(box.lines)} units.` });
  };
  useScanner(onScan, true);

  const create = async () => {
    if (!location) return setError('Choose the showroom this invoice is for.');
    if (!chosen.length) return setError('Scan or tick the boxes that go on this invoice.');
    setSaving(true);
    setError('');
    try {
      const invoice = await saveInvoice({ location, boxIds: chosen.map((b) => b.id), orderId: order?.id, note: note.trim() });
      onDone(invoice);
    } catch (err) {
      setSaving(false);
      setError(err.message);
    }
  };

  return (
    <Dialog
      id="new-invoice"
      title="New transfer invoice"
      subtitle={order ? `For ${order.number}, requested by ${locationById(order.location)?.city}. Scan the boxes that go.` : 'Choose the showroom and scan the boxes that go to it.'}
      onClose={onClose}
      size="max-w-4xl"
    >
      <div className="flex flex-col gap-4 border-t border-line-soft px-6 pt-4 pb-5">
        <div className="grid gap-3 sm:grid-cols-[16rem_minmax(0,1fr)]">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">
            Showroom
            <select value={location} onChange={(e) => setLocation(e.target.value)} disabled={Boolean(order)} className={field}>
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
              if (scan.trim()) onScan(scan);
            }}
            className="flex flex-col gap-1.5 text-[13px] font-medium"
          >
            <label htmlFor="invoice-scan">Scan a box</label>
            <div className="flex h-10 items-center gap-2 rounded-xl border border-line px-3 focus-within:border-evergreen-800/50">
              <ScanBarcode size={16} className="text-ink-3" aria-hidden="true" />
              <input
                id="invoice-scan"
                ref={scanRef}
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                placeholder="Scan the box label, or type the box number and press Enter"
                autoComplete="off"
                autoFocus
                className="min-w-0 flex-1 bg-transparent text-sm font-normal placeholder:text-ink-3"
              />
            </div>
          </form>
        </div>

        {requested && (
          <p className="rounded-xl bg-mist-2 px-4 py-2.5 text-xs text-ink-2">
            <span className="font-semibold">Requested:</span>{' '}
            {order.lines.map((l) => `${l.code} × ${l.qty}`).join(' · ')}
          </p>
        )}
        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

        <div className="grid gap-4 md:grid-cols-2">
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
              {shown.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-ink-3">{free.length ? 'No box matches.' : 'No boxes in the warehouse. Enter some under Boxes.'}</li>}
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
              On this invoice · {chosen.length} {chosen.length === 1 ? 'box' : 'boxes'}
            </h3>
            {lines.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-[13px] text-ink-3">Scanned or ticked boxes show up here with their prices.</p>
            ) : (
              <LinesTable lines={lines} />
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
          {lines.length} products · {lines.reduce((s, l) => s + l.qty, 0).toLocaleString('en-IN')} units · {inr(lines.reduce((s, l) => s + l.amount, 0))}
        </span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} className={quiet}>
            Cancel
          </button>
          <button type="button" onClick={create} disabled={saving} className={primary}>
            <FileText size={15} aria-hidden="true" /> {saving ? 'Raising…' : 'Raise invoice'}
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
 * One invoice: what is on it, the e-way bill and bill numbers (and the bill's PDF) the admin got from the GST
 * portal, then Mark paid, then Add to store stock. Raised and paid invoices can still be cancelled: their boxes go
 * back to the warehouse.
 */
export const InvoiceDetail = ({ id, onClose, onPrint }) => {
  const { invoices, saveInvoiceDocuments, payInvoice, stockInvoice, cancelInvoice, downloadInvoiceDocument } = useStore();
  const invoice = invoices.find((i) => i.id === id);
  const [form, setForm] = useState(() => ({ ewayNo: invoice?.ewayNo ?? '', billNo: invoice?.billNo ?? '' }));
  const [pdf, setPdf] = useState(null); // { name, base64 }
  const [payRef, setPayRef] = useState('');
  const [payNote, setPayNote] = useState('');
  const [confirm, setConfirm] = useState(null); // 'stock' | 'cancel'
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  if (!invoice) return null;
  const open = invoice.status === 'raised' || invoice.status === 'paid';
  const hasDoc = Boolean(invoice.ewayNo || invoice.billNo);
  const changed = form.ewayNo.trim() !== invoice.ewayNo || form.billNo.trim() !== invoice.billNo || Boolean(pdf);
  const shop = locationById(invoice.location);

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
    }, 'Bill details saved.');

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

        {onPrint && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-ink-3">An A4 invoice with your business details, the showroom’s GSTIN, HSN codes and the e-way bill number.</p>
            <button type="button" onClick={() => run(() => onPrint(invoice))} disabled={busy} className={secondary}>
              <Printer size={15} aria-hidden="true" /> Print invoice
            </button>
          </div>
        )}

        <section className="flex flex-col gap-3 rounded-xl border border-line-soft p-4">
          <h3 className="text-[13px] font-semibold">E-way bill / bill</h3>
          <p className="text-xs text-ink-3">
            Make the e-way bill (or your regular bill) on the GST portal, then record its number here. Paying is possible once a number is recorded.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-[13px] font-medium">
              E-way bill number
              <input value={form.ewayNo} onChange={(e) => setForm((f) => ({ ...f, ewayNo: e.target.value }))} disabled={!open} placeholder="12-digit number" className={`${field} font-mono`} />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium">
              Bill number
              <input value={form.billNo} onChange={(e) => setForm((f) => ({ ...f, billNo: e.target.value }))} disabled={!open} placeholder="Your regular bill’s number" className={field} />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {open && (
              <label className={`${secondary} cursor-pointer`}>
                <Upload size={15} aria-hidden="true" /> {pdf ? 'Choose another PDF' : invoice.hasDocument ? 'Replace the PDF' : 'Upload the PDF'}
                <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => pick(e.target.files[0])} />
              </label>
            )}
            {pdf && <span className="text-xs text-ink-2">{pdf.name} ready to save</span>}
            {invoice.hasDocument && !pdf && (
              <button type="button" onClick={() => run(() => downloadInvoiceDocument(invoice))} className={secondary}>
                <Download size={15} aria-hidden="true" /> {invoice.docName || 'Download the PDF'}
              </button>
            )}
            {open && (
              <button type="button" onClick={saveDocs} disabled={busy || !changed} className={`${primary} ml-auto`}>
                Save
              </button>
            )}
          </div>
        </section>

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
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => run(() => payInvoice(invoice.id, { ref: payRef.trim(), note: payNote.trim() }), 'Marked paid. You can now add the products to the store stock.')}
                disabled={busy || !hasDoc || changed}
                className={primary}
              >
                Mark paid
              </button>
              {(!hasDoc || changed) && (
                <span className="flex items-center gap-1.5 text-xs text-ink-3">
                  <CircleAlert size={13} aria-hidden="true" /> {hasDoc ? 'Save the bill details first.' : 'Record the e-way bill or bill number first.'}
                </span>
              )}
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
                <button type="button" onClick={() => run(() => cancelInvoice(invoice.id), 'Invoice cancelled; its boxes are back in the warehouse.')} disabled={busy} className="h-10 rounded-xl bg-ruby px-4 text-[13px] font-semibold text-white hover:bg-ruby-ink">
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
