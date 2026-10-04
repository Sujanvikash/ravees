import { Suspense, lazy, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Clock, Star, Truck, ArrowRight, Wand2 } from 'lucide-react';
import SectionHeading, { GRADIENT_TITLE } from '../components/SectionHeading.jsx';
import TrustBadge from '../components/TrustBadge.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import TestimonialCard from '../components/TestimonialCard.jsx';
import QuickViewModal from '../components/QuickViewModal.jsx';
import Button from '../components/Button.jsx';
import { PRODUCTS } from '../data/products.js';
import { CATEGORIES } from '../data/categories.js';
import { TESTIMONIALS } from '../data/testimonials.js';
import Container from '../components/Container.jsx';
import Eyebrow from '../components/Eyebrow.jsx';

// Hero loads separately so the rest of the homepage can paint first.
const ScrollTreeHero = lazy(() => import('../components/ScrollTreeHero'));

const TRUST_ITEMS = [
  {
    Icon: ShieldCheck,
    title: 'European Safety Certified',
    body: '100% fire-retardant, non-toxic PE/PVC safe for children & pets.',
  },
  {
    Icon: Clock,
    title: '5-Minute Quick Assembly',
    body: 'Pre-shaped memory wire boughs snap into place with zero tools.',
  },
  {
    Icon: Star,
    title: '10-Year Evergreen Warranty',
    body: 'Engineered for 15+ festive seasons of enduring beauty.',
  },
  {
    Icon: Truck,
    title: 'Free Pan-India Delivery',
    body: 'White-glove doorstep delivery directly to your home.',
  },
];

export default function Home() {
  const [quickView, setQuickView] = useState(null);

  const featured = useMemo(() => {
    // One product from each category, so the teaser spans the whole catalog.
    const seen = new Set();
    const picks = [];
    for (const cat of CATEGORIES.filter((c) => c.id !== 'all')) {
      const match = PRODUCTS.find((p) => p.category === cat.id && !seen.has(p.id));
      if (match) {
        seen.add(match.id);
        picks.push(match);
      }
    }
    return picks.slice(0, 8);
  }, []);

  return (
    <>
      <Suspense fallback={<div className="h-[calc(100svh-var(--header-h))] w-full bg-[#0B1A14]" />}>
        <ScrollTreeHero />
      </Suspense>

      {/* Trust bar */}
      <section className="relative z-20 border-t border-b border-gold-400/15 bg-[linear-gradient(180deg,var(--color-bg-darker)_0%,var(--color-bg-primary)_100%)] py-15">
        <Container>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_ITEMS.map(({ Icon, title, body }) => (
              <TrustBadge key={title} Icon={Icon} title={title}>
                {body}
              </TrustBadge>
            ))}
          </div>
        </Container>
      </section>

      {/* Featured collections */}
      <section className="relative z-20 bg-bg-primary py-25">
        <Container>
          <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
            <div>
              <Eyebrow>
                ✦ 2026 SIGNATURE COLLECTION ✦
              </Eyebrow>
              <h2 className={`font-serif text-[2rem] font-bold leading-[1.2] tracking-[0.04em] sm:text-[2.5rem] ${GRADIENT_TITLE}`}>
                European Standard Masterpieces
              </h2>
            </div>
            <Button variant="outline" to="/shop">
              View All {PRODUCTS.length} Products
              <ArrowRight size={16} strokeWidth={2} />
            </Button>
          </div>

          <ProductGrid products={featured} onQuickView={setQuickView} />
        </Container>
      </section>

      {/* Tree Studio teaser */}
      <section className="relative z-20 border-t border-b border-gold-400/15 bg-bg-darker py-25">
        <Container>
          <div className="grid items-center gap-10 rounded-3xl border border-gold-400/30 bg-[radial-gradient(circle_at_center,#0a291c_0%,#041009_100%)] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] md:p-14 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <span className="mb-3 inline-block font-mono text-[0.68rem] uppercase tracking-[0.22em] text-gold-400">
                ✦ INTERACTIVE TREE STUDIO ✦
              </span>
              <h2 className={`mb-4 font-serif text-[1.8rem] font-bold leading-[1.2] tracking-[0.03em] sm:text-[2.2rem] ${GRADIENT_TITLE}`}>
                Design Your Tree, Piece By Piece
              </h2>
              <p className="mb-6 text-[1.02rem] leading-[1.8] text-text-secondary">
                Pick a tree, layer on cluster lights, baubles and a topper, then send the whole build to our
                concierge as a single quote request. Our stylists confirm pricing and reserve your pieces.
              </p>
              <Button to="/tree-studio">
                <Wand2 size={16} strokeWidth={2} />
                Open Tree Studio
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="rounded-xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] p-5">
                <span className="block font-serif text-[2rem] font-bold text-gold-300">{PRODUCTS.length}</span>
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-text-muted">
                  Products to combine
                </span>
              </div>
              <div className="rounded-xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] p-5">
                <span className="block font-serif text-[2rem] font-bold text-gold-300">
                  {CATEGORIES.length - 1}
                </span>
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-text-muted">
                  Collections
                </span>
              </div>
              <div className="rounded-xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] p-5">
                <span className="block font-serif text-[2rem] font-bold text-gold-300">5</span>
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-text-muted">Showrooms</span>
              </div>
              <div className="rounded-xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] p-5">
                <span className="block font-serif text-[2rem] font-bold text-gold-300">27</span>
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-text-muted">
                  Years in India
                </span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Testimonials teaser */}
      <section className="relative z-20 bg-bg-primary py-25">
        <Container>
          <SectionHeading eyebrow="✦ TESTIMONIALS ✦" title="Loved Across Generations" />
          <div className="grid gap-7 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <TestimonialCard key={t.author} testimonial={t} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              to="/testimonials"
              className="text-[0.88rem] text-gold-300 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              Read every customer story →
            </Link>
          </div>
        </Container>
      </section>

      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
    </>
  );
}
