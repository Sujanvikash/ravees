import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '../ProductCard.jsx';
import RowHeader from './RowHeader.jsx';

const ARROW =
  'absolute top-[38%] z-10 hidden size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-gold-400/40 bg-bg-primary/90 text-gold-300 shadow-[0_6px_18px_--alpha(var(--color-black)/50%)] transition-all duration-300 hover:border-gold-400 hover:bg-gold-400 hover:text-on-gold md:flex';

/**
 * One shop row that scrolls sideways: a heading with "View all", then the products in a single line
 * (swipe on phones, arrows from md). Each card is a fixed share of the row, so about 2, 3, 4, 5 and 6.5
 * show as the screen widens, and the half card at the end says "there's more".
 */
const ProductRail = ({ eyebrow, title, to, action, products, onQuickView, tone = 'dark', className = '' }) => {
  const trackRef = useRef(null);
  const scroll = (dir) => {
    const track = trackRef.current;
    if (track) track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <div className={className}>
      <RowHeader eyebrow={eyebrow} title={title} to={to} action={action} tone={tone} />
      <div className="relative">
        <button type="button" aria-label="Scroll left" onClick={() => scroll(-1)} className={`${ARROW} -left-4`}>
          <ChevronLeft size={18} strokeWidth={2} />
        </button>
        <ul
          ref={trackRef}
          // data-lenis-prevent: let the browser scroll this row sideways itself instead of the smooth scroller.
          data-lenis-prevent
          className="-mx-6 flex snap-x snap-mandatory list-none gap-3 overflow-x-auto scroll-px-6 px-6 pt-1 pb-4 [scrollbar-width:none] sm:gap-4"
        >
          {products.map((product) => (
            <li
              key={product.id}
              className="w-[46%] shrink-0 snap-start sm:w-[31%] md:w-[23.5%] lg:w-[18.6%] xl:w-[14.6%]"
            >
              <ProductCard product={product} onQuickView={onQuickView} />
            </li>
          ))}
        </ul>
        <button type="button" aria-label="Scroll right" onClick={() => scroll(1)} className={`${ARROW} -right-4`}>
          <ChevronRight size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};

export default ProductRail;
