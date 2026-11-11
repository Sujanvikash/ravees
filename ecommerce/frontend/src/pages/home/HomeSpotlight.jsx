import Container from '../../components/Container.jsx';
import TreeSpotlight from '../../components/home/TreeSpotlight.jsx';
import TrustBar from '../../components/home/TrustBar.jsx';
import ProductRail from '../../components/home/ProductRail.jsx';
import RowHeader from '../../components/home/RowHeader.jsx';
import CategoryTiles from '../../components/home/CategoryTiles.jsx';
import BrandStory from '../../components/home/BrandStory.jsx';
import StoriesRow from '../../components/home/StoriesRow.jsx';
import StoresBand from '../../components/home/StoresBand.jsx';
import { productsIn } from '../../data/home.js';

/**
 * Option 2, "Tree Spotlight": the tree is the hero. Pick one of six trees on a white stage, then rows of
 * everything that dresses it (lights, ornaments, garlands), the collections, our story and the stores.
 */
const HomeSpotlight = ({ onQuickView }) => (
  <>
    <TreeSpotlight />
    <TrustBar />

    <section className="relative z-20 bg-bg-primary py-10 md:py-12">
      <Container className="flex flex-col gap-10">
        <ProductRail
          eyebrow="✦ Dress your tree ✦"
          title="Wonderland Ornaments"
          to="/shop?category=tree-hangings"
          products={productsIn('tree-hangings', 14)}
          onQuickView={onQuickView}
        />
        <ProductRail
          eyebrow="✦ Make it glow ✦"
          title="Christmas Lights"
          to="/shop?category=christmas-lights"
          products={[...productsIn('christmas-lights'), ...productsIn('wreath-garlands')]}
          action="All Lights"
          onQuickView={onQuickView}
        />
      </Container>
    </section>

    <section className="relative z-20 bg-bg-darker py-10 md:py-12">
      <Container>
        <RowHeader eyebrow="✦ Christmas decorations ✦" title="Shop by Collection" to="/shop" action="All Collections" />
        <CategoryTiles />
      </Container>
    </section>

    <BrandStory />

    <section className="relative z-20 bg-bg-primary py-10 md:py-14">
      <Container className="flex flex-col gap-10">
        <ProductRail
          eyebrow="✦ Santa & friends ✦"
          title="Santa Toys & Nativity"
          to="/shop?category=santa-toy"
          products={[...productsIn('santa-toy', 10), ...productsIn('nativity-sets')]}
          onQuickView={onQuickView}
        />
        <StoriesRow />
      </Container>
    </section>

    <StoresBand />
  </>
);

export default HomeSpotlight;
