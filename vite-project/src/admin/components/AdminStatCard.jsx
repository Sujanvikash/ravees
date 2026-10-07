const AdminStatCard = ({ Icon, label, value, hint, accent = 'gold' }) => {
  const accents = {
    gold: 'text-gold-300 bg-gold-400/10 border-gold-400/20',
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    ruby: 'text-ruby-500 bg-ruby-500/10 border-ruby-500/20',
  };

  return (
    <div className="flex items-start gap-4 rounded-xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] p-5">
      {Icon && (
        <div className={`rounded-lg border p-2.5 ${accents[accent] ?? accents.gold}`}>
          <Icon size={20} strokeWidth={2} />
        </div>
      )}
      <div>
        <span className="block font-serif text-[1.8rem] font-bold leading-none text-white">{value}</span>
        <span className="mt-1.5 block text-[0.78rem] uppercase tracking-[0.08em] text-text-muted">
          {label}
        </span>
        {hint && <span className="mt-1 block text-[0.75rem] text-text-secondary">{hint}</span>}
      </div>
    </div>
  );
};

export default AdminStatCard;
