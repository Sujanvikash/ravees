import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, ShoppingBag } from 'lucide-react';
import Button from '../components/Button.jsx';
import FormField from '../components/FormField.jsx';
import { GRADIENT_TITLE } from '../components/SectionHeading.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useCustomerAuth } from '../auth/context/CustomerAuthContext.jsx';
import { useSanta } from '../context/SantaContext.jsx';
import { addEnquiry } from '../lib/enquiries.js';
import { SHOWROOMS } from '../data/showrooms.js';
import Eyebrow from '../components/Eyebrow.jsx';
import { Input, Select, Textarea } from '../components/Input.jsx';
import Aurora from '../components/Aurora.jsx';
import Decoration from '../components/Decoration.jsx';
import { luxuryGiftBoxes } from '../assets/decorations';

const Checkout = () => {
  const { cart, totalCount, clearCart } = useCart();
  const { showToast } = useToast();
  const { session } = useCustomerAuth();
  const { celebrate } = useSanta();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: session?.name ?? '',
    phone: session?.phone ?? '',
    email: session?.email ?? '',
    city: '',
    address: '',
    fulfilment: 'delivery',
    showroom: 'Chennai',
    notes: '',
  });

  const update = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    addEnquiry({
      type: 'quote-request',
      customerEmail: session?.email ?? null,
      ...form,
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
      <section className="relative z-20 flex min-h-[60vh] items-center justify-center bg-bg-primary px-6 py-25">
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
          <h1 className={`mb-4 font-serif text-[2rem] font-bold leading-[1.2] ${GRADIENT_TITLE}`}>
            Your Request Is In
          </h1>
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
      <section className="relative z-20 flex min-h-[60vh] items-center justify-center bg-bg-primary px-6 py-25">
        <Aurora />
        <div className="flex max-w-[480px] flex-col items-center gap-4 text-center">
          <ShoppingBag size={44} strokeWidth={1.5} className="text-gold-400/50" />
          <h1 className="font-serif text-[1.5rem] text-white">Nothing to quote yet</h1>
          <p className="text-text-secondary">
            Add a few pieces to your cart and we&apos;ll price them up for you.
          </p>
          <Button to="/shop">Browse the Collections</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative z-20 bg-bg-primary py-16 md:py-25">
      <Aurora />
      <div className="mx-auto max-w-[1100px] px-6">
        <Eyebrow>
          ✦ CONCIERGE QUOTE REQUEST ✦
        </Eyebrow>
        <h1 className={`mb-8 font-serif text-[2rem] font-bold leading-[1.2] tracking-[0.04em] sm:text-[2.4rem] ${GRADIENT_TITLE}`}>
          Request Your Final Quote
        </h1>

        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-2xl border border-gold-400/20 bg-[rgba(8,28,20,0.85)] p-6 md:p-8"
          >
            <div className="grid gap-3.5 sm:grid-cols-2">
              <FormField label="Full Name" htmlFor="co-name">
                <Input id="co-name" required value={form.name} onChange={update('name')} />
              </FormField>
              <FormField label="Phone / WhatsApp" htmlFor="co-phone">
                <Input
                  id="co-phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={update('phone')}
                />
              </FormField>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <FormField label="Email" htmlFor="co-email">
                <Input
                  id="co-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={update('email')}
                />
              </FormField>
              <FormField label="City" htmlFor="co-city">
                <Input id="co-city" required value={form.city} onChange={update('city')} />
              </FormField>
            </div>

            <FormField label="Fulfilment" htmlFor="co-fulfilment">
              <Select
                id="co-fulfilment"
                value={form.fulfilment}
                onChange={update('fulfilment')}
              >
                <option value="delivery" className="bg-bg-dark-emerald">
                  White-glove home delivery
                </option>
                <option value="pickup" className="bg-bg-dark-emerald">
                  Showroom pickup
                </option>
              </Select>
            </FormField>

            {form.fulfilment === 'pickup' ? (
              <FormField label="Pickup Showroom" htmlFor="co-showroom">
                <Select
                  id="co-showroom"
                  value={form.showroom}
                  onChange={update('showroom')}
                >
                  {SHOWROOMS.map((room) => (
                    <option key={room.city} value={room.city} className="bg-bg-dark-emerald">
                      {room.city}
                      {room.isFlagship ? ' (Flagship)' : ''}
                    </option>
                  ))}
                </Select>
              </FormField>
            ) : (
              <FormField label="Delivery Address" htmlFor="co-address">
                <Textarea
                  id="co-address"
                  rows="3"
                  required
                  value={form.address}
                  onChange={update('address')}
                />
              </FormField>
            )}

            <FormField label="Notes for the concierge" htmlFor="co-notes">
              <Textarea
                id="co-notes"
                rows="3"
                placeholder="Ceiling height, installation date, colour palette..."
                value={form.notes}
                onChange={update('notes')}
              />
            </FormField>

            <Button type="submit" full>
              Submit Quote Request
              <ArrowRight size={18} strokeWidth={2} />
            </Button>
            <p className="text-center text-[0.75rem] text-text-muted">
              No payment is taken here — pricing is confirmed by our concierge first.
            </p>
          </form>

          <aside className="h-fit rounded-2xl border border-gold-400/20 bg-[#04120a] p-6">
            <h2 className="mb-4 font-serif text-[1.1rem] text-white">Your list ({totalCount})</h2>
            <div className="flex flex-col gap-3">
              {cart.map(({ product, quantity }) => (
                <div key={product.id} className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gold-400/20 bg-[#020805]">
                    <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.85rem] text-white">{product.name}</p>
                    <span className="text-[0.75rem] text-text-muted">Qty {quantity}</span>
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/cart"
              className="mt-5 inline-block text-[0.82rem] text-gold-300 underline-offset-4 hover:underline"
            >
              Edit list
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default Checkout;
