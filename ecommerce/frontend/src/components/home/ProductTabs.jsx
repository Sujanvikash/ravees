import { useState } from 'react';
import Chip from '../Chip.jsx';
import ProductCard from '../ProductCard.jsx';
import Reveal from '../Reveal.jsx';
import { useStorefront } from '../../context/StorefrontContext.jsx';
import { mixedProducts, productsIn } from '../../lib/catalogue.js';
import { SHOP_GRID } from './shopGrid.js';

/**
 * "Featured categories": a row of category tabs over a product grid, like the old site's product
 * showcase. "All" mixes the categories; any other tab shows that collection.
 */
const ProductTabs = ({ onQuickView, limit = 12, className = '' }) => {
  const [active, setActive] = useState('all');
  const { products: all, categories } = useStorefront();
  // The tabs: every collection with more than one piece, "All" first (Home Decors has a single product).
  const tabs = categories.filter((c) => c.count > 1).map((c) => ({ id: c.id, label: c.id === 'all' ? 'All' : c.name }));
  const products = active === 'all' ? mixedProducts(all, limit) : productsIn(all, active, limit);

  return (
    <div className={className}>
      <Reveal className="-mx-6 mb-5 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] sm:flex-wrap">
        {tabs.map((tab) => (
          <Chip
            key={tab.id}
            size="sm"
            active={tab.id === active}
            glow
            onClick={() => setActive(tab.id)}
            className="shrink-0 whitespace-nowrap"
          >
            {tab.label}
          </Chip>
        ))}
      </Reveal>

      {/* Keyed by tab, so each switch replays the fade-in. */}
      <div key={active} className={`${SHOP_GRID} animate-fade-in`}>
        {products.map((product) => (
          <Reveal key={product.id} delay="auto" className="h-full">
            <ProductCard product={product} onQuickView={onQuickView} />
          </Reveal>
        ))}
      </div>
    </div>
  );
};

export default ProductTabs;
