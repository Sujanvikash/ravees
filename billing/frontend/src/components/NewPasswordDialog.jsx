import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import Dialog from './Dialog.jsx';
import { MIN_PASSWORD } from '../lib/auth.js';

const PasswordField = ({ id, label, value, onChange, show, onToggle, invalid, autoFocus }) => (
  <>
    <label htmlFor={id} className="mt-4 mb-2 block text-[13px] font-medium text-ink-2 first:mt-0">
      {label}
    </label>
    <div className={`flex h-11 items-center gap-2 rounded-xl border px-3 transition-shadow ${invalid ? 'border-ruby' : 'border-line focus-within:border-evergreen-800/50 focus-within:shadow-[0_0_0_3px_rgba(23,92,38,0.10)]'}`}>
      <LockKeyhole size={15} className="text-ink-3" aria-hidden="true" />
      <input id={id} type={show ? 'text' : 'password'} autoComplete="new-password" autoFocus={autoFocus} required value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid ? true : undefined} className="min-w-0 flex-1 bg-transparent text-sm" />
      {onToggle && (
        <button type="button" onClick={onToggle} aria-label={show ? 'Hide password' : 'Show password'} className="inline-flex size-7 items-center justify-center rounded-md text-ink-3 hover:bg-mist hover:text-ink">
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      )}
    </div>
  </>
);

/** A new password, typed twice (a login's in Stores, or one of the passwords in Settings → Passwords). `onSave`
 *  saves it; what it throws is shown. */
const NewPasswordDialog = ({ title, subtitle, onClose, onSave }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
    if (password !== confirm) return setError('The two passwords do not match.');
    try {
      await onSave(password);
    } catch (err) {
      setError(err.message);
    }
  };
  const edit = (set) => (v) => {
    set(v);
    setError('');
  };
  return (
    <Dialog id="set-password" title={title} subtitle={subtitle} onClose={onClose} size="max-w-sm">
      <form onSubmit={submit} className="px-6 pb-6">
        <PasswordField id="new-password" label="New password" value={password} onChange={edit(setPassword)} show={show} onToggle={() => setShow((v) => !v)} invalid={!!error} autoFocus />
        <PasswordField id="confirm-password" label="Type it again" value={confirm} onChange={edit(setConfirm)} show={show} invalid={!!error} />
        {error && <p role="alert" className="mt-1.5 animate-pop text-xs font-medium text-ruby-ink">{error}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="inline-flex h-10 items-center justify-center rounded-xl border border-line text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink">
            Cancel
          </button>
          <button type="submit" className="inline-flex h-10 items-center justify-center rounded-xl bg-evergreen-800 text-[13px] font-semibold text-white hover:bg-evergreen-900">
            Save password
          </button>
        </div>
      </form>
    </Dialog>
  );
};

export default NewPasswordDialog;
