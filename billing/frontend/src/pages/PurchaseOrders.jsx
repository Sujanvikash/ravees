import { Fragment, useState } from 'react';
import { ChevronDown, ClipboardList, History, PackageCheck, PencilLine, Plus, Send } from 'lucide-react';
import CountInDialog from '../components/CountInDialog.jsx';
import { LocationPicker, Segmented } from '../components/Filters.jsx';
import OrderEditor from '../components/OrderEditor.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { inr } from '../lib/money.js';
import { orderQty, orderValue, STATUS } from '../lib/orders.js';

const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// Each login's tabs, most urgent first: what it needs to act on.
const TABS = {
  location: [
    { id: 'sent', label: 'To count in' },
    { id: 'requested', label: 'Requested' },
    { id: 'received', label: 'Received' },
    { id: 'all', label: 'All' },
  ],
  admin: [
    { id: 'requested', label: 'To review' },
    { id: 'sent', label: 'On the way' }, // approved, not counted in by the showroom yet
    { id: 'received', label: 'Received' },
    { id: 'all', label: 'All' },
  ],
};

const ACTION_LABEL = {
  requested: 'Requested',
  updated: 'Request updated',
  sent: 'Approved and sent',
  received: 'Counted in',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const primary =
  'inline-flex h-8 items-center gap-1.5 rounded-lg bg-evergreen-800 px-3 text-[13px] font-semibold text-white hover:bg-evergreen-900';
const quiet = 'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink';

/**
 * Purchase orders, the only way stock gets into a showroom:
 *   showroom requests stock → admin reviews, edits and sends it → showroom counts the delivery in.
 * A showroom sees its own orders and raises requests; the admin sees every showroom's and only reviews them.
 */
const PurchaseOrders = ({ session, onMenu, onNavigate }) => {
  const admin = session.role === 'admin';
  const { orders, requestOrder, updateOrder, sendOrder, rejectOrder, cancelOrder, receiveOrder } = useStore();
  const [tab, setTab] = useState(TABS[session.role][0].id);
  const [location, setLocation] = useState(admin ? null : session.location);
  const [editing, setEditing] = useState(null); // an order (new ones have no number yet)
  const [counting, setCounting] = useState(null);
  const [open, setOpen] = useState(null);
  const [flash, setFlash] = useState(null);

  const mine = orders.filter((o) => !location || o.location === location);
  const count = (id) => mine.filter((o) => id === 'all' || o.status === id).length;
  const list = mine.filter((o) => tab === 'all' || o.status === tab).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  const done = (text) => {
    setFlash(text);
    setEditing(null);
    setCounting(null);
  };

  // Each step goes to the server, which numbers the order and checks it may move on; its answer is what shows.
  const attempt = async (step) => {
    try {
      await step();
    } catch (err) {
      setFlash(`Not saved: ${err.message}`);
    }
  };

  const save = ({ location: loc, lines, note }) =>
    attempt(async () => {
      const body = { lines: lines.map((l) => ({ code: l.code, qty: l.qty, rate: l.rate })), note };
      const order = !editing.number
        ? await requestOrder({ ...body, location: loc })
        : admin
          ? await sendOrder(editing.id, body)
          : await updateOrder(editing.id, body);
      done(admin ? `${order.number} approved and sent to ${locationById(order.location).city}.` : `${order.number} sent to the admin.`);
      setTab(admin ? 'sent' : 'requested');
    });

  const reject = (reason) =>
    attempt(async () => {
      await rejectOrder(editing.id, reason);
      done(`${editing.number} rejected.`);
    });

  const cancel = (o) =>
    attempt(async () => {
      await cancelOrder(o.id);
      setFlash(`${o.number} cancelled.`);
    });

  const receive = (counted, note) =>
    attempt(async () => {
      await receiveOrder(counting.id, counted, note);
      done(`${counting.number} counted in: ${orderQty(counted).toLocaleString('en-IN')} units added to stock.`);
      setTab('received');
    });

  const shop = locationById(session.location);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader crumbs={[admin ? 'All showrooms' : `${shop.city} · ${shop.area}`, 'Purchase orders']} onMenu={onMenu} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[100rem] flex-col gap-4 p-3 lg:px-5 lg:py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13px] text-ink-3">
                {admin
                  ? 'Review showroom requests, adjust them, then approve and send them. Stock is added when the showroom counts the delivery in.'
                  : 'Request stock from the admin, and count deliveries in when they arrive. Counting in adds to your stock.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('inventory', { tab: 'history' })}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-evergreen-800/25 bg-white px-4 text-[13px] font-semibold text-evergreen-900 shadow-[0_1px_2px_rgba(9,9,11,0.06)] hover:border-evergreen-800/50 hover:bg-evergreen-50"
              >
                <History size={16} aria-hidden="true" /> Stock history
              </button>
              {!admin && (
                <button
                  type="button"
                  onClick={() => setEditing({ location: session.location, lines: [] })}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(9,9,11,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-evergreen-900"
                >
                  <Plus size={16} aria-hidden="true" /> Request stock
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label="Orders"
              options={TABS[session.role].map((t) => ({ ...t, label: `${t.label}${count(t.id) ? ` · ${count(t.id)}` : ''}` }))}
              value={tab}
              onChange={setTab}
            />
            {admin && <LocationPicker value={location} onChange={setLocation} />}
          </div>

          {flash && (
            <div role="status" className="animate-pop rounded-xl bg-ok-50 px-4 py-2.5 text-[13px] font-medium text-ok-ink">
              {flash}
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border glass">
            {list.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <ClipboardList size={22} className="text-ink-3" aria-hidden="true" />
                <div className="text-[15px] font-semibold">Nothing here</div>
                <div className="max-w-sm text-[13px] text-ink-3">
                  {tab === 'sent' && !admin
                    ? 'When the admin sends you a purchase order, it shows up here to count in.'
                    : tab === 'requested' && admin
                      ? 'Stock requests from the showrooms show up here for review.'
                      : 'No orders in this list yet.'}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[52rem] text-[13px] tabular-nums">
                  <thead>
                    <tr className="border-b border-line-soft text-left text-xs text-ink-3">
                      <th scope="col" className="w-8 py-2.5 pl-4" />
                      <th scope="col" className="py-1.5 pr-3 font-medium">Order</th>
                      {admin && <th scope="col" className="py-1.5 pr-3 font-medium">Showroom</th>}
                      <th scope="col" className="py-1.5 pr-3 font-medium">Status</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Updated</th>
                      <th scope="col" className="py-1.5 pr-3 text-right font-medium">Products</th>
                      <th scope="col" className="py-1.5 pr-3 text-right font-medium">Units</th>
                      {admin && <th scope="col" className="py-1.5 pr-3 text-right font-medium">Value</th>}
                      <th scope="col" className="py-1.5 pr-4 text-right font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((o) => {
                      const isOpen = open === o.id;
                      return (
                        <Fragment key={o.id}>
                          <tr className={`border-b border-line-soft ${isOpen ? 'bg-mist-2' : 'row-hover'}`}>
                            <td className="py-2.5 pl-4">
                              <button
                                type="button"
                                onClick={() => setOpen(isOpen ? null : o.id)}
                                aria-expanded={isOpen}
                                aria-label={`${isOpen ? 'Hide' : 'Show'} ${o.number}`}
                                className="inline-flex size-6 items-center justify-center rounded-md text-ink-3 hover:bg-mist hover:text-ink"
                              >
                                <ChevronDown size={15} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                              </button>
                            </td>
                            <td className="py-1.5 pr-3 font-mono text-xs">{o.number}</td>
                            {admin && <td className="py-1.5 pr-3 text-ink-2">{locationById(o.location).city}</td>}
                            <td className="py-1.5 pr-3">
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS[o.status].className}`}>{STATUS[o.status].label}</span>
                            </td>
                            <td className="py-1.5 pr-3 whitespace-nowrap text-ink-2">{when.format(new Date(o.updatedAt))}</td>
                            <td className="py-1.5 pr-3 text-right">{o.lines.length}</td>
                            <td className="py-1.5 pr-3 text-right">
                              {o.status === 'received' ? `${orderQty(o.counted ?? [])} of ${orderQty(o.lines)}` : orderQty(o.lines)}
                            </td>
                            {admin && <td className="py-1.5 pr-3 text-right font-medium">{inr(orderValue(o.lines))}</td>}
                            <td className="py-1.5 pr-4">
                              <div className="flex justify-end gap-1">
                                {!admin && o.status === 'sent' && (
                                  <button type="button" onClick={() => setCounting(o)} className={primary}>
                                    <PackageCheck size={14} aria-hidden="true" /> Count in
                                  </button>
                                )}
                                {!admin && o.status === 'requested' && (
                                  <>
                                    <button type="button" onClick={() => cancel(o)} className={quiet}>
                                      Cancel
                                    </button>
                                    <button type="button" onClick={() => setEditing(o)} className={quiet}>
                                      <PencilLine size={14} aria-hidden="true" /> Edit
                                    </button>
                                  </>
                                )}
                                {admin && o.status === 'requested' && (
                                  <button type="button" onClick={() => setEditing(o)} className={primary}>
                                    <Send size={14} aria-hidden="true" /> Review &amp; send
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="border-b border-line-soft bg-mist-2">
                              <td colSpan={admin ? 9 : 7} className="px-4 pt-1 pb-4">
                                <div className="ml-8 grid animate-pop gap-3 md:grid-cols-[minmax(0,1fr)_16rem]">
                                  <ul className="flex flex-col rounded-xl border border-line-soft bg-surface p-2">
                                    {o.lines.map((l) => {
                                      const got = o.counted?.find((c) => c.code === l.code)?.qty ?? 0;
                                      return (
                                        <li key={l.code} className="flex items-center gap-3 px-2 py-1.5">
                                          <span className="rounded-md bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{l.code}</span>
                                          <span className="min-w-0 flex-1 truncate">{l.name}</span>
                                          {o.status === 'received' && got !== l.qty && (
                                            <span className="text-xs font-medium text-warn-ink">counted {got}</span>
                                          )}
                                          <span className="text-xs text-ink-3">
                                            {l.qty}
                                            {admin && ` × ${inr(l.rate)}`}
                                          </span>
                                          {admin && <span className="w-24 text-right font-medium">{inr(l.qty * l.rate)}</span>}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                  <ol aria-label="History" className="flex flex-col gap-2 text-xs">
                                    {o.history.map((h) => (
                                      <li key={h.at + h.action} className="flex gap-2">
                                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-evergreen-800" aria-hidden="true" />
                                        <span>
                                          <span className="font-medium text-ink">{ACTION_LABEL[h.action]}</span>
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
              </div>
            )}
          </section>
        </div>
      </div>

      {editing && (
        <OrderEditor
          key={editing.id ?? 'new'}
          session={session}
          order={editing}
          onClose={() => setEditing(null)}
          onSave={save}
          onReject={admin && editing.status === 'requested' ? reject : null}
        />
      )}
      {counting && <CountInDialog order={counting} onClose={() => setCounting(null)} onConfirm={receive} />}
    </div>
  );
};

export default PurchaseOrders;
