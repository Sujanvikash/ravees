import { QUOTE_COLOURS } from '../lib/quoteColour.js';

/** The colours a quotation or an invoice can come out in, as swatches. */
const ColourPicker = ({ value, onChange }) => (
  <div role="radiogroup" aria-label="Colour" className="flex items-center gap-1.5">
    <span className="mr-1 text-[13px] font-medium text-ink-2">Colour</span>
    {QUOTE_COLOURS.map((c) => (
      <button
        key={c.id}
        type="button"
        role="radio"
        aria-checked={value === c.id}
        aria-label={c.label}
        title={c.label}
        onClick={() => onChange(c.id)}
        style={{ background: c.mono ? 'linear-gradient(135deg, #000 50%, #fff 50%)' : c.accent }}
        className={`size-7 rounded-full border border-black/15 transition-shadow ${value === c.id ? 'shadow-[0_0_0_2px_#fff,0_0_0_4px_var(--color-ink)]' : 'hover:shadow-[0_0_0_2px_#fff,0_0_0_4px_var(--color-line-strong)]'}`}
      />
    ))}
  </div>
);

export default ColourPicker;
