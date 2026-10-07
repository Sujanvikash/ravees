import { PackageOpen } from 'lucide-react';
import ProductCard from './ProductCard.jsx';
import Reveal from './Reveal.jsx';

// oneRow: a single row of up to 5 (2 on phones, 3 at sm, 4 at md, 5 at xl); cards past the row's width are hidden.
const ONE_ROW_GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 xl:grid-cols-5';
const ONE_ROW_HIDE = ['', '', 'max-sm:hidden', 'max-md:hidden', 'max-xl:hidden'];

const ProductGrid = ({ products, onQuickView, oneRow = false, emptyMessage = 'No products match your filters.' }) => {
  if (!products.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] px-6 py-20 text-center">
        <PackageOpen size={40} strokeWidth={1.5} className="text-gold-400/60" />
        <p className="text-text-secondary">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className={
        oneRow ? ONE_ROW_GRID : 'grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-5'
      }
    >
      {(oneRow ? products.slice(0, ONE_ROW_HIDE.length) : products).map((product, i) => (
        // The first two rows cascade in as they scroll into view; later cards just appear (see Reveal).
        <Reveal key={product.id} delay={i % 5} disabled={i >= 10} className={oneRow ? ONE_ROW_HIDE[i] : ''}>
          <ProductCard product={product} onQuickView={onQuickView} />
        </Reveal>
      ))}
    </div>
  );
};

export default ProductGrid;
