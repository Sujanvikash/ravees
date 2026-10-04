import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Sparkles, Star, TreePine, Truck, Zap } from "lucide-react";
import { hero, craft } from "./heroContent";

// Icon names used in heroContent.js → lucide-react components (project rule: icons come from packages).
const ICONS = { shield: ShieldCheck, zap: Zap, truck: Truck, tree: TreePine, sparkles: Sparkles };

// A typo in heroContent.js falls back to a generic icon instead of crashing the whole page.
function iconFor(name) {
  const Icon = ICONS[name];
  if (!Icon && import.meta.env.DEV) console.warn(`heroContent.js: unknown icon "${name}", using "sparkles"`);
  return Icon ?? Sparkles;
}

const HEADING = "font-serif";
const EYEBROW = "font-mono text-[0.68rem] uppercase tracking-[0.26em] text-gold-400 sm:text-xs";
const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-300";
// No backdrop-filter on purpose: blur over a moving canvas is the #1 cause of dropped frames.
const CARD =
  "rounded-[1.75rem] border border-gold-400/25 bg-[rgba(8,28,20,0.82)] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.85),0_0_30px_rgba(229,199,139,0.08),inset_0_1px_0_rgba(255,246,223,0.06)]";

/** Left card: heritage headline, copy, buttons, badges, scroll hint. */
export function HeroCard({ shopHref, studioHref, reduced }) {
  return (
    <div data-beat="hero" className={`${CARD} p-4 will-change-[transform,opacity] sm:p-7 lg:p-8 lg:short:p-6`}>
      <p className={EYEBROW}>✦ {hero.eyebrow}</p>

      <h1
        className={`${HEADING} mt-4 bg-[linear-gradient(135deg,#ffffff_0%,var(--color-gold-200)_100%)] bg-clip-text text-[clamp(1.85rem,min(3.1vw,5.4svh),3.3rem)] short:mt-3 font-bold leading-[1.1] tracking-[0.03em] text-transparent`}
      >
        {hero.title}
      </h1>

      <p
        data-part="lede"
        className="mt-4 text-[0.98rem] leading-relaxed text-text-secondary lg:text-[1.05rem] short:mt-3 lg:short:text-[0.95rem]"
      >
        {hero.text}
      </p>

      <div className="mt-6 flex flex-wrap gap-2.5 short:mt-4">
        <Link
          to={shopHref ?? hero.primary.href}
          className={`inline-flex items-center gap-2 rounded-lg border border-gold-200 bg-[linear-gradient(135deg,var(--color-gold-400),var(--color-gold-600))] px-4 py-3 text-[0.9rem] font-semibold tracking-[0.04em] text-[#04140b] shadow-[0_0_20px_rgba(229,199,139,0.4)] transition-transform duration-200 hover:-translate-y-0.5 sm:px-5 ${FOCUS}`}
        >
          {hero.primary.label}
          <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </Link>
        <Link
          to={studioHref ?? hero.secondary.href}
          className={`inline-flex items-center rounded-lg border border-gold-400/45 px-4 py-3 text-[0.9rem] font-semibold tracking-[0.04em] text-gold-300 transition-colors duration-200 hover:bg-gold-400/10 hover:text-white sm:px-5 ${FOCUS}`}
        >
          {hero.secondary.label}
        </Link>
      </div>

      <ul className="mt-5 flex flex-wrap gap-2 short:mt-3">
        {hero.badges.map((b) => {
          const BadgeIcon = iconFor(b.icon);
          return (
            <li
              key={b.label}
              className="inline-flex items-center gap-2 rounded-full border border-gold-400/25 bg-gold-400/8 px-3 py-1.5 text-[0.75rem] text-gold-200 sm:px-3.5 sm:py-2 sm:text-[0.8rem]"
            >
              <BadgeIcon className="h-4 w-4 text-gold-400" strokeWidth={1.6} aria-hidden="true" />
              {b.label}
            </li>
          );
        })}
      </ul>

      {!reduced && (
        <p data-part="hint" className="mt-6 flex items-center gap-3 text-sm text-gold-400 short:hidden">
          <span
            aria-hidden="true"
            className="relative block h-8 w-5 rounded-full border border-gold-400/70"
          >
            <span className="absolute left-1/2 top-1.5 h-1.5 w-0.5 -translate-x-1/2 animate-bounce rounded-full bg-gold-400" />
          </span>
          {hero.scrollHint}
        </p>
      )}
    </div>
  );
}

/** Right card: craftsmanship standards and rating. */
export function CraftCard() {
  return (
    <div data-beat="craft" className={`${CARD} p-5 will-change-[transform,opacity] sm:p-6 lg:p-7`}>
      <p className={EYEBROW}>✦ {craft.eyebrow}</p>

      <ul className="mt-5 space-y-4">
        {craft.items.map((item) => {
          const ItemIcon = iconFor(item.icon);
          return (
            <li key={item.title} className="flex items-start gap-3.5">
              <ItemIcon className="mt-0.5 h-6 w-6 shrink-0 text-gold-400" strokeWidth={1.6} aria-hidden="true" />
              <div>
                <p className="font-semibold leading-snug text-white">{item.title}</p>
                <p className="mt-0.5 text-[0.85rem] leading-snug text-text-secondary">{item.text}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex items-center justify-between border-t border-gold-400/15 pt-4">
        <span className="flex items-center gap-2 text-gold-300">
          <span className="flex gap-0.5" role="img" aria-label={`Rated ${craft.rating} out of 5`}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className="h-3.5 w-3.5" strokeWidth={2} fill="currentColor" aria-hidden="true" />
            ))}
          </span>
          <span className="font-mono text-sm">{craft.rating}</span>
        </span>
        <span className="font-mono text-sm text-gold-300">{craft.homes}</span>
      </div>
    </div>
  );
}
