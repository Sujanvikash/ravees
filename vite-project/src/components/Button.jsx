import { Link } from 'react-router-dom';

const BASE =
  'inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-lg px-6.5 py-3 font-sans text-[0.88rem] font-semibold tracking-[0.06em] no-underline transition-all duration-300';

const VARIANTS = {
  gold: 'border border-gold-200 bg-[linear-gradient(135deg,var(--color-gold-400),var(--color-gold-600))] text-[#04140b] shadow-[0_0_20px_rgba(229,199,139,0.4)] hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#fff0c4,var(--color-gold-400))] hover:shadow-[0_0_30px_rgba(229,199,139,0.65)]',
  outline:
    'border border-gold-400/30 bg-[rgba(8,28,20,0.6)] text-gold-300 backdrop-blur-[8px] hover:-translate-y-0.5 hover:border-gold-400 hover:bg-gold-400/15 hover:text-white',
  ghost: 'border border-transparent text-text-secondary hover:text-gold-300',
};

export default function Button({
  variant = 'gold',
  to,
  href,
  full = false,
  className = '',
  children,
  ...rest
}) {
  const classes = `${BASE} ${VARIANTS[variant] ?? VARIANTS.gold} ${full ? 'w-full' : ''} ${className}`;

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
