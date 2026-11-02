import { ArrowRight, CircleCheck, Phone, User } from 'lucide-react';
import { useStore } from '../context/StoreContext.jsx';
import { countLabel, gstLines } from '../lib/bill.js';
import { isValidMobile, isValidName } from '../lib/customer.js';
import { typedMobile } from '../lib/customer.js';
import { inr } from '../lib/money.js';
import Kbd from './Kbd.jsx';
import PaymentMethods from './PaymentMethods.jsx';

const Row = ({ label, value, className = 'text-ink-2' }) => (
  <div className={`flex justify-between gap-4 ${className}`}>
    <span>{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
);

/**
 * The right-hand order panel: customer number, the bill's breakdown, then the total, payment method and
 * Collect pinned at the bottom. On a counter monitor it runs the full height beside the bill.
 */
/** One customer input with its icon, a red state and the error message under it. `required` marks it with a
 * red asterisk; when the admin has made it optional it shows a muted "optional" instead. */
const CustomerField = ({ id, label, Icon, error, inputRef, required = true, ...input }) => (
  <div>
    <label htmlFor={id} className="sr-only">
      {label} {required ? '(required)' : '(optional)'}
    </label>
    <div
      className={`flex h-10 items-center gap-2 rounded-xl border px-3 transition-shadow ${
        error
          ? 'border-ruby focus-within:shadow-[0_0_0_3px_rgba(220,38,38,0.12)]'
          : 'border-line focus-within:border-evergreen-800/50 focus-within:shadow-[0_0_0_3px_rgba(23,92,38,0.10)]'
      }`}
    >
      <Icon size={15} className={error ? 'text-ruby' : 'text-ink-3'} aria-hidden="true" />
      <input
        id={id}
        ref={inputRef}
        autoComplete="off"
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        placeholder={label}
        className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-ink-3"
        {...input}
      />
      {required ? (
        <span className="text-xs text-ruby-ink" aria-hidden="true">
          *
        </span>
      ) : (
        <span className="text-[11px] text-ink-3" aria-hidden="true">
          optional
        </span>
      )}
    </div>
    {error && (
      <p id={`${id}-error`} role="alert" className="mt-1.5 animate-pop text-xs font-medium text-ruby-ink">
        {error}
      </p>
    )}
  </div>
);

const OrderPanel = ({
  bill,
  phone,
  onPhone,
  phoneError,
  phoneRef,
  name,
  onName,
  nameError,
  nameRef,
  method,
  onMethod,
  onCollect,
}) => {
  const { showGst: gst, requireName, requireMobile } = useStore().settings;
  // Each field is satisfied when it holds a valid value, or is optional and left blank. A value that is
  // typed is always checked, so a half-entered number or name still blocks the collect.
  const phoneOk = isValidMobile(phone) || (!requireMobile && !phone.trim());
  const nameOk = isValidName(name) || (!requireName && !name.trim());
  const ready = phoneOk && nameOk;
  const needed = [requireMobile && 'Mobile', requireName && 'name'].filter(Boolean).join(' and ');
  // Enter in either field tries to collect, which points at whatever is still missing.
  const collectOnEnter = (e) => e.key === 'Enter' && onCollect();
  return (
    <aside className="flex min-h-0 flex-col border-t glass lg:w-96 lg:border-t-0 lg:border-l xl:w-104">
      <section aria-labelledby="customer-heading" className="border-b border-line-soft p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="customer-heading" className="text-[13px] font-medium">
            Customer
          </h2>
          <span className="flex items-center gap-1.5 text-xs text-ink-3">
            {ready && <CircleCheck size={13} className="text-ok" aria-hidden="true" />}
            {ready ? 'Ready' : needed ? `${needed} needed` : 'Check the details'} <Kbd>F4</Kbd>
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <CustomerField
            id="customer-phone"
            label="Mobile number"
            Icon={Phone}
            required={requireMobile}
            error={phoneError}
            inputRef={phoneRef}
            type="tel"
            inputMode="numeric"
            value={phone}
            maxLength={10}
            onChange={(e) => onPhone(typedMobile(e.target.value))}
            onKeyDown={collectOnEnter}
          />
          <CustomerField
            id="customer-name"
            label="Customer name"
            Icon={User}
            required={requireName}
            error={nameError}
            inputRef={nameRef}
            type="text"
            autoCapitalize="words"
            value={name}
            onChange={(e) => onName(e.target.value)}
            onKeyDown={collectOnEnter}
          />
        </div>
      </section>

      <section aria-label="Bill summary" className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="flex flex-col gap-2 text-[13px]">
          <Row label="MRP total" value={inr(bill.mrpTotal)} />
          <Row label="Offer discount" value={inr(-bill.savings)} className={bill.savings > 0 ? 'text-ok-ink' : 'text-ink-2'} />
          <div className="my-1 h-px bg-line-soft" />
          {gst && <Row label="Taxable value" value={inr(bill.taxable)} />}
          {gst && gstLines(bill.gstRows).map((g) => <Row key={g.label} label={g.label} value={inr(g.value)} />)}
          <Row label="Round off" value={inr(bill.roundOff)} />
        </div>
      </section>

      <section className="border-t border-line-soft bg-white/40 p-5">
        <div className="flex items-end justify-between gap-3">
          <div className="text-[13px] text-ink-3">
            <div className="font-medium text-ink-2">Total</div>
            {countLabel(bill)}
            {gst && ' · incl. GST'}
          </div>
          <div className="text-[34px] leading-none font-semibold tracking-tight tabular-nums">{inr(bill.payable)}</div>
        </div>

        <div className="mt-4">
          <PaymentMethods value={method} onChange={onMethod} />
        </div>

        <button
          type="button"
          onClick={onCollect}
          disabled={!bill.count}
          className="group mt-3 flex h-12 w-full items-center justify-between rounded-xl bg-evergreen-800 px-4 text-[15px] font-semibold text-white shadow-[0_1px_2px_rgba(9,9,11,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] transition-colors hover:bg-evergreen-900 disabled:bg-line disabled:text-ink-3 disabled:shadow-none"
        >
          <span className="flex items-center gap-2">
            Collect payment
            <ArrowRight size={16} className="transition-transform group-enabled:group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
          <Kbd tone="dark" className="group-disabled:border-line group-disabled:bg-transparent group-disabled:text-ink-3">
            F12
          </Kbd>
        </button>
      </section>
    </aside>
  );
};

export default OrderPanel;
