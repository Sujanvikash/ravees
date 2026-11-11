import { useState } from 'react';
import { CalendarDays, Lock, Mail, MapPin, NotebookPen, Phone, Send, Store, Truck, User } from 'lucide-react';
import Button from '../Button.jsx';
import FormError from '../FormError.jsx';
import FormField from '../FormField.jsx';
import { errorProps } from '../fieldError.js';
import { Input, Select, Textarea } from '../Input.jsx';
import StepTitle from './StepTitle.jsx';
import CheckoutList from './CheckoutList.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useStorefront } from '../../context/StorefrontContext.jsx';
import { useCustomerAuth } from '../../auth/context/CustomerAuthContext.jsx';
import { checkoutSchema, focusFirstError, validate } from '../../lib/validation.js';
import { cardClass } from '../cardClass.js';

const FULFILMENT = { delivery: 'White-glove home delivery', pickup: 'Showroom pickup' };
const TIMELINES = ['As soon as possible', 'Within 2 weeks', 'Within a month', 'Before Christmas', 'Flexible'];

/**
 * Checkout for a list with a piece priced on request (or on backorder): the request form (your details,
 * delivery & requirements) and the list, as two columns of the checkout grid. Sent as a "quote-request"
 * enquiry with the items; the concierge then confirms pricing and delivery. `onSent` runs once it is in.
 */
const QuoteRequest = ({ onSent, onClearAll }) => {
  const { cart, totalCount } = useCart();
  const { showrooms } = useStorefront();
  const { session, request } = useCustomerAuth();
  const [form, setForm] = useState(() => ({
    name: session?.name ?? '',
    phone: session?.phone ?? '',
    email: session?.email ?? '',
    city: '',
    address: '',
    fulfilment: 'delivery',
    showroom: (showrooms.find((room) => room.isFlagship) ?? showrooms[0])?.city ?? '',
    timeline: TIMELINES[0],
    notes: '',
  }));
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
    const { data, errors: found } = validate(checkoutSchema, form);
    if (found) {
      setErrors(found);
      focusFirstError(found, 'co');
      return;
    }
    setErrors({});

    const pickup = data.fulfilment === 'pickup';
    setSending(true);
    try {
      await request('/enquiries', {
        method: 'POST',
        body: {
          type: 'quote-request',
          name: data.name,
          email: data.email,
          phone: data.phone,
          city: data.city,
          message: data.notes || undefined,
          details: {
            items: cart.map(({ product, quantity }) => ({
              id: product.id,
              name: product.name,
              categoryLabel: product.categoryLabel,
              quantity,
            })),
            itemCount: totalCount,
            fulfilment: FULFILMENT[data.fulfilment],
            ...(pickup ? { showroom: data.showroom } : { address: data.address }),
            timeline: data.timeline,
          },
        },
      });
      onSent();
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  const summary = [
    ['Total items', totalCount],
    ['Enquiry type', 'Quote request'],
    ['Fulfilment', FULFILMENT[form.fulfilment]],
    form.fulfilment === 'pickup' && ['Pickup showroom', form.showroom],
    ['Timeline', form.timeline],
  ].filter(Boolean);

  return (
    <>
      {/* ① and ② the request form */}
      <form onSubmit={handleSubmit} noValidate className={`${cardClass('raised')} flex flex-col gap-5 p-6 md:p-7`}>
        <StepTitle n="1" title="Your details" hint="Help us understand your requirements" />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full Name" htmlFor="co-name" required error={errors.name}>
            <Input id="co-name" {...errorProps('co-name', errors.name)} icon={User} required value={form.name} onChange={update('name')} placeholder="Your name" />
          </FormField>
          <FormField label="Phone / WhatsApp" htmlFor="co-phone" required error={errors.phone}>
            <Input id="co-phone" {...errorProps('co-phone', errors.phone)} icon={Phone} type="tel" required value={form.phone} onChange={update('phone')} placeholder="+91 98765 43210" />
          </FormField>
          <FormField label="Email" htmlFor="co-email" required error={errors.email}>
            <Input id="co-email" {...errorProps('co-email', errors.email)} icon={Mail} type="email" required value={form.email} onChange={update('email')} placeholder="you@example.com" />
          </FormField>
          <FormField label="City" htmlFor="co-city" required error={errors.city}>
            <Input id="co-city" {...errorProps('co-city', errors.city)} icon={MapPin} required value={form.city} onChange={update('city')} placeholder="Enter your city" />
          </FormField>
        </div>

        <div className="border-t border-gold-400/15 pt-5">
          <StepTitle n="2" title="Delivery & requirements" hint="Let us know how you would like to receive your order" />
        </div>
        {/* Fulfilment gets the wider share: "White-glove home delivery" is the longest value. */}
        <div className="grid gap-4 sm:grid-cols-[1.35fr_1fr]">
          <FormField label="Fulfilment Type" htmlFor="co-fulfilment" required>
            <Select id="co-fulfilment" icon={Truck} value={form.fulfilment} onChange={update('fulfilment')}>
              {Object.entries(FULFILMENT).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Preferred Timeline" htmlFor="co-timeline">
            <Select id="co-timeline" icon={CalendarDays} value={form.timeline} onChange={update('timeline')}>
              {TIMELINES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        {form.fulfilment === 'pickup' ? (
          <FormField label="Pickup Showroom" htmlFor="co-showroom" required>
            <Select id="co-showroom" icon={Store} value={form.showroom} onChange={update('showroom')}>
              {showrooms.map((room) => (
                <option key={room.id ?? room.city} value={room.city}>
                  {room.city}
                  {room.isFlagship ? ' (Flagship)' : ''}
                </option>
              ))}
            </Select>
          </FormField>
        ) : (
          <FormField label="Delivery Address" htmlFor="co-address" required error={errors.address}>
            <Textarea
              id="co-address"
              {...errorProps('co-address', errors.address)}
              icon={MapPin}
              rows="2"
              required
              value={form.address}
              onChange={update('address')}
              placeholder="House no, street, area, landmark, city, pincode..."
            />
          </FormField>
        )}

        <FormField label="Additional Notes for the Concierge" htmlFor="co-notes" error={errors.notes}>
          <Textarea
            id="co-notes"
            {...errorProps('co-notes', errors.notes)}
            icon={NotebookPen}
            rows="2"
            placeholder="Ceiling height, installation date, colour palette, special requests..."
            value={form.notes}
            onChange={update('notes')}
          />
        </FormField>

        <FormError>{error}</FormError>

        <Button type="submit" size="lg" full className="uppercase" disabled={sending}>
          <Send size={18} strokeWidth={2} />
          {sending ? 'Sending...' : 'Send Quote Request'}
        </Button>
        <p className="-mt-2 flex items-center justify-center gap-1.5 text-center text-[0.75rem] text-text-muted">
          <Lock size={13} strokeWidth={2} aria-hidden="true" />
          Your information is secure and will only be used for this enquiry.
        </p>
      </form>

      {/* ③ the list and summary */}
      <CheckoutList title={`Your list (${totalCount})`} summary={summary} onClearAll={onClearAll} />
    </>
  );
};

export default QuoteRequest;
