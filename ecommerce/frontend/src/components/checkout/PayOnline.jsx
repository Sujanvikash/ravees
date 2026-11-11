import { useState } from 'react';
import { Building2, CreditCard, Hash, Home, Lock, Mail, MapIcon, MapPin, NotebookPen, Phone, User } from 'lucide-react';
import Button from '../Button.jsx';
import FormError from '../FormError.jsx';
import FormField from '../FormField.jsx';
import { errorProps } from '../fieldError.js';
import { Input, Textarea } from '../Input.jsx';
import StepTitle from './StepTitle.jsx';
import CheckoutList from './CheckoutList.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useCustomerAuth } from '../../auth/context/CustomerAuthContext.jsx';
import { deliverySchema, focusFirstError, validate } from '../../lib/validation.js';
import { formatPrice } from '../../lib/format.js';
import { payWithRazorpay } from '../../lib/razorpay.js';
import { cardClass } from '../cardClass.js';

// The order being paid for in this tab: its id (made here, so a retry pays the same order instead of making
// a second one) and what it was made for. A changed cart or address makes a new id.
const ORDER_KEY = 'raave-checkout-order';

const newId = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  // Plain-http dev hosts (a phone on the LAN) have no randomUUID: a version 4 UUID from random bytes.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const orderIdFor = (signature) => {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(ORDER_KEY) ?? 'null');
    if (saved?.signature === signature) return saved.id;
  } catch {
    // unreadable: start a new one
  }
  const id = newId();
  try {
    window.sessionStorage.setItem(ORDER_KEY, JSON.stringify({ id, signature }));
  } catch {
    // storage unavailable: a retry makes a new order, which the server prices the same way
  }
  return id;
};

const forgetOrder = () => {
  try {
    window.sessionStorage.removeItem(ORDER_KEY);
  } catch {
    // nothing to forget
  }
};

// The brand gold for the payment window (it wants a colour value, so it is read from the theme).
const brandGold = () => getComputedStyle(document.documentElement).getPropertyValue('--color-gold-500').trim() || undefined;

const BUSY = { creating: 'Preparing your order...', paying: 'Waiting for payment...', verifying: 'Confirming your payment...' };

/**
 * Checkout for a list where every piece has a price: the delivery address and the order with its total, as
 * two columns of the checkout grid. Paying creates the order (`POST /orders`, priced by the server), opens
 * Razorpay, and confirms the payment (`POST /orders/<id>/verify`); `onPaid(order)` then shows the receipt.
 * Closing the payment window keeps the order, and "Try again" pays the same one.
 */
const PayOnline = ({ onPaid, onClearAll }) => {
  const { cart, totalCount, subtotal, delivery, total, freeDeliveryOver } = useCart();
  const { session, request } = useCustomerAuth();
  const [form, setForm] = useState(() => ({
    name: session?.name ?? '',
    phone: session?.phone ?? '',
    email: session?.email ?? '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    notes: '',
  }));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [stage, setStage] = useState('idle');
  const [tried, setTried] = useState(false);

  // Editing a field clears its error; the rest stay until the next submit.
  const update = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const { data, errors: found } = validate(deliverySchema, form);
    if (found) {
      setErrors(found);
      focusFirstError(found, 'pay');
      return;
    }
    setErrors({});

    const { notes, ...address } = data;
    const body = {
      lines: cart.map(({ product, quantity }) => ({ productId: product.id, qty: quantity })),
      address: { ...address, pincode: address.pincode.replace(/\s/g, '') },
      notes,
    };
    const id = orderIdFor(JSON.stringify(body));

    setStage('creating');
    try {
      const { order, payment } = await request('/orders', { method: 'POST', body: { id, ...body } });
      if (order.status === 'cancelled') {
        forgetOrder();
        throw new Error('That order was cancelled. Please press Pay again to place a new one.');
      }
      // Already paid (Razorpay's webhook can get there before this browser does): nothing left to pay.
      if (order.status !== 'pending' || !payment) {
        forgetOrder();
        onPaid(order);
        return;
      }

      setStage('paying');
      const paid = await payWithRazorpay(payment, { color: brandGold() });

      setStage('verifying');
      try {
        const confirmed = await request(`/orders/${order.id}/verify`, {
          method: 'POST',
          body: {
            razorpayOrderId: paid.razorpay_order_id,
            razorpayPaymentId: paid.razorpay_payment_id,
            razorpaySignature: paid.razorpay_signature,
          },
        });
        forgetOrder();
        onPaid(confirmed);
      } catch {
        // The money may well have moved: Razorpay's webhook marks the order paid on its own.
        throw new Error(
          `We couldn't confirm your payment just now. If money left your account, order ${order.number} will show as paid in My Account shortly; please don't pay again before checking.`
        );
      }
    } catch (err) {
      setError(err.message);
      setTried(true);
      setStage('idle');
    }
  };

  const busy = stage !== 'idle';
  const toFreeDelivery = delivery > 0 && freeDeliveryOver > subtotal ? freeDeliveryOver - subtotal : 0;

  return (
    <>
      {/* ① and ② the delivery form */}
      <form onSubmit={handleSubmit} noValidate className={`${cardClass('raised')} flex flex-col gap-5 p-6 md:p-7`}>
        <StepTitle n="1" title="Your details" hint="Who should we contact about this order?" />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full Name" htmlFor="pay-name" required error={errors.name} className="sm:col-span-2">
            <Input id="pay-name" {...errorProps('pay-name', errors.name)} icon={User} required autoComplete="name" value={form.name} onChange={update('name')} placeholder="Your name" />
          </FormField>
          <FormField label="Phone / WhatsApp" htmlFor="pay-phone" required error={errors.phone}>
            <Input id="pay-phone" {...errorProps('pay-phone', errors.phone)} icon={Phone} type="tel" required autoComplete="tel" value={form.phone} onChange={update('phone')} placeholder="+91 98765 43210" />
          </FormField>
          <FormField label="Email" htmlFor="pay-email" required error={errors.email}>
            <Input id="pay-email" {...errorProps('pay-email', errors.email)} icon={Mail} type="email" required autoComplete="email" value={form.email} onChange={update('email')} placeholder="you@example.com" />
          </FormField>
        </div>

        <div className="border-t border-gold-400/15 pt-5">
          <StepTitle n="2" title="Delivery address" hint="Where should we bring your order?" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="House / Flat and Street" htmlFor="pay-line1" required error={errors.line1} className="sm:col-span-2">
            <Input id="pay-line1" {...errorProps('pay-line1', errors.line1)} icon={Home} required autoComplete="address-line1" value={form.line1} onChange={update('line1')} placeholder="No. 12, Casa Major Road" />
          </FormField>
          <FormField label="Area and Landmark" htmlFor="pay-line2" error={errors.line2} className="sm:col-span-2">
            <Input id="pay-line2" {...errorProps('pay-line2', errors.line2)} icon={Building2} autoComplete="address-line2" value={form.line2} onChange={update('line2')} placeholder="Egmore, near the station (optional)" />
          </FormField>
          <FormField label="City" htmlFor="pay-city" required error={errors.city}>
            <Input id="pay-city" {...errorProps('pay-city', errors.city)} icon={MapPin} required autoComplete="address-level2" value={form.city} onChange={update('city')} placeholder="Chennai" />
          </FormField>
          <FormField label="State" htmlFor="pay-state" required error={errors.state}>
            <Input id="pay-state" {...errorProps('pay-state', errors.state)} icon={MapIcon} required autoComplete="address-level1" value={form.state} onChange={update('state')} placeholder="Tamil Nadu" />
          </FormField>
          <FormField label="Pincode" htmlFor="pay-pincode" required error={errors.pincode}>
            <Input id="pay-pincode" {...errorProps('pay-pincode', errors.pincode)} icon={Hash} required inputMode="numeric" autoComplete="postal-code" maxLength={7} value={form.pincode} onChange={update('pincode')} placeholder="600008" />
          </FormField>
        </div>

        <FormField label="Delivery Notes" htmlFor="pay-notes" error={errors.notes}>
          <Textarea
            id="pay-notes"
            {...errorProps('pay-notes', errors.notes)}
            icon={NotebookPen}
            rows="2"
            placeholder="Best time to deliver, floor and lift, installation wishes..."
            value={form.notes}
            onChange={update('notes')}
          />
        </FormField>

        <FormError>{error}</FormError>

        <Button type="submit" size="lg" full className="uppercase" disabled={busy}>
          <CreditCard size={18} strokeWidth={2} />
          {busy ? BUSY[stage] : `${tried ? 'Try Again · Pay' : 'Pay'} ${formatPrice(total)}`}
        </Button>
        <p className="-mt-2 flex items-center justify-center gap-1.5 text-center text-[0.75rem] text-text-muted">
          <Lock size={13} strokeWidth={2} aria-hidden="true" />
          Secure payment by Razorpay: UPI, cards, net banking and wallets.
        </p>
      </form>

      {/* ③ the order and its total */}
      <CheckoutList
        title={`Your order (${totalCount})`}
        showPrices
        summary={[
          ['Subtotal', formatPrice(subtotal)],
          ['Delivery', delivery > 0 ? formatPrice(delivery) : 'Free'],
        ]}
        total={['Total', formatPrice(total)]}
        note={`Prices include GST.${toFreeDelivery > 0 ? ` Add ${formatPrice(toFreeDelivery)} more for free delivery.` : ''}`}
        onClearAll={onClearAll}
      />
    </>
  );
};

export default PayOnline;
