import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, RotateCcw, ExternalLink } from 'lucide-react';
import DataTable from '../components/DataTable.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Button from '../../components/Button.jsx';
import { useAdminData } from '../context/AdminDataContext.jsx';

const AdminProducts = () => {
  const { products } = useAdminData();
  const [pendingDelete, setPendingDelete] = useState(null);

  const columns = [
    {
      key: 'name',
      label: 'Product',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-gold-400/20 bg-[#020805]">
            {row.image && <img src={row.image} alt="" className="h-full w-full object-cover" />}
          </div>
          <span className="font-medium text-white">{row.name}</span>
        </div>
      ),
    },
    { key: 'categoryLabel', label: 'Collection', sortable: true },
    {
      key: 'sizes',
      label: 'Sizes',
      render: (row) => (row.sizes?.length ? row.sizes.join(', ') : '—'),
    },
    {
      key: 'inStock',
      label: 'Stock',
      sortable: true,
      render: (row) => (
        <span
          className={`rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase ${
            row.inStock ? 'bg-emerald-500/15 text-emerald-300' : 'bg-ruby-500/15 text-ruby-500'
          }`}
        >
          {row.inStock ? 'In stock' : 'Backorder'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Link
            to={`/admin/products/${row.id}/edit`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold-400/20 text-gold-300 no-underline transition-all hover:border-gold-400 hover:bg-gold-400/15"
            title="Edit"
          >
            <Pencil size={14} strokeWidth={2} />
          </Link>
          <Link
            to={`/product/${row.id}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold-400/20 text-text-secondary no-underline transition-all hover:border-gold-400 hover:text-gold-300"
            title="View on storefront"
          >
            <ExternalLink size={14} strokeWidth={2} />
          </Link>
          <button
            onClick={() => setPendingDelete(row)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-transparent text-text-muted transition-all hover:border-ruby-500 hover:text-ruby-500"
            title="Delete"
          >
            <Trash2 size={14} strokeWidth={2} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[1.6rem] font-bold tracking-[0.03em] text-white">Products</h1>
          <p className="mt-1 text-[0.85rem] text-text-secondary">
            {products.items.length} products
            {products.isOverridden && ' · locally edited'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {products.isOverridden && (
            <button
              onClick={products.reset}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gold-400/25 bg-transparent px-4 py-2.5 text-[0.82rem] text-text-secondary transition-all hover:border-gold-400 hover:text-white"
              title="Discard local edits and reload the scraped catalog"
            >
              <RotateCcw size={14} strokeWidth={2} />
              Reset to scraped data
            </button>
          )}
          <Button size="sm" to="/admin/products/new">
            <Plus size={15} strokeWidth={2.5} />
            New product
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={products.items}
        searchKeys={['name', 'categoryLabel', 'id']}
        emptyMessage="No products yet."
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete product"
        message={`Remove "${pendingDelete?.name}" from the catalog? This only affects this browser and can be undone with "Reset to scraped data".`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          products.remove(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
};

export default AdminProducts;
