/**
 * A thin gold flourish drawn either side of a section title (like an engraved scroll line).
 * side   "left" draws it pointing toward a title on its right; "right" is the mirror.
 * tone   "dark" for dark sections (light gold), "light" for cream sections (deeper gold).
 */
const Flourish = ({ side = 'right', tone = 'dark', className = '' }) => {
  const color = tone === 'light' ? 'text-gold-ink' : 'text-gold-400';
  return (
    <svg
      viewBox="0 0 84 14"
      width="84"
      height="14"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${color} ${side === 'left' ? '-scale-x-100' : ''} ${className}`}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
        {/* a small curl next to the title, then a line tapering away */}
        <path d="M2 7 C 7 2, 13 2, 15 6 C 17 10, 12 12, 10 9 C 8 6, 14 4, 20 7 L 82 7" />
        <path d="M24 9.5 L 60 9.5" strokeOpacity="0.45" />
      </g>
      <circle cx="82" cy="7" r="1.4" fill="currentColor" />
    </svg>
  );
};

export default Flourish;
