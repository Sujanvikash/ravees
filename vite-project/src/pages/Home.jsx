import { Suspense, lazy, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Clock, Star, Truck, ArrowRight, Wand2 } from 'lucide-react';
import SectionHeading, { GRADIENT_TITLE } from '../components/SectionHeading.jsx';
import ShopByCategory from '../components/ShopByCategory.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import TestimonialCard from '../components/TestimonialCard.jsx';
import QuickViewModal from '../components/QuickViewModal.jsx';
import Button from '../components/Button.jsx';
import { PRODUCTS } from '../data/products.js';
import { CATEGORIES } from '../data/categories.js';
import { TESTIMONIALS } from '../data/testimonials.js';
import Container from '../components/Container.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import Reveal from '../components/Reveal.jsx';
import Aurora from '../components/Aurora.jsx';
import CountUp from '../components/CountUp.jsx';
import GlowBorder from '../components/GlowBorder.jsx';
import Decoration from '../components/Decoration.jsx';
import Flourish from '../components/Flourish.jsx';
import OurPurpose from '../components/OurPurpose.jsx';
import {
  festiveLanternGlow,
  goldenReindeerStatue,
  heroTreeGlow,
  pineBranchLeft,
  pineBranchRight,
  pineCrateBaubles,
} from '../assets/decorations';

// Side decorations fill the space beside the 1360px content column (plus a little overlap, faded).
const SIDE_BRANCH = 'top-0 h-[330px] w-[min(440px,calc((100vw-1360px)/2+160px))]';
// Tall standing pictures (reindeer, lantern) beside the testimonials.
const SIDE_STANDING = 'top-10 h-[340px] w-[min(260px,calc((100vw-1360px)/2+40px))]';

// Hero loads separately so the rest of the homepage can paint first.
const ScrollTreeHero = lazy(() => import('../components/ScrollTreeHero'));

const TRUST_ITEMS = [
  { Icon: ShieldCheck, title: 'European Safety Certified', body: 'Fire-retardant & non-toxic' },
  { Icon: Clock, title: '5-Minute Assembly', body: 'Tool-free, snap-in boughs' },
  { Icon: Star, title: '10-Year Warranty', body: '15+ festive seasons' },
  { Icon: Truck, title: 'Free Pan-India Delivery', body: 'White-glove, to your door' },
];

const Home = () => {
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
    return picks.slice(0, 5);
  }, []);

  return (
    <>
      <Suspense fallback={<div className="h-[calc(100svh-var(--header-h))] w-full bg-[#0B1A14]" />}>
        <ScrollTreeHero />
      </Suspense>

      {/* Trust strip: one slim row of promises, then a shortcut into the catalogue */}
      <section className="relative z-20 border-t border-b border-gold-400/15 bg-[linear-gradient(180deg,var(--color-bg-darker)_0%,var(--color-bg-primary)_100%)] py-5">
        <Container>
          {/* Phones show the titles only, to keep the strip short */}
          <Reveal className="grid grid-cols-2 items-center gap-x-3 gap-y-3.5 sm:gap-x-4 sm:gap-y-5 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:gap-0">
            {TRUST_ITEMS.map(({ Icon, title, body }) => (
              <div
                key={title}
                className="flex items-center gap-2.5 sm:gap-3 lg:border-r lg:border-gold-400/15 lg:px-5 lg:first:pl-0"
              >
                <Icon strokeWidth={1.5} className="size-5.5 shrink-0 text-gold-400 sm:size-7.5" />
                <div className="min-w-0">
                  <h3 className="font-serif text-[0.78rem] font-semibold leading-tight text-white sm:text-[0.95rem]">
                    {title}
                  </h3>
                  <p className="mt-0.5 hidden text-[0.8rem] leading-snug text-text-muted sm:block">{body}</p>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" to="/shop" className="col-span-2 lg:col-span-1 lg:ml-6">
              View All Categories
              <ArrowRight size={15} strokeWidth={2} />
            </Button>
          </Reveal>
        </Container>
      </section>

      {/* Shop by category, then the featured collection: one band, so the Aurora and pine branches
          cover both without a seam between them */}
      <section className="relative z-20 bg-bg-primary pt-12 pb-16 md:pt-20 md:pb-20">
        <Aurora />
        <Decoration side src={pineBranchLeft} fade="left" className={`left-0 ${SIDE_BRANCH}`} imgClassName="object-left-top" />
        <Decoration side src={pineBranchRight} fade="right" className={`right-0 ${SIDE_BRANCH}`} imgClassName="object-right-top" />
        <Container>
          <ShopByCategory className="mb-14 md:mb-20" />

          <Reveal className="mb-9 flex flex-wrap items-end justify-between gap-5">
            <div>
              <Eyebrow>
                ✦ 2026 SIGNATURE COLLECTION ✦
              </Eyebrow>
              <div className="flex items-center gap-4">
                <h2 className={`font-serif text-[2rem] font-bold leading-[1.2] tracking-[0.04em] sm:text-[2.5rem] ${GRADIENT_TITLE}`}>
                  European Standard Masterpieces
                </h2>
                <Flourish className="hidden md:block" />
              </div>
            </div>
            <Button variant="outline" to="/shop">
              View All {PRODUCTS.length} Products
              <ArrowRight size={16} strokeWidth={2} />
            </Button>
          </Reveal>

          <ProductGrid oneRow products={featured} onQuickView={setQuickView} />
        </Container>
      </section>

      {/* Tree Studio teaser */}
      <section className="relative z-20 border-t border-b border-gold-400/15 bg-bg-darker py-16 md:py-20">
        <Decoration
          side
          src={pineCrateBaubles}
          className="top-1/2 right-0 h-[320px] w-[min(420px,calc((100vw-1360px)/2+120px))] -translate-y-1/2"
        />
        <Container>
          <Reveal>
            <GlowBorder>
              <div className="relative isolate grid items-center gap-10 overflow-hidden rounded-[calc(1.5rem-1px)] bg-[radial-gradient(circle_at_center,#0a291c_0%,#041009_100%)] p-8 md:p-14 lg:grid-cols-[1.4fr_1fr]">
                <Decoration src={heroTreeGlow} fade="under" opacity={0.32} className="inset-y-0 left-0 w-[58%]" />
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
                    <CountUp value={PRODUCTS.length} className="block font-serif text-[2rem] font-bold text-gold-300" />
                    <span className="text-[0.78rem] uppercase tracking-[0.08em] text-text-muted">
                      Products to combine
                    </span>
                  </div>
                  <div className="rounded-xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] p-5">
                    <CountUp value={CATEGORIES.length - 1} className="block font-serif text-[2rem] font-bold text-gold-300" />
                    <span className="text-[0.78rem] uppercase tracking-[0.08em] text-text-muted">
                      Collections
                    </span>
                  </div>
                  <div className="rounded-xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] p-5">
                    <CountUp value={5} className="block font-serif text-[2rem] font-bold text-gold-300" />
                    <span className="text-[0.78rem] uppercase tracking-[0.08em] text-text-muted">Showrooms</span>
                  </div>
                  <div className="rounded-xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] p-5">
                    <CountUp value={27} className="block font-serif text-[2rem] font-bold text-gold-300" />
                    <span className="text-[0.78rem] uppercase tracking-[0.08em] text-text-muted">
                      Years in India
                    </span>
                  </div>
                </div>
              </div>
            </GlowBorder>
          </Reveal>
        </Container>
      </section>

      {/* Our Purpose: the cream band */}
      <OurPurpose />

      {/* Testimonials teaser */}
      <section className="relative z-20 bg-bg-primary py-16 md:py-20">
        <Aurora />
        <Decoration side src={goldenReindeerStatue} className={`right-0 ${SIDE_STANDING}`} />
        <Decoration side src={festiveLanternGlow} className={`left-0 ${SIDE_STANDING}`} />
        <Container>
          <SectionHeading eyebrow="✦ TESTIMONIALS ✦" title="Loved Across Generations" />
          <div className="grid gap-7 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.author} delay={i} className="h-full">
                <TestimonialCard testimonial={t} />
              </Reveal>
            ))}
          </div>
          <div className="mt-8 text-center md:mt-10">
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
};

export default Home;
