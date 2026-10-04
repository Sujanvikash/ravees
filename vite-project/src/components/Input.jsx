/**
 * Form controls with the site's field style. Every prop is passed through to the
 * underlying element, so they work exactly like <input>, <select> and <textarea>.
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

export function Input({ size = 'md', className = '', ...rest }) {
  return <input className={fieldClass(size, className)} {...rest} />;
}

export function Select({ size = 'md', className = '', children, ...rest }) {
  return (
    <select className={fieldClass(size, `cursor-pointer ${className}`)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ size = 'md', className = '', ...rest }) {
  return <textarea className={fieldClass(size, `resize-y ${className}`)} {...rest} />;
}
