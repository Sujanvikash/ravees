/**
 * Slow drifting gold and emerald light behind a section's content.
 *
 * Put it as the first child of a section that is `relative` with a z-index (every page section
 * here is `relative z-20`): its `-z-10` then sits above the section's background and below the
 * content. Soft radial gradients instead of `blur()`, and only transform properties animate,
 * so it runs on the compositor. Never use it over the hero canvas.
 *
 * It covers at most one screen at the top of the section: on long pages (Shop is ~11,000px)
 * full-height glows were moving layers thousands of pixels tall, which cost frames.
 */
const Aurora = ({ className = '' }) => {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 top-0 -z-10 h-screen max-h-full overflow-hidden ${className}`}
    >
      <div className="absolute -top-1/3 -left-1/4 h-[70%] w-[70%] animate-aurora rounded-full bg-[radial-gradient(closest-side,rgba(229,199,139,0.10),transparent)]" />
      <div className="absolute -right-1/4 -bottom-1/3 h-[75%] w-[75%] animate-aurora-reverse rounded-full bg-[radial-gradient(closest-side,rgba(16,185,129,0.09),transparent)]" />
    </div>
  );
};

export default Aurora;
