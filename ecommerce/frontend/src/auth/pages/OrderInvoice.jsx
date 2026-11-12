import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, FileX, RotateCw } from 'lucide-react';
import Button from '../../components/Button.jsx';
import InvoiceDocument from '../../components/InvoiceDocument.jsx';
import PageLoader from '../../components/PageLoader.jsx';
import { useAccountData } from '../useAccountData.js';

/**
 * The tax invoice of one of the customer's orders (`/account/orders/:id/invoice`, linked from the order page and
 * the order emails). A page of its own, outside the shop's header and footer, so it prints as the invoice alone.
 */
const OrderInvoice = () => {
  const { id } = useParams();
  const { data: order, loading, error, status, retry } = useAccountData(`/orders/${encodeURIComponent(id)}`);
  const notYours = status === 404 || status === 422;

  if (loading) return <PageLoader label="Loading your invoice" />;

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-6 sm:px-6 print:min-h-0 print:bg-white print:p-0">
      <div className="mx-auto mb-4 max-w-[820px] print:hidden">
        <Link
          to={order ? `/account/orders/${order.id}` : '/account'}
          className="flex w-fit items-center gap-1.5 text-[0.85rem] text-text-secondary no-underline transition-colors hover:text-gold-300"
        >
          <ChevronLeft size={16} strokeWidth={2} />
          {order ? `Order ${order.number}` : 'My Account'}
        </Link>
      </div>

      {order?.invoice ? (
        <InvoiceDocument invoice={order.invoice} />
      ) : (
        <div className="mx-auto flex max-w-[480px] flex-col items-center gap-4 py-16 text-center">
          <FileX size={44} strokeWidth={1.5} className="text-gold-400/60" />
          <h1 className="font-serif text-[1.5rem] text-text-primary">No invoice to show</h1>
          <p className="text-text-secondary">
            {error && !notYours
              ? error
              : order
                ? 'An order has its invoice once it is paid.'
                : "It isn't one of your orders."}
          </p>
          {error && !notYours && (
            <Button onClick={retry}>
              <RotateCw size={16} strokeWidth={2} />
              Try Again
            </Button>
          )}
        </div>
      )}
    </main>
  );
};

export default OrderInvoice;
