import { useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import logo from '../assets/logo.svg';
import { Landmark } from '../components/Landmarks.jsx';
import { BRAND, locationById } from '../config.js';
import { ACCOUNTS, signIn } from '../lib/auth.js';

const SHOWROOMS = ACCOUNTS.filter((a) => a.role === 'location');
const ADMIN = ACCOUNTS.find((a) => a.role === 'admin');

// a slight, different tilt per card, as if laid out on a table (straight on a phone)
const TILT = ['sm:rotate-[-2.5deg]', 'sm:rotate-[1.5deg] sm:translate-y-2.5', 'sm:rotate-[-1deg] sm:-translate-y-1.5', 'sm:rotate-[2deg] sm:translate-y-2', 'sm:rotate-[-1.5deg]'];

/** Step 1: a postcard per showroom, with its landmark and a stamp showing its bill code. */
const Postcard = ({ account, index, onPick }) => {
  const shop = locationById(account.location);
  return (
    <button
      type="button"
      onClick={() => onPick(account)}
      className={`group relative flex flex-col items-start rounded-md bg-[#fffdf8] px-4 pt-5 pb-9 text-left shadow-[0_2px_4px_rgba(0,0,0,0.06),0_18px_32px_-14px_rgba(60,40,10,0.35)] transition duration-200 before:pointer-events-none before:absolute before:inset-2 before:rounded-[3px] before:border before:border-dashed before:border-evergreen-800/25 before:content-[''] hover:-translate-y-1.5 hover:rotate-0 hover:shadow-[0_4px_8px_rgba(0,0,0,0.06),0_28px_40px_-16px_rgba(23,92,38,0.45)] sm:h-72 sm:w-52 sm:px-5 sm:pt-6 ${TILT[index]} ${
        index === 4 ? 'col-span-2 w-[calc(50%-0.375rem)] justify-self-center' : ''
      }`}
    >
      <span className="absolute top-4 right-4 bg-raave-red px-1.5 py-1 font-mono text-[11px] font-bold tracking-wider text-white shadow-[0_0_0_1px_var(--color-raave-red)] outline-[3px] outline-offset-[-2px] outline-[#fffdf8] outline-dotted">
        {shop.billPrefix}
      </span>
      <Landmark id={shop.id} className="mt-8 h-14 w-auto text-evergreen-800 transition-transform duration-200 group-hover:scale-105 sm:mt-10 sm:h-[5.5rem]" />
      <span className="mt-3 font-display text-xl font-bold sm:mt-4 sm:text-[26px]">{shop.city}</span>
      <span className="text-xs text-ink-3 sm:text-[13px]">{shop.area}</span>
      <span className="absolute inset-x-4 bottom-5 h-2 border-y border-line sm:inset-x-5" aria-hidden="true" />
    </button>
  );
};

/** Choose a login first, then type its password. A showroom bills and sees its own figures; the admin sees all. */
const Login = ({ onSignedIn }) => {
  const [account, setAccount] = useState(null);
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const pick = (a) => {
    setAccount(a);
    setPassword('');
    setError('');
  };
  const back = () => setAccount(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const session = await signIn(account.username, password);
    setBusy(false);
    if (session) onSignedIn(session);
    else {
      setError('That password is not right for this login.');
      setPassword('');
    }
  };

  const shop = account && locationById(account.location);
  const card = 'rounded-2xl border glass p-6 shadow-[0_12px_40px_-12px_rgba(9,9,11,0.18)] sm:p-7';

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className={`w-full ${account ? 'max-w-lg' : 'max-w-6xl'}`}>
        <img src={logo} alt={BRAND.name} className="brand-logo mx-auto h-16 w-auto" />

        {!account ? (
          <div key="pick" className="mt-8 flex animate-rise flex-col items-center">
            <h1 className="text-center font-display text-[28px] text-balance text-evergreen-900 sm:text-[34px]">Choose your showroom</h1>

            <div className="mt-8 grid w-full grid-cols-2 gap-3 sm:mt-10 sm:flex sm:flex-wrap sm:justify-center sm:gap-6">
              {SHOWROOMS.map((a, i) => (
                <Postcard key={a.username} account={a} index={i} onPick={pick} />
              ))}
            </div>

            <button
              type="button"
              onClick={() => pick(ADMIN)}
              className="group mt-10 inline-flex h-10 items-center gap-2 rounded-full border border-evergreen-800/20 bg-white/70 px-4 text-sm font-semibold text-evergreen-900 backdrop-blur transition hover:border-evergreen-800/40 hover:bg-white"
            >
              <ShieldCheck size={16} aria-hidden="true" /> Admin sign-in
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <form
            key="password"
            onSubmit={submit}
            onKeyDown={(e) => e.key === 'Escape' && back()}
            className={`mx-auto mt-8 max-w-sm animate-rise ${card}`}
          >
            <button
              type="button"
              onClick={back}
              className="-ml-1.5 inline-flex h-8 items-center gap-1.5 rounded-lg px-1.5 text-[13px] font-medium text-ink-3 hover:bg-white/70 hover:text-ink"
            >
              <ArrowLeft size={15} aria-hidden="true" /> All logins
            </button>

            <div className="mt-4 flex items-center gap-3">
              <span
                className={`flex h-12 shrink-0 items-center justify-center rounded-xl ${shop ? 'w-16' : 'w-12'} ${
                  shop ? 'bg-evergreen-50 text-evergreen-800' : 'bg-evergreen-800 text-white'
                }`}
              >
                {shop ? <Landmark id={shop.id} className="h-8 w-auto" /> : <ShieldCheck size={20} aria-hidden="true" />}
              </span>
              <div className="leading-tight">
                <h1 className="text-lg font-semibold tracking-tight">{shop ? shop.city : 'Admin'}</h1>
                <p className="text-[13px] text-ink-3">{shop ? `${shop.area} showroom` : 'All showrooms'}</p>
              </div>
            </div>

            <label htmlFor="password" className="mt-6 mb-2 block text-[13px] font-medium text-ink-2">
              Password
            </label>
            <div
              className={`flex h-11 items-center gap-2 rounded-xl border bg-white/80 px-3 transition-shadow ${
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
        )}

        <p className="mt-4 text-center text-xs text-ink-3">Demo build: logins are checked in this browser until the billing server is ready.</p>
      </div>
    </main>
  );
};

export default Login;
