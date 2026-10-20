import { METHODS } from '../lib/payment.js';

/** The Cash / UPI / Card / Split picker, shown in the bill summary and again in the payment dialog. */
const PaymentMethods = ({ value, onChange }) => (
  <div role="group" aria-label="Payment method" className="grid grid-cols-4 gap-1.5">
    {METHODS.map(({ id, label, Icon }) => {
      const on = value === id;
      return (
        <button
          key={id}
          type="button"
          aria-pressed={on}
          onClick={() => onChange(id)}
          className={`flex h-10 items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold ${
            on
              ? 'border-2 border-evergreen-800 bg-evergreen-50 text-ink'
              : 'border border-line text-ink-2 hover:border-line-strong hover:bg-mist-2'
          }`}
        >
          <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
          {label}
        </button>
      );
    })}
  </div>
);

export default PaymentMethods;
