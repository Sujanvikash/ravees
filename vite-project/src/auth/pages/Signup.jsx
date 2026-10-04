import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { UserPlus, Info } from 'lucide-react';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import { GRADIENT_TITLE } from '../../components/SectionHeading.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Eyebrow from '../../components/Eyebrow.jsx';
import { Input } from '../../components/Input.jsx';

export default function Signup() {
  const { signup } = useCustomerAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

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
      navigate(location.state?.from ?? '/account');
    } else {
      setError(result.error);
    }
  };

  return (
    <section className="relative z-20 flex min-h-[70vh] items-center justify-center bg-[radial-gradient(circle_at_center,#071f15_0%,#030c08_100%)] px-6 py-16">
      <div className="w-full max-w-[480px]">
        <div className="mb-7 text-center">
          <Eyebrow>
            ✦ JOIN THE RAAVE FAMILY ✦
          </Eyebrow>
          <h1 className={`font-serif text-[1.8rem] font-bold leading-[1.2] tracking-[0.03em] ${GRADIENT_TITLE}`}>
            Create Your Account
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-gold-400/25 bg-[rgba(8,28,20,0.9)] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
        >
          <FormField label="Full Name" htmlFor="signup-name">
            <Input
              id="signup-name"
              required
              autoFocus
              value={form.name}
              onChange={update('name')}
              placeholder="e.g. David Thomas"
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Email" htmlFor="signup-email">
              <Input
                id="signup-email"
                type="email"
                required
                value={form.email}
                onChange={update('email')}
                placeholder="you@example.com"
              />
            </FormField>
            <FormField label="Phone" htmlFor="signup-phone">
              <Input
                id="signup-phone"
                type="tel"
                required
                value={form.phone}
                onChange={update('phone')}
                placeholder="+91 98765 43210"
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Password" htmlFor="signup-password">
              <Input
                id="signup-password"
                type="password"
                required
                value={form.password}
                onChange={update('password')}
              />
            </FormField>
            <FormField label="Confirm Password" htmlFor="signup-confirm">
              <Input
                id="signup-confirm"
                type="password"
                required
                value={form.confirm}
                onChange={update('confirm')}
              />
            </FormField>
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
            <Link to="/login" state={location.state} className="text-gold-300 underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
}
