import { useMemo, useRef, useState } from 'react';
import { Check, ShoppingBag, Sparkles } from 'lucide-react';
import SectionHeading from '../components/SectionHeading.jsx';
import Button from '../components/Button.jsx';
import { PRODUCTS } from '../data/products.js';
import { useCart } from '../context/CartContext.jsx';
import { useSanta } from '../context/SantaContext.jsx';
import Container from '../components/Container.jsx';
import Aurora from '../components/Aurora.jsx';
import Reveal from '../components/Reveal.jsx';

const HEIGHTS = [
  { value: '6 Feet', sub: '' },
  { value: '7 Feet', sub: 'Most popular' },
  { value: '8 Feet', sub: 'Grand living' },
  { value: '10 Feet', sub: 'Majestic villa' },
];

const optionsFrom = (category, limit, extraLabel) => {
  const opts = PRODUCTS.filter((p) => p.category === category)
    .slice(0, limit)
    .map((p) => ({ id: p.id, label: p.name, image: p.image }));
  return extraLabel ? [...opts, { id: 'none', label: extraLabel, image: null }] : opts;
};

const StepBlock = ({ step, label, delay, children }) => {
  return (
    <Reveal delay={delay} className="flex flex-col gap-3">
      <label className="flex items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-gold-300">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-400/20 text-[0.68rem] font-bold text-gold-300">
          {step}
        </span>
        {label}
      </label>
      {children}
    </Reveal>
  );
};

// One choice in a step. When it becomes the selected one it gives a small springy nudge and a tick pops in.
const OptionButton = ({ active, onClick, children }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-[0.85rem] transition-all duration-300 ${
        active
          ? 'animate-select border-gold-300 bg-gold-500/90 font-semibold text-[#04120a] shadow-[0_0_16px_rgba(229,199,139,0.35)]'
          : 'border-gold-400/15 bg-[rgba(8,28,20,0.85)] text-text-secondary hover:border-gold-400 hover:text-white'
      }`}
    >
      <span>{children}</span>
      <Check
        size={16}
        strokeWidth={2.5}
        aria-hidden="true"
        className={`shrink-0 transition-[opacity,scale] duration-300 ease-spring ${
          active ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
      />
    </button>
  );
};

const TreeStudioPage = () => {
  const { addToCart } = useCart();
  const { added, needLogin } = useSanta();
  const previewRef = useRef(null);

  const trees = useMemo(() => optionsFrom('christmas-trees', 4), []);
  const lights = useMemo(() => optionsFrom('christmas-lights', 3, 'Unlit (tree only)'), []);
  const ornaments = useMemo(() => optionsFrom('tree-hangings', 3, 'No ornaments'), []);

  const [height, setHeight] = useState('7 Feet');
  const [tree, setTree] = useState(trees[0]);
  const [light, setLight] = useState(lights[0]);
  const [ornament, setOrnament] = useState(ornaments[0]);

  // Every tree in the data has an image; the fallback only guards against one being added without.
  const previewImage = tree?.image ?? '/images/products/norway-spruce-christmas-tree-1.png';

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

  const renderOptions = (options, selected, onSelect) => (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {options.map((opt) => (
        <OptionButton key={opt.id} active={selected?.id === opt.id} onClick={() => onSelect(opt)}>
          {opt.label}
        </OptionButton>
      ))}
    </div>
  );

  // Changes whenever the build does, so the summaries replay their fade with the new text.
  const buildKey = `${height}|${tree?.id}|${light?.id}|${ornament?.id}`;

  return (
    <section className="relative z-20 bg-bg-primary pt-10 pb-16 md:pt-14 md:pb-25">
      <Aurora />
      <Container>
        <SectionHeading
          eyebrow="✦ BESPOKE HOLIDAY CURATION ✦"
          title="Raave's Interactive Tree Studio"
          subtitle="Design your complete custom holiday masterpiece — pick height, foliage, lighting density and heirloom ornaments, then send the whole build to our concierge as one request."
        />

        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          {/* Live preview */}
          <Reveal className="flex h-fit flex-col gap-4 lg:sticky lg:top-25">
            {/* Every tree's photo is stacked here; the chosen one cross-fades in while settling from a slight zoom. */}
            <div className="relative h-105 overflow-hidden rounded-2xl border border-gold-400/30 bg-[radial-gradient(circle_at_center,#0a291c_0%,#041009_100%)] shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
              {trees.map((t) => {
                const active = t.id === tree?.id;
                return (
                  <img
                    key={t.id}
                    ref={active ? previewRef : undefined}
                    src={t.image}
                    alt={active ? 'Custom evergreen tree preview' : ''}
                    aria-hidden={!active}
                    loading="eager"
                    className={`absolute inset-0 size-full object-cover transition-[opacity,scale] duration-700 ease-premium ${
                      active ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
                    }`}
                  />
                );
              })}
            </div>
            <div className="rounded-full border border-gold-400/20 bg-[rgba(6,24,17,0.92)] px-5 py-3 text-center text-[0.82rem] text-gold-200">
              <span key={buildKey} className="block animate-fade-in">
                <strong className="font-semibold">{height}</strong> &bull; {tree?.label} &bull; {light?.label}
              </span>
            </div>
          </Reveal>

          {/* Configurator */}
          <div className="flex flex-col gap-7">
            <StepBlock step="1" label="Choose height & scale" delay={0}>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {HEIGHTS.map((h) => (
                  <OptionButton key={h.value} active={height === h.value} onClick={() => setHeight(h.value)}>
                    {h.value}
                    {h.sub && <span className="ml-1 text-[0.72rem] opacity-80">({h.sub})</span>}
                  </OptionButton>
                ))}
              </div>
            </StepBlock>

            <StepBlock step="2" label="Select foliage style" delay={1}>
              {renderOptions(trees, tree, setTree)}
            </StepBlock>

            <StepBlock step="3" label="Magical lighting setup" delay={2}>
              {renderOptions(lights, light, setLight)}
            </StepBlock>

            <StepBlock step="4" label="Heirloom ornament theme" delay={3}>
              {renderOptions(ornaments, ornament, setOrnament)}
            </StepBlock>

            {/* Summary */}
            <Reveal delay={4} className="flex flex-col gap-4 rounded-2xl border border-gold-400/30 bg-[#04120a] p-6">
              <div className="flex items-start gap-3">
                <Sparkles size={20} strokeWidth={2} className="mt-0.5 shrink-0 text-gold-300" />
                <div key={buildKey} className="animate-fade-in">
                  <span className="block font-mono text-[0.8rem] uppercase tracking-widest text-text-muted">
                    Your custom bundle
                  </span>
                  <span className="font-serif text-[1.15rem] text-gold-200">
                    {height} {tree?.label}
                  </span>
                  <p className="mt-1 text-[0.82rem] leading-[1.6] text-text-secondary">
                    {light?.label} · {ornament?.label}
                  </p>
                </div>
              </div>
              <p className="text-[0.8rem] leading-[1.6] text-text-muted">
                Studio bundles are quoted by our stylists so the price reflects your exact configuration and
                installation needs.
              </p>
              <Button full onClick={handleAddBundle}>
                <ShoppingBag size={18} strokeWidth={2} />
                Add Studio Bundle to Cart
              </Button>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default TreeStudioPage;
