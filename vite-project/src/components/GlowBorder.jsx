/**
 * A 1px gold border with a streak of light travelling along it, for featured blocks.
 *
 * rounded  the radius class, the same one the inner card uses (e.g. "rounded-3xl")
 * The child should drop its own border and shadow (the shadow lives here: overflow-hidden would
 * clip one on the child) and keep its background.
 *
 * The streak is its own layer moved with `translate` (GPU), clipped by overflow-hidden; the
 * 1px of padding is all that shows of it around the card.
 */
const GlowBorder = ({ rounded = 'rounded-3xl', className = '', children }) => {
  return (
    <div
      className={`relative overflow-hidden ${rounded} bg-gold-400/20 p-px shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_30px_rgba(229,199,139,0.08)] ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1/3 animate-gold-sheen bg-[linear-gradient(110deg,transparent,rgba(250,235,195,0.9),transparent)]"
      />
      <div className="relative">{children}</div>
    </div>
  );
};

export default GlowBorder;
