import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Sparkles, Star, TreePine, Truck, Zap } from "lucide-react";
import { hero, craft } from "./heroContent";

// Icon names used in heroContent.js → lucide-react components (project rule: icons come from packages).
const ICONS = { shield: ShieldCheck, zap: Zap, truck: Truck, tree: TreePine, sparkles: Sparkles };

// A typo in heroContent.js falls back to a generic icon instead of crashing the whole page.
const iconFor = (name) => {
  const Icon = ICONS[name];
  if (!Icon && import.meta.env.DEV) console.warn(`heroContent.js: unknown icon "${name}", using "sparkles"`);
  return Icon ?? Sparkles;
};

const HEADING = "font-serif";
const EYEBROW = "font-mono text-[0.68rem] uppercase tracking-[0.28em] text-gold-300 sm:text-xs";
const EYEBROW_LARGE = "font-mono text-sm uppercase tracking-[0.28em] text-gold-300 sm:text-[0.95rem]";
const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-300";
// A light tinted panel, not a solid box: the scrim in ScrollTreeHero already darkens the right edge,
// so the panel only needs to separate the text from the snow. No drop shadow, so it sits in the scene.
// No backdrop-filter on purpose: blur over a moving canvas is the #1 cause of dropped frames.
const PANEL =
  "rounded-3xl border border-gold-400/15 bg-[linear-gradient(160deg,rgba(7,18,13,0.62)_0%,rgba(7,18,13,0.36)_100%)] shadow-[inset_0_1px_0_rgba(255,246,223,0.07)]";
// Small round gold-tinted badge: holds each standard's icon and the rating pills.
const BADGE = "border border-gold-400/30 bg-gold-400/10";

// The headline block has no card behind it: just text over the scene, kept legible by the scrim in
// ScrollTreeHero and a soft shadow on the text. (Still no filter/backdrop-filter: they hurt scroll.)
const TEXT_SHADOW = "[text-shadow:0_2px_16px_rgba(0,0,0,0.75),0_0_2px_rgba(0,0,0,0.5)]";

/** Left block: heritage headline, copy, buttons, badges, scroll hint. Plain text, not a card. */
export const HeroCard = ({ shopHref, studioHref, reduced }) => {
  return (
    <div data-beat="hero" className="will-change-[transform,opacity]">
      <p className={`${EYEBROW_LARGE} ${TEXT_SHADOW}`}>✦ {hero.eyebrow}</p>

      <h1
        className={`${HEADING} mt-4 bg-[linear-gradient(135deg,#ffffff_0%,var(--color-gold-200)_100%)] bg-clip-text text-[clamp(2.2rem,min(4.4vw,7.2svh),4.6rem)] short:mt-3 font-bold leading-[1.08] tracking-[0.02em] text-transparent`}
      >
        {hero.title}
      </h1>

      {/* The value proposition under the headline: near-white, gold rule on the left so it reads as one unit with the title. */}
      <p
        data-part="lede"
        className={`mt-6 max-w-[34ch] border-l-2 border-gold-400/70 pl-4 text-[1.1rem] leading-relaxed text-white/95 lg:text-[1.3rem] short:mt-3 lg:short:text-[1.05rem] ${TEXT_SHADOW}`}
      >
        {hero.text}
      </p>

      <div className="mt-7 flex flex-wrap gap-3 short:mt-4">
        <Link
          to={shopHref ?? hero.primary.href}
          className={`inline-flex items-center gap-2 rounded-lg border border-gold-200 bg-[linear-gradient(135deg,var(--color-gold-400),var(--color-gold-600))] px-5 py-3.5 text-[1rem] font-semibold tracking-[0.04em] text-[#04140b] shadow-[0_0_20px_rgba(229,199,139,0.4)] transition-transform duration-200 hover:-translate-y-0.5 short:py-3 sm:px-6 ${FOCUS}`}
        >
          {hero.primary.label}
          <ArrowRight className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
        </Link>
        <Link
          to={studioHref ?? hero.secondary.href}
          className={`inline-flex items-center rounded-lg border border-gold-400/55 bg-[rgba(8,28,20,0.55)] px-5 py-3.5 text-[1rem] font-semibold tracking-[0.04em] text-gold-300 transition-colors duration-200 hover:bg-gold-400/15 hover:text-white short:py-3 sm:px-6 ${FOCUS}`}
        >
          {hero.secondary.label}
        </Link>
      </div>

      <ul className="mt-6 flex flex-wrap gap-2.5 short:mt-3">
        {hero.badges.map((b) => {
          const BadgeIcon = iconFor(b.icon);
          return (
            <li
              key={b.label}
              className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-[rgba(8,28,20,0.55)] px-3.5 py-2 text-[0.85rem] text-gold-200 sm:px-4 sm:text-[0.95rem]"
            >
              <BadgeIcon className="h-4 w-4 text-gold-400" strokeWidth={1.6} aria-hidden="true" />
              {b.label}
            </li>
          );
        })}
      </ul>

      {!reduced && (
        <p data-part="hint" className={`mt-7 flex items-center gap-3 text-base text-gold-400 short:hidden ${TEXT_SHADOW}`}>
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
};

/** Right card: craftsmanship standards and rating. */
export const CraftCard = () => {
  return (
    <div data-beat="craft" className={`${PANEL} p-5 will-change-[transform,opacity] sm:p-6 lg:p-7`}>
      <p className={EYEBROW}>✦ {craft.eyebrow}</p>

      <ul className="mt-4 divide-y divide-gold-400/10">
        {craft.items.map((item) => {
          const ItemIcon = iconFor(item.icon);
          return (
            <li key={item.title} className="flex items-center gap-3.5 py-3.5 short:py-2.5">
              <span className={`${BADGE} flex h-10 w-10 shrink-0 items-center justify-center rounded-full`}>
                <ItemIcon className="h-5 w-5 text-gold-300" strokeWidth={1.6} aria-hidden="true" />
              </span>
              <div>
                <p className="text-[1rem] font-semibold leading-snug tracking-[0.01em] text-white">{item.title}</p>
                <p className="mt-1 text-[0.85rem] leading-snug text-white/70">{item.text}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className={`${BADGE} inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-gold-300`}>
          <span className="flex gap-0.5" role="img" aria-label={`Rated ${craft.rating} out of 5`}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className="h-3 w-3" strokeWidth={2} fill="currentColor" aria-hidden="true" />
            ))}
          </span>
          <span className="font-mono text-[0.8rem] text-gold-200">{craft.rating}</span>
        </span>
        <span className={`${BADGE} inline-flex items-center rounded-full px-2.5 py-1.5 font-mono text-[0.8rem] text-gold-200`}>
          {craft.homes}
        </span>
      </div>
    </div>
  );
};
