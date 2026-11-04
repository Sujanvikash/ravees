import { useState } from 'react';
import { ArrowRight, CircleCheck, LockKeyhole, Phone, Tag, User, X } from 'lucide-react';
import { useStore } from '../context/StoreContext.jsx';
import { checkPassword } from '../lib/auth.js';
import { countLabel, gstLines } from '../lib/bill.js';
import { isValidMobile, isValidName } from '../lib/customer.js';
import { typedMobile } from '../lib/customer.js';
import { inr, parseAmount } from '../lib/money.js';
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

/**
 * The store's login password, asked for before a manual discount can be typed or changed, so only someone who
 * knows it (the manager, not every counter hand) can give one. The server checks it; `onUnlock` runs when it's right.
 */
const DiscountUnlock = ({ onUnlock, onRemove }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!password || busy) return;
    setBusy(true);
    try {
      await checkPassword(password);
      onUnlock();
    } catch (err) {
      setError(err.message);
      setPassword('');
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="discount-password" className="text-[12px] text-ink-3">
        Enter the store’s login password to give a discount
      </label>
      <div className="flex items-center gap-2">
        <div
          className={`flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-surface px-2.5 ${
            error ? 'border-ruby' : 'border-line focus-within:border-evergreen-800/50 focus-within:shadow-[0_0_0_3px_rgba(23,92,38,0.10)]'
          }`}
        >
          <LockKeyhole size={13} className="shrink-0 text-ink-3" aria-hidden="true" />
          <input
            id="discount-password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'discount-password-error' : undefined}
            className="min-w-0 flex-1 bg-transparent text-[13px]"
          />
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!password || busy}
          className="h-8 shrink-0 rounded-lg bg-evergreen-800 px-3 text-[13px] font-semibold text-white hover:bg-evergreen-900 disabled:opacity-50"
        >
          Unlock
        </button>
      </div>
      {error && (
        <p id="discount-password-error" role="alert" className="animate-pop text-xs font-medium text-ruby-ink">
          {error}
        </p>
      )}
      {onRemove && (
        <button type="button" onClick={onRemove} className="self-start text-xs font-medium text-ink-3 hover:text-ruby-ink">
          Remove the discount
        </button>
      )}
    </div>
  );
};

/**
 * The manual whole-bill discount: a value with a Percent / Amount toggle (a flat ₹ amount by default). Typing
 * updates the bill live; the discount is kept on the bill (so it survives a refresh) and clears when the bill
 * does. `off` is the rupees it took off. The toggle keeps its own `kind` so it still works with the field empty.
 * The field stays locked until the store's password is entered, and locks again once the discount is cleared.
 * A discount already on the bill (recalled, or after a refresh) still applies; changing it asks again.
 */
const DiscountControl = ({ discount, off, onDiscount, disabled }) => {
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [kind, setKind] = useState(discount?.kind ?? 'amount');
  const [text, setText] = useState(discount ? String(discount.value) : '');

  // Keep the field in step when the discount changes from outside (a recall, or the bill clearing after a
  // sale) without stomping what's being typed: only re-seed when the incoming value isn't already in the box.
  // This "adjust state during render" pattern avoids an effect (see react.dev "You Might Not Need an Effect").
  const sig = discount ? `${discount.kind}:${discount.value}` : '';
  const [lastSig, setLastSig] = useState(sig);
  if (sig !== lastSig) {
    setLastSig(sig);
    const typed = parseAmount(text);
    const mineSig = typed > 0 ? `${kind}:${typed}` : '';
    if (sig !== mineSig) {
      if (discount) {
        setKind(discount.kind); // a recalled bill: its discount stands, but changing it needs the password
        setText(String(discount.value));
        setUnlocked(false);
      } else {
        setText(''); // bill cleared: empty the field but leave the chosen type as it is, and lock it again
        setUnlocked(false);
        setOpen(false);
      }
    }
  }

  const apply = (nextKind, nextText) => {
    const value = parseAmount(nextText);
    onDiscount(value > 0 ? { kind: nextKind, value } : null);
  };
  const pick = (nextKind) => {
    setKind(nextKind);
    apply(nextKind, text); // re-price under the new type; a no-op while the field is empty, but the toggle still moves
  };
  const clear = () => {
    setText('');
    onDiscount(null);
    setOpen(false);
    setUnlocked(false);
  };

  const kindClass = (value) =>
    `flex h-8 flex-1 items-center justify-center gap-1 text-[13px] font-semibold transition-colors ${
      kind === value ? 'bg-evergreen-800 text-white' : 'text-ink-2 hover:bg-mist'
    }`;

  return (
    <div className="rounded-xl border border-dashed border-line-strong">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-[13px] disabled:opacity-40"
      >
        <span className="flex items-center gap-1.5 text-ink-2">
          <Tag size={14} aria-hidden="true" /> Discount
        </span>
        {off > 0 ? (
          <span className="font-medium text-ok-ink tabular-nums">
            −{inr(off)}
            {kind === 'percent' && <span className="ml-1 text-ink-3">({discount.value}%)</span>}
          </span>
        ) : (
          <span className="text-ink-3">{open ? 'Enter below' : 'Add'}</span>
        )}
      </button>
      {open && !unlocked && (
        <div className="border-t border-line-soft px-3 py-2.5">
          <DiscountUnlock onUnlock={() => setUnlocked(true)} onRemove={discount ? clear : null} />
        </div>
      )}
      {open && unlocked && (
        <div className="flex flex-col gap-2 border-t border-line-soft px-3 py-2.5">
          <div className="flex overflow-hidden rounded-lg border border-line" role="group" aria-label="Discount type">
            <button type="button" onClick={() => pick('amount')} aria-pressed={kind === 'amount'} className={kindClass('amount')}>
              ₹ Amount
            </button>
            <span className="w-px bg-line" aria-hidden="true" />
            <button type="button" onClick={() => pick('percent')} aria-pressed={kind === 'percent'} className={kindClass('percent')}>
              % Percent
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-ink-3">{kind === 'percent' ? '%' : '₹'}</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                apply(kind, e.target.value);
              }}
              placeholder={kind === 'percent' ? 'e.g. 10 (percent off)' : 'e.g. 500 (rupees off)'}
              aria-label={kind === 'percent' ? 'Discount percentage' : 'Discount amount in rupees'}
              className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 text-[13px] font-medium tabular-nums placeholder:font-normal placeholder:text-ink-3/70 focus:border-evergreen-800/50 focus:shadow-[0_0_0_3px_rgba(23,92,38,0.10)] focus:outline-none"
            />
            {off > 0 && (
              <button
                type="button"
                onClick={clear}
                aria-label="Remove discount"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-3 hover:bg-ruby-50 hover:text-ruby-ink"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const OrderPanel = ({
  bill,
  discount,
  onDiscount,
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
  const { showGst, composition, requireName, requireMobile } = useStore().settings;
  const gst = showGst && !composition; // a composition dealer's bill shows no GST

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
          <DiscountControl discount={discount} off={bill.discount} onDiscount={onDiscount} disabled={!bill.count} />
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
