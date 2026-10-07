import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Inbox, AlertTriangle, Store, Tags, ArrowRight } from 'lucide-react';
import AdminStatCard from '../components/AdminStatCard.jsx';
import { useAdminData } from '../context/AdminDataContext.jsx';
import { listEnquiries } from '../../lib/enquiries.js';

const AdminDashboard = () => {
  const { products, categories, showrooms } = useAdminData();
  const [enquiries] = useState(listEnquiries);
  const openEnquiries = enquiries.filter((e) => e.status === 'new').length;
  const outOfStock = products.items.filter((p) => !p.inStock).length;

  const perCategory = useMemo(
    () =>
      categories.items
        .filter((c) => c.id !== 'all')
        .map((c) => ({ ...c, live: products.items.filter((p) => p.category === c.id).length })),
    [categories.items, products.items]
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-serif text-[1.6rem] font-bold tracking-[0.03em] text-white">Overview</h1>
        <p className="mt-1 text-[0.88rem] text-text-secondary">
          Catalog scraped from christmasraave.in — {products.items.length} products across{' '}
          {perCategory.length} collections.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard Icon={Package} label="Total products" value={products.items.length} />
        <AdminStatCard
          Icon={Inbox}
          label="Open enquiries"
          value={openEnquiries}
          hint={`${enquiries.length} total`}
          accent="emerald"
        />
        <AdminStatCard Icon={AlertTriangle} label="On backorder" value={outOfStock} accent="ruby" />
        <AdminStatCard Icon={Store} label="Showrooms" value={showrooms.items.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-serif text-[1.1rem] text-white">
              <Tags size={17} strokeWidth={2} className="text-gold-400" />
              Products by collection
            </h2>
            <Link
              to="/admin/products"
              className="inline-flex items-center gap-1 text-[0.8rem] text-gold-300 no-underline hover:text-white"
            >
              Manage <ArrowRight size={13} strokeWidth={2} />
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            {perCategory.map((cat) => {
              return (
                <div key={cat.id} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[0.82rem]">
                    <span className="text-text-secondary">
                      {cat.icon} {cat.name}
                    </span>
                    <span className="font-mono text-gold-300">{cat.live}</span>
                  </div>
                  <progress
                    value={cat.live}
                    max={products.items.length || 1}
                    aria-label={`${cat.name}: ${cat.live} live products`}
                    className="h-1.5 w-full appearance-none overflow-hidden rounded-full border-0 bg-white/8 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-[linear-gradient(90deg,var(--color-gold-600),var(--color-gold-300))] [&::-webkit-progress-bar]:bg-white/8 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-[linear-gradient(90deg,var(--color-gold-600),var(--color-gold-300))]"
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-serif text-[1.1rem] text-white">
              <Inbox size={17} strokeWidth={2} className="text-gold-400" />
              Latest enquiries
            </h2>
            <Link
              to="/admin/enquiries"
              className="inline-flex items-center gap-1 text-[0.8rem] text-gold-300 no-underline hover:text-white"
            >
              All <ArrowRight size={13} strokeWidth={2} />
            </Link>
          </div>

          {enquiries.length === 0 ? (
            <p className="py-8 text-center text-[0.85rem] text-text-muted">
              No enquiries yet. Submit the contact form or a quote request on the storefront to see one here.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {enquiries.slice(0, 5).map((enq) => (
                <div
                  key={enq.id}
                  className="flex items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[0.85rem] text-white">{enq.name || 'Unnamed'}</p>
                    <span className="text-[0.75rem] text-text-muted">
                      {enq.type === 'quote-request' ? `Quote · ${enq.itemCount ?? 0} items` : 'Consultation'}
                      {' · '}
                      {new Date(enq.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase ${
                      enq.status === 'new'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : enq.status === 'contacted'
                          ? 'bg-gold-400/15 text-gold-300'
                          : 'bg-white/8 text-text-muted'
                    }`}
                  >
                    {enq.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
