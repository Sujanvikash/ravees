import { RotateCw } from 'lucide-react';
import Button from '../../components/Button.jsx';
import PageLoader from '../../components/PageLoader.jsx';
import DataTable from '../components/DataTable.jsx';
import AdminPageHeader from '../components/AdminPageHeader.jsx';
import { useAdminList } from '../useAdminList.js';
import { formatDate, formatPrice } from '../../lib/format.js';

const columns = [
  { key: 'name', label: 'Name', sortable: true, render: (row) => <span className="text-text-primary">{row.name}</span> },
  {
    key: 'email',
    label: 'Email',
    sortable: true,
    render: (row) => (
      <a href={`mailto:${row.email}`} className="text-text-secondary no-underline hover:text-gold-300">
        {row.email}
      </a>
    ),
  },
  { key: 'phone', label: 'Phone', render: (row) => row.phone || '—' },
  { key: 'createdAt', label: 'Joined', sortable: true, render: (row) => formatDate(row.createdAt) },
  { key: 'orders', label: 'Orders', render: (row) => row.orders ?? 0 },
  { key: 'spent', label: 'Spent', render: (row) => <span className="text-text-primary">{formatPrice(row.spent)}</span> },
];

/** The customers with an account on the website, with what they have ordered. */
const AdminCustomers = () => {
  const { items: customers, loading, error, reload } = useAdminList('/admin/customers');

  if (loading) return <PageLoader label="Loading customers" />;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Customers"
        subtitle={`${customers.length} account${customers.length === 1 ? '' : 's'} on the website`}
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

      <DataTable columns={columns} rows={customers} searchKeys={['name', 'email', 'phone']} emptyMessage="No customers yet." />
    </div>
  );
};

export default AdminCustomers;
