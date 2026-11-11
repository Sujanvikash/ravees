import { useState } from 'react';
import { History, Mail, MapPin, Phone, ReceiptText, RotateCw, Save, Search, Truck } from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import Chip from '../../components/Chip.jsx';
import Button from '../../components/Button.jsx';
import FormError from '../../components/FormError.jsx';
import FormField from '../../components/FormField.jsx';
import PageLoader from '../../components/PageLoader.jsx';
import { Input, Select } from '../../components/Input.jsx';
import DataTable from '../components/DataTable.jsx';
import AdminPageHeader from '../components/AdminPageHeader.jsx';
import { useAdminList } from '../useAdminList.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { ADMIN_LABEL } from '../components/adminForm.js';
import { cardClass } from '../../components/cardClass.js';
import { formatDate, formatPrice } from '../../lib/format.js';
import { ORDER_STATUSES, addressLines, statusBadgeClass, statusLabel } from '../../lib/orders.js';

// The usual next step for an order, offered first when it is opened.
const NEXT = { paid: 'shipped', shipped: 'delivered' };

const SECTION_TITLE = 'mb-2 flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-gold-400';

/** One order in full, and the form that moves it along (status and a note, e.g. the courier's tracking number). */
const OrderPanel = ({ order, onSaved }) => {
  const { request } = useAdminAuth();
  const { showToast } = useToast();
  const [status, setStatus] = useState(NEXT[order.status] ?? order.status);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const name = order.customer?.name ?? order.address?.name;
  const email = order.customer?.email ?? order.address?.email;
  const phone = order.customer?.phone ?? order.address?.phone;

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const saved = await request(`/admin/orders/${order.id}`, { method: 'PATCH', body: { status, note: note.trim() } });
      onSaved(saved);
      showToast(`Order ${order.number}: ${statusLabel(saved.status ?? status)}`);
      setNote('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 p-6 md:grid-cols-[1.3fr_1fr] md:p-7">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3 text-[0.82rem] text-text-secondary">
          <span className={statusBadgeClass(order.status)}>{statusLabel(order.status)}</span>
          <span>Placed {formatDate(order.createdAt, true)}</span>
        </div>

        <div>
          <h3 className={SECTION_TITLE}>Items</h3>
          <ul className="flex list-none flex-col">
            {order.lines.map((line, i) => (
              <li key={`${line.productId}-${i}`} className="flex items-center gap-3 border-b border-white/6 py-2.5 last:border-0">
                <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-gold-400/20 bg-bg-deepest">
                  {line.image && <img src={line.image} alt="" className="size-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.86rem] text-white">{line.name}</p>
                  <p className="text-[0.75rem] text-text-muted">
                    {formatPrice(line.price)} × {line.qty} · <span className="font-mono">{line.productId}</span>
                  </p>
                </div>
                <span className="text-[0.88rem] text-gold-200">{formatPrice(line.amount)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-2 flex flex-col gap-1 border-t border-gold-400/15 pt-2 text-[0.84rem]">
            <div className="flex justify-between">
              <dt className="text-text-muted">Subtotal</dt>
              <dd className="text-text-primary">{formatPrice(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Delivery</dt>
              <dd className="text-text-primary">{order.delivery > 0 ? formatPrice(order.delivery) : 'Free'}</dd>
            </div>
            <div className="flex justify-between text-[0.95rem] font-bold">
              <dt className="text-white">Total</dt>
              <dd className="text-gold-300">{formatPrice(order.total)}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h3 className={SECTION_TITLE}>Payment</h3>
          <p className="text-[0.85rem] text-text-secondary">
            {order.paidAt ? `Paid ${formatPrice(order.total)} online (Razorpay) on ${formatDate(order.paidAt, true)}` : 'Not paid yet.'}
          </p>
        </div>

        {order.history?.length > 0 && (
          <div>
            <h3 className={SECTION_TITLE}>
              <History size={13} strokeWidth={2} /> History
            </h3>
            <ol className="flex list-none flex-col gap-2 text-[0.82rem]">
              {order.history.map((step, i) => (
                <li key={`${step.at}-${i}`} className="flex flex-wrap gap-x-2">
                  <span className="text-text-muted">{formatDate(step.at, true)}</span>
                  <span className="text-white">{statusLabel(step.status)}</span>
                  {step.note && <span className="text-text-secondary">· {step.note}</span>}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <div className={`${cardClass('tile')} p-4 text-[0.84rem] text-text-secondary`}>
          <h3 className={SECTION_TITLE}>Customer</h3>
          <p className="text-white">{name}</p>
          {email && (
            <a href={`mailto:${email}`} className="flex items-center gap-1.5 text-text-secondary no-underline hover:text-gold-300">
              <Mail size={13} strokeWidth={2} /> {email}
            </a>
          )}
          {phone && (
            <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-1.5 text-text-secondary no-underline hover:text-gold-300">
              <Phone size={13} strokeWidth={2} /> {phone}
            </a>
          )}

          <h3 className={`${SECTION_TITLE} mt-4`}>
            <MapPin size={13} strokeWidth={2} /> Deliver to
          </h3>
          <address className="flex flex-col not-italic leading-[1.6]">
            {addressLines(order.address).map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </address>
          {order.notes && <p className="mt-2 text-text-muted">Notes: {order.notes}</p>}
        </div>

        <form onSubmit={save} noValidate className={`${cardClass('form')} flex flex-col gap-3 p-4`}>
          <h3 className={SECTION_TITLE}>
            <Truck size={13} strokeWidth={2} /> Move it along
          </h3>
          <FormField label="Status" htmlFor="order-status" labelClassName={ADMIN_LABEL}>
            <Select id="order-status" size="sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Note (the customer sees it)" htmlFor="order-note" labelClassName={ADMIN_LABEL}>
            <Input
              id="order-note"
              size="sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Sent with DTDC, tracking no. D12345678"
            />
          </FormField>
          <p className="text-[0.72rem] text-text-muted">The customer is emailed when the order is marked shipped.</p>
          <FormError>{error}</FormError>
          <Button size="sm" type="submit" disabled={saving || (status === order.status && !note.trim())} className="self-start">
            <Save size={14} strokeWidth={2} />
            {saving ? 'Saving...' : 'Update order'}
          </Button>
        </form>
      </div>
    </div>
  );
};

/** Every order, newest first: filter by status, search by number or name, open one to see it all and move it along. */
const AdminOrders = () => {
  const { items: orders, loading, error, reload, setItems } = useAdminList('/admin/orders');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);

  if (loading) return <PageLoader label="Loading orders" />;

  const q = query.trim().toLowerCase();
  const visible = orders.filter(
    (o) =>
      (filter === 'all' || o.status === filter) &&
      (!q || [o.number, o.customer?.name, o.address?.name, o.customer?.email].some((text) => String(text ?? '').toLowerCase().includes(q)))
  );
  const open = orders.find((o) => o.id === openId);

  const columns = [
    {
      key: 'number',
      label: 'Order',
      render: (row) => (
        <button type="button" onClick={() => setOpenId(row.id)} className="cursor-pointer border-none bg-transparent p-0 text-left">
          <span className="block font-mono text-[0.82rem] text-gold-300 underline-offset-4 hover:underline">{row.number}</span>
          <span className="text-[0.75rem] text-text-muted">{formatDate(row.createdAt, true)}</span>
        </button>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (row) => (
        <div className="min-w-0">
          <span className="block text-white">{row.customer?.name ?? row.address?.name}</span>
          <span className="text-[0.75rem] text-text-muted">{[row.address?.city, row.address?.state].filter(Boolean).join(', ')}</span>
        </div>
      ),
    },
    {
      key: 'items',
      label: 'Items',
      render: (row) => row.lines.reduce((sum, line) => sum + line.qty, 0),
    },
    { key: 'total', label: 'Total', render: (row) => <span className="text-white">{formatPrice(row.total)}</span> },
    { key: 'status', label: 'Status', render: (row) => <span className={statusBadgeClass(row.status)}>{statusLabel(row.status)}</span> },
    {
      key: 'open',
      label: '',
      render: (row) => (
        <Button size="sm" variant="outline" onClick={() => setOpenId(row.id)} className="px-3! py-1.5!">
          Open
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Orders"
        subtitle="Orders paid online, newest first. Paid orders are waiting to be shipped."
        actions={
          <Button size="sm" variant="outline" onClick={reload}>
            <RotateCw size={14} strokeWidth={2} />
            Refresh
          </Button>
        }
      />

      {error && (
        <p role="alert" className="text-[0.85rem] text-ruby-500">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {['all', ...ORDER_STATUSES].map((s) => {
          const count = s === 'all' ? orders.length : orders.filter((o) => o.status === s).length;
          return (
            <Chip key={s} size="sm" active={filter === s} onClick={() => setFilter(s)}>
              {s === 'all' ? 'All' : statusLabel(s)} ({count})
            </Chip>
          );
        })}
      </div>

      <div className="flex w-full max-w-[320px] items-center gap-2 rounded-lg border border-gold-400/15 bg-surface/85 px-3.5 py-2 text-text-secondary">
        <Search size={15} strokeWidth={2} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Order number or name..."
          aria-label="Search orders"
          className="w-full border-none bg-transparent text-[0.85rem] text-white outline-none placeholder:text-text-muted"
        />
      </div>

      <DataTable columns={columns} rows={visible} emptyMessage="No orders in this view." />

      <Modal open={Boolean(open)} onClose={() => setOpenId(null)} eyebrow="✦ ORDER ✦" title={open ? open.number : ''} size="lg">
        {open && (
          <OrderPanel
            key={`${open.id}-${open.status}`}
            order={open}
            onSaved={(saved) => setItems((list) => list.map((o) => (o.id === saved.id ? saved : o)))}
          />
        )}
      </Modal>

      {orders.length === 0 && !error && (
        <p className="flex items-center gap-2 text-[0.82rem] text-text-muted">
          <ReceiptText size={14} strokeWidth={2} /> Orders appear here once customers pay on the website.
        </p>
      )}
    </div>
  );
};

export default AdminOrders;
