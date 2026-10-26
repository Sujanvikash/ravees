import { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, LockKeyhole, RotateCcw, ShieldCheck, Store } from 'lucide-react';
import Dialog from '../components/Dialog.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { locationById } from '../config.js';
import { api } from '../lib/api.js';
import { ACCOUNTS, MIN_PASSWORD } from '../lib/auth.js';

const when = (iso) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const PasswordField = ({ id, label, value, onChange, show, onToggle, invalid, autoFocus }) => (
  <>
    <label htmlFor={id} className="mt-4 mb-2 block text-[13px] font-medium text-ink-2 first:mt-0">
      {label}
    </label>
    <div
      className={`flex h-11 items-center gap-2 rounded-xl border px-3 transition-shadow ${
        invalid ? 'border-ruby' : 'border-line focus-within:border-evergreen-800/50 focus-within:shadow-[0_0_0_3px_rgba(23,92,38,0.10)]'
      }`}
    >
      <LockKeyhole size={15} className="text-ink-3" aria-hidden="true" />
      <input
        id={id}
        type={show ? 'text' : 'password'}
        autoComplete="new-password"
        autoFocus={autoFocus}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid ? true : undefined}
        className="min-w-0 flex-1 bg-transparent text-sm"
      />
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="inline-flex size-7 items-center justify-center rounded-md text-ink-3 hover:bg-mist hover:text-ink"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      )}
    </div>
  </>
);

/** New password for one login, typed twice. */
const SetPasswordDialog = ({ account, onClose, onSave }) => {
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
    <Dialog id="set-password" title={`New password for ${account.label}`} subtitle={`Login: ${account.username}`} onClose={onClose} size="max-w-sm">
      <form onSubmit={submit} className="px-6 pb-6">
        <PasswordField id="new-password" label="New password" value={password} onChange={edit(setPassword)} show={show} onToggle={() => setShow((v) => !v)} invalid={!!error} autoFocus />
        <PasswordField id="confirm-password" label="Type it again" value={confirm} onChange={edit(setConfirm)} show={show} invalid={!!error} />
        {error && (
          <p role="alert" className="mt-1.5 animate-pop text-xs font-medium text-ruby-ink">
            {error}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-line text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-evergreen-800 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(9,9,11,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-evergreen-900"
          >
            Save password
          </button>
        </div>
      </form>
    </Dialog>
  );
};

/**
 * Admin only: every login with whether it still has its default password, a way to set a new one, and a
 * way back to the default. Showroom logins cannot change passwords themselves.
 */
const Logins = ({ onMenu }) => {
  const [changed, setChanged] = useState({}); // { [username]: { at } } for logins whose password was changed
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState('');

  const keep = (users) => setChanged(Object.fromEntries(users.filter((u) => u.passwordChangedAt).map((u) => [u.username, { at: u.passwordChangedAt }])));
  const update = (u) =>
    setChanged((prev) => {
      const next = { ...prev };
      if (u.passwordChangedAt) next[u.username] = { at: u.passwordChangedAt };
      else delete next[u.username];
      return next;
    });

  useEffect(() => {
    api('/users').then(keep, (err) => setLoadError(err.message));
  }, []);

  const save = async (password) => {
    update(await api(`/users/${editing.username}/password`, { method: 'PUT', body: { password } }));
    setNotice(`Password changed for ${editing.label}. Anyone signed in as ${editing.label} has to sign in again.`);
    setEditing(null);
  };
  const restore = async (account) => {
    try {
      update(await api(`/users/${account.username}/password/reset`, { method: 'POST' }));
      setNotice(`${account.label} is back to its default password.`);
    } catch (err) {
      setNotice(err.message);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader crumbs={['Admin', 'Logins']} onMenu={onMenu} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 p-3 lg:px-5 lg:py-4">
          <div>
            <p className="text-[13px] text-ink-3">
              Only the admin can change passwords. A new password works on every computer straight away.
            </p>
          </div>

          {loadError && (
            <p role="alert" className="rounded-xl bg-ruby-50 px-3.5 py-2.5 text-[13px] font-medium text-ruby-ink">
              {loadError}
            </p>
          )}

          {notice && (
            <p role="status" className="animate-pop rounded-xl bg-ok-50 px-3.5 py-2.5 text-[13px] font-medium text-ok-ink">
              {notice}
            </p>
          )}

          <section className="overflow-hidden rounded-2xl border glass">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line-soft text-left text-xs text-ink-3">
                  <th scope="col" className="py-1.5 pr-3 pl-4 font-medium">Login</th>
                  <th scope="col" className="py-1.5 pr-3 font-medium">Password</th>
                  <th scope="col" className="py-1.5 pr-4 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {ACCOUNTS.map((a) => {
                  const shop = locationById(a.location);
                  const set = changed[a.username];
                  const Icon = a.role === 'admin' ? ShieldCheck : Store;
                  return (
                    <tr key={a.username} className="row-hover border-b border-line-soft last:border-0">
                      <td className="py-1.5 pr-3 pl-4">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-evergreen-50 text-evergreen-800">
                            <Icon size={15} aria-hidden="true" />
                          </span>
                          <span className="leading-tight">
                            <span className="block font-medium">{shop ? `${shop.city} · ${shop.area}` : 'Admin'}</span>
                            <span className="block font-mono text-xs text-ink-3">{a.username}</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-1.5 pr-3">
                        {set ? (
                          <span className="text-ink-2">Changed {when(set.at)}</span>
                        ) : (
                          <span className="rounded-full bg-warn-50 px-2 py-0.5 text-[11px] font-medium text-warn-ink">Default</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-4">
                        <div className="flex justify-end gap-1.5">
                          {set && (
                            <button
                              type="button"
                              onClick={() => restore(a)}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-3 hover:bg-mist hover:text-ink"
                            >
                              <RotateCcw size={14} aria-hidden="true" /> Use default
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(a);
                              setNotice('');
                            }}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink"
                          >
                            <KeyRound size={14} aria-hidden="true" /> Reset password
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>
      </div>

      {editing && <SetPasswordDialog account={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
};

export default Logins;
