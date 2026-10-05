import { MessageCircle } from 'lucide-react';

/**
 * christmasraave.in does not publish prices — every product is quote-based, so this
 * fills the price slot with an enquiry prompt instead of a number.
 */
/** compact: just the "Enquire for Price" line, without the "Quote on request" caption (product cards). */
export default function PriceTag({ size = 'md', compact = false, className = '' }) {
  const titleSize = { lg: 'text-[1.6rem]', md: 'text-[1.25rem]', sm: 'text-[0.8rem] tracking-tight sm:text-[1.05rem] sm:tracking-normal' }[size] ?? 'text-[1.25rem]';

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <span className={`font-serif font-bold text-gold-200 ${titleSize}`}>Enquire for Price</span>
      {!compact && (
        <span className="inline-flex items-center gap-1.5 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-text-muted">
          <MessageCircle size={12} strokeWidth={2} />
          Quote on request
        </span>
      )}
    </div>
  );
}
