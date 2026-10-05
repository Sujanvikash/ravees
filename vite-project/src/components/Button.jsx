import { Link } from 'react-router-dom';

const BASE =
  'inline-flex cursor-pointer items-center justify-center rounded-lg font-sans font-semibold no-underline transition-all duration-300 ease-premium active:scale-[0.97] disabled:pointer-events-none disabled:border-white/10 disabled:bg-none disabled:bg-white/5 disabled:text-text-muted disabled:shadow-none';

// sm: compact admin/toolbar buttons; md: the default; lg: full-width checkout-style calls to action.
const SIZES = {
  sm: 'gap-2 px-4 py-2.5 text-[0.85rem]',
  md: 'gap-2.5 px-6.5 py-3 text-[0.88rem] tracking-[0.06em]',
  lg: 'gap-2.5 px-6.5 py-3.5 text-[0.95rem] tracking-[0.06em]',
};

// Gold buttons: a streak of light sweeps across on hover (the ::before layer, clipped by overflow-hidden).
const SHINE =
  'relative overflow-hidden before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-1/3 before:-translate-x-[120%] before:skew-x-[-20deg] before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)] before:transition-transform before:duration-700 before:ease-premium hover:before:translate-x-[420%]';

const VARIANTS = {
  gold: SHINE + ' border border-gold-200 bg-[linear-gradient(135deg,var(--color-gold-400),var(--color-gold-600))] text-[#04140b] shadow-[0_0_20px_rgba(229,199,139,0.4)] hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#fff0c4,var(--color-gold-400))] hover:shadow-[0_0_30px_rgba(229,199,139,0.65)]',
  outline:
    'border border-gold-400/30 bg-[rgba(8,28,20,0.6)] text-gold-300 backdrop-blur-[8px] hover:-translate-y-0.5 hover:border-gold-400 hover:bg-gold-400/15 hover:text-white',
  ghost: 'border border-transparent text-text-secondary hover:text-gold-300',
};

export default function Button({
  variant = 'gold',
  size = 'md',
  to,
  href,
  full = false,
  className = '',
  children,
  ...rest
}) {
  const classes = `${BASE} ${SIZES[size] ?? SIZES.md} ${VARIANTS[variant] ?? VARIANTS.gold} ${full ? 'w-full' : ''} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
