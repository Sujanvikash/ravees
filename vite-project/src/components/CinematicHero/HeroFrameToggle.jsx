/**
 * Desktop switch between the hero's frame sequences (heroConfig's FRAME_SETS). Sits in the top-right
 * corner of the stage, below the header (which covers the top of the stage on arrival), clear of the copy
 * (left) and the closing badge (bottom right).
 */
const HeroFrameToggle = ({ sets, value, onChange }) => (
  <div
    role="radiogroup"
    aria-label="Hero animation"
    className="absolute right-6 top-[calc(var(--header-h)+1.5rem)] z-30 flex rounded-full border border-gold-400/30 bg-[rgba(7,18,13,0.66)] p-1 shadow-[inset_0_1px_0_rgba(255,246,223,0.07)] sm:right-10 xl:right-16"
  >
    {sets.map((set) => {
      const active = set.id === value;
      return (
        <button
          key={set.id}
          type="button"
          role="radio"
          aria-checked={active}
          onClick={() => onChange(set.id)}
          className={`rounded-full px-4 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.2em] transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 ${
            active ? "bg-gold-400 text-[#0B1A14]" : "text-gold-200 hover:text-white"
          }`}
        >
          {set.label}
        </button>
      );
    })}
  </div>
);

export default HeroFrameToggle;
