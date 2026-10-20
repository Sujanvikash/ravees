import { Info } from 'lucide-react';

/** Red error box under a form's fields. Renders nothing when there is no message. */
const FormError = ({ children }) => {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-ruby-500/40 bg-ruby-500/10 px-3.5 py-2.5 text-[0.82rem] text-ruby-500"
    >
      <Info size={15} strokeWidth={2} className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
};

export default FormError;
