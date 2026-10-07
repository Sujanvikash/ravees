import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import PriceTag from './PriceTag.jsx';
import Badge from './Badge.jsx';
import { useCart } from '../context/CartContext.jsx';

const QuickViewModal = ({ product, onClose }) => {
  const { addToCart } = useCart();

  return (
    <Modal
      open={Boolean(product)}
      onClose={onClose}
      eyebrow="✦ QUICK SPECIFICATIONS ✦"
      title={product?.name}
      size="lg"
    >
      {product && (
        <div className="grid gap-8 p-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-gold-400/20 bg-[#020805]">
            <img src={product.image} alt={product.name} className="h-full max-h-105 w-full object-cover" />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[0.72rem] uppercase tracking-[0.12em] text-gold-400">
                {product.categoryLabel}
              </span>
              <Badge variant={product.inStock ? 'emerald' : 'ruby'}>
                {product.inStock ? 'In Stock' : 'On Backorder'}
              </Badge>
            </div>

            <p className="text-[0.92rem] leading-[1.7] text-text-secondary">{product.description}</p>

            {product.specs.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-text-muted">
                  Specifications
                </span>
                <dl className="flex flex-col gap-1.5">
                  {product.specs.map((spec) => (
                    <div
                      key={spec.label}
                      className="flex justify-between gap-4 border-b border-white/5 pb-1.5 text-[0.85rem]"
                    >
                      <dt className="text-text-muted">{spec.label}</dt>
                      <dd className="text-right text-gold-200">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {product.sizes.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-text-muted">
                  Sizes Available
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {product.sizes.map((size) => (
                    <span
                      key={size}
                      className="rounded-md border border-gold-400/15 bg-gold-400/8 px-2.5 py-1 text-[0.78rem] text-gold-300"
                    >
                      {size}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <PriceTag size="lg" className="mt-auto" />

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  addToCart(product);
                  onClose();
                }}
              >
                <ShoppingBag size={16} strokeWidth={2} />
                Add to Cart
              </Button>
              <Link
                to={`/product/${product.id}`}
                onClick={onClose}
                className="inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-gold-400/30 bg-[rgba(8,28,20,0.6)] px-6.5 py-3 font-sans text-[0.88rem] font-semibold tracking-[0.06em] text-gold-300 no-underline transition-all duration-300 hover:border-gold-400 hover:bg-gold-400/15 hover:text-white"
              >
                Full Details
                <ArrowRight size={16} strokeWidth={2} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default QuickViewModal;
