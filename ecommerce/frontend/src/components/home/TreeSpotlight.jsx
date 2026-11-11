import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus, ShoppingCart } from 'lucide-react';
import Container from '../Container.jsx';
import Button from '../Button.jsx';
import Eyebrow from '../Eyebrow.jsx';
import PageTitle from '../PageTitle.jsx';
import PageBackdrop from '../PageBackdrop.jsx';
import WhatsAppLink from '../WhatsAppLink.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { productById, productsIn } from '../../data/home.js';
import { productBg } from '../../assets/backgrounds';

const TREES = productsIn('christmas-trees');

// "Complete the look": a few pieces to dress whichever tree is chosen, placed around the stage.
const ADD_ONS = ['cluster-light-1', 'wonderland-ornaments-18', 'garland-52958'].map(productById).filter(Boolean);
// Where each add-on floats beside the stage on wide screens.
const ADD_ON_SPOTS = ['lg:top-[10%] lg:-left-36', 'lg:top-[44%] lg:-right-36', 'lg:bottom-[8%] lg:-left-32'];

/**
 * Option 2's hero: one tree in the spotlight on a white arched stage, a row of thumbnails to switch
 * between the six trees, and add-on pieces floating round the stage, each one tap from the cart.
 */
const TreeSpotlight = () => {
  const [treeId, setTreeId] = useState(TREES[2]?.id ?? TREES[0].id);
  const tree = TREES.find((t) => t.id === treeId);
  const { addToCart } = useCart();

  return (
    <section className="relative isolate z-20 overflow-hidden bg-bg-darker">
      <PageBackdrop src={productBg} fade="frame" />
      <Container className="grid items-center gap-10 py-8 md:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
        <div>
          <Eyebrow>✦ The tree collection ✦</Eyebrow>
          <PageTitle size="xl" className="mb-3">
            European Standard Trees, Under One Roof
          </PageTitle>
          <p className="mb-5 max-w-[34rem] text-[0.98rem] leading-[1.7] text-text-secondary">
            Bring home the charm of the season with European-standard Christmas trees and a wide array of festive
            decorations, all under one roof.
          </p>

          <p className="mb-2.5 text-[0.72rem] font-semibold tracking-[0.14em] text-gold-400 uppercase">Choose your tree</p>
          <div className="mb-5 grid grid-cols-6 gap-2 sm:max-w-[24rem]">
            {TREES.map((t) => (
              <button
                key={t.id}
                type="button"
                title={t.name}
                aria-label={t.name}
                aria-pressed={t.id === treeId}
                onClick={() => setTreeId(t.id)}
                className={`aspect-3/4 cursor-pointer overflow-hidden rounded-lg border-2 bg-white transition-all duration-300 ${
                  t.id === treeId
                    ? 'border-gold-400 shadow-[0_0_16px_--alpha(var(--color-gold-400)/50%)]'
                    : 'border-transparent opacity-65 hover:opacity-100'
                }`}
              >
                <img src={t.image} alt="" className="size-full scale-105 object-cover" />
              </button>
            ))}
          </div>

          {/* The chosen tree; keyed so each switch replays the fade-in */}
          <div key={tree.id} className="animate-fade-in">
            <div className="mb-1 flex flex-wrap items-center gap-3">
              <h2 className="font-serif text-[1.4rem] font-bold text-white">{tree.name}</h2>
              <span className={`rounded-md px-2 py-0.5 text-[0.66rem] font-semibold text-white ${tree.inStock ? 'bg-forest' : 'bg-ruby-500'}`}>
                {tree.inStock ? 'In Stock' : 'Backorder'}
              </span>
            </div>
            <p className="mb-4 text-[0.88rem] text-text-muted">Price on request</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => addToCart(tree)}>
                <ShoppingCart size={16} strokeWidth={2} />
                Add to Cart
              </Button>
              <Button variant="outline" to={`/product/${tree.id}`}>
                View Details
                <ArrowRight size={16} strokeWidth={2} />
              </Button>
              <WhatsAppLink
                text={`Hello Raave's, I'd like the price of the ${tree.name}.`}
                className="inline-flex items-center gap-2 px-2 text-[0.88rem] font-semibold text-gold-300 no-underline hover:text-white"
              >
                Ask on WhatsApp
              </WhatsAppLink>
            </div>
          </div>
        </div>

        {/* The stage */}
        <div className="relative mx-auto w-full max-w-[19rem] lg:max-w-[min(19rem,calc((100svh-var(--header-h)-4rem)*0.75))]">
          <div className="rounded-t-[14rem] rounded-b-3xl bg-[linear-gradient(160deg,var(--color-gold-200),var(--color-gold-550))] p-[3px] shadow-[0_30px_70px_--alpha(var(--color-black)/60%),0_0_60px_--alpha(var(--color-gold-400)/18%)]">
            <div className="overflow-hidden rounded-t-[14rem] rounded-b-[1.4rem] bg-white">
              <img key={tree.id} src={tree.image} alt={tree.name} className="aspect-3/4 w-full animate-fade-in scale-[1.04] object-cover" />
            </div>
          </div>

          <ul className="mt-4 grid list-none grid-cols-3 gap-2 lg:mt-0">
            {ADD_ONS.map((p, i) => (
              <li key={p.id} className={`lg:absolute lg:w-52 ${ADD_ON_SPOTS[i]}`}>
                <div className="flex items-center gap-2.5 rounded-xl border border-cream-200 bg-cream-50/95 p-2 shadow-[0_12px_28px_--alpha(var(--color-black)/45%)] backdrop-blur-[6px] max-lg:flex-col max-lg:text-center">
                  <Link to={`/product/${p.id}`} className="block size-12 shrink-0 overflow-hidden rounded-lg bg-white">
                    <img src={p.image} alt="" loading="lazy" className="size-full object-cover" />
                  </Link>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.6rem] font-semibold tracking-[0.08em] text-gold-ink uppercase">Complete the look</span>
                    <span className="line-clamp-2 block text-[0.78rem] leading-tight font-semibold text-ink">{p.name}</span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Add ${p.name} to cart`}
                    title="Add to cart"
                    onClick={() => addToCart(p)}
                    className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-forest text-cream-50 transition-colors hover:bg-forest-hover max-lg:hidden"
                  >
                    <Plus size={15} strokeWidth={2.5} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
};

export default TreeSpotlight;
