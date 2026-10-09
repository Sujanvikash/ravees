import { Children, isValidElement } from 'react';
import Dropdown from './Dropdown.jsx';

/**
 * Form controls with the site's field style. Input and Textarea pass every prop through to the
 * underlying element, so they work exactly like <input> and <textarea>; Select is described below.
 *
 * size: "md" (storefront, auth, product form) or "sm" (compact admin editors).
 */
const BASE =
  'rounded-lg border border-white/10 bg-white/5 font-sans text-white outline-none transition-all placeholder:text-text-muted focus:border-gold-400 focus:shadow-[0_0_10px_rgba(229,199,139,0.4)]';

const SIZES = {
  md: 'px-3.5 py-2.5 text-[0.88rem]',
  sm: 'px-3 py-2 text-[0.85rem]',
};

const fieldClass = (size, className) => `${BASE} ${SIZES[size] ?? SIZES.md} ${className}`;

export const Input = ({ size = 'md', className = '', ...rest }) => {
  return <input className={fieldClass(size, className)} {...rest} />;
};

/** Plain text of an <option>'s children (e.g. {room.city}{' (Flagship)'} → "Delhi (Flagship)"). */
const optionText = (children) => Children.toArray(children).join('');

/**
 * Same API as a <select> with <option> children, but opens the site's Dropdown list (the collection
 * page's "Featured" panel) instead of the browser's OS-coloured one. onChange gets an event-like
 * object, so `(e) => e.target.value` handlers keep working.
 */
export const Select = ({ size = 'md', className = '', children, value, onChange, id, name }) => {
  const options = Children.toArray(children)
    .filter(isValidElement)
    .map((opt) => ({ value: opt.props.value ?? optionText(opt.props.children), label: optionText(opt.props.children) }));
  return (
    <Dropdown
      id={id}
      options={options}
      value={value}
      onChange={(next) => onChange?.({ target: { value: next, id, name, type: 'select-one' } })}
      // Closed, it looks like the text boxes beside it (BASE); the open list keeps the Dropdown panel.
      className={fieldClass(size, `flex w-full items-center gap-2.5 ${className}`)}
    />
  );
};

export const Textarea = ({ size = 'md', className = '', ...rest }) => {
  return <textarea className={fieldClass(size, `resize-y ${className}`)} {...rest} />;
};
