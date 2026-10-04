import { Minus, Plus } from 'lucide-react';

const SIZES = {
  md: { button: 'h-9 w-9', value: 'w-10 text-[0.9rem]', icon: 14 },
  sm: { button: 'h-[30px] w-[30px]', value: 'w-8 text-[0.85rem]', icon: 13 },
};

/** − n + control. `onChange` gets the new quantity; what 0 means is up to the caller. */
export default function QuantityStepper({ value, onChange, size = 'md' }) {
  const s = SIZES[size] ?? SIZES.md;
  const button = `flex ${s.button} cursor-pointer items-center justify-center border-none bg-transparent text-gold-300 hover:bg-gold-400/20`;
  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-gold-400/15 bg-white/8">
      <button type="button" className={button} onClick={() => onChange(value - 1)} aria-label="Decrease quantity">
        <Minus size={s.icon} strokeWidth={2.5} />
      </button>
      <span className={`${s.value} text-center font-mono text-white`} aria-live="polite">
        {value}
      </span>
      <button type="button" className={button} onClick={() => onChange(value + 1)} aria-label="Increase quantity">
        <Plus size={s.icon} strokeWidth={2.5} />
      </button>
    </div>
  );
}
