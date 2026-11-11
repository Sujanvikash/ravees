/**
 * Razorpay Checkout: the payment window for an order the shop API created (`POST /orders` answers its
 * `payment`). The script is loaded the first time someone pays, once per visit.
 */
const SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

let loading = null;

const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error('missing')));
    script.onerror = () => reject(new Error('blocked'));
    document.body.appendChild(script);
  }).catch(() => {
    loading = null; // let the next attempt load it again
    throw new Error("We couldn't open the secure payment window. Please check your connection (or ad blocker) and try again.");
  });
  return loading;
};

/**
 * Opens the payment window for `payment` ({ keyId, razorpayOrderId, amount, currency, name, description,
 * prefill }). Resolves with Razorpay's answer ({ razorpay_order_id, razorpay_payment_id, razorpay_signature })
 * once paid; rejects with an error marked `dismissed: true` when the person closes the window without paying.
 * `color` tints the window (the brand gold).
 */
export const payWithRazorpay = async (payment, { color } = {}) => {
  const Razorpay = await loadRazorpay();
  return new Promise((resolve, reject) => {
    let failure = '';
    const checkout = new Razorpay({
      key: payment.keyId,
      order_id: payment.razorpayOrderId,
      amount: payment.amount,
      currency: payment.currency,
      name: payment.name,
      description: payment.description,
      prefill: payment.prefill,
      theme: color ? { color } : undefined,
      handler: resolve,
      modal: {
        // Closed without paying; after a declined card, say why.
        ondismiss: () =>
          reject(
            Object.assign(
              new Error(
                failure
                  ? `The payment didn't go through (${failure}). Your order is saved, so you can try again.`
                  : "The payment wasn't completed. Your order is saved, so you can try again whenever you're ready."
              ),
              { dismissed: true }
            )
          ),
      },
    });
    // Razorpay lets the person retry inside the window after a failure; remember why for the message above.
    checkout.on('payment.failed', (res) => {
      failure = res?.error?.description ?? '';
    });
    checkout.open();
  });
};
