import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Heart, X, ArrowUpDown } from 'lucide-react';
import { GRADIENT_TITLE } from '../components/SectionHeading.jsx';
import CategoryTabs from '../components/CategoryTabs.jsx';
import Dropdown from '../components/Dropdown.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import QuickViewModal from '../components/QuickViewModal.jsx';
import { PRODUCTS } from '../data/products.js';
import { CATEGORIES } from '../data/categories.js';
import { useWishlist } from '../context/WishlistContext.jsx';
import Container from '../components/Container.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import Aurora from '../components/Aurora.jsx';
import Decoration from '../components/Decoration.jsx';
import { pineBranchLeft, pineBranchRight } from '../assets/decorations';

// Pine branches on both top corners of the shop header, in the space beside the content column.
const SIDE_BRANCH = 'top-0 h-[330px] w-[min(440px,calc((100vw-1360px)/2+160px))]';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'name-asc', label: 'Name: A to Z' },
  { value: 'name-desc', label: 'Name: Z to A' },
  { value: 'stock', label: 'In Stock First' },
];

const Shop = () => {
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
      <Aurora />
      <Decoration side src={pineBranchLeft} fade="left" className={`left-0 ${SIDE_BRANCH}`} imgClassName="object-left-top" />
      <Decoration side src={pineBranchRight} fade="right" className={`right-0 ${SIDE_BRANCH}`} imgClassName="object-right-top" />
      <Container>
        <div className="mb-9">
          <Eyebrow>
            ✦ 2026 SIGNATURE COLLECTION ✦
          </Eyebrow>
          {/* Title and controls share one line (centred on each other); they stack when the screen is too narrow. */}
          <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-4">
            <h1 className={`font-serif text-[2rem] font-bold leading-[1.2] tracking-[0.04em] sm:text-[2.5rem] ${GRADIENT_TITLE}`}>
              European Standard Masterpieces
            </h1>

            {/* Counts as 340px when deciding whether it fits beside the title, then grows up to 460px:
                the search box gives way first, so the row still fits on a 1280px laptop. */}
            <div className="ml-auto flex min-w-0 max-w-[460px] flex-1 basis-[340px] items-center gap-3 max-sm:flex-wrap">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-gold-400/15 bg-[rgba(8,28,20,0.85)] px-3.5 py-2 text-text-secondary max-sm:basis-full">
                <Search size={16} strokeWidth={2} className="shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setParam('q', e.target.value)}
                  placeholder="Filter by product name..."
                  className="w-full min-w-0 border-none bg-transparent font-sans text-[0.85rem] text-white outline-none placeholder:text-text-muted"
                />
              </div>
              <Dropdown options={SORT_OPTIONS} value={sort} onChange={setSort} label="Sort by" icon={ArrowUpDown} />
            </div>
          </div>
          <p className="mt-2 text-[0.95rem] text-text-secondary">
            {filtered.length} of {PRODUCTS.length} products
            {wishlistOnly && ' · saved items only'}
          </p>
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
      </Container>

      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
    </section>
  );
};

export default Shop;
