import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../Button.jsx';
import Eyebrow from '../Eyebrow.jsx';
import { HERO_SLIDES } from '../../data/home.js';
import { useStorefront } from '../../context/StorefrontContext.jsx';
import { checkoutBg, quickViewBg, productBg } from '../../assets/backgrounds';

// Each slide's photo (subject on the right, dark on the left where the text sits) and three products
// from what the slide talks about, shown as a "featured" strip.
const SLIDE_MEDIA = [
  { photo: checkoutBg, products: ['santa-doll-2', 'wonderland-ornaments-18', 'garland-52958'] },
  { photo: quickViewBg, products: ['cluster-light-1', 'ww-with-ball-decoration', 'white-wire-lights-2'] },
  { photo: productBg, products: ['norway-spruce-christmas-tree', 'swiss-alps-christmas-tree', 'white-wood-christmas-tree'] },
];

const SLIDES = HERO_SLIDES.map((slide, i) => ({ ...slide, ...SLIDE_MEDIA[i] }));

const INTERVAL = 6500;

const NAV_BTN =
  'flex size-9 cursor-pointer items-center justify-center rounded-full border border-gold-400/40 bg-shade/70 text-gold-300 transition-colors duration-300 hover:border-gold-400 hover:bg-gold-400 hover:text-on-gold';

/**
 * The storefront hero: three slides that crossfade on their own every few seconds (not with reduced
 * motion, and not while the pointer is over them), with arrows and dots. Each slide is a headline from the
 * old site's slider over one of our photos, a button into the shop, and three products it features.
 */
const HeroCarousel = ({ className = '' }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const { productById } = useStorefront();
  const go = (d) => setIndex((i) => (i + d + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), INTERVAL);
    return () => clearTimeout(id);
  }, [index, paused]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
      className={`relative isolate overflow-hidden rounded-2xl border border-gold-400/25 bg-shade shadow-[0_24px_60px_--alpha(var(--color-black)/55%)] ${className}`}
    >
      {SLIDES.map((slide, i) => (
        <div
          key={slide.title}
          aria-hidden={i !== index}
          inert={i !== index}
          className={`absolute inset-0 flex transition-opacity duration-700 ease-premium ${i === index ? 'z-10 opacity-100' : 'opacity-0'}`}
        >
          <img
            src={slide.photo}
            alt=""
            loading={i === 0 ? 'eager' : 'lazy'}
            className={`absolute inset-0 -z-10 size-full object-cover object-right transition-[scale] duration-[7s] ease-out ${i === index ? 'scale-105' : 'scale-100'}`}
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,--alpha(var(--color-shade)/92%)_0%,--alpha(var(--color-shade)/75%)_40%,--alpha(var(--color-shade)/10%)_80%)]"
          />
          <div className="flex w-full flex-col justify-center p-6 pb-20 sm:p-10 sm:pb-24 lg:max-w-[62%]">
            <Eyebrow>✦ {slide.eyebrow} ✦</Eyebrow>
            <h2 className="mb-3 font-serif text-[1.75rem] leading-[1.15] font-bold text-white sm:text-[2.3rem] xl:text-[2.6rem]">
              {slide.title}
            </h2>
            <p className="mb-6 text-[1rem] text-text-secondary sm:text-[1.08rem]">{slide.text}</p>
            <div>
              <Button to={slide.cta.to}>
                {slide.cta.label}
                <ArrowRight size={16} strokeWidth={2} />
              </Button>
            </div>
          </div>

          {/* Featured products: small white plates along the bottom right */}
          <div className="absolute right-4 bottom-4 hidden items-end gap-2.5 sm:flex">
            {slide.products.map(productById).filter(Boolean).map((p) => (
              <Link
                key={p.id}
                to={`/product/${p.id}`}
                title={p.name}
                className="group block size-20 overflow-hidden rounded-xl border-2 border-gold-300/70 bg-white shadow-[0_8px_20px_--alpha(var(--color-black)/45%)] transition-transform duration-300 hover:-translate-y-1 lg:size-24"
              >
                <img src={p.image} alt={p.name} loading="lazy" className="size-full object-cover transition-[scale] duration-500 group-hover:scale-110" />
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Controls */}
      <div className="absolute bottom-4 left-6 z-20 flex items-center gap-3 sm:left-10">
        <button type="button" aria-label="Previous slide" onClick={() => go(-1)} className={NAV_BTN}>
          <ChevronLeft size={17} strokeWidth={2} />
        </button>
        <div className="flex gap-1.5">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.title}
              type="button"
              aria-label={`Slide ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={`h-1.5 cursor-pointer rounded-full transition-all duration-500 ${i === index ? 'w-7 bg-gold-400' : 'w-3 bg-white/30 hover:bg-white/60'}`}
            />
          ))}
        </div>
        <button type="button" aria-label="Next slide" onClick={() => go(1)} className={NAV_BTN}>
          <ChevronRight size={17} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};

export default HeroCarousel;
