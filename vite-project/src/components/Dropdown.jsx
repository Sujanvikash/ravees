import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

// The look of the collection page's "Featured" sort control: dark emerald, gold hairline border.
const TRIGGER =
  'flex min-w-[190px] items-center gap-2.5 rounded-lg border border-gold-400/15 bg-[rgba(8,28,20,0.85)] px-3.5 py-2 font-sans text-[0.85rem] text-white hover:border-gold-400/40';
const GAP = 6; // px between the trigger and the list

/**
 * Themed replacement for a native <select>, used for every dropdown on the site: the browser draws a
 * native list in plain OS colours, which clashes with the dark emerald / gold theme.
 *
 * Same keyboard model as a select: Enter, Space or the arrow keys open it; arrows / Home / End move;
 * Enter or Space picks; Escape or Tab closes. The list is rendered into <body> at a fixed position, so a
 * table or scrolling box around the trigger can't clip it, and it opens upward when there is no room below.
 *
 * Props
 *  options    [{ value, label }]
 *  value      the selected value
 *  onChange   (value) => void
 *  id         put on the trigger button, so <label htmlFor={id}> names it
 *  label      accessible name when there is no <label> ("Sort by")
 *  icon       optional lucide icon shown before the value
 *  className  replaces the trigger's look (size, colours, border); open/focus states are added on top
 */
const Dropdown = ({ options, value, onChange, id, label, icon: Icon, className = TRIGGER }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  const selectedIndex = Math.max(0, options.findIndex((o) => String(o.value) === String(value)));
  const selected = options[selectedIndex];

  // Fixed position under (or above) the trigger, at least as wide as it.
  const measure = useCallback(() => {
    const button = buttonRef.current;
    const list = listRef.current;
    if (!button || !list) return;
    const r = button.getBoundingClientRect();
    const h = list.offsetHeight;
    const below = window.innerHeight - r.bottom - GAP;
    const up = below < h && r.top - GAP > below;
    setPlace({
      left: Math.min(r.left, window.innerWidth - Math.max(list.offsetWidth, r.width) - 8),
      top: up ? r.top - GAP - h : r.bottom + GAP,
      minWidth: r.width,
      up,
    });
  }, []);

  // Measured before the browser paints the opened list, so it never shows at a stale position.
  useLayoutEffect(() => {
    if (open) measure();
  }, [open, measure]);

  // While open: follow the trigger on scroll / resize, close on a click outside.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!buttonRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open, measure]);

  const show = () => {
    setActive(selectedIndex);
    setOpen(true);
  };
  const pick = (i) => {
    if (String(options[i].value) !== String(value)) onChange(options[i].value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    const last = options.length - 1;
    const moves = {
      ArrowDown: () => setActive((i) => Math.min(last, i + 1)),
      ArrowUp: () => setActive((i) => Math.max(0, i - 1)),
      Home: () => setActive(0),
      End: () => setActive(last),
      Enter: () => pick(active),
      ' ': () => pick(active),
      Escape: () => setOpen(false),
    };
    if (moves[e.key]) {
      e.preventDefault();
      moves[e.key]();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-label={label ? `${label}: ${selected?.label ?? ''}` : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        className={`cursor-pointer text-left outline-none transition-colors focus-visible:border-gold-400/60 ${
          open ? 'border-gold-400/50!' : ''
        } ${className}`}
      >
        {Icon && <Icon size={15} strokeWidth={2} className="shrink-0 text-gold-400" aria-hidden="true" />}
        <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          aria-hidden="true"
          className={`shrink-0 opacity-70 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            data-lenis-prevent
            style={place ? { left: place.left, top: place.top, minWidth: place.minWidth } : { left: 0, top: 0 }}
            className={`fixed z-1100 max-h-72 overflow-y-auto rounded-xl border border-gold-400/20 bg-bg-dark-emerald p-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,246,223,0.06)] transition-[opacity,translate] duration-150 starting:opacity-0 ${
              place ? '' : 'invisible'
            } ${place?.up ? 'starting:translate-y-1' : 'starting:-translate-y-1'}`}
          >
            {options.map((opt, i) => {
              const isSelected = i === selectedIndex;
              return (
                <li
                  key={opt.value}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => pick(i)}
                  className={`flex cursor-pointer items-center justify-between gap-4 whitespace-nowrap rounded-lg px-3 py-2 font-sans text-[0.85rem] normal-case tracking-normal transition-colors ${
                    i === active ? 'bg-gold-400/10 text-white' : 'text-text-secondary'
                  } ${isSelected ? 'text-gold-300!' : ''}`}
                >
                  {opt.label}
                  <Check
                    size={15}
                    strokeWidth={2.25}
                    aria-hidden="true"
                    className={isSelected ? 'text-gold-400' : 'invisible'}
                  />
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </>
  );
};

export default Dropdown;
