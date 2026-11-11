import { RotateCw } from 'lucide-react';
import Aurora from './Aurora.jsx';
import Button from './Button.jsx';
import Eyebrow from './Eyebrow.jsx';
import PageLoader from './PageLoader.jsx';
import PageTitle from './PageTitle.jsx';
import WhatsAppLink from './WhatsAppLink.jsx';
import Decoration from './Decoration.jsx';
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
    <section className="relative z-20 flex min-h-[70vh] items-center justify-center overflow-hidden bg-bg-primary px-6 py-16">
      <Aurora />
      <Decoration
        src={pineCrateBaubles}
        opacity={0.25}
        className="top-1/2 left-1/2 h-[min(560px,85%)] w-[min(820px,100%)] -translate-x-1/2 -translate-y-1/2"
      />
      <div role="alert" className="max-w-[520px] text-center">
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
