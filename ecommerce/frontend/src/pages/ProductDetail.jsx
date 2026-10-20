import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronLeft, ChevronUp, Expand, Gift, Headphones, Heart, Mail, ShieldCheck, Truck } from 'lucide-react';
import WhatsAppLink from '../components/WhatsAppLink.jsx';
import { PHONE_DISPLAY, ORDER_HOURS } from '../data/site.js';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Chip from '../components/Chip.jsx';
import Modal from '../components/Modal.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import QuickViewModal from '../components/QuickViewModal.jsx';
import FeatureItem from '../components/FeatureItem.jsx';
import PageBackdrop from '../components/PageBackdrop.jsx';
import { PRODUCTS } from '../data/products.js';
import { featuresFor } from '../data/productFeatures.js';
import { withoutSizeSpec } from '../lib/productSpecs.js';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useSanta } from '../context/SantaContext.jsx';
import NotFound from './NotFound.jsx';
import Container from '../components/Container.jsx';
import PageTitle from '../components/PageTitle.jsx';
import { cardClass } from '../components/cardClass.js';
import { productBg } from '../assets/backgrounds';

const THUMBS = 5; // thumbnails shown beside the photo; the column scrolls with the selection
// The up/down buttons at the ends of the thumbnail column (desktop only).
const THUMB_ARROW =
  'hidden size-8 cursor-pointer items-center justify-center rounded-full border border-gold-400/25 bg-surface/80 text-gold-300 hover:border-gold-400 lg:flex';

// Promises that hold for every product, shown as tiles along the bottom.
const PROMISES = [
  { Icon: Truck, title: 'Pan India Delivery', body: 'Secure, white-glove shipping to your door' },
  { Icon: ShieldCheck, title: '10-Year Warranty', body: 'Built for long-lasting festive beauty' },
  { Icon: Headphones, title: 'Expert Support', body: `Call ${PHONE_DISPLAY}, ${ORDER_HOURS}` },
  { Icon: Gift, title: 'Bulk & Project Orders', body: 'Special pricing for homes, venues and businesses' },
];

// Outline button look for links that aren't <Button> (the WhatsApp link).
const OUTLINE =
  'inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-gold-400/30 bg-surface/60 px-5 py-3.5 font-sans text-[0.88rem] font-semibold uppercase tracking-[0.06em] text-gold-300 no-underline transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-400 hover:bg-gold-400/15 hover:text-white';

/** The specification rows: what the catalogue knows about this product, then what holds for every product. */
const specRows = (product) =>
  [
    ['Collection', product.categoryLabel],
    ['Availability', product.inStock ? 'In stock' : 'On backorder'],
    product.sizes.length > 0 && ['Sizes available', product.sizes.join(', ')],
    ...withoutSizeSpec(product).map((spec) => [spec.label, spec.value]),
    ['Quality', 'European standard'],
    ['Safety', 'European safety certified'],
    ['Warranty', '10 years'],
    ['Delivery', 'Pan-India, white-glove'],
    ['Orders', 'Single pieces, bulk & projects'],
    ['Price', 'On request'],
  ].filter(Boolean);

/**
 * Product page: the photo (with a thumbnail column once a product has more than one) beside the details —
 * collection, name, description, four collection points, price on request, quote / WhatsApp / save, and the
 * specifications — then four promise tiles and more from the same collection. The festive backdrop frames it.
 */
const ProductDetail = () => {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { hoverCard, leaveCard, added, needLogin } = useSanta();
  const addBtnRef = useRef(null);
  const imageRef = useRef(null);

  const product = useMemo(() => PRODUCTS.find((p) => p.id === slug), [slug]);
  const related = useMemo(
    () => PRODUCTS.filter((p) => p.category === product?.category && p.id !== product?.id).slice(0, 4),
    [product]
  );

  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [zoomed, setZoomed] = useState(false);
  const [quickView, setQuickView] = useState(null);

  if (!product) return <NotFound />;

  const wishlisted = isWishlisted(product.id);
  const photos = product.images.length ? product.images : [product.image];
  const go = (d) => setActiveImage((i) => (i + d + photos.length) % photos.length);
  const first = Math.min(Math.max(0, activeImage - (THUMBS - 1)), Math.max(0, photos.length - THUMBS));
  const rows = specRows(product);
  const half = Math.ceil(rows.length / 2);

  return (
    <section className="relative isolate z-20 overflow-hidden bg-bg-primary pt-5 pb-12 md:pt-8 md:pb-20">
      <PageBackdrop src={productBg} fade="frame" align="center" className="h-[1150px]" />
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
          {/* Gallery */}
          <div>
            <Link
              to={`/shop?category=${product.category}`}
              className={`mb-5 inline-flex items-center gap-1.5 text-[0.85rem] text-text-secondary no-underline transition-colors hover:text-gold-300 ${
                photos.length > 1 ? 'lg:ml-[6.5rem]' : ''
              }`}
            >
              <ChevronLeft size={16} strokeWidth={2} />
              Back to {product.categoryLabel}
            </Link>

            <div className="flex flex-col-reverse gap-3 lg:flex-row">
              {/* Thumbnails: a column beside the photo on desktop, a row under it on phones. Only with 2+ photos. */}
              {photos.length > 1 && (
                <div className="flex items-center gap-2 lg:w-[5.75rem] lg:flex-col">
                  <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className={THUMB_ARROW}>
                    <ChevronUp size={16} strokeWidth={2} />
                  </button>
                  <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
                    {photos.slice(first, first + THUMBS).map((img, k) => {
                      const i = first + k;
                      return (
                        <button
                          key={img}
                          type="button"
                          onClick={() => setActiveImage(i)}
                          aria-label={`Show photo ${i + 1}`}
                          aria-current={i === activeImage}
                          className={`size-20 shrink-0 cursor-pointer overflow-hidden rounded-lg border bg-bg-deepest transition-all lg:size-[5.75rem] ${
                            i === activeImage ? 'border-gold-400 shadow-[0_0_12px_--alpha(var(--color-gold-400)/40%)]' : 'border-gold-400/15 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt="" className="size-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                  <button type="button" onClick={() => go(1)} aria-label="Next photo" className={THUMB_ARROW}>
                    <ChevronDown size={16} strokeWidth={2} />
                  </button>
                </div>
              )}

              <div className="relative aspect-square flex-1 overflow-hidden rounded-2xl border border-gold-400/25 bg-bg-deepest shadow-[0_20px_50px_--alpha(var(--color-black)/60%)]">
                <img ref={imageRef} src={photos[activeImage] ?? product.image} alt={product.name} className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => setZoomed(true)}
                  aria-label="View photo full size"
                  className="absolute right-4 bottom-4 flex size-11 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-shade/70 text-white transition-colors hover:border-gold-400 hover:text-gold-300"
                >
                  <Expand size={18} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="relative flex flex-col gap-5">
            {/* A quiet flourish in the top corner, on wide screens only. */}
            <div aria-hidden="true" className="absolute top-8 right-0 hidden w-36 text-right xl:block">
              <p className="font-quote text-[1.35rem] italic leading-[1.3] text-gold-200">
                <span className="mr-1 text-gold-400">✦</span>Create Moments That Shine
              </p>
              <span className="mt-3 ml-auto block h-px w-24 bg-linear-to-r from-transparent to-gold-400/70" />
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-gold-400">{product.categoryLabel}</span>
              <Badge variant={product.inStock ? 'emerald' : 'ruby'}>{product.inStock ? 'In Stock' : 'On Backorder'}</Badge>
            </div>

            <PageTitle size="lg" className="xl:pr-40">{product.name}</PageTitle>
            <p className="text-[0.98rem] leading-[1.75] text-text-secondary xl:pr-40">{product.description}</p>

            <div className="grid grid-cols-2 gap-y-4 border-y border-gold-400/15 py-4 sm:grid-cols-4 sm:divide-x sm:divide-gold-400/15">
              {featuresFor(product.category).map(({ Icon, text }) => (
                <FeatureItem key={text} variant="point" Icon={Icon} title={text} className="sm:px-3 sm:first:pl-0" />
              ))}
            </div>

            {product.sizes.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[0.72rem] font-semibold uppercase tracking-widest text-text-muted">Select size</span>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <Chip key={size} shape="box" tone="gold" active={selectedSize === size} onClick={() => setSelectedSize(size)}>
                      {size}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="font-quote text-[1.6rem] font-semibold text-gold-200">Price on request</h2>
              <p className="mt-1 text-[0.85rem] text-text-secondary">Contact us for pricing, bulk enquiries, and project orders.</p>
            </div>

            {/* Like the product cards: pointing at the buttons sends Santa to stand on the quote button, and the
                product flies from the photo into his sack (his speech bubble replaces the toast). */}
            <div
              className="grid gap-3 sm:grid-cols-[1.4fr_1.2fr_auto]"
              onMouseEnter={() => hoverCard(addBtnRef.current)}
              onMouseLeave={leaveCard}
            >
              <Button
                ref={addBtnRef}
                size="lg"
                className="uppercase"
                onClick={() => {
                  if (addToCart(product, { quiet: true, onNeedLogin: needLogin })) added(product, imageRef.current);
                }}
              >
                <Mail size={18} strokeWidth={2} />
                Request a Quote
                <ArrowRight size={18} strokeWidth={2} />
              </Button>
              <WhatsAppLink
                text={`Hi Raave's Evergreen, I'd like a quote for ${product.name}${selectedSize ? ` (${selectedSize})` : ''}.`}
                className={OUTLINE}
                iconSize={18}
              >
                WhatsApp Quote
              </WhatsAppLink>
              <button type="button" onClick={() => toggleWishlist(product.id)} aria-pressed={wishlisted} className={OUTLINE}>
                <Heart size={18} strokeWidth={2} fill={wishlisted ? 'currentColor' : 'none'} />
                {wishlisted ? 'Saved' : 'Save'}
              </button>
            </div>

            <div>
              <h2 className="mb-3 flex items-center gap-4 font-mono text-[0.72rem] uppercase tracking-[0.2em] text-gold-400">
                Product specifications
                <span aria-hidden="true" className="h-px flex-1 bg-gold-400/20" />
              </h2>
              <div className={`${cardClass('tile')} grid gap-x-8 px-5 py-3 md:grid-cols-2`}>
                {[rows.slice(0, half), rows.slice(half)].map((col, c) => (
                  <dl key={c} className="flex flex-col">
                    {col.map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-4 border-b border-white/6 py-2.5 text-[0.84rem] last:border-0">
                        <dt className="text-text-muted">{label}</dt>
                        <dd className="text-right text-text-primary">{value}</dd>
                      </div>
                    ))}
                  </dl>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map(({ Icon, title, body }) => (
            <FeatureItem key={title} variant="card" Icon={Icon} title={title} body={body} className={`${cardClass('tile')} px-5 py-4`} />
          ))}
        </div>

        {related.length > 0 && (
          <div className="mt-20">
            <PageTitle as="h2" size="xs" className="mb-7">
              More from {product.categoryLabel}
            </PageTitle>
            <ProductGrid products={related} onQuickView={setQuickView} />
          </div>
        )}
      </Container>

      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />

      <Modal open={zoomed} onClose={() => setZoomed(false)} title={product.name} size="lg">
        <img src={photos[activeImage] ?? product.image} alt={product.name} className="max-h-[75vh] w-full bg-bg-deepest object-contain" />
      </Modal>
    </section>
  );
};

export default ProductDetail;
