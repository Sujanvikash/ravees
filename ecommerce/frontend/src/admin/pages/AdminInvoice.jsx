import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronLeft, FileX } from 'lucide-react';
import InvoiceDocument from '../../components/InvoiceDocument.jsx';
import PageLoader from '../../components/PageLoader.jsx';
import { AdminAuthProvider, useAdminAuth } from '../context/AdminAuthContext.jsx';

const Invoice = () => {
  const { id } = useParams();
  const { hasToken, checking, request } = useAdminAuth();
  const [result, setResult] = useState({ id: null, order: null, error: '' });

  useEffect(() => {
    if (!hasToken || checking) return undefined;
    let live = true;
    request(`/admin/orders/${encodeURIComponent(id)}`).then(
      (order) => live && setResult({ id, order, error: '' }),
      (err) => live && setResult({ id, order: null, error: err.message })
    );
    return () => {
      live = false;
    };
  }, [hasToken, checking, request, id]);

  if (!hasToken) return <Navigate to="/admin/login" replace />;
  if (checking || result.id !== id) return <PageLoader label="Loading the invoice" />;
  const { order, error } = result;

  return (
    <main className="min-h-screen bg-shade px-4 py-6 sm:px-6 print:min-h-0 print:bg-white print:p-0">
      <div className="mx-auto mb-4 max-w-[820px] print:hidden">
        <Link
          to="/admin/orders"
          className="flex w-fit items-center gap-1.5 text-[0.85rem] text-text-secondary no-underline transition-colors hover:text-gold-300"
        >
          <ChevronLeft size={16} strokeWidth={2} />
          Orders
        </Link>
      </div>
      {order?.invoice ? (
        <InvoiceDocument invoice={order.invoice} />
      ) : (
        <div className="mx-auto flex max-w-[480px] flex-col items-center gap-3 py-16 text-center">
          <FileX size={40} strokeWidth={1.5} className="text-gold-400/60" />
          <p className="text-text-secondary">{error || `${order?.number ?? 'This order'} has no invoice: it isn’t paid.`}</p>
        </div>
      )}
    </main>
  );
};

/**
 * An order's tax invoice for the admin (`/admin/orders/:id/invoice`), on a page of its own outside the admin's
 * sidebar, so it prints as the invoice alone. The same document the customer sees.
 */
const AdminInvoice = () => (
  <AdminAuthProvider>
    <Invoice />
  </AdminAuthProvider>
);

export default AdminInvoice;
