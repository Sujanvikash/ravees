import { Link } from 'react-router-dom';
import SectionHeading from './SectionHeading.jsx';
import Reveal from './Reveal.jsx';
import { CATEGORIES } from '../data/categories.js';

// The photo shown in each category's circle: a product that reads well cropped to a circle, picked so no
// two circles show the same thing.
const CATEGORY_IMAGES = {
  all: '/images/products/santa-doll-1-1.jpg',
  'christmas-trees': '/images/products/french-pine-christmas-tree-1.png',
  'tree-hangings': '/images/products/wonderland-ornaments-15-1.jpg',
  'christmas-lights': '/images/products/ww-with-ball-decoration-1.jpg',
  'wreath-garlands': '/images/products/garland-52958-1.jpg',
  'nativity-sets': '/images/products/cribsets-1-1.jpg',
  'santa-toy': '/images/products/santa-doll-deer-toy-1-1.jpg',
  'home-decors': '/images/products/santa-toy-3-1.jpg',
};

/**
 * Circular category photos in gold rings; each opens the shop filtered to that category.
 * A block inside a page section (the homepage puts it above the featured products, sharing that
 * section's background and side decorations), so it has no section of its own.
 */
const ShopByCategory = ({ className = '' }) => {
  return (
    <div id="categories" className={className}>
      <SectionHeading eyebrow="✦ OUR COLLECTIONS ✦" title="Shop by Category" />
      <ul className="grid grid-cols-4 gap-x-3 gap-y-7 lg:grid-cols-8 lg:gap-x-5">
        {CATEGORIES.map(({ id, name, count }, i) => (
          <Reveal as="li" key={id} delay={i % 4}>
            <Link
              to={id === 'all' ? '/shop' : `/shop?category=${id}`}
              className="group flex flex-col items-center text-center no-underline"
            >
              {/* Gold ring: a gradient border with a dark gap before the photo; it brightens and the
                  photo zooms a little on hover. */}
              <span className="block aspect-square w-full max-w-36 rounded-full bg-[linear-gradient(135deg,#fff0c4,var(--color-gold-400)_40%,var(--color-gold-600)_75%,#f5e1a4)] p-0.5 opacity-80 shadow-[0_6px_22px_rgba(0,0,0,0.45)] transition-all duration-400 ease-premium group-hover:-translate-y-1 group-hover:opacity-100 group-hover:shadow-[0_0_26px_rgba(229,199,139,0.45)] sm:p-[3px]">
                <span className="relative block size-full overflow-hidden rounded-full border-2 border-bg-primary bg-white sm:border-4">
                  {/* Absolute, so a tall photo can't stretch the circle into an oval */}
                  <img
                    src={CATEGORY_IMAGES[id]}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-premium group-hover:scale-110"
                  />
                </span>
              </span>
              <span className="mt-3 font-serif text-[0.8rem] font-semibold leading-tight text-white transition-colors group-hover:text-gold-300 sm:text-[0.98rem]">
                {name}
              </span>
              <span className="mt-1 hidden text-[0.72rem] tracking-[0.06em] text-text-muted sm:block">
                {count} {count === 1 ? 'piece' : 'pieces'}
              </span>
            </Link>
          </Reveal>
        ))}
      </ul>
    </div>
  );
};

export default ShopByCategory;
