import { ArrowRight } from 'lucide-react';
import Reveal from '../Reveal.jsx';
import Button from '../Button.jsx';
import CountUp from '../CountUp.jsx';
import Eyebrow from '../Eyebrow.jsx';
import Flourish from '../Flourish.jsx';
import { BRAND, BRAND_STATS } from '../../data/home.js';
import { santaChildGift } from '../../assets/decorations';

/**
 * Our story: the old site's welcome ("India's largest importer … 27th year") beside a photo, with the
 * four figures from its About page counting up underneath. On cream, with ink text.
 */
const BrandStory = ({ className = '' }) => (
  <section className={`relative z-20 bg-cream-100 py-10 text-ink md:py-14 ${className}`}>
    <div className="mx-auto grid max-w-340 items-center gap-8 px-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-14">
      <Reveal>
        <Eyebrow className="text-gold-ink!">✦ Our story ✦</Eyebrow>
        <div className="mb-4 flex items-center gap-4">
          <h2 className="font-serif text-[1.6rem] font-bold leading-[1.2] text-ink sm:text-[1.95rem]">{BRAND.name}</h2>
          <Flourish tone="light" className="hidden xl:block" />
        </div>
        <p className="mb-3 text-[0.97rem] leading-[1.75] text-ink-soft">{BRAND.welcome}</p>
        <p className="mb-6 text-[0.97rem] leading-[1.75] text-ink-soft">{BRAND.emotion}</p>

        <dl className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BRAND_STATS.map(({ value, suffix, label }) => (
            <div key={label} className="rounded-xl border border-cream-200 bg-cream-50 px-4 py-3">
              <dt className="sr-only">{label}</dt>
              <dd>
                <CountUp value={value} suffix={suffix} className="block font-serif text-[1.6rem] font-bold text-forest" />
                <span aria-hidden="true" className="text-[0.74rem] uppercase tracking-[0.08em] text-gold-ink">
                  {label}
                </span>
              </dd>
            </div>
          ))}
        </dl>

        <Button to="/about" className="border-forest! bg-forest! bg-none! text-cream-50! shadow-none! hover:bg-forest-hover!">
          Read Our Story
          <ArrowRight size={16} strokeWidth={2} />
        </Button>
      </Reveal>

      <Reveal className="relative">
        <img
          src={santaChildGift}
          alt="Santa Claus handing a wrapped present to a smiling girl beside a lit Christmas tree"
          loading="lazy"
          className="aspect-4/3 w-full rounded-[1.75rem] object-cover shadow-[0_24px_50px_--alpha(var(--color-forest)/30%)] lg:aspect-4/5"
        />
        <span className="absolute -bottom-4 -left-3 max-w-[15rem] rounded-xl border border-gold-300 bg-forest px-4 py-3 text-[0.85rem] leading-snug text-cream-50 shadow-[0_12px_28px_--alpha(var(--color-forest)/35%)] sm:-left-6">
          <strong className="block font-serif text-[1.05rem] text-gold-300">27th year in India</strong>
          India’s largest importer of European-standard trees
        </span>
      </Reveal>
    </div>
  </section>
);

export default BrandStory;
