import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Reveal from '../Reveal.jsx';
import { PROMOS } from '../../data/home.js';
import { heroTreeGlow, luxuryGiftBoxes, festiveLanternGlow } from '../../assets/decorations';

const PHOTOS = [heroTreeGlow, luxuryGiftBoxes, festiveLanternGlow];

/**
 * Three promo banners side by side (stacked on phones), each a photo darkened toward its text, a headline
 * and a "Shop …" link into the matching collection. The headlines are the old site's feature banners.
 */
const PromoTrio = ({ className = '' }) => (
  <div className={`grid gap-4 md:grid-cols-3 ${className}`}>
    {PROMOS.map((promo, i) => (
      <Reveal key={promo.title} delay={i}>
        <Link
          to={promo.to}
          className="group relative isolate flex h-48 overflow-hidden rounded-2xl border border-gold-400/20 no-underline shadow-[0_14px_36px_--alpha(var(--color-shadow)/45%)] sm:h-56"
        >
          <img
            src={PHOTOS[i]}
            alt=""
            loading="lazy"
            className="absolute inset-0 -z-10 size-full object-cover transition-[scale] duration-700 ease-premium group-hover:scale-[1.06]"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,--alpha(var(--color-shade)/97%)_0%,--alpha(var(--color-shade)/88%)_50%,--alpha(var(--color-shade)/15%)_100%)]"
          />
          <span className="flex max-w-[78%] flex-col justify-end p-5 sm:p-6">
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
