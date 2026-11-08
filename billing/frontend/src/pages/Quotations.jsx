import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, ArchiveRestore, CircleCheck, Building2, CalendarDays, FileText, Lock, MapPin, Phone, Printer, ReceiptText, Save, Trash2, User } from 'lucide-react';
import BillTable from '../components/BillTable.jsx';
import { CustomerStatus, CustomerSuggestions } from '../components/CustomerSuggest.jsx';
import { LocationPicker, SearchBox, Segmented } from '../components/Filters.jsx';
import PageHeader from '../components/PageHeader.jsx';
import QuotationPrint from '../components/QuotationPrint.jsx';
import ScanBar from '../components/ScanBar.jsx';
import { locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { billKey, useBill } from '../hooks/useBill.js';
import { useClock } from '../hooks/useClock.js';
import { useCustomerLookup } from '../hooks/useCustomerLookup.js';
import { useScanner } from '../hooks/useScanner.js';
import { findProduct, productImages } from '../lib/catalogue.js';
import { billNumber, buildBill, countLabel, gstLines, nextSeq } from '../lib/bill.js';
import { customerLabel, isValidMobile, isValidName, phoneDigits, typedMobile } from '../lib/customer.js';
import { inr } from '../lib/money.js';
import { newId } from '../lib/uid.js';
import Pager from '../components/Pager.jsx';
import { usePages } from '../hooks/usePages.js';

const VALIDITY = [
  { id: 7, label: '7 days' },
  { id: 15, label: '15 days' },
  { id: 30, label: '30 days' },
];
const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const day = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
// Quotation lines carry no cost, so the admin's figure is at today's cost prices.
const quoteCost = (quote) => quote.lines.reduce((sum, l) => sum + (findProduct(l.code)?.cost ?? 0) * l.qty, 0);

const field =
  'flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 transition-shadow focus-within:border-evergreen-800/50 focus-within:shadow-[0_0_0_3px_rgba(23,92,38,0.10)]';
const Row = ({ label, value, className = 'text-ink-2' }) => (
  <div className={`flex justify-between gap-4 ${className}`}>
    <span>{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
);

/**
 * Quotations: like the billing counter, but it ends in a saved quotation instead of a payment. A quotation
 * never touches stock or the sales figures; it is numbered on its own (QT-CHN262700001), and printed on
 * A4 with a QUOTATION watermark and a plain "not a bill, do not pay" notice, when the admin allows printing.
 * A saved quotation can be loaded into the billing counter when the customer buys. Showrooms write and see
 * their own; the admin sees every showroom's.
 */
const Quotations = ({ session, onMenu, onNavigate }) => {
  const admin = session.role === 'admin';
  const { quotes, saveQuote, archiveQuote, unarchiveQuote, stockOf, settings } = useStore();
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
  const print = async (quote) => {
    // the pictures come first, so they are on the page when the print dialog opens (printed without if they can't load)
    const pictures = await productImages(quote.lines.map((l) => l.code)).catch(() => ({}));
    setPrinting({ quote, pictures });
    setPrintJob((n) => n + 1);
  };

  const mine = useMemo(
    () => quotes.filter((q) => !location || q.location === location).sort((a, b) => new Date(b.at) - new Date(a.at)),
    [quotes, location],
  );
  const q = query.trim().toLowerCase();
  const archived = tab === 'archived';
  const scoped = mine.filter((x) => (archived ? x.archivedAt : !x.archivedAt));
  const list = scoped.filter((x) => !q || `${x.quoteNo} ${x.name} ${x.phone}`.toLowerCase().includes(q));
  const paged = usePages(list, 50, `${q}|${location}|${tab}`);

  // Load a quotation's items into this showroom's billing counter, unless a bill is already in progress there.
  const billIt = (quote) => {
    const key = billKey(quote.location, 'current', session.demo);
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
    // the items, and the customer's mobile and name, so the counter opens ready to collect
    const customer = { phone: quote.phone, name: quote.name };
    window.localStorage.setItem(key, JSON.stringify({ items: quote.lines.map((l) => ({ code: l.code, qty: l.qty })), lastCode: null, customer }));
    onNavigate('counter');
  };

  // A quotation is never edited or deleted, only archived (kept) and brought back.
  const archive = async (quote) => {
    try {
      await archiveQuote(quote.id);
      setFlash({ tone: 'ok', text: `${quote.quoteNo} archived — find it under Archived.` });
    } catch (err) {
      setFlash({ tone: 'warn', text: `Not archived: ${err.message}` });
    }
  };
  const unarchive = async (quote) => {
    try {
      await unarchiveQuote(quote.id);
      setFlash({ tone: 'ok', text: `${quote.quoteNo} brought back to Saved.` });
    } catch (err) {
      setFlash({ tone: 'warn', text: `Not restored: ${err.message}` });
    }
  };

  const crumb = location ? `${locationById(location).city} · ${locationById(location).area}` : 'All showrooms';
  const forScope = admin ? quotes : quotes.filter((x) => x.location === session.location);
  const savedCount = forScope.filter((x) => !x.archivedAt).length;
  const archivedCount = forScope.filter((x) => x.archivedAt).length;

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col print:hidden">
        <PageHeader crumbs={[crumb, 'Quotations']} onMenu={onMenu} />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-3 p-3 lg:flex-1 lg:px-5 lg:py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                label="View"
                options={[
                  ...(admin ? [] : [{ id: 'new', label: 'New quotation' }]),
                  { id: 'saved', label: `Saved${savedCount ? ` · ${savedCount}` : ''}` },
                  { id: 'archived', label: `Archived${archivedCount ? ` · ${archivedCount}` : ''}` },
                ]}
                value={tab}
                onChange={(t) => {
                  setTab(t);
                  setFlash(null);
                }}
              />
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
                onSave={async (body, andPrint) => {
                  const quote = await saveQuote(body);
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
                    <div className="text-[15px] font-semibold">No {archived ? 'archived ' : ''}quotations {q ? 'match that search' : 'yet'}</div>
                    <div className="text-[13px] text-ink-3">
                      {archived ? 'Archived quotations are kept here and can be brought back.' : 'Saved quotations show up here, ready to print or bill.'}
                    </div>
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
                          {admin && <th scope="col" className="py-2 pr-3 text-right font-medium">Cost</th>}
                          {admin && <th scope="col" className="py-2 pr-3 text-right font-medium">Profit</th>}
                          <th scope="col" className="py-2 pr-3 font-medium">Valid until</th>
                          <th scope="col" className="py-2 pr-4 text-right font-medium">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paged.rows.map((x) => {
                          const expired = new Date(x.validUntil) < new Date();
                          const cost = admin ? quoteCost(x) : 0;
                          const profit = (settings.showGst ? x.totals.taxable : x.totals.payable) - cost;
                          return (
                            <tr key={x.quoteNo} className="row-hover border-b border-line-soft">
                              <td className="py-1.5 pr-3 pl-4 font-mono text-xs">{x.quoteNo}</td>
                              <td className="py-1.5 pr-3 whitespace-nowrap text-ink-2">{when.format(new Date(x.at)).replace(' at ', ', ')}</td>
                              {admin && <td className="py-1.5 pr-3 text-ink-2">{locationById(x.location)?.city}</td>}
                              <td className="py-1.5 pr-3 font-medium">{customerLabel(x.phone, x.name)}</td>
                              <td className="py-1.5 pr-3 text-right text-ink-2">{x.totals.count}</td>
                              <td className="py-1.5 pr-3 text-right font-semibold">{inr(x.totals.payable)}</td>
                              {admin && <td className="py-1.5 pr-3 text-right text-ink-2">{inr(cost)}</td>}
                              {admin && <td className={`py-1.5 pr-3 text-right font-medium ${profit >= 0 ? 'text-ok-ink' : 'text-ruby-ink'}`}>{inr(profit)}</td>}
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
                                  {archived ? (
                                    <button
                                      type="button"
                                      onClick={() => unarchive(x)}
                                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-evergreen-800/25 bg-white px-2.5 text-[13px] font-semibold text-evergreen-900 hover:bg-evergreen-50"
                                    >
                                      <ArchiveRestore size={14} aria-hidden="true" /> Bring back
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => archive(x)}
                                        aria-label={`Archive ${x.quoteNo}`}
                                        title="Archive this quotation"
                                        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 hover:bg-white hover:text-ink"
                                      >
                                        <Archive size={14} aria-hidden="true" /> Archive
                                      </button>
                                      {!admin && (
                                        <button
                                          type="button"
                                          onClick={() => billIt(x)}
                                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-evergreen-800 px-2.5 text-[13px] font-semibold text-white hover:bg-evergreen-900"
                                        >
                                          <ReceiptText size={14} aria-hidden="true" /> Bill this
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <Pager {...paged.pager} />
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
      {printing && <QuotationPrint quote={printing.quote} pictures={printing.pictures} />}
    </>
  );
};

/** Writing a new quotation: the counter's scan box and item list, and a panel with the customer and total. */
const QuoteWriter = ({ location, stockOf, canPrint, onSave }) => {
  const shop = locationById(location);
  const now = useClock();
  const draft = useBill(location, 'quote');
  const { quotes, settings } = useStore();
  // Prefilled when a bill was transferred over from the counter ("Save as quotation").
  const [name, setName] = useState(() => draft.customer?.name ?? '');
  const [phone, setPhone] = useState(() => draft.customer?.phone ?? '');
  const lookup = useCustomerLookup({ phone, name, setPhone, setName });
  const [days, setDays] = useState(7);
  const [note, setNote] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [delivery, setDelivery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const scanRef = useRef(null);

  // A scan adds the product to the quotation wherever the cursor is (same as the billing counter).
  const onScan = (code) => {
    const product = findProduct(code);
    if (product) {
      draft.add(product.code);
      setNotice({ tone: 'ok', text: `${product.name} added` });
      setError('');
    } else {
      setNotice({ tone: 'error', text: `No product with barcode “${code}”.` });
    }
  };
  useScanner(onScan);

  const totals = useMemo(() => buildBill(draft.items), [draft.items]);
  const prefix = `QT-${shop.billPrefix}`;
  const quoteNo = billNumber(prefix, nextSeq(quotes.map((x) => ({ billNo: x.quoteNo })), prefix, now), now);

  // the server prices it and gives it its number; saving the same id again keeps one
  const id = useRef(newId());
  const [busy, setBusy] = useState(false);
  const save = async (andPrint) => {
    if (!totals.count) return setError('Add at least one product.');
    if (!isValidName(name)) return setError('Enter the customer’s name.');
    if (!phone.trim()) return setError('Enter the customer’s mobile number.');
    if (!isValidMobile(phone)) return setError('That mobile number doesn’t look right (10 digits).');
    if (gstin && !/^[0-9A-Z]{15}$/.test(gstin)) return setError('A GSTIN is 15 letters and digits.');
    setBusy(true);
    try {
      await onSave(
        {
          id: id.current,
          lines: totals.lines.map((l) => ({ code: l.code, qty: l.qty })),
          name: name.trim(),
          phone: phoneDigits(phone),
          validDays: days,
          note: note.trim(),
          company: company.trim(),
          address: address.trim(),
          gstin,
          deliveryDate: delivery || null,
        },
        andPrint,
      );
    } catch (err) {
      setBusy(false);
      return setError(err.message);
    }
    setBusy(false);
    id.current = newId();
    draft.clear();
    setName('');
    setPhone('');
    setNote('');
    setCompany('');
    setAddress('');
    setGstin('');
    setDelivery('');
    setDays(7);
    setError('');
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
          <BillTable lines={totals.lines} lastCode={draft.lastCode} onQty={draft.setQty} inStock={(code) => stockOf(location, code)} shortcuts={false} pictures />
        </section>
      </div>

      <aside className="flex flex-col gap-4 rounded-2xl border glass p-5 lg:w-96">
        <div className="flex flex-col gap-2">
          <h2 className="text-[13px] font-medium">Customer</h2>
          <div className="relative">
            <label className={field}>
              <Phone size={15} className="text-ink-3" aria-hidden="true" />
              <span className="sr-only">Mobile number (required)</span>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                maxLength={10}
                autoComplete="off"
                onChange={(e) => {
                  lookup.changePhone(typedMobile(e.target.value));
                  setError('');
                }}
                onKeyDown={lookup.keyDown}
                {...lookup.inputProps('phone', 'quote-phone-suggestions')}
                placeholder="Mobile number"
                className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-ink-3"
              />
              <span className="text-xs text-ruby-ink" aria-hidden="true">
                *
              </span>
            </label>
            <CustomerSuggestions id="quote-phone-suggestions" which="phone" lookup={lookup} />
          </div>
          <div className="relative">
            <label className={field}>
              <User size={15} className="text-ink-3" aria-hidden="true" />
              <span className="sr-only">Customer name (required)</span>
              <input
                value={name}
                autoComplete="off"
                onChange={(e) => {
                  lookup.changeName(e.target.value);
                  setError('');
                }}
                onKeyDown={lookup.keyDown}
                {...lookup.inputProps('name', 'quote-name-suggestions')}
                placeholder="Customer name"
                className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-ink-3"
              />
              <span className="text-xs text-ruby-ink" aria-hidden="true">
                *
              </span>
            </label>
            <CustomerSuggestions id="quote-name-suggestions" which="name" lookup={lookup} />
          </div>
          <CustomerStatus status={lookup.status} newNote="" />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-[13px] font-medium">
            Business <span className="font-normal text-ink-3">(customer or vendor, optional)</span>
          </h2>
          <label className={field}>
            <Building2 size={15} className="text-ink-3" aria-hidden="true" />
            <span className="sr-only">Business name</span>
            <input
              value={company}
              maxLength={120}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Business name"
              className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-ink-3"
            />
          </label>
          <label className="flex items-start gap-2 rounded-xl border border-line bg-white px-3 py-2">
            <MapPin size={15} className="mt-0.5 text-ink-3" aria-hidden="true" />
            <span className="sr-only">Business address</span>
            <textarea
              rows={2}
              value={address}
              maxLength={500}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address"
              className="min-w-0 flex-1 resize-none bg-transparent text-sm placeholder:text-ink-3"
            />
          </label>
          <label className={field}>
            <FileText size={15} className="text-ink-3" aria-hidden="true" />
            <span className="sr-only">GSTIN</span>
            <input
              value={gstin}
              maxLength={15}
              onChange={(e) => {
                setGstin(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''));
                setError('');
              }}
              placeholder="GSTIN"
              className="min-w-0 flex-1 bg-transparent font-mono text-sm placeholder:font-sans placeholder:text-ink-3"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-[13px] font-medium">Valid for</h2>
          <Segmented label="Valid for" options={VALIDITY} value={days} onChange={setDays} />
        </div>

        <label className="flex flex-col gap-1.5 text-[13px] font-medium">
          Delivery date <span className="font-normal text-ink-3">(rough, optional)</span>
          <span className={field}>
            <CalendarDays size={15} className="text-ink-3" aria-hidden="true" />
            <input
              type="date"
              value={delivery}
              onChange={(e) => setDelivery(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm font-normal"
            />
          </span>
        </label>

        <label className="flex flex-col gap-1.5 text-[13px] font-medium">
          Instructions <span className="sr-only">(optional)</span>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional: e.g. installation, packing, payment terms"
            className="resize-none rounded-xl border border-line bg-white px-3 py-2 font-normal text-ink placeholder:text-ink-3 focus:border-evergreen-800/50"
          />
        </label>

        <div className="flex flex-col gap-2 border-t border-line-soft pt-3 text-[13px]">
          <Row label="MRP total" value={inr(totals.mrpTotal)} />
          <Row label="Offer discount" value={inr(-totals.savings)} className={totals.savings > 0 ? 'text-ok-ink' : 'text-ink-2'} />
          {(settings.showGst && !settings.composition) && <Row label="Taxable value" value={inr(totals.taxable)} />}
          {(settings.showGst && !settings.composition) && gstLines(totals.gstRows).map((g) => <Row key={g.label} label={g.label} value={inr(g.value)} />)}
        </div>

        <div className="mt-auto flex flex-col gap-3 border-t border-line-soft pt-3">
          <div className="flex items-end justify-between gap-3">
            <div className="text-[13px] text-ink-3">
              <div className="font-medium text-ink-2">Quoted total</div>
              {(settings.showGst && !settings.composition) ? 'incl. GST · not a bill' : 'not a bill'}
            </div>
            <div className="text-[30px] leading-none font-semibold tracking-tight tabular-nums">{inr(totals.payable)}</div>
          </div>
          {error && (
            <p role="alert" className="animate-pop text-xs font-medium text-ruby-ink">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => save(false)} disabled={!totals.count || busy} className={canPrint ? secondary : primary}>
              <Save size={16} aria-hidden="true" /> Save
            </button>
            {canPrint && (
              <button type="button" onClick={() => save(true)} disabled={!totals.count || busy} className={primary}>
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
