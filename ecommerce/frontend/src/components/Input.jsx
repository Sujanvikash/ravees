import { Children, isValidElement } from 'react';
import Dropdown from './Dropdown.jsx';

/**
 * Form controls with the site's field style. Input and Textarea pass every prop through to the
 * underlying element, so they work exactly like <input> and <textarea>; Select is described below.
 *
 * size: "md" (storefront, auth, product form) or "sm" (compact admin editors).
 * icon: optional lucide icon shown inside the field on the left (e.g. icon={Mail}).
 */
const BASE =
  'rounded-lg border border-white/10 bg-white/5 font-sans text-white outline-none transition-all placeholder:text-text-muted focus:border-gold-400 focus:shadow-[0_0_10px_--alpha(var(--color-gold-400)/40%)] aria-invalid:border-ruby-500/70 aria-invalid:focus:border-ruby-500 aria-invalid:focus:shadow-[0_0_10px_--alpha(var(--color-ruby-500)/35%)]';

const SIZES = {
  md: 'px-3.5 py-2.5 text-[0.88rem]',
  sm: 'px-3 py-2 text-[0.85rem]',
};

const fieldClass = (size, className) => `${BASE} ${SIZES[size] ?? SIZES.md} ${className}`;

/** Puts `Icon` inside the left edge of a field (vertically centred, or at the top for a textarea). */
const withIcon = (Icon, atTop, field) =>
  Icon ? (
    <div className="relative">
      <Icon
        size={17}
        strokeWidth={1.7}
        aria-hidden="true"
        className={`pointer-events-none absolute left-3.5 text-gold-400 ${atTop ? 'top-3' : 'top-1/2 -translate-y-1/2'}`}
      />
      {field}
    </div>
  ) : (
    field
  );

export const Input = ({ size = 'md', icon, className = '', ...rest }) => {
  return withIcon(icon, false, <input className={fieldClass(size, `${icon ? 'w-full pl-10' : ''} ${className}`)} {...rest} />);
};

/** Plain text of an <option>'s children (e.g. {room.city}{' (Flagship)'} → "Delhi (Flagship)"). */
const optionText = (children) => Children.toArray(children).join('');

/**
 * Same API as a <select> with <option> children, but opens the site's Dropdown list (the collection
 * page's "Featured" panel) instead of the browser's OS-coloured one. onChange gets an event-like
 * object, so `(e) => e.target.value` handlers keep working.
 */
export const Select = ({ size = 'md', icon, className = '', children, value, onChange, id, name }) => {
  const options = Children.toArray(children)
    .filter(isValidElement)
    .map((opt) => ({ value: opt.props.value ?? optionText(opt.props.children), label: optionText(opt.props.children) }));
  return (
    <Dropdown
      id={id}
      icon={icon}
      options={options}
      value={value}
      onChange={(next) => onChange?.({ target: { value: next, id, name, type: 'select-one' } })}
      // Closed, it looks like the text boxes beside it (BASE); the open list keeps the Dropdown panel.
      className={fieldClass(size, `flex w-full items-center gap-2.5 ${className}`)}
    />
  );
};

export const Textarea = ({ size = 'md', icon, className = '', ...rest }) => {
  return withIcon(icon, true, <textarea className={fieldClass(size, `resize-y ${icon ? 'w-full pl-10' : ''} ${className}`)} {...rest} />);
};
