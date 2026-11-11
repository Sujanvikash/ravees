import { useState } from 'react';
import { KeyRound, Save } from 'lucide-react';
import Button from '../../components/Button.jsx';
import FormError from '../../components/FormError.jsx';
import FormField from '../../components/FormField.jsx';
import { errorProps } from '../../components/fieldError.js';
import { Input } from '../../components/Input.jsx';
import { cardClass } from '../../components/cardClass.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { changePasswordSchema } from '../../lib/validation.js';
import { useAuthForm } from '../useAuthForm.js';

const PasswordForm = ({ onChanged }) => {
  const { changePassword } = useCustomerAuth();
  const { form, update, error, fieldErrors, submitting, handleSubmit } = useAuthForm({
    initial: { current: '', password: '', confirm: '' },
    schema: changePasswordSchema,
    idPrefix: 'pw',
    submit: changePassword,
    done: onChanged,
  });

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormField label="Current Password" htmlFor="pw-current" error={fieldErrors.current}>
        <Input
          id="pw-current"
          {...errorProps('pw-current', fieldErrors.current)}
          type="password"
          required
          autoComplete="current-password"
          value={form.current}
          onChange={update('current')}
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="New Password" htmlFor="pw-password" error={fieldErrors.password}>
          <Input
            id="pw-password"
            {...errorProps('pw-password', fieldErrors.password)}
            type="password"
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={update('password')}
          />
        </FormField>
        <FormField label="Confirm New Password" htmlFor="pw-confirm" error={fieldErrors.confirm}>
          <Input
            id="pw-confirm"
            {...errorProps('pw-confirm', fieldErrors.confirm)}
            type="password"
            required
            autoComplete="new-password"
            value={form.confirm}
            onChange={update('confirm')}
          />
        </FormField>
      </div>

      <FormError>{error}</FormError>

      <Button size="sm" type="submit" disabled={submitting} className="self-start">
        <Save size={15} strokeWidth={2} />
        {submitting ? 'Saving...' : 'Change Password'}
      </Button>
    </form>
  );
};

/** The account page's password change. The server signs every other device out. */
const PasswordCard = () => {
  const { showToast } = useToast();
  // A new key after each change gives an empty form again.
  const [round, setRound] = useState(0);

  return (
    <div className={`${cardClass('panel')} flex flex-col gap-4 p-6 md:p-8`}>
      <h2 className="flex items-center gap-2 font-serif text-[1.15rem] text-white">
        <KeyRound size={18} strokeWidth={2} className="text-gold-400" />
        Change Password
      </h2>
      <PasswordForm
        key={round}
        onChanged={() => {
          showToast('Password changed. Any other devices have been signed out.');
          setRound((n) => n + 1);
        }}
      />
    </div>
  );
};

export default PasswordCard;
