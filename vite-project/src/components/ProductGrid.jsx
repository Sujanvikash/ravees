import { PackageOpen } from 'lucide-react';
import ProductCard from './ProductCard.jsx';

export default function ProductGrid({ products, onQuickView, emptyMessage = 'No products match your filters.' }) {
  if (!products.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] px-6 py-20 text-center">
        <PackageOpen size={40} strokeWidth={1.5} className="text-gold-400/60" />
        <p className="text-text-secondary">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onQuickView={onQuickView} />
      ))}
    </div>
  );
}
