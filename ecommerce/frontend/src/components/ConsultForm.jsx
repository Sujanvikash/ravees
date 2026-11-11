import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Button from './Button.jsx';
import FormError from './FormError.jsx';
import FormField from './FormField.jsx';
import { errorProps } from './fieldError.js';
import { useToast } from '../context/ToastContext.jsx';
import { useStorefront } from '../context/StorefrontContext.jsx';
import { useCustomerAuth } from '../auth/context/CustomerAuthContext.jsx';
import { consultSchema, focusFirstError, validate } from '../lib/validation.js';
import { Input, Select, Textarea } from './Input.jsx';

const HEIGHT_OPTIONS = [
  { value: '6-7.5ft', label: '6ft – 7.5ft (Standard Living Room)' },
  { value: '9-12ft', label: '9ft – 12ft (High Ceiling / Villa)' },
  { value: 'Commercial', label: '15ft+ (Commercial / Church)' },
  { value: 'LightsDecor', label: 'Lights & Ornaments Only' },
];

/**
 * The styling consultation request (Contact page). It is sent to the shop as a "consult" enquiry, linked to
 * the customer's account when they are signed in (their details are filled in for them). `onSent` runs
 * once it is in (the page has Santa celebrate).
 */
const ConsultForm = ({ onSent }) => {
  const { showToast } = useToast();
  const { showrooms } = useStorefront();
  const { session, request } = useCustomerAuth();
  const defaultShowroom = (showrooms.find((room) => room.isFlagship) ?? showrooms[0])?.city ?? 'Online';
  const blank = () => ({
    name: session?.name ?? '',
    email: session?.email ?? '',
    phone: session?.phone ?? '',
    showroom: defaultShowroom,
    height: '6-7.5ft',
    notes: '',
  });
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  // Editing a field clears its error; the rest stay until the next submit.
  const update = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const { data, errors: found } = validate(consultSchema, form);
    if (found) {
      setErrors(found);
      focusFirstError(found, 'consult');
      return;
    }
    setErrors({});

    setSending(true);
    try {
      const height = HEIGHT_OPTIONS.find((opt) => opt.value === data.height)?.label ?? data.height;
      await request('/enquiries', {
        method: 'POST',
        body: {
          type: 'consult',
          name: data.name,
          email: data.email,
          phone: data.phone,
          message: data.notes || undefined,
          details: { showroom: data.showroom, treeHeight: height },
        },
      });
      showToast(`Thank you, ${data.name.split(' ')[0]}! Your consultation for ${data.showroom} has been requested.`);
      setForm(blank());
      onSent?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <FormField label="Your Name" htmlFor="consult-name" error={errors.name}>
          <Input
            id="consult-name"
            {...errorProps('consult-name', errors.name)}
            type="text"
            required
            placeholder="e.g. David Thomas"
            value={form.name}
            onChange={update('name')}
          />
        </FormField>
        <FormField label="Phone / WhatsApp Number" htmlFor="consult-phone" error={errors.phone}>
          <Input
            id="consult-phone"
            {...errorProps('consult-phone', errors.phone)}
            type="tel"
            required
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={update('phone')}
          />
        </FormField>
      </div>

      <FormField label="Email" htmlFor="consult-email" error={errors.email}>
        <Input
          id="consult-email"
          {...errorProps('consult-email', errors.email)}
          type="email"
          required
          placeholder="you@example.com"
          value={form.email}
          onChange={update('email')}
        />
      </FormField>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <FormField label="Preferred Showroom" htmlFor="consult-showroom">
          <Select id="consult-showroom" value={form.showroom} onChange={update('showroom')}>
            {showrooms.map((room) => (
              <option key={room.id ?? room.city} value={room.city} className="bg-bg-dark-emerald">
                {room.city}
                {room.isFlagship ? ' (Flagship)' : ''}
              </option>
            ))}
            <option value="Online" className="bg-bg-dark-emerald">
              Online Delivery Only
            </option>
          </Select>
        </FormField>
        <FormField label="Tree Height Interest" htmlFor="consult-height">
          <Select id="consult-height" value={form.height} onChange={update('height')}>
            {HEIGHT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-bg-dark-emerald">
                {opt.label}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField label="Special Requests / Notes" htmlFor="consult-notes" error={errors.notes}>
        <Textarea
          id="consult-notes"
          {...errorProps('consult-notes', errors.notes)}
          rows="3"
          placeholder="Tell us about your home layout or decor preferences..."
          value={form.notes}
          onChange={update('notes')}
        />
      </FormField>

      <FormError>{error}</FormError>

      <Button type="submit" full disabled={sending}>
        <span>{sending ? 'Sending...' : 'Submit Consultation Request'}</span>
        <ArrowRight size={18} strokeWidth={2} />
      </Button>
    </form>
  );
};

export default ConsultForm;
