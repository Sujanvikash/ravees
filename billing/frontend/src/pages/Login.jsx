import { useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, FlaskConical, LockKeyhole, ShieldCheck } from 'lucide-react';
import logo from '../assets/logo.svg';
import { Landmark } from '../components/Landmarks.jsx';
import { BRAND, locationById } from '../config.js';
import { accounts, signIn, signInDemo, unlockDemo } from '../lib/auth.js';

// a slight, different tilt per card, as if laid out on a table (straight on a phone); cycled for any store count
const TILT = ['sm:rotate-[-2.5deg]', 'sm:rotate-[1.5deg] sm:translate-y-2.5', 'sm:rotate-[-1deg] sm:-translate-y-1.5', 'sm:rotate-[2deg] sm:translate-y-2', 'sm:rotate-[-1.5deg]'];

/** Step 1: a postcard per store, with its landmark and a stamp showing its bill code. */
const Postcard = ({ account, index, onPick }) => {
  const shop = locationById(account.location);
  return (
    <button
      type="button"
      onClick={() => onPick(account)}
      className={`group relative flex flex-col items-start rounded-md bg-[#fffdf8] px-4 pt-5 pb-9 text-left shadow-[0_2px_4px_rgba(0,0,0,0.06),0_18px_32px_-14px_rgba(60,40,10,0.35)] transition duration-200 before:pointer-events-none before:absolute before:inset-2 before:rounded-[3px] before:border before:border-dashed before:border-evergreen-800/25 before:content-[''] hover:-translate-y-1.5 hover:rotate-0 hover:shadow-[0_4px_8px_rgba(0,0,0,0.06),0_28px_40px_-16px_rgba(23,92,38,0.45)] sm:h-72 sm:w-52 sm:px-5 sm:pt-6 xl:w-auto xl:px-4 ${TILT[index % TILT.length]}`}
    >
      <span className="absolute top-4 right-4 bg-raave-red px-1.5 py-1 font-mono text-[11px] font-bold tracking-wider text-white shadow-[0_0_0_1px_var(--color-raave-red)] outline-[3px] outline-offset-[-2px] outline-[#fffdf8] outline-dotted">
        {shop.billPrefix}
      </span>
      <Landmark id={shop.id} className="mt-8 h-14 w-auto text-evergreen-800 transition-transform duration-200 group-hover:scale-105 sm:mt-10 sm:h-[5.5rem]" />
      <span className="mt-3 font-display text-xl font-bold sm:mt-4 sm:text-[26px] xl:text-[23px]">{shop.city}</span>
      <span className="text-xs text-ink-3 sm:text-[13px]">{shop.area}</span>
      <span className="absolute inset-x-4 bottom-5 h-2 border-y border-line sm:inset-x-5" aria-hidden="true" />
    </button>
  );
};

// the one store the demo opens, besides the admin (the server lets no other in)
const DEMO_STORE = 'chennai';

/** Choose a login first, then type its password. A showroom bills and sees its own figures; the admin sees all.
 * The Demo switch asks for its own password, then Chennai Egmore and the admin open the demo (sample data, kept
 * apart from the real data) in one click. */
const Login = ({ onSignedIn }) => {
  const [account, setAccount] = useState(null);
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // the Demo switch's password once the server took it: the switch is on while it is held, and it is never stored,
  // so the switch is off again after a reload or a sign-out
  const [demoKey, setDemoKey] = useState(null);
  const demo = demoKey !== null;
  const [asking, setAsking] = useState(false); // the switch's password box is open
  const [demoInput, setDemoInput] = useState('');
  const [demoError, setDemoError] = useState('');
  const all = accounts();
  const SHOWROOMS = all.filter((a) => a.role === 'location' && (!demo || a.username === DEMO_STORE));
  const ADMIN = all.find((a) => a.role === 'admin');

  const toggleDemo = () => {
    setDemoError('');
    if (demo) {
      setDemoKey(null);
    } else {
      setAsking(!asking);
      setDemoInput('');
    }
  };

  const unlock = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await unlockDemo(demoInput);
      setDemoKey(demoInput);
      setAsking(false);
    } catch (err) {
      setDemoError(err.message);
      if (err.status === 401) setDemoInput('');
    } finally {
      setBusy(false);
    }
  };

  const tryDemo = async (a) => {
    setBusy(true);
    setDemoError('');
    try {
      onSignedIn(await signInDemo(a.username, demoKey));
    } catch (err) {
      setBusy(false);
      setDemoError(err.message);
    }
  };

  const pick = (a) => {
    if (demo) return tryDemo(a);
    setAccount(a);
    setPassword('');
    setError('');
  };
  const back = () => setAccount(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      onSignedIn(await signIn(account.username, password));
    } catch (err) {
      setBusy(false);
      setError(err.message);
      if (err.status === 401) setPassword('');
    }
  };

  const shop = account && locationById(account.location);
  const card = 'rounded-2xl border glass p-6 shadow-[0_12px_40px_-12px_rgba(9,9,11,0.18)] sm:p-7';

  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-10">
      {/* the Demo switch: asks its password, then Chennai Egmore and the admin open the demo in one click */}
      {!account && (
        <label className="absolute top-4 right-4 z-10 inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-white/80 py-1 pr-1.5 pl-3 text-[13px] font-medium text-ink-2 backdrop-blur">
          <FlaskConical size={14} aria-hidden="true" /> Demo
          <button
            type="button"
            role="switch"
            aria-checked={demo}
            aria-label="Demo"
            onClick={toggleDemo}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${demo ? 'brand-gradient' : 'bg-line-strong'}`}
          >
            <span className={`inline-block size-4 rounded-full bg-[#fff] shadow transition-transform ${demo ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
          </button>
        </label>
      )}
      {!account && asking && (
        <form
          onSubmit={unlock}
          onKeyDown={(e) => e.key === 'Escape' && setAsking(false)}
          className="absolute top-14 right-4 z-10 w-72 animate-rise rounded-2xl border glass p-4 shadow-[0_12px_40px_-12px_rgba(9,9,11,0.18)]"
        >
          <label htmlFor="demo-password" className="mb-2 block text-[13px] font-medium text-ink-2">
            Demo password
          </label>
          <div className="flex gap-2">
            <div
              className={`flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border bg-white/80 px-3 transition-shadow ${
                demoError ? 'border-ruby' : 'border-line focus-within:border-evergreen-800/50 focus-within:shadow-[0_0_0_3px_rgba(23,92,38,0.10)]'
              }`}
            >
              <LockKeyhole size={14} className="text-ink-3" aria-hidden="true" />
              <input
                id="demo-password"
                type="password"
                autoComplete="off"
                autoFocus
                required
                value={demoInput}
                onChange={(e) => {
                  setDemoInput(e.target.value);
                  setDemoError('');
                }}
                aria-invalid={demoError ? true : undefined}
                aria-describedby={demoError ? 'demo-password-error' : undefined}
                className="min-w-0 flex-1 bg-transparent text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="h-10 rounded-xl bg-evergreen-800 px-3.5 text-sm font-semibold text-white hover:bg-evergreen-900 disabled:opacity-60"
            >
              Open
            </button>
          </div>
          {demoError && (
            <p id="demo-password-error" role="alert" className="mt-1.5 animate-pop text-xs font-medium text-ruby-ink">
              {demoError}
            </p>
          )}
        </form>
      )}
      <div className={`w-full ${account ? 'max-w-lg' : 'max-w-7xl'}`}>
        <img src={logo} alt={BRAND.name} className="brand-logo mx-auto h-16 w-auto" />

        {!account ? (
          <div key="pick" className="mt-8 flex animate-rise flex-col items-center">
            <h1 className="text-center font-display text-[28px] text-balance text-evergreen-900 sm:text-[34px]">
              {demo ? 'Try the demo' : 'Choose your showroom'}
            </h1>
            {demo && (
              <p className="mt-1 max-w-md text-center text-[13px] text-balance text-ink-3">
                Chennai Egmore and the admin, on a practice copy. Nothing you do here touches the real sales or stock.
              </p>
            )}
            {demoError && !asking && (
              <p role="alert" className="mt-3 text-center text-xs font-medium text-ruby-ink">
                {demoError}
              </p>
            )}

            {/* every showroom on one row on a wide screen, however many there are; the demo's one store in the middle */}
            <div
              style={{ '--stores': SHOWROOMS.length }}
              className={
                demo
                  ? 'mx-auto mt-8 grid w-full max-w-52 sm:mt-10'
                  : 'mt-8 grid w-full grid-cols-2 gap-3 sm:mt-10 sm:flex sm:flex-wrap sm:justify-center sm:gap-6 xl:grid xl:grid-cols-[repeat(var(--stores),minmax(0,1fr))] xl:gap-5'
              }
            >
              {SHOWROOMS.map((a, i) => (
                <Postcard key={a.username} account={a} index={i} onPick={pick} />
              ))}
            </div>

            <button
              type="button"
              onClick={() => pick(ADMIN)}
              className="group mt-10 inline-flex h-10 items-center gap-2 rounded-full border border-evergreen-800/20 bg-white/70 px-4 text-sm font-semibold text-evergreen-900 backdrop-blur transition hover:border-evergreen-800/40 hover:bg-white"
            >
              <ShieldCheck size={16} aria-hidden="true" /> {demo ? 'Demo admin' : 'Admin sign-in'}
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

      </div>
    </main>
  );
};

export default Login;
