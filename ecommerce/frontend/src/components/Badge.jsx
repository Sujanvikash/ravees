const VARIANTS = {
  gold: 'bg-[linear-gradient(135deg,var(--color-cta-from),var(--color-cta-to))] text-on-cta',
  emerald: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  ruby: 'bg-ruby-500 text-white',
  muted: 'bg-contrast/5 text-text-muted border border-contrast/10',
};

const Badge = ({ variant = 'gold', className = '', children }) => {
  return (
    <span
      className={`inline-block rounded-md px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.08em] ${VARIANTS[variant] ?? VARIANTS.gold} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
