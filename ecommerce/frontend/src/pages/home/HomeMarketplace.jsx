import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Container from '../../components/Container.jsx';
import Reveal from '../../components/Reveal.jsx';
import Button from '../../components/Button.jsx';
import Eyebrow from '../../components/Eyebrow.jsx';
import TrustBar from '../../components/home/TrustBar.jsx';
import ProductRail from '../../components/home/ProductRail.jsx';
import PromoTrio from '../../components/home/PromoTrio.jsx';
import StoriesRow from '../../components/home/StoriesRow.jsx';
import StoresBand from '../../components/home/StoresBand.jsx';
import { CATEGORIES } from '../../data/categories.js';
import { CATEGORY_IMAGES, productsIn } from '../../data/home.js';
import { quickViewBg } from '../../assets/backgrounds';

// The four "quad" cards under the banner: a title and four products from a collection.
const QUADS = [
  { title: 'Christmas Trees', category: 'christmas-trees', link: 'See all trees' },
  { title: 'Ornaments & Baubles', category: 'tree-hangings', link: 'See all ornaments' },
  { title: 'Santa Toys', category: 'santa-toy', link: 'See all Santa toys' },
  { title: 'Nativity Sets', category: 'nativity-sets', link: 'See all nativity sets' },
];

// One sideways row per collection, in this order.
const RAILS = [
  { title: 'Christmas Trees', eyebrow: '✦ European standard ✦', category: 'christmas-trees' },
  { title: 'Wonderland Ornaments', eyebrow: '✦ Tree hangings ✦', category: 'tree-hangings', limit: 16 },
  { title: 'Christmas Lights', eyebrow: '✦ Make it glow ✦', category: 'christmas-lights' },
  { title: 'Santa Toys', eyebrow: '✦ Santa & friends ✦', category: 'santa-toy' },
  { title: 'Nativity Sets', eyebrow: '✦ The reason for the season ✦', category: 'nativity-sets' },
  { title: 'Wreaths & Garlands', eyebrow: '✦ For doors & mantels ✦', category: 'wreath-garlands' },
];

/**
 * Option 3, "Marketplace": built to browse, like the big online stores. A category bar, a wide banner,
 * four quick-look cards, then a sideways row for every collection.
 */
const HomeMarketplace = ({ onQuickView }) => (
  <>
    {/* Category bar */}
    <nav aria-label="Collections" className="relative z-20 border-b border-gold-400/15 bg-bg-darker">
      <Container>
        <ul className="-mx-6 flex list-none gap-1 overflow-x-auto px-6 py-3 [scrollbar-width:none] lg:justify-between">
          {CATEGORIES.map(({ id, name }) => (
            <li key={id} className="shrink-0">
              <Link
                to={id === 'all' ? '/shop' : `/shop?category=${id}`}
                className="group flex w-20 flex-col items-center gap-1.5 text-center no-underline sm:w-24"
              >
                <span className="block size-12 overflow-hidden rounded-full border-2 border-gold-400/40 bg-white transition-all duration-300 group-hover:border-gold-300 group-hover:shadow-[0_0_16px_--alpha(var(--color-gold-400)/45%)] sm:size-14">
                  <img src={CATEGORY_IMAGES[id]} alt="" className="size-full object-cover" />
                </span>
                <span className="text-[0.72rem] leading-tight font-medium text-text-secondary transition-colors group-hover:text-gold-300 sm:text-[0.78rem]">
                  {id === 'all' ? 'All' : name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </nav>

    {/* Wide banner, with the quad cards overlapping its foot */}
    <section className="relative isolate z-20 bg-bg-primary pb-8">
      <div className="relative h-[300px] overflow-hidden sm:h-[360px]">
        <img src={quickViewBg} alt="" className="absolute inset-0 size-full object-cover object-right" />
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(90deg,--alpha(var(--color-shade)/92%)_0%,--alpha(var(--color-shade)/60%)_45%,transparent_80%)]"
        />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-bg-primary to-transparent" />
        <Container className="relative flex h-full flex-col justify-center pb-16">
          <Eyebrow>✦ Since 1997 · India’s largest importer ✦</Eyebrow>
          <h1 className="mb-2 max-w-[36rem] font-serif text-[1.8rem] leading-[1.15] font-bold text-white sm:text-[2.4rem]">
            Christmas Raave’s Lights Illuminate Your Soul
          </h1>
          <p className="mb-5 text-text-secondary">Dance through magical, glowing moments.</p>
          <div>
            <Button to="/shop">
              Shop Everything
              <ArrowRight size={16} strokeWidth={2} />
            </Button>
          </div>
        </Container>
      </div>

      <Container className="relative -mt-16 grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {QUADS.map((quad, i) => (
          <Reveal key={quad.category} delay={i}>
            <div className="flex h-full flex-col rounded-2xl border border-cream-200 bg-cream-50 p-4 shadow-[0_16px_40px_--alpha(var(--color-black)/45%)]">
              <h2 className="mb-3 font-serif text-[1.08rem] font-bold text-ink">{quad.title}</h2>
              <ul className="mb-3 grid list-none grid-cols-2 gap-2.5">
                {productsIn(quad.category, 4).map((p) => (
                  <li key={p.id}>
                    <Link to={`/product/${p.id}`} className="group block no-underline">
                      <span className="mb-1 block aspect-square overflow-hidden rounded-lg border border-cream-200 bg-white">
                        <img src={p.image} alt="" loading="lazy" className="size-full object-cover transition-[scale] duration-500 group-hover:scale-105" />
                      </span>
                      <span className="block truncate text-[0.72rem] text-ink-soft group-hover:text-ink">{p.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                to={`/shop?category=${quad.category}`}
                className="mt-auto inline-flex items-center gap-1 text-[0.8rem] font-semibold text-forest no-underline hover:text-gold-ink"
              >
                {quad.link}
                <ArrowRight size={14} strokeWidth={2} />
              </Link>
            </div>
          </Reveal>
        ))}
      </Container>
    </section>

    <TrustBar />

    <section className="relative z-20 bg-bg-primary py-10 md:py-12">
      <Container className="flex flex-col gap-10">
        {RAILS.slice(0, 3).map((rail) => (
          <ProductRail
            key={rail.category}
            eyebrow={rail.eyebrow}
            title={rail.title}
            to={`/shop?category=${rail.category}`}
            products={productsIn(rail.category, rail.limit)}
            onQuickView={onQuickView}
          />
        ))}
        <PromoTrio />
        {RAILS.slice(3).map((rail) => (
          <ProductRail
            key={rail.category}
            eyebrow={rail.eyebrow}
            title={rail.title}
            to={`/shop?category=${rail.category}`}
            products={productsIn(rail.category, rail.limit)}
            onQuickView={onQuickView}
          />
        ))}
      </Container>
    </section>

    <StoresBand />

    <section className="relative z-20 bg-bg-primary py-10 md:py-14">
      <Container>
        <StoriesRow />
      </Container>
    </section>
  </>
);

export default HomeMarketplace;
