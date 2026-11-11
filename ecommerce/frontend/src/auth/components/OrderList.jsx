import { Link } from 'react-router-dom';
import { ChevronRight, PackageOpen, RotateCw } from 'lucide-react';
import Button from '../../components/Button.jsx';
import { cardClass } from '../../components/cardClass.js';
import { formatDate, formatPrice } from '../../lib/format.js';
import { linesSummary, statusBadgeClass, statusLabel } from '../../lib/orders.js';
import { useAccountData } from '../useAccountData.js';

/** "My orders" on the account page: the customer's orders, newest first, each opening its own page. */
const OrderList = () => {
  const { data: orders, loading, error, retry } = useAccountData('/orders');

  if (loading) {
    return (
      <div className={`${cardClass('panel')} px-6 py-12 text-center font-mono text-[0.72rem] uppercase tracking-[0.3em] text-gold-400`}>
        Loading your orders
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${cardClass('panel')} flex flex-col items-center gap-4 px-6 py-10 text-center`}>
        <p className="text-text-secondary">{error}</p>
        <Button size="sm" variant="outline" onClick={retry}>
          <RotateCw size={15} strokeWidth={2} />
          Try again
        </Button>
      </div>
    );
  }

  if (!orders?.length) {
    return (
      <div className={`${cardClass('panel')} flex flex-col items-center gap-3 px-6 py-12 text-center`}>
        <PackageOpen size={36} strokeWidth={1.5} className="text-gold-400/60" />
        <p className="text-text-secondary">You haven&apos;t placed an order yet.</p>
        <Button size="sm" to="/shop">
          Browse the Collections
        </Button>
      </div>
    );
  }

  return (
    <ul className="flex list-none flex-col gap-4">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            to={`/account/orders/${order.id}`}
            className={`${cardClass('tile')} group flex items-center gap-4 p-5 no-underline transition-all hover:border-gold-400/40`}
          >
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="font-mono text-[0.78rem] tracking-[0.08em] text-gold-300">{order.number}</span>
                <span className={statusBadgeClass(order.status)}>{statusLabel(order.status)}</span>
                <span className="text-[0.78rem] text-text-muted">{formatDate(order.createdAt)}</span>
              </div>
              <p className="truncate text-[0.88rem] text-text-secondary">{linesSummary(order.lines)}</p>
            </div>
            <span className="font-serif text-[1.05rem] font-bold text-gold-200">{formatPrice(order.total)}</span>
            <ChevronRight size={18} strokeWidth={2} className="shrink-0 text-gold-400 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default OrderList;
