import { Suspense, lazy, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Clock, Star, Truck, ArrowRight, Wand2 } from 'lucide-react';
import SectionHeading from '../components/SectionHeading.jsx';
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
import HangingOrnaments from '../components/HangingOrnaments.jsx';
import Flourish from '../components/Flourish.jsx';
import OurPurpose from '../components/OurPurpose.jsx';
import PageTitle from '../components/PageTitle.jsx';
import FeatureItem from '../components/FeatureItem.jsx';
import { goldenReindeerCutout, heroTreeGlow } from '../assets/decorations';
import { cardClass } from '../components/cardClass.js';

// The standing reindeer beside the testimonials: exactly the space beside the 1360px content column, so it
// never covers a card, and only from 1700px wide, where that space can hold it.
const SIDE_STANDING = 'top-6 h-[300px] w-[min(240px,calc((100vw-1360px)/2))]';
const SIDE_STANDING_FROM = 'hidden min-[1700px]:block';

// Hero loads separately so the rest of the homepage can paint first.
const CinematicHero = lazy(() => import('../components/CinematicHero'));

const TRUST_ITEMS = [
  { Icon: ShieldCheck, title: 'European Safety Certified', body: 'Fire-retardant & non-toxic' },
  { Icon: Clock, title: '5-Minute Assembly', body: 'Tool-free, snap-in boughs' },
  { Icon: Star, title: '10-Year Warranty', body: '15+ festive seasons' },
  { Icon: Truck, title: 'Free Pan-India Delivery', body: 'White-glove, to your door' },
];

// The counters beside the Tree Studio teaser.
const STUDIO_STATS = [
  { value: PRODUCTS.length, label: 'Products to combine' },
  { value: CATEGORIES.length - 1, label: 'Collections' },
  { value: 5, label: 'Showrooms' },
  { value: 27, label: 'Years in India' },
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
    return picks.slice(0, 6);
  }, []);

  return (
    <>
      <Suspense fallback={<div className="-mt-(--header-h) h-svh w-full bg-hero-bg" />}>
        <CinematicHero />
      </Suspense>

      {/* Trust strip: one slim row of promises, then a shortcut into the catalogue */}
      <section className="relative z-20 border-t border-b border-gold-400/15 bg-[linear-gradient(180deg,var(--color-bg-darker)_0%,var(--color-bg-primary)_100%)] py-3">
        <Container>
          <Reveal className="grid grid-cols-2 items-center gap-x-3 gap-y-3.5 sm:gap-x-4 sm:gap-y-5 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:gap-0">
            {TRUST_ITEMS.map(({ Icon, title, body }) => (
              <FeatureItem
                key={title}
                variant="trust"
                Icon={Icon}
                title={title}
                body={body}
                className="lg:border-r lg:border-gold-400/15 lg:px-5 lg:first:pl-0"
              />
            ))}
            <Button variant="outline" size="sm" to="/shop" className="col-span-2 lg:col-span-1 lg:ml-6">
              View All Categories
              <ArrowRight size={15} strokeWidth={2} />
            </Button>
          </Reveal>
        </Container>
      </section>

      {/* Shop by category, then the featured collection: one band, so the Aurora and ornaments
          cover both without a seam between them */}
      <section className="relative z-20 bg-bg-primary pt-8 pb-10 md:pt-10 md:pb-14">
        <Aurora />
        <HangingOrnaments side="left" />
        <HangingOrnaments side="right" />
        <Container>
          <ShopByCategory className="mb-8 md:mb-10" />

          <Reveal className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>
                ✦ 2026 SIGNATURE COLLECTION ✦
              </Eyebrow>
              <div className="flex items-center gap-4">
                <PageTitle as="h2" size="lg">
                  European Standard Masterpieces
                </PageTitle>
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
      <section className="relative z-20 border-t border-b border-gold-400/15 bg-bg-darker py-10 md:py-12">
        <Container>
          <Reveal>
            <GlowBorder>
              <div className="relative isolate grid items-center gap-7 overflow-hidden rounded-[calc(1.5rem-1px)] bg-[radial-gradient(circle_at_center,#0a291c_0%,#041009_100%)] p-6 md:p-9 lg:grid-cols-[1.4fr_1fr]">
                <Decoration src={heroTreeGlow} fade="under" opacity={0.32} className="inset-y-0 left-0 w-[58%]" />
                <div>
                  <span className="mb-1.5 inline-block font-mono text-[0.66rem] uppercase tracking-[0.22em] text-gold-400">
                    ✦ INTERACTIVE TREE STUDIO ✦
                  </span>
                  <PageTitle as="h2" size="sm" className="mb-2">
                    Design Your Tree, Piece By Piece
                  </PageTitle>
                  <p className="mb-5 text-[0.95rem] leading-[1.65] text-text-secondary">
                    Pick a tree, layer on cluster lights, baubles and a topper, then send the whole build to our
                    concierge as a single quote request. Our stylists confirm pricing and reserve your pieces.
                  </p>
                  <Button to="/tree-studio">
                    <Wand2 size={16} strokeWidth={2} />
                    Open Tree Studio
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {STUDIO_STATS.map(({ value, label }) => (
                    <div key={label} className={`${cardClass('tile')} px-4 py-3`}>
                      <CountUp value={value} className="block font-serif text-[1.7rem] font-bold text-gold-300" />
                      <span className="text-[0.78rem] uppercase tracking-[0.08em] text-text-muted">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </GlowBorder>
          </Reveal>
        </Container>
      </section>

      {/* Our Purpose: the cream band */}
      <OurPurpose />

      {/* Testimonials teaser */}
      <section className="relative z-20 bg-bg-primary py-10 md:py-14">
        <Aurora />
        <HangingOrnaments side="left" />
        {/* A cut-out, so no edge fade: contained (antlers and hooves stay whole) and standing on the bottom edge. */}
        <Decoration
          side={SIDE_STANDING_FROM}
          src={goldenReindeerCutout}
          fade="none"
          className={`right-0 ${SIDE_STANDING}`}
          imgClassName="object-contain! object-bottom!"
        />
        <Container>
          <SectionHeading eyebrow="✦ TESTIMONIALS ✦" title="Loved Across Generations" />
          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.author} delay={i} className="h-full">
                <TestimonialCard testimonial={t} />
              </Reveal>
            ))}
          </div>
          <div className="mt-5 text-center md:mt-6">
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
