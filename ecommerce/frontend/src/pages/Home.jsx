import { Suspense, lazy, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import QuickViewModal from '../components/QuickViewModal.jsx';
import PageLoader from '../components/PageLoader.jsx';
import HomeOptionSwitcher from '../components/home/HomeOptionSwitcher.jsx';

// The home page designs on offer (?option=1…5; 1 without a parameter). Each loads on its own.
// Once one is chosen, it becomes the home page and the rest, with the switcher, go.
const OPTIONS = [
  { id: 1, name: 'Storefront', Page: lazy(() => import('./home/HomeStorefront.jsx')) },
  { id: 2, name: 'Tree Spotlight', Page: lazy(() => import('./home/HomeSpotlight.jsx')) },
  { id: 3, name: 'Marketplace', Page: lazy(() => import('./home/HomeMarketplace.jsx')) },
  { id: 4, name: 'Collections Bento', Page: lazy(() => import('./home/HomeBento.jsx')) },
  { id: 5, name: 'Cream Boutique', Page: lazy(() => import('./home/HomeBoutique.jsx')) },
];

const Home = () => {
  const [params] = useSearchParams();
  const [quickView, setQuickView] = useState(null);
  const { id, Page } = OPTIONS.find((o) => String(o.id) === params.get('option')) ?? OPTIONS[0];

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Page onQuickView={setQuickView} />
      </Suspense>
      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
      <HomeOptionSwitcher options={OPTIONS} current={id} />
    </>
  );
};

export default Home;
