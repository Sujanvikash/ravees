import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import Container from '../components/Container.jsx';
import Reveal from '../components/Reveal.jsx';
import Button from '../components/Button.jsx';
import Badge from '../components/Badge.jsx';
import ShopByCategory from '../components/ShopByCategory.jsx';
import OurPurpose from '../components/OurPurpose.jsx';
import QuickViewModal from '../components/QuickViewModal.jsx';
import HeroCarousel from '../components/home/HeroCarousel.jsx';
import TrustBar from '../components/home/TrustBar.jsx';
import RowHeader from '../components/home/RowHeader.jsx';
import ProductTabs from '../components/home/ProductTabs.jsx';
import ProductRail from '../components/home/ProductRail.jsx';
import PromoTrio from '../components/home/PromoTrio.jsx';
import WhyChoose from '../components/home/WhyChoose.jsx';
import StoriesRow from '../components/home/StoriesRow.jsx';
import StoresBand from '../components/home/StoresBand.jsx';
import { productsIn } from '../data/home.js';
import { CATEGORIES } from '../data/categories.js';
import { goldenReindeerStatue } from '../assets/decorations';

const ORNAMENTS = productsIn('tree-hangings').filter((p) => /-(1[4-8])$/.test(p.id));
const HANGINGS_COUNT = CATEGORIES.find((c) => c.id === 'tree-hangings')?.count ?? 0;

/**
 * The home page, a shop front: a big slider with two promo cards beside it, the brand facts, category
 * circles, a tabbed product grid, promo banners, a Santa row, then the brand, stories and stores.
 */
const Home = () => {
  const [quickView, setQuickView] = useState(null);

  return (
    <>
      <section className="relative z-20 bg-bg-primary pt-4 pb-6 md:pt-5">
        <Container className="grid gap-4 lg:h-[clamp(440px,calc(100svh-var(--header-h)-7.5rem),560px)] lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
          <HeroCarousel className="h-[440px] lg:h-full" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2">
            {/* The old site's red promo card, in our colours: off to the stores */}
            <Reveal className="h-full">
              <Link
                to="/showrooms"
                className="group relative isolate flex h-full min-h-52 flex-col justify-end overflow-hidden rounded-2xl border border-gold-400/25 p-5 no-underline"
              >
                <img
                  src={goldenReindeerStatue}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 -z-10 size-full object-cover object-[50%_35%] transition-[scale] duration-700 ease-premium group-hover:scale-[1.05]"
                />
                <span aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-shade via-shade/55 to-transparent" />
                <Badge variant="ruby" className="mb-2 self-start">
                  Now open
                </Badge>
                <span className="font-serif text-[1.2rem] leading-tight font-bold text-white">
                  Christmas Raave’s <span className="text-gold-300">Energy Fuels Holiday Cheer</span>
                </span>
                <span className="mt-2 inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-gold-300 group-hover:text-gold-100">
                  <MapPin size={14} strokeWidth={2} /> Visit Locations
                </span>
              </Link>
            </Reveal>

            {/* New this season: a 2×2 of ornaments */}
            <Reveal className="h-full">
              <Link
                to="/shop?category=tree-hangings"
                className="group flex h-full min-h-52 flex-col rounded-2xl border border-cream-200 bg-cream-50 p-4 no-underline shadow-[0_14px_36px_--alpha(var(--color-black)/40%)]"
              >
                <span className="mb-0.5 text-[0.66rem] font-semibold tracking-[0.12em] text-gold-ink uppercase">New this season</span>
                <span className="mb-3 flex items-baseline justify-between gap-2 font-serif text-[1.1rem] font-bold text-ink">
                  Wonderland Ornaments
                  <span className="font-sans text-[0.75rem] font-medium text-ink-soft">{HANGINGS_COUNT} designs</span>
                </span>
                <span className="grid flex-1 grid-cols-4 gap-2 lg:grid-cols-2 lg:grid-rows-2">
                  {ORNAMENTS.slice(0, 4).map((p) => (
                    // The photo is absolute, so its own size never stretches the card.
                    <span key={p.id} className="relative block aspect-square overflow-hidden rounded-lg bg-white lg:aspect-auto">
                      <img src={p.image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-[scale] duration-500 group-hover:scale-105" />
                    </span>
                  ))}
                </span>
              </Link>
            </Reveal>
          </div>
        </Container>
      </section>

      <TrustBar />

      <section className="relative z-20 bg-bg-primary pt-8 pb-10 md:pt-10 md:pb-14">
        <Container>
          <ShopByCategory className="mb-8 md:mb-10" />
          <RowHeader eyebrow="✦ Featured categories ✦" title="Shop the Season" to="/shop" action="View All Products" />
          <ProductTabs onQuickView={setQuickView} />
        </Container>
      </section>

      <section className="relative z-20 bg-bg-darker py-8 md:py-10">
        <Container>
          <PromoTrio />
        </Container>
      </section>

      <section className="relative z-20 bg-bg-primary py-10 md:py-12">
        <Container className="flex flex-col gap-10">
          <ProductRail
            eyebrow="✦ Santa & friends ✦"
            title="Santa Toys"
            to="/shop?category=santa-toy"
            products={productsIn('santa-toy')}
            onQuickView={setQuickView}
          />
          <ProductRail
            eyebrow="✦ The reason for the season ✦"
            title="Nativity & Crib Sets"
            to="/shop?category=nativity-sets"
            products={productsIn('nativity-sets')}
            onQuickView={setQuickView}
          />
        </Container>
      </section>

      <section className="relative z-20 border-t border-gold-400/15 bg-bg-darker py-12 md:py-16">
        <Container>
          <WhyChoose />
        </Container>
      </section>

      <OurPurpose />

      <section className="relative z-20 bg-bg-primary py-10 md:py-14">
        <Container>
          <StoriesRow />
          <div className="mt-8 text-center">
            <Button variant="outline" to="/shop">
              Browse the Full Collection
              <ArrowRight size={16} strokeWidth={2} />
            </Button>
          </div>
        </Container>
      </section>

      <StoresBand />
      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
    </>
  );
};

export default Home;
