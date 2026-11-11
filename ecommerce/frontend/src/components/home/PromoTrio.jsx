import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Reveal from '../Reveal.jsx';
import { PROMOS } from '../../data/home.js';
import { heroTreeGlow, luxuryGiftBoxes, festiveLanternGlow } from '../../assets/decorations';

const PHOTOS = [heroTreeGlow, luxuryGiftBoxes, festiveLanternGlow];

/**
 * Three promo banners side by side (stacked on phones), each a photo shown as it is (no wash) above a
 * plain strip with a headline and a "Shop …" link into the matching collection. The headlines are the old
 * site's feature banners.
 */
const PromoTrio = ({ className = '' }) => (
  <div className={`grid gap-4 md:grid-cols-3 ${className}`}>
    {PROMOS.map((promo, i) => (
      <Reveal key={promo.title} delay={i} className="h-full">
        <Link
          to={promo.to}
          className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gold-400/20 bg-surface no-underline shadow-[0_14px_36px_--alpha(var(--color-shadow)/45%)]"
        >
          <span className="relative block h-36 overflow-hidden sm:h-40">
            <img
              src={PHOTOS[i]}
              alt=""
              loading="lazy"
              className="absolute inset-0 size-full object-cover transition-[scale] duration-700 ease-premium group-hover:scale-[1.06]"
            />
          </span>
          <span className="flex flex-1 flex-col justify-between border-t border-gold-400/20 p-4 sm:p-5">
            <span className="mb-3 font-serif text-[1.12rem] font-bold leading-[1.3] text-text-primary sm:text-[1.2rem]">
              {promo.title}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold tracking-[0.06em] text-gold-300 transition-colors group-hover:text-text-primary">
              {promo.cta}
              <ArrowRight size={15} strokeWidth={2} className="transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </span>
        </Link>
      </Reveal>
    ))}
  </div>
);

export default PromoTrio;
