import { ChevronDown, ChevronUp } from 'lucide-react';

const BTN =
  'flex size-7 cursor-pointer items-center justify-center rounded-md border border-gold-400/20 bg-transparent text-gold-300 transition-all hover:border-gold-400 hover:bg-gold-400/15 disabled:cursor-default disabled:opacity-30 disabled:hover:border-gold-400/20 disabled:hover:bg-transparent';

/**
 * Up / down arrows that move an item in the shop's order (products, collections, showrooms, testimonials).
 * Pass null for a direction it can't go (or `disabled` while a move is being saved). `label` names the
 * item for screen readers.
 */
const MoveButtons = ({ label, onUp, onDown, disabled = false }) => (
  <div className="flex gap-1">
    <button type="button" onClick={onUp ?? undefined} disabled={disabled || !onUp} aria-label={`Move ${label} up`} title="Move up" className={BTN}>
      <ChevronUp size={14} strokeWidth={2} />
    </button>
    <button type="button" onClick={onDown ?? undefined} disabled={disabled || !onDown} aria-label={`Move ${label} down`} title="Move down" className={BTN}>
      <ChevronDown size={14} strokeWidth={2} />
    </button>
  </div>
);

export default MoveButtons;
