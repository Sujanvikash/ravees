import { FIELD_LABEL_CLASS, fieldErrorId } from './fieldError.js';

/**
 * The "label above one field" wrapper repeated in every form on the site. Only
 * standardizes that layout — each form still owns its own input/select/textarea
 * (and that field's own styling), since those genuinely differ between forms.
 * required: shows a red * after the label (the field itself still needs its own `required`).
 * error: message shown under the field. Give the field `aria-invalid` and
 *   `aria-describedby` — spread `errorProps(htmlFor, error)` from fieldError.js so it is announced.
 */
const FormField = ({ label, htmlFor, required = false, error, className = '', labelClassName, children }) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className={labelClassName ?? FIELD_LABEL_CLASS} htmlFor={htmlFor}>
          {label}
          {required && (
            <span className="ml-0.5 text-ruby-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error && (
        <p id={fieldErrorId(htmlFor)} className="text-[0.76rem] text-ruby-500">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
