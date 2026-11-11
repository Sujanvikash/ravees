import { useState } from 'react';
import { ArrowRight, CheckCircle2, Headphones, PackageCheck, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import Button from '../components/Button.jsx';
import FeatureItem from '../components/FeatureItem.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Container from '../components/Container.jsx';
import PayOnline from '../components/checkout/PayOnline.jsx';
import UnavailableItems from '../components/UnavailableItems.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useSanta } from '../context/SantaContext.jsx';
import { formatPrice } from '../lib/format.js';
import Aurora from '../components/Aurora.jsx';
import Decoration from '../components/Decoration.jsx';
import { luxuryGiftBoxes } from '../assets/decorations';
import PageTitle from '../components/PageTitle.jsx';
import { sectionClass } from '../components/sectionClass.js';

// The left column's three points.
const PROMISES = [
  { Icon: ShieldCheck, text: 'Secure Payments by Razorpay' },
  { Icon: Truck, text: 'White-Glove Delivery Across India' },
  { Icon: Headphones, text: 'Dedicated Concierge Support' },
];

/** The thank-you screen after a paid order: wrapped gifts with a check, then the words. */
const Done = ({ title, children, actions }) => (
  <section className={sectionClass('centered')}>
    <Aurora />
    <div className="max-w-[560px] text-center">
      {/* Wrapped gifts, with the success check as a badge on their bottom edge. */}
      <div className="relative isolate mx-auto mb-6 h-[220px] w-[min(330px,100%)]">
        <Decoration src={luxuryGiftBoxes} fade="none" className="inset-0 overflow-hidden rounded-2xl border border-gold-400/25" />
        <CheckCircle2
          size={44}
          strokeWidth={1.5}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-bg-primary text-emerald-400"
        />
      </div>
      <PageTitle className="mb-4">{title}</PageTitle>
      {children}
      <div className="flex flex-wrap justify-center gap-3">{actions}</div>
    </div>
  </section>
);

/**
 * Checkout on the plain ivory page, in three columns: the invitation on the left, the delivery address and
 * payment in the middle and the order with its total on the right (stacking on smaller screens; PayOnline
 * draws the last two). Lines that can't be bought right now are called out, and must go before paying.
 */
const Checkout = () => {
  const { cart, unavailable, clearCart } = useCart();
  const { showToast } = useToast();
  const { celebrate } = useSanta();
  const [done, setDone] = useState(null); // { order } once paid
  const [confirmClear, setConfirmClear] = useState(false);

  const finish = (result, message, santa) => {
    celebrate(santa); // before clearCart, so Santa celebrates instead of reacting to the emptied cart
    clearCart();
    setDone(result);
    showToast(message);
    window.scrollTo({ top: 0 }); // the thank-you screen is short; the form may have been scrolled far down
  };

  if (done?.order) {
    const { order } = done;
    return (
      <Done
        title="Thank You For Your Order"
        actions={
          <>
            <Button to={`/account/orders/${order.id}`}>
              <PackageCheck size={16} strokeWidth={2} />
              View Your Order
            </Button>
            <Button variant="outline" to="/shop">
              Continue Browsing
              <ArrowRight size={16} strokeWidth={2} />
            </Button>
          </>
        }
      >
        <p className="mb-2 font-mono text-[0.85rem] uppercase tracking-[0.18em] text-gold-300">Order {order.number}</p>
        <p className="mb-8 text-[1rem] leading-[1.7] text-text-secondary">
          Your payment of {formatPrice(order.total)} is confirmed and a receipt is on its way to {order.address?.email ?? 'your email'}.
          We will let you know as soon as your order ships.
        </p>
      </Done>
    );
  }

  // Nothing that can be bought: an empty cart, or only lines that are out of stock or gone from the shop.
  if (cart.length === 0) {
    return (
      <section className={sectionClass('centered')}>
        <Aurora />
        <div className="flex w-full max-w-[480px] flex-col items-center gap-4 text-center">
          <ShoppingBag size={44} strokeWidth={1.5} className="text-gold-400/50" />
          <h1 className="font-serif text-[1.5rem] text-text-primary">
            {unavailable.length ? 'Nothing in your cart can be bought right now' : 'Your cart is empty'}
          </h1>
          <p className="text-text-secondary">Add a few pieces to your cart and they will be waiting for you here.</p>
          <UnavailableItems className="w-full text-left" />
          <Button to="/shop">Browse the Collections</Button>
        </div>
      </section>
    );
  }

  const askToClear = () => setConfirmClear(true);

  return (
    <section className="relative isolate z-20 overflow-hidden bg-bg-primary pt-4 pb-10 md:pt-6 md:pb-14">
      <Aurora />
      <Container>
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-2 xl:grid-cols-[0.72fr_1.28fr_1fr]">
          {/* The invitation, straight on the page. */}
          <div className="lg:col-span-2 xl:col-span-1 xl:pt-6">
            <span className="mb-3 flex items-center gap-3 font-mono text-[0.7rem] uppercase tracking-[0.24em] text-gold-400">
              <span aria-hidden="true" className="h-px w-5 bg-gold-400/60" />
              Secure checkout
              <span aria-hidden="true" className="h-px w-5 bg-gold-400/60" />
            </span>
            <PageTitle size="xl" className="mb-4">
              Complete Your Order
            </PageTitle>
            <p className="max-w-[26rem] text-[0.92rem] leading-[1.75] text-text-secondary">
              Tell us where to deliver, then pay securely online. We will email your order confirmation and keep you
              posted until it arrives.
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

          {/* The form and the order: two columns of this grid. */}
          <PayOnline
            onClearAll={askToClear}
            onPaid={(order) =>
              finish({ order }, `Order ${order.number} is confirmed. Thank you!`, 'Ho ho ho! Your order is on its way — Merry Christmas! 🎄')
            }
          />
        </div>
      </Container>

      <ConfirmDialog
        open={confirmClear}
        title="Clear your cart?"
        message="This removes every item from your cart. You can add them again from the collections."
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
