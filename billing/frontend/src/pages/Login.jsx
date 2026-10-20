import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Store } from 'lucide-react';
import logo from '../assets/logo.svg';
import { BRAND } from '../config.js';
import { ACCOUNTS, signIn } from '../lib/auth.js';

/** Sign in as one showroom (bills and sees only its own figures) or as the admin (sees all showrooms). */
const Login = ({ onSignedIn }) => {
  const [username, setUsername] = useState(ACCOUNTS[0].username);
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const session = await signIn(username, password);
    setBusy(false);
    if (session) onSignedIn(session);
    else {
      setError('That password is not right for this login.');
      setPassword('');
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ground px-4 py-10">
      <div className="w-full max-w-sm animate-rise">
        <img src={logo} alt={BRAND.name} className="mx-auto h-16 w-auto" />
        <form
          onSubmit={submit}
          className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(9,9,11,0.04),0_12px_32px_-12px_rgba(9,9,11,0.12)]"
        >
          <h1 className="text-lg font-semibold tracking-tight">Sign in to billing</h1>
          <p className="mt-0.5 text-[13px] text-ink-3">Choose your showroom, or Admin for all showrooms.</p>

          <fieldset className="mt-5">
            <legend className="mb-2 text-[13px] font-medium text-ink-2">Login</legend>
            <div className="grid grid-cols-2 gap-1.5">
              {ACCOUNTS.map((a) => {
                const on = a.username === username;
                const Icon = a.role === 'admin' ? ShieldCheck : Store;
                return (
                  <label
                    key={a.username}
                    className={`flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 text-[13px] font-medium transition-colors ${
                      on ? 'border-evergreen-800 bg-evergreen-50 text-ink' : 'border-line text-ink-2 hover:bg-mist-2'
                    } ${a.role === 'admin' ? 'col-span-2' : ''}`}
                  >
                    <input
                      type="radio"
                      name="login"
                      value={a.username}
                      checked={on}
                      onChange={() => {
                        setUsername(a.username);
                        setError('');
                      }}
                      className="sr-only"
                    />
                    <Icon size={15} className={on ? 'text-evergreen-800' : 'text-ink-3'} aria-hidden="true" />
                    {a.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label htmlFor="password" className="mt-4 mb-2 block text-[13px] font-medium text-ink-2">
            Password
          </label>
          <div
            className={`flex h-11 items-center gap-2 rounded-xl border px-3 transition-shadow ${
              error ? 'border-ruby' : 'border-line focus-within:border-evergreen-800/50 focus-within:shadow-[0_0_0_3px_rgba(23,92,38,0.10)]'
            }`}
          >
            <LockKeyhole size={15} className="text-ink-3" aria-hidden="true" />
            <input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              autoFocus
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'password-error' : undefined}
              className="min-w-0 flex-1 bg-transparent text-sm"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Hide password' : 'Show password'}
              className="inline-flex size-7 items-center justify-center rounded-md text-ink-3 hover:bg-mist hover:text-ink"
            >
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {error && (
            <p id="password-error" role="alert" className="mt-1.5 animate-pop text-xs font-medium text-ruby-ink">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-evergreen-800 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(9,9,11,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-evergreen-900 disabled:opacity-60"
          >
            Sign in <ArrowRight size={16} aria-hidden="true" />
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-ink-3">
          Demo build: logins are checked in this browser until the billing server is ready.
        </p>
      </div>
    </main>
  );
};

export default Login;
