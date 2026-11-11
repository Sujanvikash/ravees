import { Home, Store } from 'lucide-react';
import Button from '../components/Button.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import PageBackdrop from '../components/PageBackdrop.jsx';
import { baublesScatter } from '../assets/decorations';
import PageTitle from '../components/PageTitle.jsx';

const NotFound = () => {
  return (
    <section className="theme-dark relative isolate z-20 flex min-h-[70vh] items-center justify-center overflow-hidden bg-bg-primary px-6 py-16">
      {/* Scattered ornaments behind the message (the ones that "wandered off"), shown as they are; the
          message sits on a solid panel, since the photo is busy all over. */}
      <PageBackdrop src={baublesScatter} align="center" />
      <div className="max-w-[560px] rounded-2xl border border-gold-400/30 bg-surface px-6 py-9 text-center shadow-[0_24px_60px_--alpha(var(--color-shadow)/60%)] sm:px-10">
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
