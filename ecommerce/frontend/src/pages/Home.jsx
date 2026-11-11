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
import Decoration from '../components/Decoration.jsx';
import HangingBauble from '../components/HangingBauble.jsx';
import { ornamentBerryCorner, ornamentBowCorner, promoReindeerCard } from '../assets/decorations';

const ORNAMENTS = productsIn('tree-hangings').filter((p) => /-(1[4-8])$/.test(p.id));

// Cut-out ornaments are transparent, so they are shown whole (contain), never cropped or edge-faded.
// The corner pictures hug a top-left corner; MIRROR flips one for a top-right corner.
const CUTOUT = { fade: 'none', imgClassName: 'object-contain!' };
const MIRROR = { fade: 'none', imgClassName: 'object-contain! -scale-x-100' };
// Side ornaments live in the space beside the 1360px content column, so they never cover a card:
// exactly that wide (at most 260px), and only from 1600px, where it can hold them.
const SIDE_FROM = 'hidden min-[1600px]:block';
const SIDE_W = 'w-[min(260px,calc((100vw-1360px)/2))]';
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
                className="group flex h-full min-h-60 flex-col overflow-hidden rounded-2xl border border-gold-400/25 bg-surface no-underline shadow-[0_14px_36px_--alpha(var(--color-shadow)/40%)]"
              >
                {/* The photo on top, clear (no wash), with the badge on it; the words on plain ivory below. */}
                <span className="relative block min-h-28 flex-1 overflow-hidden">
                  <img
                    src={promoReindeerCard}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover object-[72%_18%] transition-[scale] duration-700 ease-premium group-hover:scale-[1.05]"
                  />
                  <Badge variant="ruby" className="absolute top-3 left-3">
                    Now open
                  </Badge>
                </span>
                <span className="flex flex-col border-t border-gold-400/20 px-4 py-3">
                  <span className="font-serif text-[1.1rem] leading-tight font-bold text-text-primary">
                    Christmas Raave’s <span className="text-gold-300">Energy Fuels Holiday Cheer</span>
                  </span>
                  <span className="mt-1.5 inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-gold-300 group-hover:text-text-primary">
                    <MapPin size={14} strokeWidth={2} /> Visit Locations
                  </span>
                </span>
              </Link>
            </Reveal>

            {/* New this season: a 2×2 of ornaments */}
            <Reveal className="h-full">
              <Link
                to="/shop?category=tree-hangings"
                className="group flex h-full min-h-52 flex-col rounded-2xl border border-cream-200 bg-cream-50 p-4 no-underline shadow-[0_14px_36px_--alpha(var(--color-shadow)/40%)]"
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
        {/* Pine corners with a gold bow framing the category heading, as on a garlanded shop window */}
        <Decoration {...CUTOUT} side="hidden sm:block" src={ornamentBowCorner} className="top-0 left-0 aspect-900/566 w-[clamp(150px,18vw,300px)]" />
        <Decoration {...MIRROR} side="hidden sm:block" src={ornamentBowCorner} className="top-0 right-0 aspect-900/566 w-[clamp(150px,18vw,300px)]" />
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
        {/* A bauble in the empty middle of the first rail's header row (title left, button right) */}
        <HangingBauble side="hidden xl:block" className="left-[calc(50%-35px)]" width={70} drop={24} />
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
        <Decoration {...CUTOUT} side={SIDE_FROM} src={ornamentBerryCorner} className={`top-0 left-0 aspect-900/697 ${SIDE_W}`} />
        <Decoration {...MIRROR} side={SIDE_FROM} src={ornamentBerryCorner} className={`top-0 right-0 aspect-900/697 ${SIDE_W}`} />
        <Container>
          <WhyChoose />
        </Container>
      </section>

      <OurPurpose />

      <section className="relative z-20 bg-bg-primary py-10 md:py-14">
        {/* Snowflake baubles hanging in the side spaces, a long and a short one on each side */}
        {/* Baubles in the side spaces, a long and a short one either side of each space's middle */}
        <HangingBauble side={SIDE_FROM} className="left-[calc((100vw-1360px)/4-75px)]" width={84} drop={110} />
        <HangingBauble side={SIDE_FROM} className="left-[calc((100vw-1360px)/4+5px)]" width={64} drop={40} delay={3} />
        <HangingBauble side={SIDE_FROM} className="right-[calc((100vw-1360px)/4+5px)]" width={64} drop={40} delay={5} />
        <HangingBauble side={SIDE_FROM} className="right-[calc((100vw-1360px)/4-75px)]" width={84} drop={110} delay={1.5} />
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
