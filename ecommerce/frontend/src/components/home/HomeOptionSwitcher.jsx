import { useSearchParams } from 'react-router-dom';
import { LayoutTemplate } from 'lucide-react';

/**
 * TEMPORARY, for choosing a home page design: a pill at the bottom of the screen that switches between
 * the options (?option=1…5). Remove it, and the options not chosen, once one is picked.
 */
const HomeOptionSwitcher = ({ options, current }) => {
  const [, setParams] = useSearchParams();
  const choose = (id) => {
    setParams(id === options[0].id ? {} : { option: String(id) });
    window.scrollTo({ top: 0 });
  };
  const active = options.find((o) => o.id === current);

  return (
    <div className="fixed bottom-4 left-1/2 z-[95] flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-gold-400/50 bg-bg-deepest/92 py-1.5 pr-1.5 pl-3.5 shadow-[0_12px_32px_--alpha(var(--color-black)/60%)] backdrop-blur-[8px]">
      <LayoutTemplate size={15} strokeWidth={2} className="shrink-0 text-gold-400" aria-hidden="true" />
      <span className="mr-1 hidden text-[0.75rem] whitespace-nowrap text-text-secondary sm:inline">
        Home option: <strong className="text-gold-300">{active?.name}</strong>
      </span>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          title={o.name}
          aria-label={`Home option ${o.id}: ${o.name}`}
          aria-pressed={o.id === current}
          onClick={() => choose(o.id)}
          className={`size-8 cursor-pointer rounded-full text-[0.8rem] font-bold transition-colors ${
            o.id === current ? 'bg-gold-400 text-on-gold' : 'text-text-secondary hover:bg-white/10 hover:text-white'
          }`}
        >
          {o.id}
        </button>
      ))}
    </div>
  );
};

export default HomeOptionSwitcher;
