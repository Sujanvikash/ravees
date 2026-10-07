import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import AuthCard from '../../components/AuthCard.jsx';
import Button from '../../components/Button.jsx';
import FormError from '../../components/FormError.jsx';
import FormField from '../../components/FormField.jsx';
import { Input } from '../../components/Input.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const Signup = () => {
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
    <AuthCard
      eyebrow="✦ JOIN THE RAAVE FAMILY ✦"
      title="Create Your Account"
      maxWidth="max-w-[480px]"
      onSubmit={handleSubmit}
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

      <FormError>{error}</FormError>

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
    </AuthCard>
  );
};

export default Signup;
