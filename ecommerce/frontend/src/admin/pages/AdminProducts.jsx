import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, ExternalLink, Search, EyeOff, Star, Tags } from 'lucide-react';
import DataTable from '../components/DataTable.jsx';
import MoveButtons from '../components/MoveButtons.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Button from '../../components/Button.jsx';
import Dropdown from '../../components/Dropdown.jsx';
import { useAdminData } from '../context/AdminDataContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import AdminPageHeader from '../components/AdminPageHeader.jsx';
import { swapIds } from '../components/adminForm.js';
import { formatPrice } from '../../lib/format.js';

const BADGE = 'rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase';

/**
 * The products in the shop's order, with a search and a collection filter. The arrows move a product one
 * place up or down among those shown, which is its place on the website too.
 */
const AdminProducts = () => {
  const { products, categories } = useAdminData();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [moving, setMoving] = useState(false);

  const q = query.trim().toLowerCase();
  const visible = products.items.filter(
    (p) =>
      (category === 'all' || p.category === category) &&
      (!q || [p.name, p.id, p.categoryLabel].some((text) => String(text ?? '').toLowerCase().includes(q)))
  );

  const move = async (id, neighbourId) => {
    const ids = swapIds(products.items, id, neighbourId);
    if (!ids) return;
    setMoving(true);
    try {
      await products.reorder(ids);
    } catch (err) {
      showToast(err.message);
    } finally {
      setMoving(false);
    }
  };

  const remove = async () => {
    const product = pendingDelete;
    setPendingDelete(null);
    try {
      await products.remove(product.id);
      showToast(`Deleted "${product.name}"`);
    } catch (err) {
      showToast(err.message);
    }
  };

  const columns = [
    {
      key: 'order',
      label: 'Order',
      render: (row) => {
        const i = visible.indexOf(row);
        return (
          <MoveButtons
            label={row.name}
            disabled={moving}
            onUp={i > 0 ? () => move(row.id, visible[i - 1].id) : null}
            onDown={i < visible.length - 1 ? () => move(row.id, visible[i + 1].id) : null}
          />
        );
      },
    },
    {
      key: 'name',
      label: 'Product',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-gold-400/20 bg-bg-deepest">
            {row.image && <img src={row.image} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0">
            <span className="block font-medium text-white">{row.name}</span>
            <span className="flex flex-wrap gap-2 text-[0.72rem] text-text-muted">
              {!row.visible && (
                <span className="inline-flex items-center gap-1 text-ruby-500">
                  <EyeOff size={11} strokeWidth={2} /> Hidden
                </span>
              )}
              {row.featured && (
                <span className="inline-flex items-center gap-1 text-gold-300">
                  <Star size={11} strokeWidth={2} fill="currentColor" /> Featured
                </span>
              )}
              {!row.images?.length && <span>No photo</span>}
            </span>
          </div>
        </div>
      ),
    },
    { key: 'categoryLabel', label: 'Collection' },
    {
      key: 'price',
      label: 'Price',
      render: (row) =>
        row.price != null ? (
          <span className="whitespace-nowrap">
            <span className="text-white">{formatPrice(row.price)}</span>
            {row.mrp != null && row.mrp > row.price && <s className="ml-2 text-[0.75rem] text-text-muted">{formatPrice(row.mrp)}</s>}
          </span>
        ) : (
          <span className="text-text-muted">On request</span>
        ),
    },
    {
      key: 'inStock',
      label: 'Stock',
      render: (row) => (
        <span className={`${BADGE} ${row.inStock ? 'bg-emerald-500/15 text-emerald-300' : 'bg-ruby-500/15 text-ruby-500'}`}>
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
            aria-label={`Edit ${row.name}`}
          >
            <Pencil size={14} strokeWidth={2} />
          </Link>
          <Link
            to={`/product/${row.id}`}
            target="_blank"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold-400/20 text-text-secondary no-underline transition-all hover:border-gold-400 hover:text-gold-300"
            title="View on the website"
            aria-label={`View ${row.name} on the website`}
          >
            <ExternalLink size={14} strokeWidth={2} />
          </Link>
          <button
            type="button"
            onClick={() => setPendingDelete(row)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-transparent text-text-muted transition-all hover:border-ruby-500 hover:text-ruby-500"
            title="Delete"
            aria-label={`Delete ${row.name}`}
          >
            <Trash2 size={14} strokeWidth={2} />
          </button>
        </div>
      ),
    },
  ];

  const hidden = products.items.filter((p) => !p.visible).length;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Products"
        subtitle={`${products.items.length} products${hidden ? ` · ${hidden} hidden from the website` : ''}`}
        actions={
          <Button size="sm" to="/admin/products/new">
            <Plus size={15} strokeWidth={2.5} />
            New product
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex w-full max-w-[320px] items-center gap-2 rounded-lg border border-gold-400/15 bg-surface/85 px-3.5 py-2 text-text-secondary">
          <Search size={15} strokeWidth={2} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            aria-label="Search products"
            className="w-full border-none bg-transparent text-[0.85rem] text-white outline-none placeholder:text-text-muted"
          />
        </div>
        <Dropdown
          label="Collection"
          icon={Tags}
          value={category}
          onChange={setCategory}
          options={[{ value: 'all', label: 'All collections' }, ...categories.items.map((c) => ({ value: c.id, label: c.name }))]}
        />
      </div>

      <DataTable columns={columns} rows={visible} emptyMessage="No products match." />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete product"
        message={`Delete "${pendingDelete?.name}" from the shop? Past orders keep their own copy of it.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={remove}
      />
    </div>
  );
};

export default AdminProducts;
