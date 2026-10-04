import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, Info } from 'lucide-react';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import { GRADIENT_TITLE } from '../../components/SectionHeading.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Eyebrow from '../../components/Eyebrow.jsx';
import { Input } from '../../components/Input.jsx';

export default function Login() {
  const { login } = useCustomerAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await login(form);
    setSubmitting(false);
    if (result.ok) {
      showToast(`Welcome back, ${form.email.split('@')[0]}!`);
      navigate(location.state?.from ?? '/account');
    } else {
      setError(result.error);
    }
  };

  return (
    <section className="relative z-20 flex min-h-[70vh] items-center justify-center bg-[radial-gradient(circle_at_center,#071f15_0%,#030c08_100%)] px-6 py-16">
      <div className="w-full max-w-[440px]">
        <div className="mb-7 text-center">
          <Eyebrow>
            ✦ WELCOME BACK ✦
          </Eyebrow>
          <h1 className={`font-serif text-[1.8rem] font-bold leading-[1.2] tracking-[0.03em] ${GRADIENT_TITLE}`}>
            Sign In To Your Account
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-gold-400/25 bg-[rgba(8,28,20,0.9)] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
        >
          <FormField label="Email" htmlFor="login-email">
            <Input
              id="login-email"
              type="email"
              required
              autoFocus
              value={form.email}
              onChange={update('email')}
              placeholder="you@example.com"
            />
          </FormField>

          <FormField label="Password" htmlFor="login-password">
            <Input
              id="login-password"
              type="password"
              required
              value={form.password}
              onChange={update('password')}
            />
          </FormField>

          {error && (
            <p className="flex items-start gap-2 rounded-lg border border-ruby-500/40 bg-ruby-500/10 px-3.5 py-2.5 text-[0.82rem] text-ruby-500">
              <Info size={15} strokeWidth={2} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}

          <Button type="submit" full disabled={submitting}>
            <LogIn size={17} strokeWidth={2} />
            {submitting ? 'Signing in...' : 'Sign In'}
          </Button>

          <p className="text-center text-[0.85rem] text-text-secondary">
            New to Raave&apos;s?{' '}
            <Link to="/signup" state={location.state} className="text-gold-300 underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
}
