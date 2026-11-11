import WhatsAppLink from './WhatsAppLink.jsx';

/**
 * The round WhatsApp button fixed to the bottom-left corner of every storefront page (Santa has the
 * bottom-right). It opens a chat with the store, with a greeting already typed.
 */
const WhatsAppFloat = () => (
  <WhatsAppLink
    text="Hello Raave's, I have a question about your Christmas collection."
    iconSize={26}
    aria-label="Chat with us on WhatsApp"
    title="Chat with us on WhatsApp"
    className="fixed bottom-5 left-5 z-[90] flex size-13 items-center justify-center rounded-full bg-whatsapp text-white shadow-[0_10px_26px_--alpha(var(--color-shadow)/45%)] transition-transform duration-300 ease-spring hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
  />
);

export default WhatsAppFloat;
