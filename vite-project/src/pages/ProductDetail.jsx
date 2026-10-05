import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShoppingBag, Heart, ChevronLeft, Phone, ShieldCheck } from 'lucide-react';
import WhatsAppLink from '../components/WhatsAppLink.jsx';
import { PHONE_HREF, PHONE_DISPLAY, ORDER_HOURS } from '../data/site.js';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import PriceTag from '../components/PriceTag.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import { GRADIENT_TITLE } from '../components/SectionHeading.jsx';
import { PRODUCTS } from '../data/products.js';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import NotFound from './NotFound.jsx';
import Container from '../components/Container.jsx';
import Aurora from '../components/Aurora.jsx';

export default function ProductDetail() {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const product = useMemo(() => PRODUCTS.find((p) => p.id === slug), [slug]);
  const related = useMemo(
    () => PRODUCTS.filter((p) => p.category === product?.category && p.id !== product?.id).slice(0, 4),
    [product]
  );

  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');

  if (!product) return <NotFound />;

  const wishlisted = isWishlisted(product.id);

  return (
    <section className="relative z-20 bg-bg-primary py-12 md:py-20">
      <Aurora />
      <Container>
        <Link
          to={`/shop?category=${product.category}`}
          className="mb-7 inline-flex items-center gap-1.5 text-[0.85rem] text-text-secondary no-underline transition-colors hover:text-gold-300"
        >
          <ChevronLeft size={16} strokeWidth={2} />
          Back to {product.categoryLabel}
        </Link>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Gallery */}
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-2xl border border-gold-400/20 bg-[#020805]">
              <img
                src={product.images[activeImage] ?? product.image}
                alt={product.name}
                className="h-full max-h-[540px] w-full object-cover"
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto">
                {product.images.map((img, i) => (
                  <button
                    key={img}
                    onClick={() => setActiveImage(i)}
                    className={`h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-lg border bg-[#020805] transition-all ${
                      i === activeImage ? 'border-gold-400' : 'border-gold-400/15 hover:border-gold-400/50'
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-gold-400">
                {product.categoryLabel}
              </span>
              <Badge variant={product.inStock ? 'emerald' : 'ruby'}>
                {product.inStock ? 'In Stock' : 'On Backorder'}
              </Badge>
            </div>

            <h1 className={`font-serif text-[1.9rem] font-bold leading-[1.2] tracking-[0.02em] sm:text-[2.4rem] ${GRADIENT_TITLE}`}>
              {product.name}
            </h1>

            <p className="text-[1rem] leading-[1.8] text-text-secondary">{product.description}</p>

            {product.sizes.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[0.72rem] font-semibold uppercase tracking-widest text-text-muted">
                  Select size
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`cursor-pointer rounded-lg border px-4 py-2 text-[0.85rem] transition-all ${
                        selectedSize === size
                          ? 'border-gold-300 bg-gold-500 font-semibold text-[#04120a]'
                          : 'border-gold-400/20 bg-gold-400/8 text-gold-300 hover:border-gold-400'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.specs.length > 0 && (
              <div className="rounded-xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] p-5">
                <span className="mb-3 block text-[0.72rem] font-semibold uppercase tracking-widest text-gold-300">
                  Specifications
                </span>
                <dl className="flex flex-col gap-2">
                  {product.specs.map((spec) => (
                    <div
                      key={spec.label}
                      className="flex justify-between gap-4 border-b border-white/5 pb-2 text-[0.88rem] last:border-0 last:pb-0"
                    >
                      <dt className="text-text-muted">{spec.label}</dt>
                      <dd className="text-right text-gold-200">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <PriceTag size="lg" />

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => addToCart(product)}>
                <ShoppingBag size={16} strokeWidth={2} />
                Add to Cart
              </Button>
              <Button variant="outline" onClick={() => toggleWishlist(product.id)}>
                <Heart size={16} strokeWidth={2} fill={wishlisted ? 'currentColor' : 'none'} />
                {wishlisted ? 'Saved' : 'Save'}
              </Button>
              <WhatsAppLink
                text={`Hi Raave's Evergreen, I'd like a quote for ${product.name}${selectedSize ? ` (${selectedSize})` : ''}.`}
                className="inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/12 px-6.5 py-3 text-[0.88rem] font-semibold tracking-[0.06em] text-emerald-300 no-underline transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-500/25"
              >
                WhatsApp Quote
              </WhatsAppLink>
            </div>

            <div className="flex flex-col gap-2.5 border-t border-white/10 pt-5 text-[0.85rem] text-text-secondary">
              <span className="flex items-center gap-2">
                <ShieldCheck size={15} strokeWidth={2} className="text-gold-400" />
                European safety certified · 10-year warranty
              </span>
              <a
                href={PHONE_HREF}
                className="flex items-center gap-2 text-text-secondary no-underline hover:text-gold-300"
              >
                <Phone size={15} strokeWidth={2} className="text-gold-400" />
                Order direct: {PHONE_DISPLAY} ({ORDER_HOURS})
              </a>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-20">
            <h2 className={`mb-7 font-serif text-[1.6rem] font-bold tracking-[0.03em] ${GRADIENT_TITLE}`}>
              More from {product.categoryLabel}
            </h2>
            <ProductGrid products={related} />
          </div>
        )}
      </Container>
    </section>
  );
}
