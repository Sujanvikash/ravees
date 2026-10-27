import { PackageOpen } from 'lucide-react';
import ProductCard from './ProductCard.jsx';
import Reveal from './Reveal.jsx';
import { cardClass } from './cardClass.js';

// oneRow: a single row of up to 6 (2 on phones, 3 at sm, 4 at md, 5 at lg, 6 at xl); cards past the row's width are hidden.
const ONE_ROW_GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
const ONE_ROW_HIDE = ['', '', 'max-sm:hidden', 'max-md:hidden', 'max-lg:hidden', 'max-xl:hidden'];

const ProductGrid = ({ products, onQuickView, oneRow = false, emptyMessage = 'No products match your filters.' }) => {
  if (!products.length) {
    return (
      <div className={`${cardClass('panel')} flex flex-col items-center gap-3 px-6 py-12 text-center`}>
        <PackageOpen size={40} strokeWidth={1.5} className="text-gold-400/60" />
        <p className="text-text-secondary">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className={
        oneRow ? ONE_ROW_GRID : 'grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(145px,1fr))] sm:gap-3.5'
      }
    >
      {(oneRow ? products.slice(0, ONE_ROW_HIDE.length) : products).map((product, i) => (
        // Every card slides in from the left as its row scrolls into view, cascading along the row (see Reveal).
        <Reveal key={product.id} delay="auto" from="left" className={oneRow ? ONE_ROW_HIDE[i] : ''}>
          <ProductCard product={product} onQuickView={onQuickView} />
        </Reveal>
      ))}
    </div>
  );
};

export default ProductGrid;
