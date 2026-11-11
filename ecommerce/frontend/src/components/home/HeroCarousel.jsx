import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../Button.jsx';
import Eyebrow from '../Eyebrow.jsx';
import { HERO_SLIDES } from '../../data/home.js';
import { useStorefront } from '../../context/StorefrontContext.jsx';
import { slideCandleBg, slideLanternBg, slideTreesBg } from '../../assets/backgrounds';

// Each slide's photo, shown as it is (no wash): the client's own, with the decorations on the right. The words
// sit on a solid ivory panel beside it (below it on phones), never on the photo, so they read at WCAG AA
// whatever the photo does behind them; the photo keeps its decorated right side in view. Each slide also has
// three products from what it talks about, shown as a "featured" strip on the photo.
const SLIDE_MEDIA = [
  { photo: slideCandleBg, products: ['santa-doll-2', 'wonderland-ornaments-18', 'garland-52958'] },
  { photo: slideLanternBg, products: ['cluster-light-1', 'ww-with-ball-decoration', 'white-wire-lights-2'] },
  { photo: slideTreesBg, products: ['norway-spruce-christmas-tree', 'swiss-alps-christmas-tree', 'white-wood-christmas-tree'] },
];

const SLIDES = HERO_SLIDES.map((slide, i) => ({ ...slide, ...SLIDE_MEDIA[i] }));

const INTERVAL = 6500;

const NAV_BTN =
  'flex size-9 cursor-pointer items-center justify-center rounded-full border border-gold-400/40 bg-shade/70 text-gold-300 transition-colors duration-300 hover:border-gold-400 hover:bg-gold-400 hover:text-on-gold';

/**
 * The storefront hero: three slides that crossfade on their own every few seconds (not with reduced
 * motion, and not while the pointer is over them), with arrows and dots. Each slide is a headline from the
 * old site's slider on an ivory panel beside one of our photos, a button into the shop, and three products it
 * features on the photo.
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
      className={`relative isolate overflow-hidden rounded-2xl border border-gold-400/25 bg-shade shadow-[0_24px_60px_--alpha(var(--color-shadow)/55%)] ${className}`}
    >
      {SLIDES.map((slide, i) => (
        <div
          key={slide.title}
          aria-hidden={i !== index}
          inert={i !== index}
          className={`absolute inset-0 flex flex-col-reverse transition-opacity duration-700 ease-premium sm:flex-row ${i === index ? 'z-10 opacity-100' : 'opacity-0'}`}
        >
          {/* The words, on solid ivory: left from sm, under the photo on phones (room left at the bottom for the controls) */}
          <div className="flex flex-1 flex-col justify-center bg-surface px-6 pt-5 pb-16 sm:w-[54%] sm:flex-none sm:border-r sm:border-gold-400/20 sm:px-8 sm:pt-8 sm:pb-20 xl:px-10">
            <Eyebrow>✦ {slide.eyebrow} ✦</Eyebrow>
            <h2 className="mb-3 font-serif text-[1.6rem] leading-[1.15] font-bold text-text-primary sm:text-[1.8rem] xl:text-[2.3rem]">
              {slide.title}
            </h2>
            <p className="mb-5 text-[1rem] text-text-secondary sm:mb-6 sm:text-[1.05rem]">{slide.text}</p>
            <div>
              <Button to={slide.cta.to}>
                {slide.cta.label}
                <ArrowRight size={16} strokeWidth={2} />
              </Button>
            </div>
          </div>

          {/* The photo, as it is, with its decorated right side in view */}
          <div className="relative h-36 shrink-0 overflow-hidden sm:h-auto sm:flex-1">
            <img
              src={slide.photo}
              alt=""
              loading={i === 0 ? 'eager' : 'lazy'}
              className={`absolute inset-0 size-full object-cover object-right transition-[scale] duration-[7s] ease-out ${i === index ? 'scale-105' : 'scale-100'}`}
            />

            {/* Featured products: small white plates along the bottom right */}
            <div className="absolute right-4 bottom-4 hidden items-end gap-2.5 sm:flex">
              {slide.products.map(productById).filter(Boolean).map((p) => (
                <Link
                  key={p.id}
                  to={`/product/${p.id}`}
                  title={p.name}
                  className="group block size-16 overflow-hidden rounded-xl border-2 border-gold-300/70 bg-white shadow-[0_8px_20px_--alpha(var(--color-shadow)/45%)] transition-transform duration-300 hover:-translate-y-1 md:size-20 xl:size-24"
                >
                  <img src={p.image} alt={p.name} loading="lazy" className="size-full object-cover transition-[scale] duration-500 group-hover:scale-110" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Controls */}
      <div className="absolute bottom-4 left-6 z-20 flex items-center gap-3 sm:left-8 xl:left-10">
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
              className={`h-1.5 cursor-pointer rounded-full transition-all duration-500 ${i === index ? 'w-7 bg-gold-400' : 'w-3 bg-contrast/30 hover:bg-contrast/60'}`}
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
