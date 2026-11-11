import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import Container from '../../components/Container.jsx';
import Reveal from '../../components/Reveal.jsx';
import Button from '../../components/Button.jsx';
import Flourish from '../../components/Flourish.jsx';
import RowHeader from '../../components/home/RowHeader.jsx';
import ProductTabs from '../../components/home/ProductTabs.jsx';
import CategoryTiles from '../../components/home/CategoryTiles.jsx';
import WhyChoose from '../../components/home/WhyChoose.jsx';
import StoriesRow from '../../components/home/StoriesRow.jsx';
import StoresBand from '../../components/home/StoresBand.jsx';
import { BRAND, BRAND_STATS, WHAT_AWAITS, productById } from '../../data/home.js';

// The three arched frames in the hero: a tree in the tall middle one, a Santa and an ornament either side.
const ARCHES = [
  { id: 'santa-doll-2', className: 'mt-16 h-[64%]' },
  { id: 'norway-spruce-christmas-tree', className: 'h-full' },
  { id: 'wonderland-ornaments-18', className: 'mt-24 h-[58%]' },
].map((a) => ({ ...a, product: productById(a.id) }));

// The forest button, for cream backgrounds (the gold one is made for the dark green).
const FOREST_BTN = 'border-forest! bg-forest! bg-none! text-cream-50! shadow-none! hover:bg-forest-hover!';
const FOREST_OUTLINE = 'border-forest/40! bg-transparent! text-forest! backdrop-blur-none! hover:border-forest! hover:bg-forest/8!';

/**
 * Option 5, "Cream Boutique": the light side of our palette. The cream of the product cards and the
 * Our Purpose band becomes the page, with the dark green kept for a few bands. Arched product frames in
 * the hero, a tabbed product grid, collections, why us, stories and stores.
 */
const HomeBoutique = ({ onQuickView }) => (
  <>
    <section className="relative isolate z-20 overflow-hidden bg-cream-100 text-ink">
      <span
        aria-hidden="true"
        className="absolute -top-40 -right-40 -z-10 size-[38rem] rounded-full bg-[radial-gradient(circle,--alpha(var(--color-gold-400)/22%),transparent_65%)]"
      />
      <Container className="grid items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:py-12">
        <Reveal>
          <div className="mb-4 flex items-center gap-4">
            <span className="text-[0.72rem] font-semibold tracking-[0.18em] text-gold-ink uppercase">Since 1997 · 27th year in India</span>
            <Flourish tone="light" />
          </div>
          <h1 className="mb-4 font-serif text-[2rem] leading-[1.12] font-bold text-ink sm:text-[2.5rem] xl:text-[2.8rem]">
            Christmas Trees &amp; Decorations, European Standard
          </h1>
          <p className="mb-6 max-w-[34rem] text-[1rem] leading-[1.75] text-ink-soft">{BRAND.welcome}</p>
          <div className="mb-7 flex flex-wrap gap-3">
            <Button to="/shop" className={FOREST_BTN}>
              Shop the Collection
              <ArrowRight size={16} strokeWidth={2} />
            </Button>
            <Button variant="outline" to="/showrooms" className={FOREST_OUTLINE}>
              <MapPin size={16} strokeWidth={2} />
              Visit a Store
            </Button>
          </div>
          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            {BRAND_STATS.slice(0, 3).map(({ value, suffix, label }) => (
              <div key={label}>
                <dt className="text-[0.7rem] tracking-[0.12em] text-gold-ink uppercase">{label}</dt>
                <dd className="font-serif text-[1.6rem] font-bold text-forest">
                  {value}
                  {suffix}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <div className="grid h-[380px] grid-cols-[1fr_1.3fr_1fr] items-start gap-3 sm:h-[440px] sm:gap-4 lg:h-[min(460px,calc(100svh-var(--header-h)-5rem))]">
          {ARCHES.map(({ id, className, product }, i) => (
            <Reveal key={id} delay={i} className={className}>
              <Link
                to={`/product/${id}`}
                title={product.name}
                className="group block h-full rounded-t-full rounded-b-2xl bg-[linear-gradient(160deg,var(--color-gold-200),var(--color-gold-550))] p-[3px] shadow-[0_24px_50px_--alpha(var(--color-forest)/28%)]"
              >
                <span className="block h-full overflow-hidden rounded-t-full rounded-b-[0.85rem] bg-white">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="size-full object-cover transition-[scale] duration-700 ease-premium group-hover:scale-105"
                  />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>

    {/* What awaits you: four collection promises on a forest strip */}
    <section className="relative z-20 bg-forest py-6 text-cream-50">
      <Container>
        <ul className="grid list-none gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHAT_AWAITS.map(({ title, text, category }) => (
            <li key={title}>
              <Link to={`/shop?category=${category}`} className="group block no-underline">
                <span className="mb-1 flex items-center gap-2 font-serif text-[0.98rem] font-bold text-gold-300 group-hover:text-gold-100">
                  {title}
                  <ArrowRight size={14} strokeWidth={2} className="transition-transform group-hover:translate-x-1" />
                </span>
                <span className="text-[0.84rem] leading-[1.55] text-cream-100/80">{text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>

    <section className="relative z-20 bg-cream-50 py-10 md:py-14">
      <Container>
        <RowHeader eyebrow="✦ Featured categories ✦" title="New This Season" to="/shop" action="View All Products" tone="light" />
        <ProductTabs onQuickView={onQuickView} />
      </Container>
    </section>

    <section className="relative z-20 bg-bg-primary py-10 md:py-12">
      <Container>
        <RowHeader eyebrow="✦ Christmas decorations ✦" title="Shop by Collection" to="/shop" action="All Collections" />
        <CategoryTiles />
      </Container>
    </section>

    <section className="relative z-20 bg-cream-100 py-12 md:py-16">
      <Container>
        <WhyChoose tone="light" />
      </Container>
    </section>

    <section className="relative z-20 bg-cream-50 py-10 md:py-14">
      <Container>
        <StoriesRow tone="light" />
      </Container>
    </section>

    <StoresBand />
  </>
);

export default HomeBoutique;
