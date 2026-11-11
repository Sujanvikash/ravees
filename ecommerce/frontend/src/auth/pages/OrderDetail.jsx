import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, History, MapPin, PackageOpen, Receipt, RotateCw } from 'lucide-react';
import Aurora from '../../components/Aurora.jsx';
import Button from '../../components/Button.jsx';
import Eyebrow from '../../components/Eyebrow.jsx';
import PageLoader from '../../components/PageLoader.jsx';
import PageTitle from '../../components/PageTitle.jsx';
import { cardClass } from '../../components/cardClass.js';
import { sectionClass } from '../../components/sectionClass.js';
import { formatDate, formatPrice } from '../../lib/format.js';
import { addressLines, statusBadgeClass, statusLabel } from '../../lib/orders.js';
import { useAccountData } from '../useAccountData.js';

const CARD_TITLE = 'mb-4 flex items-center gap-2 font-serif text-[1.1rem] text-white';

/**
 * One of the customer's orders (`/account/orders/:id`, where the order emails link): what was bought, the
 * total, where it is going and what has happened to it so far.
 */
const OrderDetail = () => {
  const { id } = useParams();
  const { data: order, loading, error, retry } = useAccountData(`/orders/${encodeURIComponent(id)}`);

  if (loading) return <PageLoader label="Loading your order" />;

  if (error || !order) {
    return (
      <section className={sectionClass('centered')}>
        <Aurora />
        <div className="flex max-w-[480px] flex-col items-center gap-4 text-center">
          <PackageOpen size={44} strokeWidth={1.5} className="text-gold-400/50" />
          <h1 className="font-serif text-[1.5rem] text-white">We couldn&apos;t open this order</h1>
          <p className="text-text-secondary">{error || "It isn't one of your orders."}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={retry}>
              <RotateCw size={16} strokeWidth={2} />
              Try Again
            </Button>
            <Button variant="outline" to="/account">
              My Account
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const summary = [
    ['Subtotal', formatPrice(order.subtotal)],
    ['Delivery', order.delivery > 0 ? formatPrice(order.delivery) : 'Free'],
  ];

  return (
    <section className={sectionClass('panel')}>
      <Aurora />
      <div className="mx-auto max-w-275 px-6">
        <Link
          to="/account"
          className="mb-4 flex w-fit items-center gap-1.5 text-[0.85rem] text-text-secondary no-underline transition-colors hover:text-gold-300"
        >
          <ChevronLeft size={16} strokeWidth={2} />
          My Account
        </Link>
        <Eyebrow>✦ YOUR ORDER ✦</Eyebrow>
        <PageTitle className="mb-3">Order {order.number}</PageTitle>
        <div className="mb-6 flex flex-wrap items-center gap-3 text-[0.85rem] text-text-secondary">
          <span className={statusBadgeClass(order.status)}>{statusLabel(order.status)}</span>
          <span>Placed {formatDate(order.createdAt, true)}</span>
          {order.paidAt && <span>· Paid {formatDate(order.paidAt, true)}</span>}
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div className={`${cardClass('panel')} p-6 md:p-7`}>
            <ul className="flex list-none flex-col">
              {order.lines.map((line, i) => (
                <li key={`${line.productId}-${i}`} className="flex items-center gap-4 border-b border-white/6 py-3 first:pt-0 last:border-0">
                  <div className="size-16 shrink-0 overflow-hidden rounded-lg border border-gold-400/20 bg-bg-deepest">
                    {line.image && <img src={line.image} alt="" className="size-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link to={`/product/${line.productId}`} className="text-[0.92rem] font-medium text-white no-underline hover:text-gold-200">
                      {line.name}
                    </Link>
                    <p className="text-[0.8rem] text-text-muted">
                      {formatPrice(line.price)} × {line.qty}
                    </p>
                  </div>
                  <span className="font-serif text-[0.95rem] font-bold text-gold-200">{formatPrice(line.amount)}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 flex flex-col border-t border-gold-400/15 pt-3">
              {summary.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-1.5 text-[0.88rem]">
                  <dt className="text-text-muted">{label}</dt>
                  <dd className="text-text-primary">{value}</dd>
                </div>
              ))}
              <div className="mt-1 flex justify-between gap-4 border-t border-gold-400/25 pt-3 text-[1.05rem] font-bold">
                <dt className="text-white">Total</dt>
                <dd className="font-serif text-gold-300">{formatPrice(order.total)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-[0.76rem] text-text-muted">Prices include GST.</p>
          </div>

          <div className="flex flex-col gap-5">
            <div className={`${cardClass('panel')} p-6`}>
              <h2 className={CARD_TITLE}>
                <MapPin size={18} strokeWidth={2} className="text-gold-400" />
                Delivering to
              </h2>
              <address className="flex flex-col gap-0.5 text-[0.9rem] not-italic leading-[1.6] text-text-secondary">
                {addressLines(order.address).map((line, i) => (
                  <span key={i}>{line}</span>
                ))}
              </address>
              {order.notes && <p className="mt-3 text-[0.82rem] text-text-muted">Notes: {order.notes}</p>}
            </div>

            {order.history?.length > 0 && (
              <div className={`${cardClass('panel')} p-6`}>
                <h2 className={CARD_TITLE}>
                  <History size={18} strokeWidth={2} className="text-gold-400" />
                  Progress
                </h2>
                <ol className="flex list-none flex-col gap-3 border-l border-gold-400/25 pl-4">
                  {order.history.map((step, i) => (
                    <li key={`${step.at}-${i}`} className="relative">
                      <span aria-hidden="true" className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-gold-400" />
                      <p className="text-[0.88rem] text-white">{statusLabel(step.status)}</p>
                      <p className="text-[0.76rem] text-text-muted">{formatDate(step.at, true)}</p>
                      {step.note && <p className="mt-0.5 text-[0.82rem] text-text-secondary">{step.note}</p>}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <p className="flex items-start gap-2 text-[0.8rem] leading-[1.6] text-text-muted">
              <Receipt size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-gold-400" />
              Questions about this order? Reply to your order email or call us, quoting {order.number}.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OrderDetail;
