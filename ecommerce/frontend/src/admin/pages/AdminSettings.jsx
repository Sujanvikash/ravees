import { useEffect, useState } from 'react';
import { KeyRound, Save, Truck } from 'lucide-react';
import Button from '../../components/Button.jsx';
import FormError from '../../components/FormError.jsx';
import FormField from '../../components/FormField.jsx';
import PageLoader from '../../components/PageLoader.jsx';
import { errorProps } from '../../components/fieldError.js';
import { Input } from '../../components/Input.jsx';
import { cardClass } from '../../components/cardClass.js';
import AdminPageHeader from '../components/AdminPageHeader.jsx';
import { rupeesOrNull } from '../components/adminForm.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatPrice } from '../../lib/format.js';
import { changePasswordSchema, focusFirstError, validate } from '../../lib/validation.js';

const CARD_TITLE = 'mb-1 flex items-center gap-2 font-serif text-[1.15rem] text-white';

/** What delivery costs: a flat fee per order, free from a threshold (0 = never free). */
const DeliveryCard = () => {
  const { request } = useAdminAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    request('/admin/settings').then(
      (settings) => setForm({ deliveryFee: String(settings.deliveryFee ?? 0), freeDeliveryOver: String(settings.freeDeliveryOver ?? 0) }),
      (err) => setLoadError(err.message)
    );
  }, [request]);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    const deliveryFee = rupeesOrNull(form.deliveryFee) ?? 0;
    const freeDeliveryOver = rupeesOrNull(form.freeDeliveryOver) ?? 0;
    if (![deliveryFee, freeDeliveryOver].every((n) => Number.isFinite(n) && n >= 0)) {
      setError('Please enter amounts in rupees (0 or more).');
      return;
    }
    setSaving(true);
    try {
      const saved = await request('/admin/settings', { method: 'PATCH', body: { deliveryFee, freeDeliveryOver } });
      setForm({ deliveryFee: String(saved.deliveryFee), freeDeliveryOver: String(saved.freeDeliveryOver) });
      showToast('Delivery charges saved');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return (
      <div className={`${cardClass('tile')} p-6`}>
        {loadError ? <FormError>{loadError}</FormError> : <PageLoader label="Loading settings" />}
      </div>
    );
  }

  const fee = rupeesOrNull(form.deliveryFee) ?? 0;
  const over = rupeesOrNull(form.freeDeliveryOver) ?? 0;
  const summary = !fee
    ? 'Delivery is free on every order.'
    : `Delivery costs ${formatPrice(fee)} per order${over > 0 ? `, free from ${formatPrice(over)}` : ''}.`;

  return (
    <form onSubmit={save} noValidate className={`${cardClass('tile')} flex flex-col gap-4 p-6`}>
      <h2 className={CARD_TITLE}>
        <Truck size={18} strokeWidth={2} className="text-gold-400" />
        Delivery charges
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Delivery fee per order (₹)" htmlFor="set-fee">
          <Input
            id="set-fee"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={form.deliveryFee}
            onChange={(e) => setForm((prev) => ({ ...prev, deliveryFee: e.target.value }))}
          />
        </FormField>
        <FormField label="Free delivery from (₹, 0 = never)" htmlFor="set-free">
          <Input
            id="set-free"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={form.freeDeliveryOver}
            onChange={(e) => setForm((prev) => ({ ...prev, freeDeliveryOver: e.target.value }))}
          />
        </FormField>
      </div>
      <p className="text-[0.8rem] text-text-muted">{summary} The checkout and new orders use this straight away.</p>
      <FormError>{error}</FormError>
      <Button size="sm" type="submit" disabled={saving} className="self-start">
        <Save size={15} strokeWidth={2} />
        {saving ? 'Saving...' : 'Save delivery charges'}
      </Button>
    </form>
  );
};

/** The admin's own password (signs other admin sessions out; this one gets a new token). */
const PasswordCard = () => {
  const { changePassword } = useAdminAuth();
  const { showToast } = useToast();
  const blank = { current: '', password: '', confirm: '' };
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    const { data, errors: found } = validate(changePasswordSchema, form);
    if (found) {
      setErrors(found);
      focusFirstError(found, 'adm-pw');
      return;
    }
    setErrors({});
    setSaving(true);
    const result = await changePassword(data);
    setSaving(false);
    if (result.ok) {
      setForm(blank);
      showToast('Admin password changed');
    } else {
      setError(result.error);
    }
  };

  return (
    <form onSubmit={save} noValidate className={`${cardClass('tile')} flex flex-col gap-4 p-6`}>
      <h2 className={CARD_TITLE}>
        <KeyRound size={18} strokeWidth={2} className="text-gold-400" />
        Admin password
      </h2>
      <FormField label="Current password" htmlFor="adm-pw-current" error={errors.current}>
        <Input
          id="adm-pw-current"
          {...errorProps('adm-pw-current', errors.current)}
          type="password"
          autoComplete="current-password"
          value={form.current}
          onChange={update('current')}
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="New password" htmlFor="adm-pw-password" error={errors.password}>
          <Input
            id="adm-pw-password"
            {...errorProps('adm-pw-password', errors.password)}
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={update('password')}
          />
        </FormField>
        <FormField label="Confirm new password" htmlFor="adm-pw-confirm" error={errors.confirm}>
          <Input
            id="adm-pw-confirm"
            {...errorProps('adm-pw-confirm', errors.confirm)}
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={update('confirm')}
          />
        </FormField>
      </div>
      <FormError>{error}</FormError>
      <Button size="sm" type="submit" disabled={saving} className="self-start">
        <Save size={15} strokeWidth={2} />
        {saving ? 'Saving...' : 'Change password'}
      </Button>
    </form>
  );
};

const AdminSettings = () => (
  <div className="flex flex-col gap-6">
    <AdminPageHeader title="Settings" subtitle="Delivery charges for orders paid online, and your admin password." />
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <DeliveryCard />
      <PasswordCard />
    </div>
  </div>
);

export default AdminSettings;
