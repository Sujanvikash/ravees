import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Heart, X } from 'lucide-react';
import { GRADIENT_TITLE } from '../components/SectionHeading.jsx';
import CategoryTabs from '../components/CategoryTabs.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import QuickViewModal from '../components/QuickViewModal.jsx';
import { PRODUCTS } from '../data/products.js';
import { CATEGORIES } from '../data/categories.js';
import { useWishlist } from '../context/WishlistContext.jsx';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'name-asc', label: 'Name: A to Z' },
  { value: 'name-desc', label: 'Name: Z to A' },
  { value: 'stock', label: 'In Stock First' },
];

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [quickView, setQuickView] = useState(null);
  const [sort, setSort] = useState('featured');
  const { wishlist } = useWishlist();

  const category = searchParams.get('category') ?? 'all';
  const query = searchParams.get('q') ?? '';
  const wishlistOnly = searchParams.get('wishlist') === '1';

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== 'all') next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = PRODUCTS.filter((p) => {
      const matchesCat = category === 'all' || p.category === category;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.categoryLabel.toLowerCase().includes(q);
      const matchesWishlist = !wishlistOnly || wishlist.has(p.id);
      return matchesCat && matchesQuery && matchesWishlist;
    });

    if (sort === 'name-asc') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'name-desc') list = [...list].sort((a, b) => b.name.localeCompare(a.name));
    else if (sort === 'stock') list = [...list].sort((a, b) => Number(b.inStock) - Number(a.inStock));

    return list;
  }, [category, query, sort, wishlistOnly, wishlist]);

  return (
    <section className="relative z-20 bg-bg-primary py-16 md:py-25">
      <div className="mx-auto max-w-[1360px] px-6">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="mb-3 inline-block font-mono text-[0.72rem] uppercase tracking-[0.28em] text-gold-400">
              ✦ 2026 SIGNATURE COLLECTION ✦
            </span>
            <h1 className={`font-serif text-[2rem] font-bold leading-[1.2] tracking-[0.04em] sm:text-[2.5rem] ${GRADIENT_TITLE}`}>
              European Standard Masterpieces
            </h1>
            <p className="mt-2 text-[0.95rem] text-text-secondary">
              {filtered.length} of {PRODUCTS.length} products
              {wishlistOnly && ' · saved items only'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-gold-400/15 bg-[rgba(8,28,20,0.85)] px-3.5 py-2 text-text-secondary">
              <Search size={16} strokeWidth={2} />
              <input
                type="text"
                value={query}
                onChange={(e) => setParam('q', e.target.value)}
                placeholder="Filter by product name..."
                className="w-[200px] border-none bg-transparent font-sans text-[0.85rem] text-white outline-none placeholder:text-text-muted"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="cursor-pointer rounded-lg border border-gold-400/15 bg-[rgba(8,28,20,0.85)] px-3.5 py-2 font-sans text-[0.85rem] text-text-secondary outline-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-bg-dark-emerald">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {wishlistOnly && (
          <button
            onClick={() => setParam('wishlist', '')}
            className="mb-5 inline-flex cursor-pointer items-center gap-2 rounded-full border border-ruby-500/40 bg-ruby-500/10 px-4 py-2 text-[0.8rem] text-ruby-500 transition-colors hover:bg-ruby-500/20"
          >
            <Heart size={14} strokeWidth={2} fill="currentColor" />
            Showing saved items only
            <X size={14} strokeWidth={2} />
          </button>
        )}

        <CategoryTabs
          categories={CATEGORIES}
          selected={category}
          onSelect={(id) => setParam('category', id)}
        />

        <ProductGrid
          products={filtered}
          onQuickView={setQuickView}
          emptyMessage={
            wishlistOnly
              ? 'Nothing saved yet — tap the heart on any product to save it here.'
              : 'No products match your filters.'
          }
        />
      </div>

      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
    </section>
  );
}
