import { RotateCw } from 'lucide-react';
import Button from './Button.jsx';
import Eyebrow from './Eyebrow.jsx';
import PageBackdrop from './PageBackdrop.jsx';
import PageLoader from './PageLoader.jsx';
import PageTitle from './PageTitle.jsx';
import WhatsAppLink from './WhatsAppLink.jsx';
import { pineCrateBaubles } from '../assets/decorations';
import { useStorefront } from '../context/StorefrontContext.jsx';

/**
 * Shows the page once the storefront data is in (at once on a return visit: the saved copy is used).
 * On a first visit it shows the loader meanwhile, and if the shop's server can't be reached, a calm
 * message with a retry and the WhatsApp line instead.
 */
const StorefrontGate = ({ children }) => {
  const { ready, loading, error, retry } = useStorefront();

  if (ready) return children;
  if (loading || !error) return <PageLoader label="Unwrapping the collection" />;

  return (
    // Like the 404 page: the dark festive photo shown as it is, the message on a solid panel over it.
    <section className="theme-dark relative isolate z-20 flex min-h-[70vh] items-center justify-center overflow-hidden bg-bg-primary px-6 py-16">
      <PageBackdrop src={pineCrateBaubles} align="center" />
      <div
        role="alert"
        className="max-w-[560px] rounded-2xl border border-gold-400/30 bg-surface px-6 py-9 text-center shadow-[0_24px_60px_--alpha(var(--color-shadow)/60%)] sm:px-10"
      >
        <Eyebrow>✦ One moment ✦</Eyebrow>
        <PageTitle className="mb-4">The Shop Is Taking A Breather</PageTitle>
        <p className="mb-8 text-[1rem] leading-[1.7] text-text-secondary">
          We couldn&apos;t load the collection just now. Please check your connection and try again; our concierge
          is also happy to help on WhatsApp.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={retry}>
            <RotateCw size={16} strokeWidth={2} />
            Try Again
          </Button>
          <WhatsAppLink
            iconSize={17}
            className="inline-flex items-center justify-center gap-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/12 px-6 py-3 text-[0.88rem] font-semibold text-emerald-300 no-underline transition-all duration-300 hover:bg-emerald-500/25"
          >
            WhatsApp Us
          </WhatsAppLink>
        </div>
      </div>
    </section>
  );
};

export default StorefrontGate;
