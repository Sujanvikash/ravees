import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LogIn, Info } from 'lucide-react';
import { TbChristmasTreeFilled } from 'react-icons/tb';
import {
  AdminAuthProvider,
  DEMO_CREDENTIALS,
  useAdminAuth,
} from '../context/AdminAuthContext.jsx';

const FIELD =
  'rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 font-sans text-[0.9rem] text-white outline-none transition-all focus:border-gold-400 placeholder:text-text-muted';

function LoginForm() {
  const { isAuthenticated, login } = useAdminAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to="/admin" replace />;

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = login(username, password);
    if (result.ok) navigate('/admin');
    else setError(result.error);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_center,#071f15_0%,#020704_100%)] px-6 py-16">
      <div className="w-full max-w-[420px]">
        <div className="mb-7 flex flex-col items-center gap-2 text-center">
          <TbChristmasTreeFilled
            size={44}
            className="text-gold-400 drop-shadow-[0_0_16px_rgba(229,199,139,0.4)]"
          />
          <h1 className="font-serif text-[1.3rem] font-bold tracking-[0.14em] text-white">
            RAAVE&apos;S ADMIN
          </h1>
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-gold-400">
            Console sign-in
          </span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-gold-400/25 bg-[rgba(8,28,20,0.9)] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.78rem] text-gold-300" htmlFor="admin-user">
              Username
            </label>
            <input
              id="admin-user"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={FIELD}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.78rem] text-gold-300" htmlFor="admin-pass">
              Password
            </label>
            <input
              id="admin-pass"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={FIELD}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-ruby-500/40 bg-ruby-500/10 px-3.5 py-2.5 text-[0.82rem] text-ruby-500">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mt-1 inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-gold-200 bg-[linear-gradient(135deg,var(--color-gold-400),var(--color-gold-600))] px-6 py-3 text-[0.9rem] font-semibold tracking-[0.06em] text-[#04140b] shadow-[0_0_20px_rgba(229,199,139,0.4)] transition-all hover:bg-[linear-gradient(135deg,#fff0c4,var(--color-gold-400))]"
          >
            <LogIn size={17} strokeWidth={2} />
            Sign In
          </button>

          <div className="flex gap-2.5 rounded-lg border border-gold-400/15 bg-gold-400/8 p-3.5">
            <Info size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-gold-300" />
            <p className="text-[0.78rem] leading-[1.6] text-text-secondary">
              Demo credentials — <code className="font-mono text-gold-200">{DEMO_CREDENTIALS.username}</code> /{' '}
              <code className="font-mono text-gold-200">{DEMO_CREDENTIALS.password}</code>. This gate is
              client-side only and is not real security.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <AdminAuthProvider>
      <LoginForm />
    </AdminAuthProvider>
  );
}
