import { Ban, Clock, FileCheck, Lock, Mail, PackageX, ShieldCheck, Truck, UserCheck, Video } from 'lucide-react';
import { EMAIL, PHONE_DISPLAY } from './site.js';
import { formatPrice } from '../lib/format.js';

// The shop's policies, one page each (pages/Policy.jsx), in the footer's order. The refund rules are the
// client's (2026-11-12): no returns and no refunds; damage in delivery is reported within 24–48 hours by email or
// WhatsApp, and an unboxing video is a must. Razorpay asks for all four pages on the site it takes payments for.
//
// Each policy: `highlights` (the three points at the top) and `sections`, whose `body` items are paragraphs
// (strings) or bulleted lists (arrays of strings), with optional `links` to the other policies after them.
// Shipping's sections are a function of the delivery settings, so its charges follow the admin's.

export const POLICIES_UPDATED = '12 November 2026';

// Who sells and invoices online orders: the default seller in the admin's Settings → Invoices.
const SELLER =
  'SIANNA COLLECTION, New No. 54, Old No. 18, Casa Major Road, Egmore, Chennai 600 008, Tamil Nadu (GSTIN 33AFUPE5958A1ZF)';

// How long orders take, in working days (Monday to Saturday, except public holidays).
const DISPATCH_DAYS = '2–3';
const DELIVERY_DAYS = '3–7';

const REFUND = { to: '/refund-policy', label: 'Refund & Cancellation Policy' };
const SHIPPING = { to: '/shipping-policy', label: 'Shipping Policy' };

/** "Delivery costs ₹500 per order, and is free on orders of ₹10,000 or more." from the admin's settings. */
const deliveryCharge = ({ deliveryFee, freeDeliveryOver }) => {
  if (!(deliveryFee > 0)) return 'Delivery is free on every order.';
  const free = freeDeliveryOver > 0 ? `, and is free on orders of ${formatPrice(freeDeliveryOver)} or more` : '';
  return `Delivery costs ${formatPrice(deliveryFee)} per order${free}.`;
};

export const POLICIES = [
  {
    path: '/refund-policy',
    label: 'Refund Policy',
    title: 'Refund & Cancellation Policy',
    intro: 'Please read this before you order. It covers every order placed and paid for on this website.',
    highlights: [
      { Icon: Ban, title: 'No returns, no refunds', text: 'Every sale is final once it is paid.' },
      { Icon: Clock, title: 'Damaged? Tell us in 24–48 hours', text: 'From delivery, by email or WhatsApp.' },
      { Icon: Video, title: 'Unboxing video is a must', text: 'No video, no damage claim.' },
    ],
    sections: [
      {
        heading: 'No returns or refunds',
        body: [
          "All sales on this website are final. Once an order is paid, we don't take products back and we don't give refunds, whether you have changed your mind, ordered the wrong size or no longer need it.",
          "Please check a product's size, height, colour and details on its page before you order. Colours can look a little different from screen to screen. If you are unsure, ask us on WhatsApp or see it in one of our stores first.",
        ],
      },
      {
        heading: 'Cancelling an order',
        body: [
          "Orders can't be cancelled once they are paid.",
          "If we can't fulfil your order, for example because a product has gone out of stock, we will cancel it, tell you by email and refund the full amount you paid, delivery included, to the way you paid. Razorpay usually returns it to your account within 5–7 working days.",
        ],
      },
      {
        heading: 'If your order arrives damaged',
        body: [
          'We pack every order with care. If something still reaches you damaged:',
          [
            `Contact us within 24–48 hours of delivery, by email at ${EMAIL} or on WhatsApp at ${PHONE_DISPLAY}.`,
            'Send your order number, a few clear photos of the damage and your unboxing video.',
            'Once we have checked them, we will replace or repair the damaged item.',
          ],
          "Claims made more than 48 hours after delivery, or without an unboxing video, can't be accepted.",
        ],
      },
      {
        heading: 'The unboxing video',
        body: [
          "An unboxing video is a must for every damage claim. Without one, we can't accept the claim.",
          [
            'Start recording before you open the package, showing the sealed package and its shipping label.',
            'Record in one unbroken take, with no cuts or pauses, until the product is fully out and any damage can be seen.',
            'Keep the packaging until we have settled your claim.',
          ],
          'If the outer package looks damaged when it arrives, photograph it before you open it and tell us straight away.',
        ],
      },
      {
        heading: 'Purchases in our stores',
        body: ["This policy covers orders on this website. Products bought in our stores follow the store's own terms."],
      },
    ],
  },
  {
    path: '/shipping-policy',
    label: 'Shipping Policy',
    title: 'Shipping Policy',
    intro: 'We deliver across India. Here is how your order reaches you.',
    highlights: [
      { Icon: Truck, title: 'Pan-India delivery', text: 'To any address in India.' },
      { Icon: Clock, title: `Ships in ${DISPATCH_DAYS} working days`, text: 'From the day you pay.' },
      { Icon: Mail, title: 'Updates by email', text: 'When your order is paid, shipped and delivered.' },
    ],
    sections: (settings) => [
      {
        heading: 'Where we deliver',
        body: [
          "We deliver to addresses across India. We don't ship outside India at the moment.",
          "Products marked Store Exclusive are sold only in our stores, so they can't be delivered.",
        ],
      },
      {
        heading: 'Delivery charges',
        body: [`${deliveryCharge(settings)} The charge is shown in your cart and at checkout, before you pay.`],
      },
      {
        heading: 'When your order arrives',
        body: [
          [
            `Orders are packed and handed to our delivery partner within ${DISPATCH_DAYS} working days of payment.`,
            `Delivery then usually takes ${DELIVERY_DAYS} working days, depending on where you are. Remote areas can take longer.`,
            'Working days are Monday to Saturday, except public holidays.',
          ],
          'In the weeks before Christmas, and during strikes, bad weather or other events outside our control, delivery can take longer. We will keep you posted.',
        ],
      },
      {
        heading: 'Following your order',
        body: [
          'We email you when your order is paid (with your tax invoice), when it is shipped and when it is delivered. You can see its progress at any time in My Account, under your orders.',
        ],
      },
      {
        heading: 'Receiving your order',
        body: [
          [
            "Please give a full, correct address, pincode and phone number. We can't be responsible for delays or losses caused by a wrong address.",
            'Someone should be there to receive the order. Our delivery partner may call the phone number on the order.',
            'Record a video as you open the package: we need it for any damage claim.',
          ],
        ],
        links: [REFUND],
      },
    ],
  },
  {
    path: '/terms',
    label: 'Terms & Conditions',
    title: 'Terms & Conditions',
    intro: 'These terms apply when you use this website or buy from it. By placing an order, you agree to them.',
    highlights: [
      { Icon: FileCheck, title: 'GST invoice with every order', text: 'Emailed to you and kept in your account.' },
      { Icon: ShieldCheck, title: 'Secure payment by Razorpay', text: 'UPI, cards, net banking and wallets.' },
      { Icon: PackageX, title: 'All sales are final', text: 'See the Refund & Cancellation Policy.' },
    ],
    sections: [
      {
        heading: 'Who we are',
        body: [
          `This website is run under the Raave's Evergreen brand. Orders placed on it are sold and invoiced by ${SELLER}.`,
        ],
      },
      {
        heading: 'Your account',
        body: [
          'You need an account to order. Please give true details and keep your password to yourself: you are responsible for orders placed from your account.',
        ],
      },
      {
        heading: 'Products and prices',
        body: [
          [
            'Prices are in Indian rupees and include GST. The delivery charge, if any, is shown before you pay.',
            'Photos show each product as closely as we can, but the real colour and finish can look a little different. Sizes and heights are approximate.',
            'Products marked Store Exclusive are sold only in our stores.',
            'If a product is shown with a wrong price or description by mistake, we may cancel its order and refund it in full.',
          ],
        ],
      },
      {
        heading: 'Orders and payment',
        body: [
          [
            'Your order is confirmed once it is paid.',
            'Payments are handled by Razorpay. We never see or store your card, UPI or bank details.',
            'Your GST tax invoice is emailed to you and kept in My Account.',
            "If we can't fulfil an order, we cancel it and refund the full amount you paid.",
          ],
        ],
      },
      {
        heading: 'Delivery, returns and refunds',
        body: [
          'Delivery is covered by our Shipping Policy. All sales are final, with no returns or refunds; damage in delivery is covered by our Refund & Cancellation Policy.',
        ],
        links: [SHIPPING, REFUND],
      },
      {
        heading: 'Our content',
        body: [
          "The words, photos, logo and designs on this website belong to Raave's Evergreen. Please don't copy or reuse them without our written permission.",
        ],
      },
      {
        heading: 'Our responsibility',
        body: [
          "We aren't responsible for delays or losses caused by events outside our control. Our responsibility for any order is limited to the amount paid for it.",
        ],
      },
      {
        heading: 'Law and disputes',
        body: ['These terms are governed by the laws of India. Any dispute is subject to the courts in Chennai.'],
      },
      {
        heading: 'Changes to these terms',
        body: [
          'We may update these terms from time to time. The terms on this page when you place an order apply to that order.',
        ],
      },
    ],
  },
  {
    path: '/privacy-policy',
    label: 'Privacy Policy',
    title: 'Privacy Policy',
    intro: 'We collect only what we need to take and deliver your orders, and we never sell it.',
    highlights: [
      { Icon: UserCheck, title: 'Only what we need', text: 'To take, deliver and invoice your orders.' },
      { Icon: Lock, title: 'No card details kept', text: "Payments happen on Razorpay's secure page." },
      { Icon: Ban, title: 'Never sold', text: 'We never sell or rent your details.' },
    ],
    sections: [
      {
        heading: 'What we collect',
        body: [
          [
            'Your name, email address and phone number, when you create an account.',
            'Your delivery address and any delivery notes, when you order.',
            'Your orders and their invoices.',
            'What you write to us through the contact form, by email or on WhatsApp.',
          ],
          "We don't see or store your card, UPI or bank details: you pay on Razorpay's secure page.",
        ],
      },
      {
        heading: 'How we use it',
        body: [
          [
            'To process, deliver and invoice your orders.',
            'To email you about your order: its payment, shipping, delivery or cancellation.',
            'To answer your questions and look into damage claims.',
            'To reset your password when you ask.',
            'To keep the tax and accounting records the law requires.',
          ],
          "We don't send you marketing messages unless you ask for them.",
        ],
      },
      {
        heading: 'Who we share it with',
        body: [
          'Only what each of them needs:',
          [
            'Razorpay, to take your payment.',
            'Our delivery partners: your name, phone number and address, to deliver your order.',
            'Our email service, to send your order emails.',
            'Government authorities, when the law requires it.',
          ],
          'We never sell or rent your details.',
        ],
      },
      {
        heading: 'Kept on your device',
        body: [
          "The website keeps your cart, wishlist and sign-in in your own browser, so they are still there when you come back. We don't use advertising cookies or trackers.",
        ],
      },
      {
        heading: 'Keeping it safe',
        body: [
          'Your password is stored in a form that no one can read, not even us, and the website always uses a secure (HTTPS) connection. Only our team can see your details.',
        ],
      },
      {
        heading: 'How long we keep it',
        body: [
          'We keep your account until you ask us to delete it. Orders and invoices are kept for as long as tax law requires.',
        ],
      },
      {
        heading: 'Your choices',
        body: [
          `You can see and update your details in My Account. To have your account deleted, or for any question about your data, email us at ${EMAIL}.`,
        ],
      },
    ],
  },
];
