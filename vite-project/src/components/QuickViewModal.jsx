import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Expand, FileText, ShoppingBag } from 'lucide-react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import Badge from './Badge.jsx';
import FeatureItem from './FeatureItem.jsx';
import WhatsAppLink from './WhatsAppLink.jsx';
import { useCart } from '../context/CartContext.jsx';
import { withoutSizeSpec } from '../lib/productSpecs.js';
import { featuresFor } from '../data/productFeatures.js';
import { quickViewBg } from '../assets/backgrounds';

const ROUND_BTN =
  'flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-shade/70 text-white transition-colors hover:border-gold-400 hover:text-gold-300';
const LABEL = 'text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-text-muted';

/**
 * Quick specifications, over the festive frame: the photo (with ‹ › and thumbnails once a product has more
 * than one) beside the collection, name, description, the collection's points, quote on request, and
 * Add to Cart / Full Details / WhatsApp Quote.
 */
const QuickViewModal = ({ product, onClose }) => {
  const { addToCart } = useCart();
  const [photo, setPhoto] = useState(0);
  // Each product starts at its first photo (the modal stays mounted between products).
  const [shownFor, setShownFor] = useState(product?.id);
  if (product?.id !== shownFor) {
    setShownFor(product?.id);
    setPhoto(0);
  }

  const specs = product ? withoutSizeSpec(product) : [];
  const photos = product ? (product.images.length ? product.images : [product.image]) : [];
  const go = (d) => setPhoto((i) => (i + d + photos.length) % photos.length);
  const current = photos[photo] ?? product?.image;

  return (
    <Modal
      open={Boolean(product)}
      onClose={onClose}
      eyebrow="✦ Quick specifications"
      title={product?.name}
      size="lg"
      backdrop={quickViewBg}
    >
      {product && (
        <div className="grid items-start gap-7 px-6 pt-5 pb-7 sm:px-8 md:grid-cols-[minmax(0,1fr)_1.15fr]">
          {/* Gallery */}
          <div className="flex flex-col gap-3">
            <div className="relative aspect-[7/6] overflow-hidden rounded-xl border border-gold-400/25 bg-bg-deepest shadow-[0_16px_40px_--alpha(var(--color-black)/55%)]">
              <img src={current} alt={product.name} className="size-full object-cover" />
              {photos.length > 1 && (
                <>
                  <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className={`${ROUND_BTN} absolute top-1/2 left-3 -translate-y-1/2`}>
                    <ChevronLeft size={18} strokeWidth={2} />
                  </button>
                  <button type="button" onClick={() => go(1)} aria-label="Next photo" className={`${ROUND_BTN} absolute top-1/2 right-3 -translate-y-1/2`}>
                    <ChevronRight size={18} strokeWidth={2} />
                  </button>
                </>
              )}
              <a href={current} target="_blank" rel="noreferrer" aria-label="Open the photo full size" className={`${ROUND_BTN} absolute right-3 bottom-3`}>
                <Expand size={17} strokeWidth={2} />
              </a>
            </div>
            {photos.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {photos.slice(0, 5).map((img, i) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => setPhoto(i)}
                    aria-label={`Show photo ${i + 1}`}
                    aria-current={i === photo}
                    className={`aspect-square cursor-pointer overflow-hidden rounded-lg border transition-all ${
                      i === photo ? 'border-gold-400 shadow-[0_0_12px_--alpha(var(--color-gold-400)/40%)]' : 'border-gold-400/15 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-gold-300">{product.categoryLabel}</span>
              <Badge variant={product.inStock ? 'emerald' : 'ruby'}>{product.inStock ? 'In Stock' : 'On Backorder'}</Badge>
            </div>
            <h4 className="font-serif text-[1.6rem] font-semibold leading-tight text-white">{product.name}</h4>
            <p className="text-[0.92rem] leading-[1.7] text-text-secondary">{product.description}</p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {featuresFor(product.category).map(({ Icon, text }) => (
                <FeatureItem key={text} variant="box" Icon={Icon} title={text} />
              ))}
            </div>

            {product.sizes.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className={LABEL}>Sizes Available</span>
                <div className="flex flex-wrap gap-1.5">
                  {product.sizes.map((size) => (
                    <span key={size} className="rounded-md border border-gold-400/15 bg-gold-400/8 px-2.5 py-1 text-[0.78rem] text-gold-300">
                      {size}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {specs.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className={LABEL}>Specifications</span>
                <dl className="flex flex-col gap-1.5">
                  {specs.map((spec) => (
                    <div key={spec.label} className="flex justify-between gap-4 border-b border-white/5 pb-1.5 text-[0.85rem]">
                      <dt className="text-text-muted">{spec.label}</dt>
                      <dd className="text-right text-gold-200">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="flex gap-3 border-t border-gold-400/15 pt-4">
              <FileText size={20} strokeWidth={1.5} className="mt-0.5 shrink-0 text-gold-400" aria-hidden="true" />
              <div>
                <span className="font-mono text-[0.78rem] uppercase tracking-[0.18em] text-gold-300">Quote on request</span>
                <p className="mt-1 text-[0.84rem] text-text-secondary">Contact us for pricing, bulk enquiries, and project orders.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                onClick={() => {
                  addToCart(product);
                  onClose();
                }}
              >
                <ShoppingBag size={17} strokeWidth={2} />
                Add to Cart
              </Button>
              <Link
                to={`/product/${product.id}`}
                onClick={onClose}
                className="inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-gold-400/30 bg-surface/60 px-6 py-3 font-sans text-[0.88rem] font-semibold tracking-[0.06em] text-gold-300 no-underline transition-all duration-300 hover:border-gold-400 hover:bg-gold-400/15 hover:text-white"
              >
                <FileText size={17} strokeWidth={2} />
                Full Details
                <ArrowRight size={16} strokeWidth={2} />
              </Link>
              <WhatsAppLink
                text={`Hi Raave's Evergreen, I'd like a quote for ${product.name}.`}
                iconSize={18}
                className="inline-flex items-center justify-center gap-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/12 px-6 py-3 text-[0.9rem] font-semibold text-emerald-300 no-underline transition-all duration-300 hover:bg-emerald-500/25 sm:col-span-2"
              >
                WhatsApp Quote
                <ChevronRight size={16} strokeWidth={2} />
              </WhatsAppLink>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default QuickViewModal;
