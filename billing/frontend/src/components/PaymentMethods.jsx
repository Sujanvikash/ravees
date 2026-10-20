import { METHODS } from '../lib/payment.js';

/** The Cash / UPI / Card / Split picker, shown in the bill summary and again in the payment dialog. */
const PaymentMethods = ({ value, onChange, compact = false }) => (
  <div role="group" aria-label="Payment method" className="grid grid-cols-4 gap-2">
    {METHODS.map(({ id, label, Icon }) => {
      const on = value === id;
      return (
        <button
          key={id}
          type="button"
          aria-pressed={on}
          onClick={() => onChange(id)}
          className={`flex flex-col items-center justify-center gap-1 rounded-xl text-[13px] font-semibold ${
            compact ? 'h-12' : 'h-16'
          } ${
            on
              ? 'border-2 border-evergreen-800 bg-evergreen-50 text-ink'
              : 'border border-line text-ink-2 hover:border-line-strong hover:bg-mist-2'
          }`}
        >
          {!compact && <Icon size={20} strokeWidth={1.8} aria-hidden="true" />}
          {label}
        </button>
      );
    })}
  </div>
);

export default PaymentMethods;
