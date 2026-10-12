import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Headphones, ShieldCheck, ShoppingBag, Star, TreePine } from 'lucide-react';
import { GRADIENT_TITLE } from '../components/SectionHeading.jsx';
import Button from '../components/Button.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import { PRODUCTS } from '../data/products.js';
import { useCart } from '../context/CartContext.jsx';
import { useSanta } from '../context/SantaContext.jsx';
import Container from '../components/Container.jsx';
import Aurora from '../components/Aurora.jsx';
import Reveal from '../components/Reveal.jsx';
import { heroTreeGlow } from '../assets/decorations';

// The tree icon grows with the height, so the cards read as a scale at a glance.
const HEIGHTS = [
  { value: '6 Feet', sub: 'Compact', icon: 34 },
  { value: '7 Feet', sub: 'Most popular', icon: 40 },
  { value: '8 Feet', sub: 'Grand living', icon: 46 },
  { value: '10 Feet', sub: 'Majestic villa', icon: 52 },
];

// A one-line character note per foliage, shown under its name (trees without one show just the name).
const FOLIAGE_NOTE = {
  'French Pine': 'Lifelike & full',
  'Needle Pine': 'Classic look',
  'Norway Spruce': 'Premium density',
  'Swiss Alps': 'Luxury finish',
};

// The four steps, and which of them each page of the studio shows.
const STEPS = ['Size & Height', 'Foliage Style', 'Lighting & Decor', 'Preview & Enquire'];
const PAGES = [[0, 1], [2], [3]];
const NEXT_LABEL = ['Next: Lighting & Decor', 'Next: Preview & Enquire'];
const pageOf = (step) => PAGES.findIndex((steps) => steps.includes(step));

const PROMISES = [
  { Icon: Headphones, text: 'Free Design Consultation' },
  { Icon: ShieldCheck, text: 'Premium European Quality' },
  { Icon: Star, text: '27 Years of Trust' },
];

const optionsFrom = (category, limit, extraLabel) => {
  const opts = PRODUCTS.filter((p) => p.category === category)
    .slice(0, limit)
    .map((p) => {
      const label = p.name.replace(/\s+Christmas Tree$/i, '');
      return { id: p.id, label, note: FOLIAGE_NOTE[label], image: p.image };
    });
  return extraLabel ? [...opts, { id: 'none', label: extraLabel, image: null }] : opts;
};

const ACTIVE = 'border-gold-300 bg-[linear-gradient(135deg,var(--color-gold-300),var(--color-gold-500))] text-[#04120a] shadow-[0_0_18px_rgba(229,199,139,0.35)]';
const IDLE = 'border-gold-400/15 bg-[rgba(6,22,15,0.8)] text-text-secondary hover:border-gold-400/60 hover:text-white';

/** The tick that pops into the corner of the selected card. */
const Tick = ({ on }) => (
  <Check
    size={16}
    strokeWidth={2.5}
    aria-hidden="true"
    className={`absolute top-2.5 right-2.5 transition-[opacity,scale] duration-300 ease-spring ${on ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
  />
);

/** A numbered block heading on the right: ① CHOOSE HEIGHT & SCALE. */
const BlockTitle = ({ n, children }) => (
  <h3 className="mb-3.5 flex items-center gap-2.5 font-mono text-[0.74rem] uppercase tracking-[0.16em] text-gold-300">
    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-gold-400/40 bg-gold-400/15 text-[0.7rem] font-bold">
      {n}
    </span>
    {children}
  </h3>
);

/** A choice with a small picture (foliage, lights, ornaments): picture, name, and an optional note. */
const OptionCard = ({ option, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`relative flex cursor-pointer items-center gap-3 rounded-xl border p-3 pr-8 text-left transition-all duration-300 ${active ? `animate-select ${ACTIVE}` : IDLE}`}
  >
    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/90">
      {option.image ? (
        <img src={option.image} alt="" loading="lazy" className="size-full object-contain" />
      ) : (
        <TreePine size={24} strokeWidth={1.5} className="text-forest" />
      )}
    </span>
    <span className="min-w-0">
      <span className="block text-[0.86rem] font-semibold leading-snug">{option.label}</span>
      {option.note && <span className="block text-[0.74rem] opacity-80">({option.note})</span>}
    </span>
    <Tick on={active} />
  </button>
);

/**
 * Tree Studio: a guided build in three pages. The photo panel on the left carries the title and the four
 * steps (click one to jump to it); the right shows the current page's choices and a Next button.
 * Page 1 picks size and foliage, page 2 lighting and ornaments, page 3 previews the build and adds it to the cart.
 */
const TreeStudioPage = () => {
  const { addToCart } = useCart();
  const { added, needLogin } = useSanta();
  const previewRef = useRef(null);
  const panelRef = useRef(null);

  const trees = useMemo(() => optionsFrom('christmas-trees', 4), []);
  const lights = useMemo(() => optionsFrom('christmas-lights', 3, 'Unlit (tree only)'), []);
  const ornaments = useMemo(() => optionsFrom('tree-hangings', 3, 'No ornaments'), []);

  const [page, setPage] = useState(0);
  const [height, setHeight] = useState('7 Feet');
  const [tree, setTree] = useState(trees[0]);
  const [light, setLight] = useState(lights[0]);
  const [ornament, setOrnament] = useState(ornaments[0]);

  // Every tree in the data has an image; the fallback only guards against one being added without.
  const previewImage = tree?.image ?? '/images/products/norway-spruce-christmas-tree-1.png';

  const goTo = (next) => {
    setPage(next);
    // Phones stack the panel above the choices: bring the new page's top into view.
    if (window.innerWidth < 1024) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleAddBundle = () => {
    const bundle = {
      id: `studio-bundle-${Date.now()}`,
      name: `Custom ${height} ${tree?.label ?? 'Tree'} Studio Bundle`,
      category: 'christmas-trees',
      categoryLabel: 'Tree Studio Bundle',
      description: `Bespoke studio build — ${height} ${tree?.label}, ${light?.label}, ${ornament?.label}.`,
      specs: [
        { label: 'Height', value: height },
        { label: 'Tree', value: tree?.label ?? '—' },
        { label: 'Lighting', value: light?.label ?? '—' },
        { label: 'Ornaments', value: ornament?.label ?? '—' },
      ],
      sizes: [height],
      images: [previewImage],
      image: previewImage,
      inStock: true,
      priceOnRequest: true,
    };
    // Like a product card: the preview flies into Santa's sack (he falls back to a toast when hidden).
    if (addToCart(bundle, { quiet: true, onNeedLogin: needLogin })) added(bundle, previewRef.current);
  };

  const options = (list, selected, onSelect) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {list.map((opt) => (
        <OptionCard key={opt.id} option={opt} active={selected?.id === opt.id} onClick={() => onSelect(opt)} />
      ))}
    </div>
  );

  return (
    <section className="relative z-20 bg-bg-primary pt-3 pb-16 md:pt-5 md:pb-24">
      <Aurora />
      <Container>
        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
          {/* Left: the photo panel with the title and the steps, then the promises. */}
          <Reveal className="flex flex-col gap-5">
            <div className="relative isolate flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-gold-400/20 p-7 shadow-[0_20px_50px_rgba(0,0,0,0.5)] sm:p-9">
              <img src={heroTreeGlow} alt="" className="absolute inset-0 -z-10 size-full object-cover object-[72%_center]" />
              <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(4,15,10,0.95)_0%,rgba(4,15,10,0.82)_38%,rgba(4,15,10,0.25)_72%,rgba(4,15,10,0.05)_100%)]" />

              <Eyebrow>✦ CREATE YOUR PERFECT TREE ✦</Eyebrow>
              <h1 className={`mb-4 font-serif text-[1.9rem] font-bold leading-[1.15] tracking-[0.04em] sm:text-[2.3rem] ${GRADIENT_TITLE}`}>
                Raave&apos;s Interactive
                <br />
                Tree Studio
              </h1>
              <p className="max-w-[26rem] text-[0.95rem] leading-[1.7] text-text-secondary">
                Customize every detail — height, foliage, lighting density and heirloom ornaments to create a tree
                that&apos;s uniquely yours.
              </p>

              {/* The steps: the current page's are lit, finished ones get a tick. Click to jump. */}
              <ol className="relative mt-8 flex max-w-[20rem] flex-col gap-2 before:absolute before:top-5 before:bottom-5 before:left-[1.45rem] before:w-px before:bg-gold-400/25">
                {STEPS.map((label, i) => {
                  const p = pageOf(i);
                  const current = p === page;
                  const done = p < page;
                  return (
                    <li key={label}>
                      <button
                        type="button"
                        onClick={() => goTo(p)}
                        aria-current={current ? 'step' : undefined}
                        className={`relative flex w-full cursor-pointer items-center gap-4 rounded-lg py-2 pr-3 pl-2.5 text-left text-[0.88rem] transition-colors duration-300 ${
                          current ? 'bg-[linear-gradient(90deg,rgba(229,199,139,0.18),transparent)] text-white' : 'text-text-secondary hover:text-white'
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[0.8rem] font-bold transition-colors duration-300 ${
                            current
                              ? 'border-gold-300 bg-gold-400 text-[#04120a]'
                              : done
                                ? 'border-gold-400/60 bg-[#06160f] text-gold-300'
                                : 'border-gold-400/30 bg-[#06160f] text-text-secondary'
                          }`}
                        >
                          {done ? <Check size={15} strokeWidth={2.5} /> : i + 1}
                        </span>
                        {label}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-gold-400/15 pt-5 sm:grid-cols-3">
              {PROMISES.map(({ Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-[0.82rem] text-text-secondary">
                  <Icon size={24} strokeWidth={1.5} className="shrink-0 text-gold-400" aria-hidden="true" />
                  {text}
                </div>
              ))}
            </div>
          </Reveal>

          {/* Right: the current page. Keyed by page, so each one fades in. */}
          <div ref={panelRef} className="scroll-mt-[calc(var(--header-h)+16px)]">
            <div key={page} className="flex animate-fade-in flex-col gap-7">
              {page === 0 && (
                <>
                  <div>
                    <BlockTitle n="1">Choose height &amp; scale</BlockTitle>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {HEIGHTS.map((h) => {
                        const active = height === h.value;
                        return (
                          <button
                            key={h.value}
                            type="button"
                            onClick={() => setHeight(h.value)}
                            aria-pressed={active}
                            className={`relative flex cursor-pointer flex-col items-center justify-end gap-1.5 rounded-xl border px-2 pt-5 pb-4 text-center transition-all duration-300 ${active ? `animate-select ${ACTIVE}` : IDLE}`}
                          >
                            <span className="flex h-14 items-end">
                              <TreePine size={h.icon} strokeWidth={1.4} className={active ? 'text-forest' : 'text-gold-400'} />
                            </span>
                            <span className="text-[0.95rem] font-semibold">{h.value}</span>
                            <span className="text-[0.72rem] opacity-80">({h.sub})</span>
                            <Tick on={active} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <BlockTitle n="2">Select foliage style</BlockTitle>
                    {options(trees, tree, setTree)}
                  </div>
                </>
              )}

              {page === 1 && (
                <>
                  <div>
                    <BlockTitle n="3">Magical lighting setup</BlockTitle>
                    {options(lights, light, setLight)}
                  </div>
                  <div>
                    <BlockTitle n="3">Heirloom ornament theme</BlockTitle>
                    {options(ornaments, ornament, setOrnament)}
                  </div>
                </>
              )}

              {page === 2 && (
                <div>
                  <BlockTitle n="4">Preview &amp; enquire</BlockTitle>
                  <div className="flex flex-col gap-5 rounded-2xl border border-gold-400/25 bg-[rgba(6,22,15,0.85)] p-6 sm:flex-row">
                    <div className="flex h-56 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white sm:w-44">
                      <img ref={previewRef} src={previewImage} alt="Your tree" className="h-full object-contain" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-text-muted">Your custom bundle</span>
                      <span className="mb-3 font-serif text-[1.3rem] text-gold-200">
                        {height} {tree?.label}
                      </span>
                      <dl className="flex flex-col gap-1.5 text-[0.85rem]">
                        {[
                          ['Height', height],
                          ['Foliage', tree?.label],
                          ['Lighting', light?.label],
                          ['Ornaments', ornament?.label],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-4 border-b border-white/6 pb-1.5">
                            <dt className="text-text-muted">{k}</dt>
                            <dd className="text-right text-white">{v}</dd>
                          </div>
                        ))}
                      </dl>
                      <p className="mt-3 text-[0.78rem] leading-[1.6] text-text-muted">
                        Studio bundles are quoted by our stylists, so the price reflects your exact configuration and
                        installation needs.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {page > 0 && (
                  <Button variant="outline" onClick={() => goTo(page - 1)} className="shrink-0">
                    <ArrowLeft size={16} strokeWidth={2} />
                    Back
                  </Button>
                )}
                {page < PAGES.length - 1 ? (
                  <Button size="lg" full onClick={() => goTo(page + 1)} className="uppercase">
                    {NEXT_LABEL[page]}
                    <ArrowRight size={18} strokeWidth={2} />
                  </Button>
                ) : (
                  <Button size="lg" full onClick={handleAddBundle}>
                    <ShoppingBag size={18} strokeWidth={2} />
                    Add Studio Bundle to Cart
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default TreeStudioPage;
