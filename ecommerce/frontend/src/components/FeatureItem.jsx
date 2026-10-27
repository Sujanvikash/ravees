/**
 * One promise / benefit: a gold line icon beside a short text. The page lays several out in its own grid.
 *
 *  variant "band"   large icon, small spaced-out capitals (Why Raave promise band)
 *          "strip"  medium icon, plain small text (Tree Studio strip)
 *          "trust"  icon, serif title and a muted line under it, hidden on phones (Home trust strip)
 *          "point"  large thin icon beside a two-line label (product page features)
 *          "card"   icon beside a gold title and a line of detail (product page promise tiles)
 *          "box"    icon above a short centred label, in a small bordered box (quick view)
 *
 * Props: Icon, title, body (trust / card), variant, className, and `as` to render it as another component
 * (e.g. Reveal, with its `delay`); other props pass through to it.
 */
const FeatureItem = ({ Icon, title, body, variant = 'strip', as: Tag = 'div', className = '', ...rest }) => {
  if (variant === 'trust') {
    return (
      <Tag className={`flex items-center gap-2.5 sm:gap-3 ${className}`} {...rest}>
        <Icon strokeWidth={1.5} className="size-5 shrink-0 text-gold-400 sm:size-6" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="text-[0.78rem] font-semibold leading-tight text-white sm:text-[0.88rem]">{title}</h3>
          {/* Phones show the title only, to keep the strip short. */}
          {body && <p className="hidden text-[0.76rem] leading-snug text-text-muted sm:block">{body}</p>}
        </div>
      </Tag>
    );
  }
  if (variant === 'point') {
    return (
      <Tag className={`flex items-center gap-3 ${className}`} {...rest}>
        <Icon size={32} strokeWidth={1.2} className="shrink-0 text-gold-400" aria-hidden="true" />
        <span className="text-[0.8rem] leading-snug text-text-primary">{title}</span>
      </Tag>
    );
  }
  if (variant === 'card') {
    return (
      <Tag className={`flex items-center gap-4 ${className}`} {...rest}>
        <Icon size={34} strokeWidth={1.3} className="shrink-0 text-gold-400" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="text-[0.85rem] font-semibold text-gold-200">{title}</h3>
          {body && <p className="mt-0.5 text-[0.78rem] leading-snug text-text-secondary">{body}</p>}
        </div>
      </Tag>
    );
  }
  if (variant === 'box') {
    return (
      <Tag
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-gold-400/20 bg-surface/50 px-2 py-3 text-center ${className}`}
        {...rest}
      >
        <Icon size={26} strokeWidth={1.3} className="text-gold-400" aria-hidden="true" />
        <span className="text-[0.74rem] leading-snug text-text-primary">{title}</span>
      </Tag>
    );
  }
  const band = variant === 'band';
  return (
    <Tag className={`flex items-center ${band ? 'gap-4' : 'gap-3 text-[0.82rem] text-text-secondary'} ${className}`} {...rest}>
      <Icon size={band ? 34 : 24} strokeWidth={band ? 1.3 : 1.5} className="shrink-0 text-gold-400" aria-hidden="true" />
      {band ? (
        <span className="max-w-[15rem] font-mono text-[0.7rem] uppercase leading-[1.6] tracking-[0.14em] text-text-secondary">
          {title}
        </span>
      ) : (
        title
      )}
    </Tag>
  );
};

export default FeatureItem;
