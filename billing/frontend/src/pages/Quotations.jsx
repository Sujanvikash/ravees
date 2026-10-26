import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleCheck, FileText, Lock, Phone, Printer, ReceiptText, Save, Trash2, User } from 'lucide-react';
import BillTable from '../components/BillTable.jsx';
import { LocationPicker, SearchBox, Segmented } from '../components/Filters.jsx';
import PageHeader from '../components/PageHeader.jsx';
import QuotationPrint from '../components/QuotationPrint.jsx';
import ScanBar from '../components/ScanBar.jsx';
import { locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { billKey, useBill } from '../hooks/useBill.js';
import { useClock } from '../hooks/useClock.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { billNumber, buildBill, countLabel, gstLines } from '../lib/bill.js';
import { customerLabel, isValidMobile, isValidName, phoneDigits } from '../lib/customer.js';
import { inr } from '../lib/money.js';

const VALIDITY = [
  { id: 7, label: '7 days' },
  { id: 15, label: '15 days' },
  { id: 30, label: '30 days' },
];
const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const day = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const field =
  'flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 transition-shadow focus-within:border-evergreen-800/50 focus-within:shadow-[0_0_0_3px_rgba(23,92,38,0.10)]';
const Row = ({ label, value, className = 'text-ink-2' }) => (
  <div className={`flex justify-between gap-4 ${className}`}>
    <span>{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
);

/** The end of the last valid day, `days` from now. */
const validUntil = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};

/**
 * Quotations: like the billing counter, but it ends in a saved quotation instead of a payment. A quotation
 * never touches stock or the sales figures; it is numbered on its own (QT-CHN/26-27/00001), and printed on
 * A4 with a QUOTATION watermark and a plain "not a bill, do not pay" notice, when the admin allows printing.
 * A saved quotation can be loaded into the billing counter when the customer buys. Showrooms write and see
 * their own; the admin sees every showroom's.
 */
const Quotations = ({ session, onMenu, onNavigate }) => {
  const admin = session.role === 'admin';
  const { quotes, saveQuote, stockOf, settings } = useStore();
  const canPrint = settings.quotePrint;
  const [tab, setTab] = useState(admin ? 'saved' : 'new');
  const [location, setLocation] = useState(admin ? null : session.location);
  const [query, setQuery] = useState('');
  const [flash, setFlash] = useState(null); // { tone, text }
  const [printing, setPrinting] = useState(null); // the quotation on the print page
  const [printJob, setPrintJob] = useState(0);

  useEffect(() => {
    if (printJob) window.print();
  }, [printJob]);
  const print = (quote) => {
    setPrinting(quote);
    setPrintJob((n) => n + 1);
  };

  const mine = useMemo(
    () => quotes.filter((q) => !location || q.location === location).sort((a, b) => new Date(b.at) - new Date(a.at)),
    [quotes, location],
  );
  const q = query.trim().toLowerCase();
  const list = mine.filter((x) => !q || `${x.quoteNo} ${x.name} ${x.phone}`.toLowerCase().includes(q));

  // Load a quotation's items into this showroom's billing counter, unless a bill is already in progress there.
  const billIt = (quote) => {
    const key = billKey(quote.location);
    const current = (() => {
      try {
        return JSON.parse(window.localStorage.getItem(key));
      } catch {
        return null;
      }
    })();
    if (current?.items?.length) {
      setFlash({ tone: 'warn', text: 'There is already a bill in progress at the counter. Finish or hold it first, then try again.' });
      return;
    }
    window.localStorage.setItem(key, JSON.stringify({ items: quote.lines.map((l) => ({ code: l.code, qty: l.qty })), lastCode: null }));
    onNavigate('counter');
  };

  const crumb = location ? `${locationById(location).city} · ${locationById(location).area}` : 'All showrooms';
  const savedCount = admin ? quotes.length : quotes.filter((x) => x.location === session.location).length;

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col print:hidden">
        <PageHeader crumbs={[crumb, 'Quotations']} onMenu={onMenu} />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-3 p-3 lg:flex-1 lg:px-5 lg:py-4">
            <div className="flex flex-wrap items-center gap-2">
              {!admin && (
                <Segmented
                  label="View"
                  options={[
                    { id: 'new', label: 'New quotation' },
                    { id: 'saved', label: `Saved${savedCount ? ` · ${savedCount}` : ''}` },
                  ]}
                  value={tab}
                  onChange={(t) => {
                    setTab(t);
                    setFlash(null);
                  }}
                />
              )}
              {admin && <LocationPicker value={location} onChange={setLocation} />}
              <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-ink-3">
                {canPrint ? <Printer size={13} aria-hidden="true" /> : <Lock size={13} aria-hidden="true" />}
                {canPrint ? 'Printing quotations is allowed' : 'Printing quotations is turned off by the admin'}
              </span>
            </div>

            {flash && (
              <p
                role="status"
                className={`flex animate-pop items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-medium ${flash.tone === 'warn' ? 'bg-warn-50 text-warn-ink' : 'bg-ok-50 text-ok-ink'}`}
              >
                <CircleCheck size={15} className="shrink-0" aria-hidden="true" /> {flash.text}
              </p>
            )}

            {tab === 'new' && !admin ? (
              <QuoteWriter
                location={session.location}
                stockOf={stockOf}
                canPrint={canPrint}
                onSave={(quote, andPrint) => {
                  saveQuote(quote);
                  setFlash({ tone: 'ok', text: `${quote.quoteNo} saved for ${quote.name}.` });
                  if (andPrint) print(quote);
                }}
              />
            ) : (
              <section className="overflow-clip rounded-2xl border glass">
                <div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-4 py-2.5">
                  <span className="text-[13px] text-ink-3">
                    {list.length.toLocaleString('en-IN')} {list.length === 1 ? 'quotation' : 'quotations'}
                  </span>
                  <div className="flex flex-1 justify-end">
                    <SearchBox value={query} onChange={setQuery} placeholder="Quotation number, customer or mobile" />
                  </div>
                </div>
                {list.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                    <FileText size={22} className="text-ink-3" aria-hidden="true" />
                    <div className="text-[15px] font-semibold">No quotations {q ? 'match that search' : 'yet'}</div>
                    <div className="text-[13px] text-ink-3">Saved quotations show up here, ready to print or bill.</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[56rem] text-[13px] tabular-nums">
                      <thead>
                        <tr className="border-b border-line-soft text-left text-xs text-ink-3">
                          <th scope="col" className="py-2 pr-3 pl-4 font-medium">Quotation</th>
                          <th scope="col" className="py-2 pr-3 font-medium">Date</th>
                          {admin && <th scope="col" className="py-2 pr-3 font-medium">Showroom</th>}
                          <th scope="col" className="py-2 pr-3 font-medium">Customer</th>
                          <th scope="col" className="py-2 pr-3 text-right font-medium">Items</th>
                          <th scope="col" className="py-2 pr-3 text-right font-medium">Amount</th>
                          <th scope="col" className="py-2 pr-3 font-medium">Valid until</th>
                          <th scope="col" className="py-2 pr-4 text-right font-medium">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((x) => {
                          const expired = new Date(x.validUntil) < new Date();
                          return (
                            <tr key={x.quoteNo} className="row-hover border-b border-line-soft">
                              <td className="py-1.5 pr-3 pl-4 font-mono text-xs">{x.quoteNo}</td>
                              <td className="py-1.5 pr-3 whitespace-nowrap text-ink-2">{when.format(new Date(x.at)).replace(' at ', ', ')}</td>
                              {admin && <td className="py-1.5 pr-3 text-ink-2">{locationById(x.location)?.city}</td>}
                              <td className="py-1.5 pr-3 font-medium">{customerLabel(x.phone, x.name)}</td>
                              <td className="py-1.5 pr-3 text-right text-ink-2">{x.totals.count}</td>
                              <td className="py-1.5 pr-3 text-right font-semibold">{inr(x.totals.payable)}</td>
                              <td className="py-1.5 pr-3 whitespace-nowrap">
                                {day.format(new Date(x.validUntil))}{' '}
                                {expired && <span className="ml-1 rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-ink-3">Expired</span>}
                              </td>
                              <td className="py-1.5 pr-4">
                                <div className="flex justify-end gap-1.5">
                                  {canPrint && (
                                    <button
                                      type="button"
                                      onClick={() => print(x)}
                                      className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 hover:bg-white hover:text-ink"
                                    >
                                      <Printer size={14} aria-hidden="true" /> Print
                                    </button>
                                  )}
                                  {!admin && (
                                    <button
                                      type="button"
                                      onClick={() => billIt(x)}
                                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-evergreen-800 px-2.5 text-[13px] font-semibold text-white hover:bg-evergreen-900"
                                    >
                                      <ReceiptText size={14} aria-hidden="true" /> Bill this
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
      {printing && <QuotationPrint quote={printing} />}
    </>
  );
};

/** Writing a new quotation: the counter's scan box and item list, and a panel with the customer and total. */
const QuoteWriter = ({ location, stockOf, canPrint, onSave }) => {
  const shop = locationById(location);
  const now = useClock();
  const draft = useBill(location, 'quote');
  const [seq, setSeq] = useLocalStorage(`billing-quote-seq-${location}`, 1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [days, setDays] = useState(7);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const scanRef = useRef(null);

  const totals = useMemo(() => buildBill(draft.items), [draft.items]);
  const quoteNo = billNumber(`QT-${shop.billPrefix}`, seq, now);

  const save = (andPrint) => {
    if (!totals.count) return setError('Add at least one product.');
    if (!isValidName(name)) return setError('Enter the customer’s name.');
    if (phone.trim() && !isValidMobile(phone)) return setError('That mobile number doesn’t look right (10 digits).');
    const quote = {
      quoteNo,
      at: new Date().toISOString(),
      location,
      by: shop.city,
      name: name.trim(),
      phone: phone.trim() ? phoneDigits(phone) : '',
      validUntil: validUntil(days),
      note: note.trim(),
      lines: totals.lines.map((l) => ({ code: l.code, name: l.product.name, qty: l.qty, price: l.price, mrp: l.product.mrp })),
      totals: {
        count: totals.count,
        qty: totals.qty,
        mrpTotal: totals.mrpTotal,
        savings: totals.savings,
        taxable: totals.taxable,
        tax: totals.tax,
        gstRows: totals.gstRows,
        roundOff: totals.roundOff,
        payable: totals.payable,
      },
    };
    setSeq(seq + 1);
    draft.clear();
    setName('');
    setPhone('');
    setNote('');
    setDays(7);
    setError('');
    onSave(quote, andPrint);
  };

  const primary =
    'inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-evergreen-800 text-[14px] font-semibold text-white shadow-[0_1px_2px_rgba(9,9,11,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-evergreen-900 disabled:bg-line disabled:text-ink-3 disabled:shadow-none';
  const secondary =
    'inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-evergreen-800/25 bg-white text-[14px] font-semibold text-evergreen-900 hover:border-evergreen-800/50 hover:bg-evergreen-50 disabled:opacity-40';

  return (
    <div className="flex min-h-0 flex-col gap-3 lg:flex-1 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <ScanBar
          inputRef={scanRef}
          onAdd={(p) => {
            draft.add(p.code);
            setNotice({ tone: 'ok', text: `${p.name} added` });
            setError('');
          }}
          notice={notice}
          onNotice={setNotice}
          inStock={(code) => stockOf(location, code)}
        />
        <section className="flex min-h-72 flex-1 flex-col overflow-hidden rounded-2xl border glass">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4 pb-2">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <h2 className="text-[15px] font-semibold tracking-tight">New quotation</h2>
              <span className="font-mono text-xs text-ink-3">{quoteNo}</span>
              {totals.count > 0 && <span className="text-xs text-ink-3">· {countLabel(totals)}</span>}
            </div>
            <button
              type="button"
              onClick={draft.clear}
              disabled={!totals.count}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 enabled:hover:bg-ruby-50 enabled:hover:text-ruby-ink disabled:opacity-40"
            >
              <Trash2 size={15} /> Clear
            </button>
          </div>
          <BillTable lines={totals.lines} lastCode={draft.lastCode} onQty={draft.setQty} inStock={(code) => stockOf(location, code)} shortcuts={false} />
        </section>
      </div>

      <aside className="flex flex-col gap-4 rounded-2xl border glass p-5 lg:w-96">
        <div className="flex flex-col gap-2">
          <h2 className="text-[13px] font-medium">Customer</h2>
          <label className={field}>
            <User size={15} className="text-ink-3" aria-hidden="true" />
            <span className="sr-only">Customer name (required)</span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Customer name"
              className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-ink-3"
            />
            <span className="text-xs text-ruby-ink" aria-hidden="true">
              *
            </span>
          </label>
          <label className={field}>
            <Phone size={15} className="text-ink-3" aria-hidden="true" />
            <span className="sr-only">Mobile number (optional)</span>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError('');
              }}
              placeholder="Mobile number (optional)"
              className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-ink-3"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-[13px] font-medium">Valid for</h2>
          <Segmented label="Valid for" options={VALIDITY} value={days} onChange={setDays} />
        </div>

        <label className="flex flex-col gap-1.5 text-[13px] font-medium">
          Note <span className="sr-only">(optional)</span>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional: e.g. delivery, installation"
            className="resize-none rounded-xl border border-line bg-white px-3 py-2 font-normal text-ink placeholder:text-ink-3 focus:border-evergreen-800/50"
          />
        </label>

        <div className="flex flex-col gap-2 border-t border-line-soft pt-3 text-[13px]">
          <Row label="MRP total" value={inr(totals.mrpTotal)} />
          <Row label="Offer discount" value={inr(-totals.savings)} className={totals.savings > 0 ? 'text-ok-ink' : 'text-ink-2'} />
          <Row label="Taxable value" value={inr(totals.taxable)} />
          {gstLines(totals.gstRows).map((g) => (
            <Row key={g.label} label={g.label} value={inr(g.value)} />
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-3 border-t border-line-soft pt-3">
          <div className="flex items-end justify-between gap-3">
            <div className="text-[13px] text-ink-3">
              <div className="font-medium text-ink-2">Quoted total</div>
              incl. GST · not a bill
            </div>
            <div className="text-[30px] leading-none font-semibold tracking-tight tabular-nums">{inr(totals.payable)}</div>
          </div>
          {error && (
            <p role="alert" className="animate-pop text-xs font-medium text-ruby-ink">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => save(false)} disabled={!totals.count} className={canPrint ? secondary : primary}>
              <Save size={16} aria-hidden="true" /> Save
            </button>
            {canPrint && (
              <button type="button" onClick={() => save(true)} disabled={!totals.count} className={primary}>
                <Printer size={16} aria-hidden="true" /> Save &amp; print
              </button>
            )}
          </div>
          {!canPrint && (
            <p className="flex items-center gap-1.5 text-xs text-ink-3">
              <Lock size={12} aria-hidden="true" /> Printing quotations is turned off by the admin.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
};

export default Quotations;
