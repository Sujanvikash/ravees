import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Container from '../../components/Container.jsx';
import Reveal from '../../components/Reveal.jsx';
import Button from '../../components/Button.jsx';
import Eyebrow from '../../components/Eyebrow.jsx';
import CountUp from '../../components/CountUp.jsx';
import OurPurpose from '../../components/OurPurpose.jsx';
import RowHeader from '../../components/home/RowHeader.jsx';
import ProductTabs from '../../components/home/ProductTabs.jsx';
import WhyChoose from '../../components/home/WhyChoose.jsx';
import StoriesRow from '../../components/home/StoriesRow.jsx';
import StoresBand from '../../components/home/StoresBand.jsx';
import { CATEGORIES } from '../../data/categories.js';
import { BRAND_STATS, CATEGORY_PHOTOS, productById, productsIn } from '../../data/home.js';

const countOf = (id) => CATEGORIES.find((c) => c.id === id)?.count ?? 0;

// The four small tiles beside the big one: photo, products, photo, products (a checkerboard).
const SMALL_TILES = [
  { kind: 'photo', category: 'christmas-lights', title: 'Christmas Lights' },
  { kind: 'products', category: 'tree-hangings', title: 'Wonderland Ornaments', products: ['wonderland-ornaments-15', 'wonderland-ornaments-17'] },
  { kind: 'products', category: 'santa-toy', title: 'Santa Toys', products: ['santa-doll-3', 'santa-doll-snowman-2'] },
  { kind: 'photo', category: 'nativity-sets', title: 'Nativity Sets' },
];

const TILE = 'group relative isolate flex h-full min-h-44 flex-col justify-end overflow-hidden rounded-2xl p-4 no-underline';

const TileLabel = ({ title, count, light }) => (
  <span className="flex items-end justify-between gap-2">
    <span>
      <span className={`block font-serif text-[1.05rem] leading-tight font-bold ${light ? 'text-ink' : 'text-white'}`}>{title}</span>
      <span className={`text-[0.74rem] ${light ? 'text-gold-ink' : 'text-gold-300'}`}>{count} pieces</span>
    </span>
    <ArrowUpRight
      size={18}
      strokeWidth={2}
      className={`shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${light ? 'text-forest' : 'text-gold-300'}`}
    />
  </span>
);

/**
 * Option 4, "Collections Bento": the hero is a grid of the collections, one big tree tile and four small
 * ones mixing our photos with product shots. Then the brand in numbers, a tabbed product grid, why us,
 * our purpose, stories and stores.
 */
const HomeBento = ({ onQuickView }) => (
  <>
    <section className="relative z-20 bg-bg-primary pt-4 pb-8 md:pt-5">
      <Container className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:h-[clamp(460px,calc(100svh-var(--header-h)-6rem),600px)] lg:grid-cols-4 lg:grid-rows-[repeat(2,minmax(0,1fr))]">
        <Reveal className="sm:col-span-2 lg:row-span-2">
          <Link to="/shop?category=christmas-trees" className={`${TILE} min-h-[420px] border border-gold-400/25 p-6 sm:p-8`}>
            <img
              src={CATEGORY_PHOTOS['christmas-trees']}
              alt=""
              className="absolute inset-0 -z-10 size-full object-cover transition-[scale] duration-[1.2s] ease-premium group-hover:scale-[1.04]"
            />
            <span aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-shade via-shade/60 to-shade/5" />
            <Eyebrow>✦ Christmas trees · {countOf('christmas-trees')} styles ✦</Eyebrow>
            <h1 className="mb-3 max-w-[30rem] font-serif text-[1.75rem] leading-[1.15] font-bold text-white sm:text-[2.2rem]">
              European Standard Christmas Trees and Decorations Under One Roof
            </h1>
            <span className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-2 rounded-lg border border-gold-200 bg-[linear-gradient(135deg,var(--color-gold-400),var(--color-gold-600))] px-5 py-2.5 text-[0.88rem] font-semibold tracking-[0.06em] text-on-gold">
                Shop Trees
                <ArrowRight size={16} strokeWidth={2} />
              </span>
              <span className="flex -space-x-3">
                {productsIn('christmas-trees', 4).map((p) => (
                  <span key={p.id} className="block size-11 overflow-hidden rounded-full border-2 border-gold-300 bg-white">
                    <img src={p.image} alt="" className="size-full scale-110 object-cover" />
                  </span>
                ))}
              </span>
            </span>
          </Link>
        </Reveal>

        {SMALL_TILES.map((tile, i) => (
          <Reveal key={tile.category} delay={i + 1}>
            {tile.kind === 'photo' ? (
              <Link to={`/shop?category=${tile.category}`} className={`${TILE} border border-gold-400/20`}>
                <img
                  src={CATEGORY_PHOTOS[tile.category]}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 -z-10 size-full object-cover transition-[scale] duration-700 ease-premium group-hover:scale-[1.06]"
                />
                <span aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-shade via-shade/35 to-transparent" />
                <TileLabel title={tile.title} count={countOf(tile.category)} />
              </Link>
            ) : (
              <Link
                to={`/shop?category=${tile.category}`}
                className={`${TILE} justify-between border border-cream-200 bg-cream-50 shadow-[0_14px_36px_--alpha(var(--color-black)/40%)]`}
              >
                <span className="mb-3 grid min-h-0 flex-1 grid-cols-2 gap-2">
                  {tile.products.map(productById).map((p) => (
                    // The photo is absolute, so its own size never stretches the tile.
                    <span key={p.id} className="relative block min-h-24 overflow-hidden rounded-lg bg-white">
                      <img src={p.image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-[scale] duration-500 group-hover:scale-105" />
                    </span>
                  ))}
                </span>
                <TileLabel title={tile.title} count={countOf(tile.category)} light />
              </Link>
            )}
          </Reveal>
        ))}
      </Container>
    </section>

    {/* The brand in numbers */}
    <section className="relative z-20 border-y border-gold-400/15 bg-bg-darker py-6">
      <Container>
        <dl className="grid grid-cols-2 gap-y-5 text-center lg:grid-cols-4">
          {BRAND_STATS.map(({ value, suffix, label }) => (
            <div key={label} className="lg:border-r lg:border-gold-400/15 lg:last:border-r-0">
              <dt className="sr-only">{label}</dt>
              <dd>
                <CountUp value={value} suffix={suffix} className="block font-serif text-[2rem] leading-none font-bold text-gold-300" />
                <span aria-hidden="true" className="mt-1 block text-[0.74rem] tracking-[0.12em] text-text-muted uppercase">
                  {label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>

    <section className="relative z-20 bg-bg-primary py-10 md:py-14">
      <Container>
        <RowHeader eyebrow="✦ Featured categories ✦" title="Best of the Season" to="/shop" action="View All Products" />
        <ProductTabs onQuickView={onQuickView} />
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
        <StoriesRow limit={4} />
        <div className="mt-8 text-center">
          <Button variant="outline" to="/shop">
            Browse the Full Collection
            <ArrowRight size={16} strokeWidth={2} />
          </Button>
        </div>
      </Container>
    </section>

    <StoresBand />
  </>
);

export default HomeBento;
