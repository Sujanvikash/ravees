import { Home, Store } from 'lucide-react';
import Button from '../components/Button.jsx';
import { GRADIENT_TITLE } from '../components/SectionHeading.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import Aurora from '../components/Aurora.jsx';

const NotFound = () => {
  return (
    <section className="relative z-20 flex min-h-[70vh] items-center justify-center bg-bg-primary px-6 py-25">
      <Aurora />
      <div className="max-w-[520px] text-center">
        <Eyebrow>
          ✦ 404 ✦
        </Eyebrow>
        <h1 className={`mb-4 font-serif text-[2.2rem] font-bold leading-[1.2] tracking-[0.03em] ${GRADIENT_TITLE}`}>
          This Ornament Wandered Off
        </h1>
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
