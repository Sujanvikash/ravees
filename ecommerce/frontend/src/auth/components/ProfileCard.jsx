import { useState } from 'react';
import { LogOut, Mail, MapPin, Pencil, Phone, Save, User } from 'lucide-react';
import { addressLines } from '../../lib/orders.js';
import Button from '../../components/Button.jsx';
import FormError from '../../components/FormError.jsx';
import FormField from '../../components/FormField.jsx';
import { errorProps } from '../../components/fieldError.js';
import { Input } from '../../components/Input.jsx';
import { cardClass } from '../../components/cardClass.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { profileSchema } from '../../lib/validation.js';
import { useAuthForm } from '../useAuthForm.js';

const CANCEL =
  'cursor-pointer rounded-lg border border-gold-400/25 bg-transparent px-4 py-2.5 text-[0.85rem] text-text-secondary transition-all hover:border-gold-400 hover:text-text-primary';

/** The name and phone, editable (the email is the sign-in and stays as it is). */
const ProfileForm = ({ onSaved, onCancel }) => {
  const { session, updateProfile } = useCustomerAuth();
  const { form, update, error, fieldErrors, submitting, handleSubmit } = useAuthForm({
    initial: { name: session.name ?? '', phone: session.phone ?? '' },
    schema: profileSchema,
    idPrefix: 'profile',
    submit: updateProfile,
    done: onSaved,
  });

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormField label="Full Name" htmlFor="profile-name" error={fieldErrors.name}>
        <Input
          id="profile-name"
          {...errorProps('profile-name', fieldErrors.name)}
          icon={User}
          required
          autoFocus
          autoComplete="name"
          value={form.name}
          onChange={update('name')}
        />
      </FormField>
      <FormField label="Phone" htmlFor="profile-phone" error={fieldErrors.phone}>
        <Input
          id="profile-phone"
          {...errorProps('profile-phone', fieldErrors.phone)}
          icon={Phone}
          type="tel"
          required
          autoComplete="tel"
          value={form.phone}
          onChange={update('phone')}
        />
      </FormField>

      <FormError>{error}</FormError>

      <div className="flex flex-wrap gap-3">
        <Button size="sm" type="submit" disabled={submitting}>
          <Save size={15} strokeWidth={2} />
          {submitting ? 'Saving...' : 'Save'}
        </Button>
        <button type="button" onClick={onCancel} className={CANCEL}>
          Cancel
        </button>
      </div>
    </form>
  );
};

/** The account page's profile card: name, email and phone (editable), the delivery address saved at checkout
 * (with a way to remove it), and signing out. */
const ProfileCard = () => {
  const { session, logout, forgetAddress } = useCustomerAuth();
  const saved = session.address;
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);

  return (
    <div className={`${cardClass('panel')} flex flex-col gap-4 p-6 md:p-8`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-serif text-[1.15rem] text-text-primary">
          <User size={18} strokeWidth={2} className="text-gold-400" />
          Profile
        </h2>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 text-[0.85rem] text-gold-300 transition-colors hover:text-text-primary"
          >
            <Pencil size={14} strokeWidth={2} />
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <ProfileForm
          onSaved={() => {
            showToast('Your details are saved');
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <User size={18} strokeWidth={2} className="shrink-0 text-gold-400" />
            <span className="text-[0.95rem] text-text-primary">{session.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <Mail size={18} strokeWidth={2} className="shrink-0 text-gold-400" />
            <span className="min-w-0 break-all text-[0.95rem] text-text-secondary">{session.email}</span>
          </div>
          {session.phone && (
            <div className="flex items-center gap-3">
              <Phone size={18} strokeWidth={2} className="shrink-0 text-gold-400" />
              <span className="text-[0.95rem] text-text-secondary">{session.phone}</span>
            </div>
          )}
          {saved && (
            <div className="flex items-start gap-3">
              <MapPin size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-gold-400" />
              <div className="min-w-0 flex-1 text-[0.9rem] leading-[1.6] text-text-secondary">
                <span className="block text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-text-muted">Saved delivery address</span>
                {addressLines(saved).map((line, i) => (
                  <span key={i} className="block">
                    {line}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={async () => {
                    const result = await forgetAddress();
                    showToast(result.ok ? 'Saved address removed' : result.error);
                  }}
                  className="mt-1 cursor-pointer border-none bg-transparent p-0 text-[0.82rem] text-gold-300 underline-offset-4 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => {
          logout();
          showToast('Signed out');
        }}
        className="mt-auto inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-contrast/10 bg-transparent px-4 py-2.5 text-[0.85rem] text-text-secondary transition-all hover:border-ruby-500 hover:text-ruby-500"
      >
        <LogOut size={15} strokeWidth={2} />
        Sign out
      </button>
    </div>
  );
};

export default ProfileCard;
