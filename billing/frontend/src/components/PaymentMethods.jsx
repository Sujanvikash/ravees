import { METHODS } from '../lib/payment.js';

/** The Cash / UPI / Card / Split segmented control, in the order panel and again in the payment dialog. */
const PaymentMethods = ({ value, onChange }) => (
  <div role="group" aria-label="Payment method" className="grid grid-cols-4 gap-1 rounded-xl bg-mist p-1">
    {METHODS.map(({ id, label, Icon }) => {
      const on = value === id;
      return (
        <button
          key={id}
          type="button"
          aria-pressed={on}
          onClick={() => onChange(id)}
          className={`flex h-9 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium transition-colors ${
            on
              ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(9,9,11,0.08),0_0_0_1px_rgba(9,9,11,0.04)]'
              : 'text-ink-3 hover:text-ink'
          }`}
        >
          <Icon size={15} strokeWidth={1.9} aria-hidden="true" className={on ? 'text-evergreen-800' : ''} />
          {label}
        </button>
      );
    })}
  </div>
);

export default PaymentMethods;
