import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Info } from 'lucide-react';
import Button from '../components/Button.jsx';
import { GRADIENT_TITLE } from '../components/SectionHeading.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const FIELD =
  'rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 font-sans text-[0.9rem] text-white outline-none transition-all focus:border-gold-400 placeholder:text-text-muted';
const LABEL = 'text-[0.78rem] text-gold-300';

export default function Signup() {
  const { signup } = useCustomerAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 6) {
      setError('Please choose a password of at least 6 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const result = await signup(form);
    setSubmitting(false);
    if (result.ok) {
      showToast(`Welcome to Raave's Evergreen, ${form.name.split(' ')[0]}!`);
      navigate('/account');
    } else {
      setError(result.error);
    }
  };

  return (
    <section className="relative z-20 flex min-h-[70vh] items-center justify-center bg-[radial-gradient(circle_at_center,#071f15_0%,#030c08_100%)] px-6 py-16">
      <div className="w-full max-w-[480px]">
        <div className="mb-7 text-center">
          <span className="mb-3 inline-block font-mono text-[0.72rem] uppercase tracking-[0.28em] text-gold-400">
            ✦ JOIN THE RAAVE FAMILY ✦
          </span>
          <h1 className={`font-serif text-[1.8rem] font-bold leading-[1.2] tracking-[0.03em] ${GRADIENT_TITLE}`}>
            Create Your Account
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-gold-400/25 bg-[rgba(8,28,20,0.9)] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
        >
          <div className="flex flex-col gap-1.5">
            <label className={LABEL} htmlFor="signup-name">
              Full Name
            </label>
            <input
              id="signup-name"
              required
              autoFocus
              value={form.name}
              onChange={update('name')}
              placeholder="e.g. David Thomas"
              className={FIELD}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL} htmlFor="signup-email">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                required
                value={form.email}
                onChange={update('email')}
                placeholder="you@example.com"
                className={FIELD}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL} htmlFor="signup-phone">
                Phone
              </label>
              <input
                id="signup-phone"
                type="tel"
                required
                value={form.phone}
                onChange={update('phone')}
                placeholder="+91 98765 43210"
                className={FIELD}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL} htmlFor="signup-password">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                required
                value={form.password}
                onChange={update('password')}
                className={FIELD}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL} htmlFor="signup-confirm">
                Confirm Password
              </label>
              <input
                id="signup-confirm"
                type="password"
                required
                value={form.confirm}
                onChange={update('confirm')}
                className={FIELD}
              />
            </div>
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-lg border border-ruby-500/40 bg-ruby-500/10 px-3.5 py-2.5 text-[0.82rem] text-ruby-500">
              <Info size={15} strokeWidth={2} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}

          <Button type="submit" full disabled={submitting}>
            <UserPlus size={17} strokeWidth={2} />
            {submitting ? 'Creating account...' : 'Create Account'}
          </Button>

          <p className="text-center text-[0.85rem] text-text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="text-gold-300 underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
}
