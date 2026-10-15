import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import AuthCard from '../../components/AuthCard.jsx';
import Button from '../../components/Button.jsx';
import FormError from '../../components/FormError.jsx';
import FormField from '../../components/FormField.jsx';
import { errorProps } from '../../components/fieldError.js';
import { Input } from '../../components/Input.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { focusFirstError, signupSchema, validate } from '../../lib/validation.js';

const Signup = () => {
  const { signup } = useCustomerAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Editing a field clears its error; the rest stay until the next submit.
  const update = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { data, errors } = validate(signupSchema, form);
    if (errors) {
      setFieldErrors(errors);
      focusFirstError(errors, 'signup');
      return;
    }

    setSubmitting(true);
    const result = await signup(data);
    setSubmitting(false);
    if (result.ok) {
      showToast(`Welcome to Raave's Evergreen, ${data.name.split(' ')[0]}!`);
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
      decorated
      onSubmit={handleSubmit}
      noValidate
    >
      <FormField label="Full Name" htmlFor="signup-name" error={fieldErrors.name}>
        <Input
          id="signup-name"
          {...errorProps('signup-name', fieldErrors.name)}
          required
          autoFocus
          value={form.name}
          onChange={update('name')}
          placeholder="e.g. David Thomas"
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Email" htmlFor="signup-email" error={fieldErrors.email}>
          <Input
            id="signup-email"
            {...errorProps('signup-email', fieldErrors.email)}
            type="email"
            required
            value={form.email}
            onChange={update('email')}
            placeholder="you@example.com"
          />
        </FormField>
        <FormField label="Phone" htmlFor="signup-phone" error={fieldErrors.phone}>
          <Input
            id="signup-phone"
            {...errorProps('signup-phone', fieldErrors.phone)}
            type="tel"
            required
            value={form.phone}
            onChange={update('phone')}
            placeholder="+91 98765 43210"
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Password" htmlFor="signup-password" error={fieldErrors.password}>
          <Input
            id="signup-password"
            {...errorProps('signup-password', fieldErrors.password)}
            type="password"
            required
            value={form.password}
            onChange={update('password')}
          />
        </FormField>
        <FormField label="Confirm Password" htmlFor="signup-confirm" error={fieldErrors.confirm}>
          <Input
            id="signup-confirm"
            {...errorProps('signup-confirm', fieldErrors.confirm)}
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
