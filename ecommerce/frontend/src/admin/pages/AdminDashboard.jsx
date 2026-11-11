import { Link } from 'react-router-dom';
import { Package, Inbox, Truck, Users, IndianRupee, ReceiptText, ArrowRight } from 'lucide-react';
import AdminStatCard from '../components/AdminStatCard.jsx';
import { useAdminData } from '../context/AdminDataContext.jsx';
import { useAdminList } from '../useAdminList.js';
import AdminPageHeader from '../components/AdminPageHeader.jsx';
import { ENQUIRY_STATUS_STYLE, ENQUIRY_TYPES } from '../components/adminLabels.js';
import { cardClass } from '../../components/cardClass.js';
import { formatDate, formatPrice } from '../../lib/format.js';
import { statusBadgeClass, statusLabel } from '../../lib/orders.js';

// Orders the money has come in for (whatever has happened since).
const PAID = ['paid', 'shipped', 'delivered'];

// A dashboard card's title, with a link to the full page for it on the right.
const CardHeader = ({ Icon, title, to, link }) => (
  <div className="mb-4 flex items-center justify-between">
    <h2 className="flex items-center gap-2 font-serif text-[1.1rem] text-white">
      <Icon size={17} strokeWidth={2} className="text-gold-400" />
      {title}
    </h2>
    <Link to={to} className="inline-flex items-center gap-1 text-[0.8rem] text-gold-300 no-underline hover:text-white">
      {link} <ArrowRight size={13} strokeWidth={2} />
    </Link>
  </div>
);

const Empty = ({ children }) => <p className="py-8 text-center text-[0.85rem] text-text-muted">{children}</p>;

/** The overview: paid orders and revenue, what is waiting (orders to ship, new enquiries), and the latest of each. */
const AdminDashboard = () => {
  const { products } = useAdminData();
  const orders = useAdminList('/admin/orders');
  const enquiries = useAdminList('/admin/enquiries');
  const customers = useAdminList('/admin/customers');

  const paid = orders.items.filter((o) => PAID.includes(o.status));
  const revenue = paid.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const toShip = orders.items.filter((o) => o.status === 'paid');
  const newEnquiries = enquiries.items.filter((e) => e.status === 'new');
  const hidden = products.items.filter((p) => !p.visible).length;
  const noPrice = products.items.filter((p) => p.price == null).length;
  // A figure still loading shows a dash rather than a misleading 0.
  const figure = (list, value) => (list.loading ? '—' : value);
  const inAll = (list, one, many) => (list.loading ? '' : `${list.items.length} ${list.items.length === 1 ? one : many} in all`);

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title="Overview" subtitle="Raave's Evergreen shop at a glance." />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <AdminStatCard Icon={ReceiptText} label="Paid orders" value={figure(orders, paid.length)} hint={inAll(orders, 'order', 'orders')} accent="emerald" />
        <AdminStatCard Icon={IndianRupee} label="Revenue" value={figure(orders, formatPrice(revenue))} hint="Paid orders, GST included" accent="emerald" />
        <AdminStatCard Icon={Truck} label="Orders to ship" value={figure(orders, toShip.length)} accent={toShip.length ? 'ruby' : 'gold'} />
        <AdminStatCard Icon={Inbox} label="New enquiries" value={figure(enquiries, newEnquiries.length)} hint={inAll(enquiries, 'enquiry', 'enquiries')} accent={newEnquiries.length ? 'ruby' : 'gold'} />
        <AdminStatCard
          Icon={Package}
          label="Products"
          value={products.items.length}
          hint={[hidden && `${hidden} hidden`, noPrice && `${noPrice} without a price (hidden)`].filter(Boolean).join(' · ')}
        />
        <AdminStatCard Icon={Users} label="Customers" value={figure(customers, customers.items.length)} />
      </div>

      {(orders.error || enquiries.error || customers.error) && (
        <p role="alert" className="text-[0.85rem] text-ruby-500">
          {orders.error || enquiries.error || customers.error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${cardClass('tile')} p-6`}>
          <CardHeader Icon={Truck} title="Orders to ship" to="/admin/orders" link="All orders" />
          {toShip.length === 0 ? (
            <Empty>{orders.loading ? 'Loading…' : 'Nothing waiting: every paid order is on its way.'}</Empty>
          ) : (
            <div className="flex flex-col gap-3">
              {toShip.slice(0, 6).map((order) => (
                <div key={order.id} className="flex items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-[0.85rem] text-white">
                      <span className="font-mono text-gold-300">{order.number}</span> · {order.customer?.name ?? order.address?.name}
                    </p>
                    <span className="text-[0.75rem] text-text-muted">
                      Paid {formatDate(order.paidAt ?? order.createdAt)} · {order.address?.city}
                    </span>
                  </div>
                  <span className="shrink-0 text-[0.85rem] text-white">{formatPrice(order.total)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`${cardClass('tile')} p-6`}>
          <CardHeader Icon={Inbox} title="Latest enquiries" to="/admin/enquiries" link="All" />
          {enquiries.items.length === 0 ? (
            <Empty>{enquiries.loading ? 'Loading…' : 'No enquiries yet.'}</Empty>
          ) : (
            <div className="flex flex-col gap-3">
              {enquiries.items.slice(0, 6).map((enq) => (
                <div key={enq.id} className="flex items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-[0.85rem] text-white">{enq.name || 'Unnamed'}</p>
                    <span className="text-[0.75rem] text-text-muted">
                      {ENQUIRY_TYPES[enq.type] ?? enq.type}
                      {enq.details?.items?.length ? ` · ${enq.details.items.length} items` : ''} · {formatDate(enq.createdAt)}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase ${ENQUIRY_STATUS_STYLE[enq.status] ?? ENQUIRY_STATUS_STYLE.closed}`}
                  >
                    {enq.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {orders.items.length > 0 && (
        <section className={`${cardClass('tile')} p-6`}>
          <CardHeader Icon={ReceiptText} title="Latest orders" to="/admin/orders" link="All orders" />
          <div className="flex flex-col gap-3">
            {orders.items.slice(0, 5).map((order) => (
              <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                <p className="min-w-0 text-[0.85rem] text-white">
                  <span className="font-mono text-gold-300">{order.number}</span> · {order.customer?.name ?? order.address?.name}
                  <span className="ml-2 text-[0.75rem] text-text-muted">{formatDate(order.createdAt)}</span>
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-[0.85rem] text-white">{formatPrice(order.total)}</span>
                  <span className={statusBadgeClass(order.status)}>{statusLabel(order.status)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminDashboard;
