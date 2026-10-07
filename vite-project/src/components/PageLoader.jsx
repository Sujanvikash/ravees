import Logo from './Logo.jsx';

const PageLoader = ({ label = 'Loading' }) => {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5">
      <Logo size={56} glow={20} className="animate-pulse-logo" />
      <span className="font-mono text-[0.72rem] uppercase tracking-[0.3em] text-gold-400">{label}</span>
    </div>
  );
};

export default PageLoader;
