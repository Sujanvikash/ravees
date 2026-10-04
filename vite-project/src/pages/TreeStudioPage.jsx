import { useMemo, useState } from 'react';
import { ShoppingBag, Sparkles } from 'lucide-react';
import SectionHeading from '../components/SectionHeading.jsx';
import Button from '../components/Button.jsx';
import { PRODUCTS } from '../data/products.js';
import { useCart } from '../context/CartContext.jsx';
import Container from '../components/Container.jsx';

const HEIGHTS = [
  { value: '6 Feet', sub: '' },
  { value: '7 Feet', sub: 'Most popular' },
  { value: '8 Feet', sub: 'Grand living' },
  { value: '10 Feet', sub: 'Majestic villa' },
];

const OPT_BTN =
  'cursor-pointer rounded-xl border px-4 py-3 text-left text-[0.85rem] transition-all duration-300';

function optionsFrom(category, limit, extraLabel) {
  const opts = PRODUCTS.filter((p) => p.category === category)
    .slice(0, limit)
    .map((p) => ({ id: p.id, label: p.name, image: p.image }));
  return extraLabel ? [...opts, { id: 'none', label: extraLabel, image: null }] : opts;
}

function StepBlock({ step, label, children }) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-gold-300">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-400/20 text-[0.68rem] font-bold text-gold-300">
          {step}
        </span>
        {label}
      </label>
      {children}
    </div>
  );
}

export default function TreeStudioPage() {
  const { addToCart } = useCart();

  const trees = useMemo(() => optionsFrom('christmas-trees', 4), []);
  const lights = useMemo(() => optionsFrom('christmas-lights', 3, 'Unlit (tree only)'), []);
  const ornaments = useMemo(() => optionsFrom('tree-hangings', 3, 'No ornaments'), []);

  const [height, setHeight] = useState('7 Feet');
  const [tree, setTree] = useState(trees[0]);
  const [light, setLight] = useState(lights[0]);
  const [ornament, setOrnament] = useState(ornaments[0]);

  const previewImage = tree?.image ?? '/frames/frame-242.jpg';

  const handleAddBundle = () => {
    addToCart({
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
    });
  };

  const renderOptions = (options, selected, onSelect) => (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {options.map((opt) => {
        const active = selected?.id === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onSelect(opt)}
            className={`${OPT_BTN} ${
              active
                ? 'border-gold-300 bg-gold-500/90 font-semibold text-[#04120a] shadow-[0_0_16px_rgba(229,199,139,0.35)]'
                : 'border-gold-400/15 bg-[rgba(8,28,20,0.85)] text-text-secondary hover:border-gold-400 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <section className="relative z-20 bg-bg-primary py-16 md:py-25">
      <Container>
        <SectionHeading
          eyebrow="✦ BESPOKE HOLIDAY CURATION ✦"
          title="Raave's Interactive Tree Studio"
          subtitle="Design your complete custom holiday masterpiece — pick height, foliage, lighting density and heirloom ornaments, then send the whole build to our concierge as one request."
        />

        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          {/* Live preview */}
          <div className="flex h-fit flex-col gap-4 lg:sticky lg:top-[100px]">
            <div className="relative overflow-hidden rounded-2xl border border-gold-400/30 bg-[radial-gradient(circle_at_center,#0a291c_0%,#041009_100%)] shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
              <img
                src={previewImage}
                alt="Custom evergreen tree preview"
                className="h-[420px] w-full object-cover"
              />
            </div>
            <div className="rounded-full border border-gold-400/20 bg-[rgba(6,24,17,0.92)] px-5 py-3 text-center text-[0.82rem] text-gold-200">
              <strong className="font-semibold">{height}</strong> &bull; {tree?.label} &bull; {light?.label}
            </div>
          </div>

          {/* Configurator */}
          <div className="flex flex-col gap-7">
            <StepBlock step="1" label="Choose height & scale">
              <div className="grid gap-2.5 sm:grid-cols-2">
                {HEIGHTS.map((h) => (
                  <button
                    key={h.value}
                    onClick={() => setHeight(h.value)}
                    className={`${OPT_BTN} ${
                      height === h.value
                        ? 'border-gold-300 bg-gold-500/90 font-semibold text-[#04120a] shadow-[0_0_16px_rgba(229,199,139,0.35)]'
                        : 'border-gold-400/15 bg-[rgba(8,28,20,0.85)] text-text-secondary hover:border-gold-400 hover:text-white'
                    }`}
                  >
                    {h.value}
                    {h.sub && <span className="ml-1 text-[0.72rem] opacity-80">({h.sub})</span>}
                  </button>
                ))}
              </div>
            </StepBlock>

            <StepBlock step="2" label="Select foliage style">
              {renderOptions(trees, tree, setTree)}
            </StepBlock>

            <StepBlock step="3" label="Magical lighting setup">
              {renderOptions(lights, light, setLight)}
            </StepBlock>

            <StepBlock step="4" label="Heirloom ornament theme">
              {renderOptions(ornaments, ornament, setOrnament)}
            </StepBlock>

            {/* Summary */}
            <div className="flex flex-col gap-4 rounded-2xl border border-gold-400/30 bg-[#04120a] p-6">
              <div className="flex items-start gap-3">
                <Sparkles size={20} strokeWidth={2} className="mt-0.5 shrink-0 text-gold-300" />
                <div>
                  <span className="block text-[0.8rem] uppercase tracking-[0.1em] text-text-muted">
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
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
