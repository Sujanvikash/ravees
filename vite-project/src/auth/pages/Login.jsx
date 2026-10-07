import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import AuthCard from '../../components/AuthCard.jsx';
import Button from '../../components/Button.jsx';
import FormError from '../../components/FormError.jsx';
import FormField from '../../components/FormField.jsx';
import { Input } from '../../components/Input.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const Login = () => {
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
    <AuthCard eyebrow="✦ WELCOME BACK ✦" title="Sign In To Your Account" onSubmit={handleSubmit}>
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

      <FormError>{error}</FormError>

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
    </AuthCard>
  );
};

export default Login;
