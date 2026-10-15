/** The id of a field's error message under it in FormField (e.g. "co-email" → "co-email-error"). */
export const fieldErrorId = (htmlFor) => `${htmlFor}-error`;

/** Props that tie a field to its FormField error so screen readers announce it: spread them onto the input. */
export const errorProps = (htmlFor, error) =>
  error ? { 'aria-invalid': true, 'aria-describedby': fieldErrorId(htmlFor) } : {};
