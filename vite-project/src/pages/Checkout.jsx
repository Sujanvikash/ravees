import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, ShoppingBag } from 'lucide-react';
import Button from '../components/Button.jsx';
import FormField from '../components/FormField.jsx';
import { GRADIENT_TITLE } from '../components/SectionHeading.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useCustomerAuth } from '../auth/context/CustomerAuthContext.jsx';
import { addEnquiry } from '../lib/enquiries.js';
import { SHOWROOMS } from '../data/showrooms.js';

const FIELD =
  'rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 font-sans text-[0.88rem] text-white outline-none transition-all focus:border-gold-400 focus:shadow-[0_0_10px_rgba(229,199,139,0.4)] placeholder:text-text-muted';

export default function Checkout() {
  const { cart, totalCount, clearCart } = useCart();
  const { showToast } = useToast();
  const { session } = useCustomerAuth();
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
    clearCart();
    setSubmitted(true);
    showToast('Quote request received — our concierge will be in touch.');
  };

  if (submitted) {
    return (
      <section className="relative z-20 flex min-h-[60vh] items-center justify-center bg-bg-primary px-6 py-25">
        <div className="max-w-[560px] text-center">
          <CheckCircle2 size={56} strokeWidth={1.5} className="mx-auto mb-5 text-emerald-400" />
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
        <div className="flex max-w-[480px] flex-col items-center gap-4 text-center">
          <ShoppingBag size={44} strokeWidth={1.5} className="text-gold-400/50" />
          <h1 className="font-serif text-[1.5rem] text-white">Nothing to quote yet</h1>
          <p className="text-text-secondary">
            Add a few pieces to your enquiry list and we&apos;ll price them up for you.
          </p>
          <Button to="/shop">Browse the Collections</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative z-20 bg-bg-primary py-16 md:py-25">
      <div className="mx-auto max-w-[1100px] px-6">
        <span className="mb-3 inline-block font-mono text-[0.72rem] uppercase tracking-[0.28em] text-gold-400">
          ✦ CONCIERGE QUOTE REQUEST ✦
        </span>
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
                <input id="co-name" required value={form.name} onChange={update('name')} className={FIELD} />
              </FormField>
              <FormField label="Phone / WhatsApp" htmlFor="co-phone">
                <input
                  id="co-phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={update('phone')}
                  className={FIELD}
                />
              </FormField>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <FormField label="Email" htmlFor="co-email">
                <input
                  id="co-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={update('email')}
                  className={FIELD}
                />
              </FormField>
              <FormField label="City" htmlFor="co-city">
                <input id="co-city" required value={form.city} onChange={update('city')} className={FIELD} />
              </FormField>
            </div>

            <FormField label="Fulfilment" htmlFor="co-fulfilment">
              <select
                id="co-fulfilment"
                value={form.fulfilment}
                onChange={update('fulfilment')}
                className={`${FIELD} cursor-pointer`}
              >
                <option value="delivery" className="bg-bg-dark-emerald">
                  White-glove home delivery
                </option>
                <option value="pickup" className="bg-bg-dark-emerald">
                  Showroom pickup
                </option>
              </select>
            </FormField>

            {form.fulfilment === 'pickup' ? (
              <FormField label="Pickup Showroom" htmlFor="co-showroom">
                <select
                  id="co-showroom"
                  value={form.showroom}
                  onChange={update('showroom')}
                  className={`${FIELD} cursor-pointer`}
                >
                  {SHOWROOMS.map((room) => (
                    <option key={room.city} value={room.city} className="bg-bg-dark-emerald">
                      {room.city}
                      {room.isFlagship ? ' (Flagship)' : ''}
                    </option>
                  ))}
                </select>
              </FormField>
            ) : (
              <FormField label="Delivery Address" htmlFor="co-address">
                <textarea
                  id="co-address"
                  rows="3"
                  required
                  value={form.address}
                  onChange={update('address')}
                  className={`${FIELD} resize-y`}
                />
              </FormField>
            )}

            <FormField label="Notes for the concierge" htmlFor="co-notes">
              <textarea
                id="co-notes"
                rows="3"
                placeholder="Ceiling height, installation date, colour palette..."
                value={form.notes}
                onChange={update('notes')}
                className={`${FIELD} resize-y`}
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
}
