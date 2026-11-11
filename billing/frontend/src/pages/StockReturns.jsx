import { Fragment, useEffect, useState } from 'react';
import { ChevronDown, History, PackageCheck, Printer, Undo2 } from 'lucide-react';
import CountInDialog from '../components/CountInDialog.jsx';
import { LocationPicker, Segmented } from '../components/Filters.jsx';
import OrderPrint from '../components/OrderPrint.jsx';
import PageHeader from '../components/PageHeader.jsx';
import SendBackDialog from '../components/SendBackDialog.jsx';
import { locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { inr } from '../lib/money.js';
import { orderGst, orderQty, orderTotal, orderValue, PO_GST } from '../lib/orders.js';
import Pager from '../components/Pager.jsx';
import { usePages } from '../hooks/usePages.js';
import { rowClick } from '../lib/rowClick.js';

const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const RETURN_STATUS = {
  sent: { label: 'On the way', className: 'bg-warn-50 text-warn-ink' },
  received: { label: 'Received', className: 'bg-mist text-ink-2' },
};
const REASON_LABEL = {
  'end-of-season': 'End of the season',
  'another-store': 'For another showroom',
  damaged: 'Damaged',
  other: 'Other',
};
const ACTION_LABEL = { sent: 'Sent back', received: 'Counted in by the admin' };

const TABS = {
  location: [
    { id: 'sent', label: 'On the way' },
    { id: 'received', label: 'Received' },
    { id: 'all', label: 'All' },
  ],
  admin: [
    { id: 'sent', label: 'To receive' },
    { id: 'received', label: 'Received' },
    { id: 'all', label: 'All' },
  ],
};

const primary =
  'inline-flex h-8 items-center gap-1.5 rounded-lg bg-evergreen-800 px-3 text-[13px] font-semibold text-white hover:bg-evergreen-900';

/**
 * Purchase returns, the way stock goes back from a showroom, and only ever to the admin:
 *   showroom sends items back (end of the season, another showroom needs them, damaged) → they leave its stock
 *   → admin counts them in when they arrive; any shortfall is kept on the return.
 * A showroom sees its own and sends; the admin sees every showroom's and counts them in.
 */
const StockReturns = ({ session, onMenu, onNavigate }) => {
  const admin = session.role === 'admin';
  const { stockReturns, receiveStockBack } = useStore();
  const [tab, setTab] = useState(TABS[session.role][0].id);
  const [location, setLocation] = useState(admin ? null : session.location);
  const [sending, setSending] = useState(false);
  const [counting, setCounting] = useState(null);
  const [open, setOpen] = useState(null);
  const [flash, setFlash] = useState(null);
  const [printing, setPrinting] = useState(null); // the return on the print page
  const [printJob, setPrintJob] = useState(0);

  useEffect(() => {
    if (printJob) window.print();
  }, [printJob]);
  const print = (r) => {
    setPrinting(r);
    setPrintJob((n) => n + 1);
  };

  const mine = stockReturns.filter((r) => !location || r.location === location);
  const count = (id) => mine.filter((r) => id === 'all' || r.status === id).length;
  const list = mine.filter((r) => tab === 'all' || r.status === tab).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const paged = usePages(list, 50, `${tab}|${location}`);
  const shop = locationById(session.location);

  const receive = async (counted, note) => {
    const r = counting;
    setCounting(null);
    try {
      await receiveStockBack(r.id, counted, note);
      setFlash({ tone: 'ok', text: `${r.number} counted in: ${orderQty(counted).toLocaleString('en-IN')} of ${orderQty(r.lines).toLocaleString('en-IN')} units arrived.` });
      setTab('received');
    } catch (err) {
      setFlash({ tone: 'warn', text: `Not saved: ${err.message}` });
    }
  };

  return (
    <>
    <div className="flex min-h-0 flex-1 flex-col print:hidden">
      <PageHeader crumbs={[admin ? 'All showrooms' : `${shop.city} · ${shop.area}`, 'Purchase returns']} onMenu={onMenu} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[100rem] flex-col gap-4 p-3 lg:px-5 lg:py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-ink-3">
              {admin
                ? 'Purchase returns from the showrooms. Count each one in when it arrives; it goes into your admin stock, and anything missing is kept on the return.'
                : 'Return stock to the admin: what’s left at the end of the season, items another showroom needs, or damaged goods. The units leave your stock when you send them.'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('inventory', { tab: 'history' })}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-evergreen-800/25 bg-white px-4 text-[13px] font-semibold text-evergreen-900 hover:border-evergreen-800/50 hover:bg-evergreen-50"
              >
                <History size={16} aria-hidden="true" /> Stock history
              </button>
              {!admin && (
                <button
                  type="button"
                  onClick={() => {
                    setSending(true);
                    setFlash(null);
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white hover:bg-evergreen-900"
                >
                  <Undo2 size={16} aria-hidden="true" /> New purchase return
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label="Purchase returns"
              options={TABS[session.role].map((t) => ({ ...t, label: `${t.label}${count(t.id) ? ` · ${count(t.id)}` : ''}` }))}
              value={tab}
              onChange={setTab}
            />
            {admin && <LocationPicker value={location} onChange={setLocation} />}
          </div>

          {flash && (
            <div role="status" className={`animate-pop rounded-xl px-4 py-2.5 text-[13px] font-medium ${flash.tone === 'warn' ? 'bg-warn-50 text-warn-ink' : 'bg-ok-50 text-ok-ink'}`}>
              {flash.text}
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border glass">
            {list.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <Undo2 size={22} className="text-ink-3" aria-hidden="true" />
                <div className="text-[15px] font-semibold">Nothing here</div>
                <div className="max-w-sm text-[13px] text-ink-3">
                  {admin && tab === 'sent' ? 'When a showroom sends stock back, it shows up here to count in.' : 'No purchase returns in this list yet.'}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[52rem] text-[13px] tabular-nums">
                  <thead>
                    <tr className="border-b border-line-soft text-left text-xs text-ink-3">
                      <th scope="col" className="w-8 py-2.5 pl-4" />
                      <th scope="col" className="py-1.5 pr-3 font-medium">Return</th>
                      {admin && <th scope="col" className="py-1.5 pr-3 font-medium">Showroom</th>}
                      <th scope="col" className="py-1.5 pr-3 font-medium">Status</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Reason</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Updated</th>
                      <th scope="col" className="py-1.5 pr-3 text-right font-medium">Products</th>
                      <th scope="col" className="py-1.5 pr-3 text-right font-medium">Units</th>
                      {admin && <th scope="col" className="py-1.5 pr-3 text-right font-medium">Value at cost</th>}
                      <th scope="col" className="py-1.5 pr-4 text-right font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.rows.map((r) => {
                      const isOpen = open === r.id;
                      return (
                        <Fragment key={r.id}>
                          <tr onClick={rowClick(() => setOpen(isOpen ? null : r.id))} className={`cursor-pointer border-b border-line-soft ${isOpen ? 'bg-mist-2' : 'row-hover'}`}>
                            <td className="py-2.5 pl-4">
                              <button
                                type="button"
                                onClick={() => setOpen(isOpen ? null : r.id)}
                                aria-expanded={isOpen}
                                aria-label={`${isOpen ? 'Hide' : 'Show'} ${r.number}`}
                                className="inline-flex size-6 items-center justify-center rounded-md text-ink-3 hover:bg-mist hover:text-ink"
                              >
                                <ChevronDown size={15} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                              </button>
                            </td>
                            <td className="py-1.5 pr-3 font-mono text-xs">{r.number}</td>
                            {admin && <td className="py-1.5 pr-3 text-ink-2">{locationById(r.location)?.label}</td>}
                            <td className="py-1.5 pr-3">
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${RETURN_STATUS[r.status].className}`}>{RETURN_STATUS[r.status].label}</span>
                            </td>
                            <td className="py-1.5 pr-3 text-ink-2">{REASON_LABEL[r.reason] ?? r.reason}</td>
                            <td className="py-1.5 pr-3 whitespace-nowrap text-ink-2">{when.format(new Date(r.updatedAt))}</td>
                            <td className="py-1.5 pr-3 text-right">{r.lines.length}</td>
                            <td className="py-1.5 pr-3 text-right">
                              {r.status === 'received' ? `${orderQty(r.counted ?? [])} of ${orderQty(r.lines)}` : orderQty(r.lines)}
                            </td>
                            {admin && <td className="py-1.5 pr-3 text-right font-medium">{inr(orderValue(r.lines))}</td>}
                            <td className="py-1.5 pr-4">
                              <div className="flex justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => print(r)}
                                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink"
                                >
                                  <Printer size={14} aria-hidden="true" /> Print
                                </button>
                                {admin && r.status === 'sent' && (
                                  <button type="button" onClick={() => setCounting(r)} className={primary}>
                                    <PackageCheck size={14} aria-hidden="true" /> Count in
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="border-b border-line-soft bg-mist-2">
                              <td colSpan={admin ? 10 : 8} className="px-4 pt-1 pb-4">
                                <div className="ml-8 grid animate-pop gap-3 md:grid-cols-[minmax(0,1fr)_16rem]">
                                  <div className="flex flex-col gap-2">
                                  <ul className="flex flex-col rounded-xl border border-line-soft bg-surface p-2">
                                    {r.lines.map((l) => {
                                      const got = r.counted?.find((c) => c.code === l.code)?.qty ?? 0;
                                      return (
                                        <li key={l.code} className="flex items-center gap-3 px-2 py-1.5">
                                          <span className="rounded-md bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{l.code}</span>
                                          <span className="min-w-0 flex-1 truncate">{l.name}</span>
                                          {r.status === 'received' && got !== l.qty && <span className="text-xs font-medium text-warn-ink">counted {got}</span>}
                                          <span className="text-xs text-ink-3">{l.qty}</span>
                                          {admin && <span className="w-28 text-right text-xs text-ink-2 tabular-nums">× {inr(l.rate)} cost</span>}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                  <div className="flex flex-col gap-1 rounded-xl border border-line-soft bg-surface px-3 py-2 text-[13px] tabular-nums">
                                    <div className="flex justify-between text-ink-2">
                                      <span>Goods value</span>
                                      <span>{inr(orderValue(r.lines))}</span>
                                    </div>
                                    <div className="flex justify-between text-ink-2">
                                      <span>GST {PO_GST}%</span>
                                      <span>{inr(orderGst(r.lines))}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-line-soft pt-1 font-semibold">
                                      <span>Total credit</span>
                                      <span>{inr(orderTotal(r.lines))}</span>
                                    </div>
                                  </div>
                                  </div>
                                  <ol aria-label="History" className="flex flex-col gap-2 text-xs">
                                    {r.history.map((h) => (
                                      <li key={h.at + h.action} className="flex gap-2">
                                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-evergreen-800" aria-hidden="true" />
                                        <span>
                                          <span className="font-medium text-ink">{ACTION_LABEL[h.action] ?? h.action}</span>
                                          <span className="text-ink-3">
                                            {' '}
                                            · {h.by} · {when.format(new Date(h.at))}
                                          </span>
                                          {h.note && <span className="mt-0.5 block text-ink-2">“{h.note}”</span>}
                                        </span>
                                      </li>
                                    ))}
                                  </ol>
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

      {sending && (
        <SendBackDialog
          location={session.location}
          onClose={() => setSending(false)}
          onDone={(r) => {
            setSending(false);
            setFlash({ tone: 'ok', text: `${r.number} sent to the admin: ${orderQty(r.lines).toLocaleString('en-IN')} units taken off your stock.` });
            setTab('sent');
          }}
        />
      )}
      {counting && (
        <CountInDialog
          order={counting}
          subtitle={`Stock sent back by ${locationById(counting.location)?.label}. Count what arrived; any shortfall is kept on the return.`}
          onClose={() => setCounting(null)}
          onConfirm={receive}
        />
      )}
    </div>
      {printing && <OrderPrint doc={printing} kind="return" />}
    </>
  );
};

export default StockReturns;
