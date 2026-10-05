export default function TrustBadge({ Icon, title, children }) {
  return (
    // h-full: every badge in a row is as tall as the tallest one, even inside a wrapper (Reveal).
    <div className="flex h-full items-start gap-4 rounded-[14px] border border-gold-400/15 bg-[rgba(8,28,20,0.85)] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gold-400/30">
      <div className="shrink-0 rounded-xl border border-gold-400/15 bg-gold-400/10 p-3 text-gold-400">
        <Icon size={28} strokeWidth={2} />
      </div>
      <div>
        <h4 className="mb-1 font-serif text-[1.05rem] text-white">{title}</h4>
        <p className="text-[0.85rem] leading-[1.6] text-text-secondary">{children}</p>
      </div>
    </div>
  );
}
