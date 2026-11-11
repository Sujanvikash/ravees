import { Fragment, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ChevronDown, Download, FileSpreadsheet, HandCoins, Printer, ReceiptText, Repeat, Undo2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import CollectBalance from '../components/CollectBalance.jsx';
import { LocationPicker, PeriodTabs, SearchBox, Segmented } from '../components/Filters.jsx';
import Dialog from '../components/Dialog.jsx';
import PageHeader from '../components/PageHeader.jsx';
import PaymentReceiptPrint from '../components/PaymentReceiptPrint.jsx';
import ProductPerformance from '../components/ProductPerformance.jsx';
import ReturnDialog from '../components/ReturnDialog.jsx';
import SummaryStrip from '../components/SummaryStrip.jsx';
import { locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { formatMobile } from '../lib/customer.js';
import { inr, inrWhole } from '../lib/money.js';
import { isCreditBill, methodLabel, paidAtCounter } from '../lib/payment.js';
import { printAlone } from '../lib/print.js';
import { filterSales, periodStart, returnsByLocation, returnsBySale, returnStatus, saleCost, summarize } from '../lib/reports.js';
import { newId } from '../lib/uid.js';
import Pager from '../components/Pager.jsx';
import { usePages } from '../hooks/usePages.js';
import { rowClick } from '../lib/rowClick.js';

const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const PAGE = 100;
const PERIOD_NOTE = { today: 'today', '7d': 'last 7 days', '30d': 'last 30 days', all: 'all time' };

/** A date as YYYY-MM-DD in India, for the report's days. */
const istDay = (d) => new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);

// Filter bills by what has come back against them. Matches the one-word returnStatus of each bill.
const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'returned', label: 'Fully returned' },
  { id: 'part', label: 'Partly returned' },
  { id: 'exchanged', label: 'Exchanged' },
];

// Filter bills by what is still owed on them (credit bills).
const DUE_FILTERS = [
  { id: 'all', label: 'All bills' },
  { id: 'credit', label: 'Credit bills' },
  { id: 'owing', label: 'Balance due' },
];
const dueMatch = { all: () => true, credit: isCreditBill, owing: (s) => s.balance > 0 };

/** A bill number shown as a link that jumps the list to that bill. */
const BillLink = ({ loc, billNo, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(loc, billNo)}
    className="inline-flex items-center gap-0.5 font-mono text-xs font-semibold text-evergreen-900 hover:underline"
  >
    {billNo}
    <ArrowUpRight size={12} aria-hidden="true" />
  </button>
);

/**
 * Completed bills. A showroom sees only its own; the admin sees every showroom and, on top, the purchase
 * cost and gross profit of each bill. Returns come off the sales as net sales. Export to Excel downloads the
 * period's report (summary, bills, items, returns and cash closes) from the server.
 */
const Sales = ({ session, intent, onMenu, onNavigate }) => {
  const admin = session.role === 'admin';
  const { sales, returns, recordReturn, findBill, downloadSalesReport, downloadFinalSales, settings } = useStore();
  const gst = settings.showGst;
  const [exporting, setExporting] = useState('');
  const [returnFor, setReturnFor] = useState(null); // bill number being returned/exchanged (showrooms only)
  const [refunded, setRefunded] = useState(null); // the credit note after a cash refund, for its dialog
  // opened from a customer's bill (intent.bill): that bill, found in all time, opened
  const [period, setPeriod] = useState(intent?.bill ? 'all' : '30d');
  const [location, setLocation] = useState(admin ? (intent?.bill?.location ?? null) : session.location);
  const [query, setQuery] = useState(intent?.bill?.billNo ?? '');
  const [status, setStatus] = useState('all'); // return-status filter: all | returned | part | exchanged
  const [open, setOpen] = useState(intent?.bill ? `${intent.bill.location}-${intent.bill.billNo}` : null);
  const [openLoc, setOpenLoc] = useState(null); // admin: showroom whose returns & exchanges are expanded
  const [highlight, setHighlight] = useState(null); // a row to scroll to and flash (from an exchange cross-link)
  const [due, setDue] = useState('all'); // credit filter: all | credit | owing
  const [collecting, setCollecting] = useState(null); // id of the credit bill a balance is being collected on
  const [reprint, setReprint] = useState(null); // { sale, collection }: a payment receipt to print again
  useEffect(() => {
    if (reprint) printAlone();
  }, [reprint]);

  // What has come back against each bill (qty, value, exchange links), and each credit note by its number so an
  // exchange's new bill can point back to the bill it replaced.
  const retBySale = useMemo(() => returnsBySale(returns), [returns]);
  const retByNote = useMemo(() => new Map(returns.map((r) => [r.returnNo, r])), [returns]);
  // A showroom can take any of its bills back from here (the admin only views); returns are always allowed.
  const canReturn = !admin;
  const returnState = (s) => {
    const ret = retBySale.get(s.id);
    const retQty = ret?.qty ?? 0;
    const fully = retQty > 0 && retQty >= s.totals.qty;
    return {
      ret,
      retQty,
      fully,
      partial: retQty > 0 && !fully,
      exchanged: ret?.exchanged ?? false,
      exchangeBills: ret?.exchangeBills ?? [],
      status: returnStatus(ret, s.totals.qty),
      origin: s.payment.creditNote ? retByNote.get(s.payment.creditNote) : null, // set when this bill IS an exchange
      returnable: canReturn && !fully,
    };
  };

  const scoped = useMemo(() => filterSales(sales, { location, period }), [sales, location, period]);
  const q = query.trim().toLowerCase();
  const rows = useMemo(
    () =>
      [...scoped]
        .filter((s) => !q || `${s.billNo} ${s.customer} ${s.phone}`.toLowerCase().includes(q))
        .filter((s) => status === 'all' || returnStatus(retBySale.get(s.id), s.totals.qty) === status)
        .filter(dueMatch[due])
        .sort((a, b) => new Date(b.at) - new Date(a.at)),
    [scoped, q, status, due, retBySale],
  );
  const sum = summarize(scoped, { gst });
  const paged = usePages(rows, PAGE, `${period}|${location}|${q}|${status}|${due}`);
  const owedNow = scoped.reduce((t, s) => t + (s.balance ?? 0), 0);
  const owingBills = scoped.filter((s) => s.balance > 0).length;
  const returned = filterSales(returns, { location, period }).reduce((t, r) => t + r.amount, 0);
  const retByLoc = useMemo(() => (admin ? returnsByLocation(returns, { period }) : []), [admin, returns, period]);

  // Jump to a specific bill from a cross-link (e.g. an exchange's original or new bill): widen the view and clear
  // any filters so it is on screen, then scroll to its row and flash it — the bill is NOT typed into the search.
  const openBill = (loc, billNo) => {
    const id = `${loc}-${billNo}`;
    setStatus('all');
    setDue('all');
    setPeriod('all');
    setQuery('');
    if (admin) setLocation(loc);
    setOpen(id);
    setHighlight(id);
  };

  // Once the list has re-rendered with the target in scope, bring its row into view and let the flash fade.
  useEffect(() => {
    if (!highlight) return undefined;
    const el = document.getElementById(`sale-${highlight}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => setHighlight(null), 2200);
    return () => clearTimeout(t);
  }, [highlight]);

  const doRefund = async (body) => {
    const { creditNote } = await recordReturn({ id: newId(), ...body }); // throws → ReturnDialog shows the message
    setReturnFor(null);
    setRefunded(creditNote);
  };
  const doExchange = (back) => {
    setReturnFor(null);
    onNavigate('counter', { exchange: back }); // the swap items are scanned at the counter
  };
  const exportExcel = async (which) => {
    setExporting(which);
    const from = periodStart(period, new Date());
    const get = which === 'final' ? downloadFinalSales : downloadSalesReport;
    try {
      await get({ location, since: from ? istDay(from) : undefined, until: istDay(new Date()) });
      setExporting('');
    } catch (err) {
      setExporting(err.message);
    }
  };
  const busy = exporting === 'final' || exporting === 'report';
  const shop = locationById(session.location);
  const cols = admin ? 10 : 8;


  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader crumbs={[shop ? `${shop.city} · ${shop.area}` : 'All showrooms', 'Sales']} onMenu={onMenu} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[100rem] flex-col gap-4 p-3 lg:px-5 lg:py-4">
          <div className="flex flex-wrap items-center gap-2">
            <PeriodTabs value={period} onChange={setPeriod} />
            {admin && <LocationPicker value={location} onChange={setLocation} />}
            {admin && (
              <button
                type="button"
                onClick={() => exportExcel('final')}
                disabled={busy}
                title="Each bill less its returns, with a total per showroom"
                className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-xl border border-evergreen-800/25 bg-white px-3.5 text-[13px] font-semibold text-evergreen-900 hover:border-evergreen-800/50 hover:bg-evergreen-50 disabled:opacity-60"
              >
                <Download size={15} aria-hidden="true" /> {exporting === 'final' ? 'Preparing…' : 'Final sales'}
              </button>
            )}
            <button
              type="button"
              onClick={() => exportExcel('report')}
              disabled={busy}
              className={`${admin ? '' : 'ml-auto '}inline-flex h-8 items-center gap-1.5 rounded-xl border border-evergreen-800/25 bg-white px-3.5 text-[13px] font-semibold text-evergreen-900 hover:border-evergreen-800/50 hover:bg-evergreen-50 disabled:opacity-60`}
            >
              <FileSpreadsheet size={15} aria-hidden="true" /> {exporting === 'report' ? 'Preparing…' : 'Export to Excel'}
            </button>
          </div>
          {exporting && !busy && (
            <p role="alert" className="text-xs font-medium text-ruby-ink">
              Couldn’t export: {exporting}
            </p>
          )}

          <SummaryStrip
            figures={[
              { label: `Sales · ${location ? locationById(location).label : 'All showrooms'}`, value: inrWhole(sum.total), note: gst ? 'incl. GST' : 'selling price' },
              { label: 'Bills', value: sum.bills.toLocaleString('en-IN'), note: `${sum.units.toLocaleString('en-IN')} units sold` },
              { label: 'Returns', value: inrWhole(returned), note: `net sales ${inrWhole(sum.total - returned)}` },
              ...(sum.discount > 0 ? [{ label: 'Discounts given', value: inrWhole(sum.discount), note: 'manual discounts' }] : []),
              ...(owedNow > 0
                ? [{ label: 'Owed on credit', value: inrWhole(owedNow), note: `${owingBills} ${owingBills === 1 ? 'bill' : 'bills'} with a balance due`, tone: 'warn' }]
                : []),
              { label: 'Average bill', value: inrWhole(sum.average) },
              ...(gst ? [{ label: 'GST collected', value: inrWhole(sum.tax) }] : []),
              ...(admin
                ? [
                    { label: 'Purchase cost', value: inrWhole(sum.cost), note: 'at cost price' },
                    {
                      label: 'Gross profit',
                      value: inrWhole(sum.profit),
                      note: `${(sum.margin * 100).toFixed(1)}% margin${gst ? ' excl. GST' : ''}`,
                      tone: sum.profit < 0 ? 'bad' : undefined,
                    },
                  ]
                : []),
            ]}
          />

          <ProductPerformance location={location} admin={admin} />

          {admin && returns.length > 0 && (
            <section className="overflow-clip rounded-2xl border glass">
              <div className="border-b border-line-soft px-4 py-2.5 text-[13px] font-semibold">
                Returns &amp; exchanges by showroom{' '}
                <span className="font-normal text-ink-3">· {PERIOD_NOTE[period]} · open a showroom to see each one</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-[13px] tabular-nums">
                  <thead>
                    <tr className="border-b border-line-soft text-left text-xs text-ink-3">
                      <th scope="col" className="w-8 py-1.5 pl-4" />
                      <th scope="col" className="py-1.5 pr-3 font-medium">Showroom</th>
                      <th scope="col" className="py-1.5 pr-3 text-right font-medium">Credit notes</th>
                      <th scope="col" className="py-1.5 pr-4 text-right font-medium">Credited</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retByLoc.map((r) => {
                      const isOpen = openLoc === r.location.id;
                      const notes = filterSales(returns, { location: r.location.id, period }).sort((a, b) => new Date(b.at) - new Date(a.at));
                      return (
                        <Fragment key={r.location.id}>
                          <tr
                            onClick={r.count ? rowClick(() => setOpenLoc(isOpen ? null : r.location.id)) : undefined}
                            className={`border-b border-line-soft ${r.count ? 'cursor-pointer' : ''} ${isOpen ? 'bg-mist-2' : r.count ? 'row-hover' : 'opacity-55'}`}
                          >
                            <td className="py-2 pl-4">
                              {r.count > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setOpenLoc(isOpen ? null : r.location.id)}
                                  aria-expanded={isOpen}
                                  aria-label={`${isOpen ? 'Hide' : 'Show'} ${r.location.label} returns`}
                                  className="inline-flex size-6 items-center justify-center rounded-md text-ink-3 hover:bg-mist hover:text-ink"
                                >
                                  <ChevronDown size={15} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </button>
                              )}
                            </td>
                            <td className="py-2 pr-3 font-medium">{r.location.label}</td>
                            <td className="py-2 pr-3 text-right text-ink-2">{r.count}</td>
                            <td className="py-2 pr-4 text-right font-medium">{inrWhole(r.amount)}</td>
                          </tr>
                          {isOpen && r.count > 0 && (
                            <tr className="border-b border-line-soft bg-mist-2">
                              <td colSpan={4} className="px-4 pt-1 pb-3">
                                <div className="ml-6 animate-pop overflow-x-auto rounded-xl border border-line-soft bg-surface">
                                  <table className="w-full min-w-[46rem] text-[13px] tabular-nums">
                                    <thead>
                                      <tr className="border-b border-line-soft text-left text-xs text-ink-3">
                                        <th scope="col" className="py-1.5 pr-3 pl-3 font-medium">Credit note</th>
                                        <th scope="col" className="py-1.5 pr-3 font-medium">Date</th>
                                        <th scope="col" className="py-1.5 pr-3 font-medium">Against bill</th>
                                        <th scope="col" className="py-1.5 pr-3 font-medium">Customer</th>
                                        <th scope="col" className="py-1.5 pr-3 font-medium">Type</th>
                                        <th scope="col" className="py-1.5 pr-3 text-right font-medium">Items</th>
                                        <th scope="col" className="py-1.5 pr-3 text-right font-medium">Value</th>
                                        <th scope="col" className="py-1.5 pr-3 text-right font-medium">Refunded</th>
                                        <th scope="col" className="py-1.5 pr-3 font-medium">New bill</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {notes.map((n) => {
                                        const qty = n.lines.reduce((t, l) => t + l.qty, 0);
                                        const exchange = n.kind === 'exchange';
                                        return (
                                          <tr key={n.id} className="border-b border-line-soft last:border-0">
                                            <td className="py-1.5 pr-3 pl-3 font-mono text-xs">{n.returnNo}</td>
                                            <td className="py-1.5 pr-3 whitespace-nowrap text-ink-2">{when.format(new Date(n.at))}</td>
                                            <td className="py-1.5 pr-3">
                                              <BillLink loc={n.location} billNo={n.billNo} onClick={openBill} />
                                            </td>
                                            <td className="py-1.5 pr-3">{n.name || (n.phone ? formatMobile(n.phone) : 'Walk-in')}</td>
                                            <td className="py-1.5 pr-3">
                                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${exchange ? 'bg-evergreen-50 text-evergreen-900' : 'bg-mist text-ink-2'}`}>
                                                {exchange ? 'Exchange' : 'Return'}
                                              </span>
                                            </td>
                                            <td className="py-1.5 pr-3 text-right">{qty}</td>
                                            <td className="py-1.5 pr-3 text-right font-medium">{inr(n.amount)}</td>
                                            <td className="py-1.5 pr-3 text-right text-ink-2">{n.refund > 0 ? inr(n.refund) : '—'}</td>
                                            <td className="py-1.5 pr-3">
                                              {n.exchangeBillNo ? <BillLink loc={n.location} billNo={n.exchangeBillNo} onClick={openBill} /> : <span className="text-ink-3">—</span>}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    <tr className="font-semibold">
                      <td className="py-2 pl-4" />
                      <td className="py-2 pr-3">All showrooms</td>
                      <td className="py-2 pr-3 text-right">{retByLoc.reduce((t, r) => t + r.count, 0)}</td>
                      <td className="py-2 pr-4 text-right">{inrWhole(retByLoc.reduce((t, r) => t + r.amount, 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="overflow-clip rounded-2xl border glass">
            <div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-4 py-2.5">
              <span className="text-[13px] text-ink-3">
                {rows.length.toLocaleString('en-IN')} {rows.length === 1 ? 'bill' : 'bills'}
                {(q || status !== 'all' || due !== 'all') && ' matching'}
              </span>
              <Segmented label="Return status" options={STATUS_FILTERS} value={status} onChange={setStatus} />
              <Segmented label="Credit" options={DUE_FILTERS} value={due} onChange={setDue} />
              <div className="flex flex-1 justify-end">
                <SearchBox value={query} onChange={setQuery} placeholder="Bill number, customer or mobile" />
              </div>
            </div>
            {rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <ReceiptText size={22} className="text-ink-3" aria-hidden="true" />
                <div className="text-[15px] font-semibold">No bills {q ? 'match that search' : 'in this period'}</div>
                <div className="text-[13px] text-ink-3">Completed sales from the billing counter show up here.</div>
              </div>
            ) : (
              // the page scrolls as one and the column headings stick; below xl the table scrolls in its own box
              <div className="max-h-[70dvh] overflow-auto xl:max-h-none xl:overflow-visible">
                <table className="w-full min-w-[56rem] text-[13px]">
                  <thead className="sticky top-0 z-1 bg-white/95 shadow-[0_1px_0_var(--color-line-soft)] backdrop-blur">
                    <tr className="border-b border-line-soft text-left text-xs text-ink-3">
                      <th scope="col" className="w-8 py-2.5 pl-4" />
                      <th scope="col" className="py-1.5 pr-3 font-medium">Bill</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Date</th>
                      {admin && <th scope="col" className="py-1.5 pr-3 font-medium">Showroom</th>}
                      <th scope="col" className="py-1.5 pr-3 font-medium">Customer</th>
                      <th scope="col" className="py-1.5 pr-3 text-right font-medium">Items</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Payment</th>
                      <th scope="col" className="py-1.5 pr-3 text-right font-medium">Amount</th>
                      {admin && <th scope="col" className="py-1.5 pr-3 text-right font-medium">Cost</th>}
                      {admin && <th scope="col" className="py-1.5 pr-4 text-right font-medium">Profit</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.rows.map((s) => {
                      const id = `${s.location}-${s.billNo}`;
                      const isOpen = open === id;
                      const isHighlight = highlight === id;
                      const cost = saleCost(s);
                      const rs = returnState(s);
                      return (
                        <Fragment key={id}>
                          <tr
                            id={`sale-${id}`}
                            onClick={rowClick(() => setOpen(isOpen ? null : id))}
                            className={`cursor-pointer border-b border-line-soft tabular-nums ${
                              isHighlight ? 'animate-pop bg-evergreen-50 shadow-[inset_3px_0_0_var(--color-evergreen-800)]' : isOpen ? 'bg-mist-2' : 'row-hover'
                            }`}
                          >
                            <td className="py-2.5 pl-4">
                              <button
                                type="button"
                                onClick={() => setOpen(isOpen ? null : id)}
                                aria-expanded={isOpen}
                                aria-label={`${isOpen ? 'Hide' : 'Show'} items on ${s.billNo}`}
                                className="inline-flex size-6 items-center justify-center rounded-md text-ink-3 hover:bg-mist hover:text-ink"
                              >
                                <ChevronDown size={15} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                              </button>
                            </td>
                            <td className="py-1.5 pr-3 font-mono text-xs">
                              {s.billNo}
                              {s.demo && <span className="ml-2 rounded bg-warn-50 px-1 font-sans text-[10px] font-medium text-warn-ink">DEMO</span>}
                              {rs.exchanged ? (
                                <span className="ml-2 rounded bg-evergreen-50 px-1 font-sans text-[10px] font-medium text-evergreen-900">EXCHANGED</span>
                              ) : rs.fully ? (
                                <span className="ml-2 rounded bg-ruby-50 px-1 font-sans text-[10px] font-medium text-ruby-ink">RETURNED</span>
                              ) : rs.partial ? (
                                <span className="ml-2 rounded bg-warn-50 px-1 font-sans text-[10px] font-medium text-warn-ink">PART RETURNED</span>
                              ) : null}
                              {rs.origin && <span className="ml-2 rounded bg-mist px-1 font-sans text-[10px] font-medium text-ink-2">EXCHANGE BILL</span>}
                            </td>
                            <td className="py-1.5 pr-3 whitespace-nowrap text-ink-2">{when.format(new Date(s.at))}</td>
                            {admin && <td className="py-1.5 pr-3 text-ink-2">{locationById(s.location)?.label ?? '—'}</td>}
                            <td className="py-1.5 pr-3">
                              <div className="font-medium">{s.name || 'Walk-in'}</div>
                              {s.phone && <div className="text-xs text-ink-3">{formatMobile(s.phone)}</div>}
                            </td>
                            <td className="py-1.5 pr-3 text-right">{s.totals.qty}</td>
                            <td className="py-1.5 pr-3 text-ink-2">
                              {methodLabel(s.payment.method)}
                              {s.balance > 0 ? (
                                <div className="text-[11px] font-medium text-warn-ink">{inr(s.balance)} due</div>
                              ) : (
                                isCreditBill(s) && <div className="text-[11px] text-ok-ink">credit · paid</div>
                              )}
                            </td>
                            <td className="py-1.5 pr-3 text-right font-semibold">
                              {inr(s.totals.payable)}
                              {s.totals.discount > 0 && (
                                <div className="text-[11px] font-normal text-ok-ink">−{inr(s.totals.discount)} disc</div>
                              )}
                            </td>
                            {admin && <td className="py-1.5 pr-3 text-right text-ink-2">{inr(cost)}</td>}
                            {admin && (
                              <td className={`py-1.5 pr-4 text-right font-medium ${(gst ? s.totals.taxable : s.totals.payable) - cost >= 0 ? 'text-ok-ink' : 'text-ruby-ink'}`}>
                                {inr((gst ? s.totals.taxable : s.totals.payable) - cost)}
                              </td>
                            )}
                          </tr>
                          {isOpen && (
                            <tr className="border-b border-line-soft bg-mist-2">
                              <td colSpan={cols} className="px-4 pt-1 pb-3">
                                <div className="ml-8 flex animate-pop flex-col gap-2">
                                  <ul className="flex flex-col rounded-xl border border-line-soft bg-surface p-2">
                                    {s.lines.map((l) => {
                                      const back = rs.ret?.byCode[l.code] ?? 0;
                                      return (
                                        <li key={l.code} className="flex items-center gap-3 px-2 py-1.5 tabular-nums">
                                          <span className="rounded-md bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{l.code}</span>
                                          <span className="min-w-0 flex-1 truncate">{l.name}</span>
                                          {back > 0 && <span className="shrink-0 text-[11px] font-medium text-warn-ink">{back} returned</span>}
                                          <span className="text-xs text-ink-3">
                                            {l.qty} × {inr(l.price)}
                                          </span>
                                          {admin && <span className="w-36 text-right text-xs text-ink-3">cost {inr(l.cost ?? 0)} each</span>}
                                          <span className="w-24 text-right font-medium">{inr(l.price * l.qty)}</span>
                                        </li>
                                      );
                                    })}
                                    {s.totals.discount > 0 && (
                                      <li className="mt-1 flex items-center justify-between gap-3 border-t border-line-soft px-2 pt-2 text-xs tabular-nums">
                                        <span className="text-ink-2">
                                          Discount{s.totals.discountKind === 'percent' ? ` (${s.totals.discountValue}%)` : ''}
                                        </span>
                                        <span className="font-medium text-ok-ink">−{inr(s.totals.discount)}</span>
                                      </li>
                                    )}
                                  </ul>
                                  {rs.origin && (
                                    <div className="flex flex-wrap items-center gap-1.5 px-1 text-xs text-ink-2">
                                      <Repeat size={13} className="text-ink-3" aria-hidden="true" />
                                      This bill is an exchange against
                                      <BillLink loc={rs.origin.location} billNo={rs.origin.billNo} onClick={openBill} />
                                      {s.payment.credit > 0 && <span className="text-ink-3">· {inr(s.payment.credit)} credit used · note {s.payment.creditNote}</span>}
                                    </div>
                                  )}
                                  {isCreditBill(s) && (
                                    <div className="flex flex-col gap-1.5 rounded-xl border border-line-soft bg-surface px-3 py-2.5 text-xs tabular-nums">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="flex items-center gap-1.5 font-semibold text-ink">
                                          <HandCoins size={13} className="text-ink-3" aria-hidden="true" /> Credit bill
                                          <span className="font-normal text-ink-3">
                                            · {inr(paidAtCounter(s))} paid at the counter · {inr(s.payment.later)} left on credit
                                          </span>
                                        </span>
                                        <span className={`font-semibold ${s.balance > 0 ? 'text-warn-ink' : 'text-ok-ink'}`}>
                                          {s.balance > 0 ? `${inr(s.balance)} still owed` : 'Paid in full'}
                                        </span>
                                      </div>
                                      {(s.collections ?? []).map((c) => (
                                        <div key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-line-soft pt-1.5 text-ink-2">
                                          <span className="font-mono">{c.receiptNo}</span>
                                          <span className="text-ink-3">{when.format(new Date(c.at))}</span>
                                          <span>{methodLabel(c.payment.method)}</span>
                                          <span className="font-medium text-ink">{inr(c.amount)}</span>
                                          {c.payment.after !== undefined && <span className="text-ink-3">{c.payment.after > 0 ? `${inr(c.payment.after)} left after` : 'cleared the bill'}</span>}
                                          <button
                                            type="button"
                                            onClick={() => setReprint({ sale: s, collection: c })}
                                            className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-ink-3 hover:bg-mist hover:text-ink"
                                          >
                                            <Printer size={12} aria-hidden="true" /> Receipt
                                          </button>
                                        </div>
                                      ))}
                                      {!admin && s.balance > 0 && (
                                        <div className="flex justify-end border-t border-line-soft pt-2">
                                          <button
                                            type="button"
                                            onClick={() => setCollecting(s.id)}
                                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-evergreen-800 px-3 text-[13px] font-semibold text-white hover:bg-evergreen-900"
                                          >
                                            <HandCoins size={14} aria-hidden="true" /> Collect balance {inr(s.balance)}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {rs.exchangeBills.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1.5 px-1 text-xs text-ink-2">
                                      <Repeat size={13} className="text-ink-3" aria-hidden="true" />
                                      Exchanged for
                                      {rs.exchangeBills.map((b) => (
                                        <BillLink key={b} loc={s.location} billNo={b} onClick={openBill} />
                                      ))}
                                    </div>
                                  )}
                                  {(rs.retQty > 0 || rs.returnable) && (
                                    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                                      <span className="text-xs text-ink-3">
                                        {rs.retQty > 0
                                          ? `${rs.exchanged ? 'Swapped' : 'Returned'} ${rs.retQty} of ${s.totals.qty} ${s.totals.qty === 1 ? 'item' : 'items'} · ${inr(rs.ret.amount)} ${rs.exchanged ? 'in exchange credit' : 'credited'}${rs.ret.refund > 0 ? ` · ${inr(rs.ret.refund)} refunded in cash` : ''}`
                                          : 'Nothing returned yet'}
                                      </span>
                                      {rs.returnable && (
                                        <button
                                          type="button"
                                          onClick={() => setReturnFor(s.billNo)}
                                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-evergreen-800/25 bg-white px-3 text-[13px] font-semibold text-evergreen-900 hover:border-evergreen-800/50 hover:bg-evergreen-50"
                                        >
                                          <Undo2 size={14} aria-hidden="true" /> Return / exchange
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
                <Pager {...paged.pager} />
              </div>
            )}
          </section>
        </div>
      </div>

      {collecting && sales.some((s) => s.id === collecting) && (
        <CollectBalance sale={sales.find((s) => s.id === collecting)} onClose={() => setCollecting(null)} />
      )}
      {reprint && createPortal(<PaymentReceiptPrint sale={reprint.sale} collection={reprint.collection} />, document.body)}
      {returnFor && (
        <ReturnDialog
          location={session.location}
          sales={sales}
          findBill={findBill}
          startBillNo={returnFor}
          onRefund={doRefund}
          onExchange={doExchange}
          onClose={() => setReturnFor(null)}
        />
      )}
      {refunded && (
        <Dialog id="refunded" title="Refund in cash" subtitle={`${refunded.returnNo} · against ${refunded.billNo}`} onClose={() => setRefunded(null)} size="max-w-sm">
          <div className="flex flex-col gap-4 px-6 pb-6">
            <div className="rounded-2xl bg-evergreen-50 px-4 py-3.5 text-center">
              <div className="text-[13px] font-medium text-evergreen-900">Give back</div>
              <div className="text-[34px] leading-tight font-semibold tracking-tight text-evergreen-900 tabular-nums">{inr(refunded.refund)}</div>
              <div className="text-xs text-evergreen-900/80">in cash · the items are back in stock</div>
              {refunded.balanceOff > 0 && (
                <div className="mt-1 text-xs font-medium text-evergreen-900">{inr(refunded.balanceOff)} of the value paid off what was owed on the bill</div>
              )}
            </div>
            <button type="button" autoFocus onClick={() => setRefunded(null)} className="inline-flex h-10 items-center justify-center rounded-xl bg-evergreen-800 text-[13px] font-semibold text-white hover:bg-evergreen-900">
              Done
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default Sales;
