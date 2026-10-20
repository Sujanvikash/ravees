/** FormField's label style, for a label that sits outside a FormField (e.g. above an upload box). */
export const FIELD_LABEL_CLASS = 'text-[0.78rem] text-gold-300';

/** The id of a field's error message under it in FormField (e.g. "co-email" → "co-email-error"). */
export const fieldErrorId = (htmlFor) => `${htmlFor}-error`;

/** Props that tie a field to its FormField error so screen readers announce it: spread them onto the input. */
export const errorProps = (htmlFor, error) =>
  error ? { 'aria-invalid': true, 'aria-describedby': fieldErrorId(htmlFor) } : {};
