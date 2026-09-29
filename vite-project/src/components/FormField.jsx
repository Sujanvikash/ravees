export const FIELD_LABEL_CLASS = 'text-[0.78rem] text-gold-300';

/**
 * The "label above one field" wrapper repeated in every form on the site. Only
 * standardizes that layout — each form still owns its own input/select/textarea
 * (and that field's own styling), since those genuinely differ between forms.
 */
export default function FormField({ label, htmlFor, className = '', labelClassName, children }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className={labelClassName ?? FIELD_LABEL_CLASS} htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
    </div>
  );
}
