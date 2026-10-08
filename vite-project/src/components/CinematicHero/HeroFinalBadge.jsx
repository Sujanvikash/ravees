import { HERO_COPY } from "./heroConfig";

const lines = (arr) =>
  arr.map((line, i) => (
    <span key={line} className="block">
      {line}
      {i < arr.length - 1 && " "}
    </span>
  ));

/**
 * The small closing mark on the right of the finished tree. Deliberately quiet: a seal, not a card.
 * Sits above the bottom corner, which the site's floating Santa button occupies.
 */
const HeroFinalBadge = ({ ref }) => {
  const { title, caption } = HERO_COPY.badge;
  return (
    <div
      ref={ref}
      className="absolute bottom-28 right-6 z-20 rounded-2xl border border-gold-400/25 bg-[linear-gradient(160deg,rgba(7,18,13,0.66),rgba(7,18,13,0.4))] px-5 py-4 text-right shadow-[inset_0_1px_0_rgba(255,246,223,0.07)] will-change-[transform,opacity] sm:right-10 xl:right-16 short:bottom-24"
    >
      <p className="font-serif text-[0.95rem] font-bold uppercase leading-snug tracking-[0.08em] text-gold-200">
        {lines(title)}
      </p>
      <span aria-hidden="true" className="my-3 ml-auto block h-px w-8 bg-gold-400/60" />
      <p className="font-mono text-[0.66rem] uppercase leading-relaxed tracking-[0.24em] text-white/75">
        {lines(caption)}
      </p>
    </div>
  );
};

export default HeroFinalBadge;
