import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MailCheck, Send } from 'lucide-react';
import AuthCard from '../../components/AuthCard.jsx';
import Button from '../../components/Button.jsx';
import FormError from '../../components/FormError.jsx';
import FormField from '../../components/FormField.jsx';
import { errorProps } from '../../components/fieldError.js';
import { Input } from '../../components/Input.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { forgotPasswordSchema } from '../../lib/validation.js';
import { useAuthForm } from '../useAuthForm.js';

/**
 * "Forgot password?": asks for the email and has the shop send a reset link to it (valid 30 minutes). The
 * answer is the same whether or not the email has an account, so the page never says which.
 */
const ForgotPassword = () => {
  const { forgotPassword } = useCustomerAuth();
  const location = useLocation();
  const [sentTo, setSentTo] = useState('');
  const { form, update, error, fieldErrors, submitting, handleSubmit } = useAuthForm({
    initial: { email: '' },
    schema: forgotPasswordSchema,
    idPrefix: 'forgot',
    submit: forgotPassword,
    done: (data) => setSentTo(data.email),
  });

  return (
    <AuthCard eyebrow="✦ FORGOT YOUR PASSWORD? ✦" title="Reset Your Password" decorated noValidate onSubmit={handleSubmit}>
      {sentTo ? (
        <div role="status" className="flex flex-col items-center gap-3 py-2 text-center">
          <MailCheck size={40} strokeWidth={1.5} className="text-emerald-400" />
          <p className="text-[0.92rem] leading-[1.7] text-text-secondary">
            If an account exists for <span className="text-white">{sentTo}</span>, we&apos;ve sent a link to reset its
            password. It works for 30 minutes; do check your spam folder too.
          </p>
        </div>
      ) : (
        <>
          <p className="text-[0.88rem] leading-[1.6] text-text-secondary">
            Enter the email you signed up with and we&apos;ll send you a link to choose a new password.
          </p>

          <FormField label="Email" htmlFor="forgot-email" error={fieldErrors.email}>
            <Input
              id="forgot-email"
              {...errorProps('forgot-email', fieldErrors.email)}
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={form.email}
              onChange={update('email')}
              placeholder="you@example.com"
            />
          </FormField>

          <FormError>{error}</FormError>

          <Button type="submit" full disabled={submitting}>
            <Send size={17} strokeWidth={2} />
            {submitting ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </>
      )}

      <p className="text-center text-[0.85rem] text-text-secondary">
        Remembered it?{' '}
        <Link to="/login" state={location.state} className="text-gold-300 underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
};

export default ForgotPassword;
