import { Link, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import AuthCard from '../../components/AuthCard.jsx';
import Button from '../../components/Button.jsx';
import FormError from '../../components/FormError.jsx';
import FormField from '../../components/FormField.jsx';
import { errorProps } from '../../components/fieldError.js';
import { Input } from '../../components/Input.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { resetPasswordSchema } from '../../lib/validation.js';
import { useAuthForm } from '../useAuthForm.js';

/**
 * The page the reset email links to (`/reset-password?token=…`): a new password, twice. The link works
 * once, for 30 minutes; it signs the customer in and takes them to their account.
 */
const ResetPassword = () => {
  const { resetPassword } = useCustomerAuth();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { form, update, error, fieldErrors, submitting, handleSubmit } = useAuthForm({
    initial: { password: '', confirm: '' },
    schema: resetPasswordSchema,
    idPrefix: 'reset',
    submit: (data) => resetPassword({ token, password: data.password }),
    welcome: () => 'Your password is changed and you are signed in.',
  });

  if (!token) {
    return (
      <AuthCard eyebrow="✦ RESET YOUR PASSWORD ✦" title="This Link Is Incomplete" decorated onSubmit={(e) => e.preventDefault()}>
        <p className="text-[0.9rem] leading-[1.7] text-text-secondary">
          The reset link seems to be cut short. Please open it straight from the email, or ask for a new one.
        </p>
        <Button to="/forgot-password" full>
          Send Me A New Link
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard eyebrow="✦ RESET YOUR PASSWORD ✦" title="Choose A New Password" decorated noValidate onSubmit={handleSubmit}>
      <FormField label="New Password" htmlFor="reset-password" error={fieldErrors.password}>
        <Input
          id="reset-password"
          {...errorProps('reset-password', fieldErrors.password)}
          type="password"
          required
          autoFocus
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={update('password')}
        />
      </FormField>

      <FormField label="Confirm New Password" htmlFor="reset-confirm" error={fieldErrors.confirm}>
        <Input
          id="reset-confirm"
          {...errorProps('reset-confirm', fieldErrors.confirm)}
          type="password"
          required
          autoComplete="new-password"
          value={form.confirm}
          onChange={update('confirm')}
        />
      </FormField>

      <FormError>
        {error && (
          <span>
            {error}{' '}
            <Link to="/forgot-password" className="underline underline-offset-4">
              Send a new link
            </Link>
          </span>
        )}
      </FormError>

      <Button type="submit" full disabled={submitting}>
        <KeyRound size={17} strokeWidth={2} />
        {submitting ? 'Saving...' : 'Save And Sign In'}
      </Button>
    </AuthCard>
  );
};

export default ResetPassword;
