import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { checkPassword } from '../lib/auth.js';

/**
 * The store's login password, asked for before a manual discount can be typed or changed, so only someone who
 * knows it (the manager, not every counter hand) can give one. The server checks it; `onUnlock` runs when it's right.
 * Once is enough for a bill: the counter keeps it unlocked, for the whole-bill discount and every line's, until the
 * bill is done. `check` stands in for the store's password check (editing a bill asks for its own password).
 */
const DiscountUnlock = ({
  id = 'discount-password',
  label = 'Enter the store’s login password to give a discount',
  check = checkPassword,
  autoComplete = 'current-password',
  onUnlock,
  onRemove,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!password || busy) return;
    setBusy(true);
    try {
      await check(password);
      onUnlock(password);
    } catch (err) {
      setError(err.message);
      setPassword('');
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[12px] text-ink-3">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div
          className={`flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-surface px-2.5 ${
            error ? 'border-ruby' : 'border-line focus-within:border-evergreen-800/50 focus-within:shadow-[0_0_0_3px_rgba(23,92,38,0.10)]'
          }`}
        >
          <LockKeyhole size={13} className="shrink-0 text-ink-3" aria-hidden="true" />
          <input
            id={id}
            type="password"
            autoComplete={autoComplete}
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              submit();
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
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
        <p id={`${id}-error`} role="alert" className="animate-pop text-xs font-medium text-ruby-ink">
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

export default DiscountUnlock;
