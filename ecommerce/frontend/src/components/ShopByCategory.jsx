import { Link } from 'react-router-dom';
import SectionHeading from './SectionHeading.jsx';
import Reveal from './Reveal.jsx';
import { useStorefront } from '../context/StorefrontContext.jsx';

/**
 * Circular category photos in gold rings (the category's own photo, or its first product's); each opens
 * the shop filtered to that category.
 * A block inside a page section (the homepage puts it above the featured products, sharing that
 * section's background and side decorations), so it has no section of its own.
 */
const ShopByCategory = ({ className = '' }) => {
  const { categories } = useStorefront();
  return (
    <div id="categories" className={className}>
      <SectionHeading eyebrow="✦ OUR COLLECTIONS ✦" title="Shop by Category" />
      {/* Centred under the heading: three a row on phones, all in one row from sm. */}
      <ul className="flex flex-wrap justify-center gap-x-3 gap-y-5 lg:gap-x-10">
        {categories.map(({ id, name, count, image }) => (
          <Reveal as="li" key={id} delay="auto" className="w-[calc((100%-1.5rem)/3)] sm:w-[calc((100%-3.75rem)/6)] lg:w-36">
            <Link
              to={id === 'all' ? '/shop' : `/shop?category=${id}`}
              className="group flex flex-col items-center text-center no-underline"
            >
              {/* Gold ring: a gradient border with a dark gap before the photo; it brightens and the
                  photo zooms a little on hover. */}
              <span className="block aspect-square w-full max-w-28 rounded-full bg-[linear-gradient(135deg,var(--color-gold-100),var(--color-gold-400)_40%,var(--color-gold-600)_75%,var(--color-gold-250))] p-0.5 opacity-80 shadow-[0_6px_22px_--alpha(var(--color-shadow)/45%)] transition-all duration-400 ease-premium group-hover:-translate-y-1 group-hover:opacity-100 group-hover:shadow-[0_0_26px_--alpha(var(--color-gold-400)/45%)] sm:p-[3px]">
                <span className="relative block size-full overflow-hidden rounded-full border-2 border-bg-primary bg-white sm:border-4">
                  {/* Absolute, so a tall photo can't stretch the circle into an oval */}
                  <img
                    src={image}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-premium group-hover:scale-110"
                  />
                </span>
              </span>
              <span className="mt-2 text-[0.8rem] font-semibold leading-tight text-text-primary transition-colors group-hover:text-gold-300 sm:text-[0.92rem]">
                {name}
              </span>
              <span className="mt-0.5 hidden text-[0.72rem] tracking-[0.04em] text-text-muted sm:block">
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
