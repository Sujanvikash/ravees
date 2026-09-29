import { TbChristmasTreeFilled } from 'react-icons/tb';

export default function PageLoader({ label = 'Loading' }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5">
      <TbChristmasTreeFilled
        size={56}
        className="animate-pulse-logo text-gold-400 drop-shadow-[0_0_20px_rgba(229,199,139,0.4)]"
      />
      <span className="font-mono text-[0.72rem] uppercase tracking-[0.3em] text-gold-400">{label}</span>
    </div>
  );
}
