import { Home, Store } from 'lucide-react';
import Button from '../components/Button.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import HangingBauble from '../components/HangingBauble.jsx';
import PageTitle from '../components/PageTitle.jsx';

const NotFound = () => {
  return (
    <section className="relative isolate z-20 flex min-h-[70vh] items-center justify-center overflow-hidden bg-bg-primary px-6 py-16">
      {/* Two baubles still hanging either side of the message: the one that "wandered off" is missing. */}
      <HangingBauble side="hidden md:block" className="left-[14%]" width={76} drop={90} />
      <HangingBauble side="hidden md:block" className="right-[14%]" width={60} drop={40} delay={2.5} />
      <div className="max-w-[560px] rounded-2xl border border-gold-400/30 bg-surface px-6 py-9 text-center shadow-[0_24px_60px_--alpha(var(--color-shadow)/25%)] sm:px-10">
        <Eyebrow>
          ✦ 404 ✦
        </Eyebrow>
        <PageTitle className="mb-4">
          This Ornament Wandered Off
        </PageTitle>
        <p className="mb-8 text-[1rem] leading-[1.7] text-text-secondary">
          The page you were looking for isn&apos;t here. Let&apos;s get you back to the collections.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button to="/">
            <Home size={16} strokeWidth={2} />
            Back Home
          </Button>
          <Button variant="outline" to="/shop">
            <Store size={16} strokeWidth={2} />
            Browse Collections
          </Button>
        </div>
      </div>
    </section>
  );
};

export default NotFound;
