import { Link, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import AuthCard from '../../components/AuthCard.jsx';
import Button from '../../components/Button.jsx';
import FormError from '../../components/FormError.jsx';
import FormField from '../../components/FormField.jsx';
import { errorProps } from '../../components/fieldError.js';
import { Input } from '../../components/Input.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { loginSchema } from '../../lib/validation.js';
import { useAuthForm } from '../useAuthForm.js';

const Login = () => {
  const { login } = useCustomerAuth();
  const location = useLocation();
  const { form, update, error, fieldErrors, submitting, handleSubmit } = useAuthForm({
    initial: { email: '', password: '' },
    schema: loginSchema,
    idPrefix: 'login',
    submit: login,
    welcome: (data) => `Welcome back, ${data.email.split('@')[0]}!`,
  });

  return (
    <AuthCard eyebrow="✦ WELCOME BACK ✦" title="Sign In To Your Account" decorated noValidate onSubmit={handleSubmit}>
      <FormField label="Email" htmlFor="login-email" error={fieldErrors.email}>
        <Input
          id="login-email"
          {...errorProps('login-email', fieldErrors.email)}
          type="email"
          required
          autoFocus
          value={form.email}
          onChange={update('email')}
          placeholder="you@example.com"
        />
      </FormField>

      <FormField label="Password" htmlFor="login-password" error={fieldErrors.password}>
        <Input
          id="login-password"
          {...errorProps('login-password', fieldErrors.password)}
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
