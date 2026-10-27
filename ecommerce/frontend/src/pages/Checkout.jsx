import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileText,
  Headphones,
  Lock,
  Mail,
  MapPin,
  NotebookPen,
  Phone,
  Plus,
  Send,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
  User,
} from 'lucide-react';
import Button from '../components/Button.jsx';
import FormField from '../components/FormField.jsx';
import { errorProps } from '../components/fieldError.js';
import FeatureItem from '../components/FeatureItem.jsx';
import QuantityStepper from '../components/QuantityStepper.jsx';
import IconButton from '../components/IconButton.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import PageBackdrop from '../components/PageBackdrop.jsx';
import Container from '../components/Container.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useCustomerAuth } from '../auth/context/CustomerAuthContext.jsx';
import { useSanta } from '../context/SantaContext.jsx';
import { addEnquiry } from '../lib/enquiries.js';
import { checkoutSchema, focusFirstError, validate } from '../lib/validation.js';
import { SHOWROOMS } from '../data/showrooms.js';
import { Input, Select, Textarea } from '../components/Input.jsx';
import Aurora from '../components/Aurora.jsx';
import Decoration from '../components/Decoration.jsx';
import { luxuryGiftBoxes } from '../assets/decorations';
import { checkoutBg } from '../assets/backgrounds';
import PageTitle from '../components/PageTitle.jsx';
import { cardClass } from '../components/cardClass.js';
import { sectionClass } from '../components/sectionClass.js';

const PROMISES = [
  { Icon: Headphones, text: 'Dedicated Concierge Support' },
  { Icon: FileText, text: 'Best Pricing & Bulk Options' },
  { Icon: Truck, text: 'Fast Response (Within 24 Hours)' },
];

const FULFILMENT = { delivery: 'White-glove home delivery', pickup: 'Showroom pickup' };
const TIMELINES = ['As soon as possible', 'Within 2 weeks', 'Within a month', 'Before Christmas', 'Flexible'];

/** ① YOUR DETAILS: a numbered step heading with a one-line hint. */
const StepTitle = ({ n, title, hint, action }) => (
  <div className="flex items-start justify-between gap-3">
    <div className="flex items-start gap-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold-400 font-sans text-[1.05rem] font-bold text-on-gold">
        {n}
      </span>
      <div>
        <h2 className="font-serif text-[1.15rem] font-semibold leading-tight tracking-[0.04em] text-white uppercase">{title}</h2>
        {hint && <p className="mt-0.5 text-[0.8rem] text-text-secondary">{hint}</p>}
      </div>
    </div>
    {action}
  </div>
);

/**
 * Checkout (quote request) over the festive backdrop, in three columns: the invitation on the left, the
 * request form (your details, delivery & requirements) in the middle, and the list with quantities and an
 * order summary on the right. Stacks on smaller screens.
 */
const Checkout = () => {
  const { cart, totalCount, clearCart, updateQuantity, removeFromCart } = useCart();
  const { showToast } = useToast();
  const { session } = useCustomerAuth();
  const { celebrate } = useSanta();
  const [submitted, setSubmitted] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [form, setForm] = useState({
    name: session?.name ?? '',
    phone: session?.phone ?? '',
    email: session?.email ?? '',
    city: '',
    address: '',
    fulfilment: 'delivery',
    showroom: 'Chennai',
    timeline: TIMELINES[0],
    notes: '',
  });
  const [errors, setErrors] = useState({});

  // Editing a field clears its error; the rest stay until the next submit.
  const update = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { data, errors: found } = validate(checkoutSchema, form);
    if (found) {
      setErrors(found);
      focusFirstError(found, 'co');
      return;
    }
    addEnquiry({
      type: 'quote-request',
      customerEmail: session?.email ?? null,
      ...data,
      items: cart.map(({ product, quantity }) => ({
        id: product.id,
        name: product.name,
        categoryLabel: product.categoryLabel,
        quantity,
      })),
      itemCount: totalCount,
    });
    celebrate(); // before clearCart, so Santa celebrates instead of reacting to the emptied cart
    clearCart();
    setSubmitted(true);
    showToast('Quote request received — our concierge will be in touch.');
  };

  if (submitted) {
    return (
      <section className={sectionClass('centered')}>
        <Aurora />
        <div className="max-w-[560px] text-center">
          {/* Wrapped gifts, with the success check as a badge on their bottom edge. */}
          <div className="relative isolate mx-auto mb-6 h-[220px] w-[min(330px,100%)]">
            <Decoration src={luxuryGiftBoxes} className="inset-0" />
            <CheckCircle2
              size={44}
              strokeWidth={1.5}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-bg-primary text-emerald-400"
            />
          </div>
          <PageTitle className="mb-4">Your Request Is In</PageTitle>
          <p className="mb-8 text-[1rem] leading-[1.7] text-text-secondary">
            Thank you! Our holiday concierge will contact you on WhatsApp or phone to confirm pricing,
            availability and your white-glove delivery schedule.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button to="/shop">
              Continue Browsing
              <ArrowRight size={16} strokeWidth={2} />
            </Button>
            <Button variant="outline" to="/">
              Back Home
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (cart.length === 0) {
    return (
      <section className={sectionClass('centered')}>
        <Aurora />
        <div className="flex max-w-[480px] flex-col items-center gap-4 text-center">
          <ShoppingBag size={44} strokeWidth={1.5} className="text-gold-400/50" />
          <h1 className="font-serif text-[1.5rem] text-white">Nothing to quote yet</h1>
          <p className="text-text-secondary">Add a few pieces to your cart and we&apos;ll price them up for you.</p>
          <Button to="/shop">Browse the Collections</Button>
        </div>
      </section>
    );
  }

  const summary = [
    ['Total items', totalCount],
    ['Enquiry type', 'Quote request'],
    ['Fulfilment', FULFILMENT[form.fulfilment]],
    form.fulfilment === 'pickup' && ['Pickup showroom', form.showroom],
    ['Timeline', form.timeline],
  ].filter(Boolean);

  return (
    <section className="relative isolate z-20 overflow-hidden bg-bg-primary pt-4 pb-10 md:pt-6 md:pb-14">
      <PageBackdrop src={checkoutBg} fade="frame" align="center" />
      <Container>
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-2 xl:grid-cols-[0.72fr_1.28fr_1fr]">
          {/* The invitation, straight on the backdrop. */}
          <div className="lg:col-span-2 xl:col-span-1 xl:pt-6">
            <span className="mb-3 flex items-center gap-3 font-mono text-[0.7rem] uppercase tracking-[0.24em] text-gold-400">
              <span aria-hidden="true" className="h-px w-5 bg-gold-400/60" />
              Concierge quote request
              <span aria-hidden="true" className="h-px w-5 bg-gold-400/60" />
            </span>
            <PageTitle size="xl" className="mb-4 [text-shadow:0_2px_16px_--alpha(var(--color-black)/70%)]">
              Request Your Final Quote
            </PageTitle>
            <p className="max-w-[26rem] text-[0.92rem] leading-[1.75] text-text-secondary">
              Share your requirements and our team will get back to you with the best pricing, availability, and
              delivery options.
            </p>

            <div className="mt-6 flex flex-col gap-4 border-t border-gold-400/15 pt-6 sm:flex-row sm:flex-wrap xl:flex-col">
              {PROMISES.map(({ Icon, text }) => (
                <FeatureItem key={text} variant="point" Icon={Icon} title={text} className="sm:min-w-[14rem]" />
              ))}
            </div>

            <figure className="mt-8 hidden max-w-[17rem] text-center xl:block">
              <div aria-hidden="true" className="flex items-center gap-3 text-gold-400">
                <span className="h-px flex-1 bg-gold-400/40" />★<span className="h-px flex-1 bg-gold-400/40" />
              </div>
              <blockquote className="my-3 font-quote text-[1.2rem] italic leading-[1.45] text-gold-200">
                &ldquo;Bringing the magic of Christmas to every celebration.&rdquo;
              </blockquote>
              <div aria-hidden="true" className="flex items-center gap-3 text-gold-400">
                <span className="h-px flex-1 bg-gold-400/40" />✦<span className="h-px flex-1 bg-gold-400/40" />
              </div>
            </figure>
          </div>

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
                  {SHOWROOMS.map((room) => (
                    <option key={room.city} value={room.city}>
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

            <Button type="submit" size="lg" full className="uppercase">
              <Send size={18} strokeWidth={2} />
              Send Quote Request
            </Button>
            <p className="-mt-2 flex items-center justify-center gap-1.5 text-center text-[0.75rem] text-text-muted">
              <Lock size={13} strokeWidth={2} aria-hidden="true" />
              Your information is secure and will only be used for this enquiry.
            </p>
          </form>

          {/* ③ the list and summary */}
          <aside className={`${cardClass('raised')} flex flex-col gap-5 p-6 md:p-7`}>
            <StepTitle
              n="3"
              title={`Your list (${totalCount})`}
              action={
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-[0.85rem] text-gold-300 transition-colors hover:text-white"
                >
                  <Trash2 size={16} strokeWidth={1.8} />
                  Clear All
                </button>
              }
            />

            <ul data-lenis-prevent className="-mr-2 flex max-h-[430px] flex-col overflow-y-auto pr-2">
              {cart.map(({ product, quantity }) => (
                <li key={product.id} className="flex items-center gap-3 border-b border-white/6 py-3 first:pt-0 last:border-0">
                  <Link to={`/product/${product.id}`} className="size-14 shrink-0 overflow-hidden rounded-lg border border-gold-400/20 bg-bg-deepest">
                    <img src={product.image} alt={product.name} className="size-full object-cover" />
                  </Link>
                  {/* Phones put the quantity under the name, so the name keeps the row's width. */}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[0.88rem] font-medium leading-snug text-white sm:truncate">{product.name}</p>
                    <span className="text-[0.74rem] text-text-muted">{product.categoryLabel}</span>
                    <div className="mt-1.5 sm:hidden">
                      <QuantityStepper size="sm" value={quantity} onChange={(q) => updateQuantity(product.id, q)} />
                    </div>
                  </div>
                  <div className="hidden sm:block">
                    <QuantityStepper size="sm" value={quantity} onChange={(q) => updateQuantity(product.id, q)} />
                  </div>
                  <IconButton label={`Remove ${product.name}`} variant="remove" onClick={() => removeFromCart(product.id)} className="p-1.5 text-gold-300">
                    <Trash2 size={17} strokeWidth={1.8} />
                  </IconButton>
                </li>
              ))}
            </ul>

            <Link
              to="/shop"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gold-400/30 px-4 py-3 font-mono text-[0.78rem] font-bold uppercase tracking-[0.12em] text-gold-300 no-underline transition-all hover:border-gold-400 hover:bg-gold-400/10 hover:text-white"
            >
              <Plus size={16} strokeWidth={2} />
              Add more products
            </Link>

            <div className="border-t border-gold-400/15 pt-5">
              <h3 className="mb-3 flex items-center gap-2.5 font-serif text-[1.05rem] font-semibold tracking-[0.04em] text-gold-200 uppercase">
                <FileText size={20} strokeWidth={1.5} className="text-gold-400" aria-hidden="true" />
                Order summary
              </h3>
              <dl className="flex flex-col">
                {summary.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 border-b border-white/6 py-2 text-[0.85rem] last:border-0">
                    <dt className="text-text-muted">{label}</dt>
                    <dd className="text-right text-text-primary">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
        </div>
      </Container>

      <ConfirmDialog
        open={confirmClear}
        title="Clear your list?"
        message="This removes every item from your quote list. You can add them again from the collections."
        confirmLabel="Clear all"
        onConfirm={() => {
          clearCart();
          setConfirmClear(false);
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </section>
  );
};

export default Checkout;
