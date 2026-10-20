import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import CartDrawer from './CartDrawer.jsx';
import ToastContainer from './ToastContainer.jsx';
import PageLoader from '../components/PageLoader.jsx';
import SmoothScroll from '../components/SmoothScroll';
import SantaLayer from '../components/SantaLayer/SantaLayer.jsx';
import { SantaProvider } from '../context/SantaContext.jsx';

const RootLayout = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  // SmoothScroll (Lenis) wraps the storefront only; the admin tree stays on native scrolling.
  return (
    <SmoothScroll>
      <SantaProvider>
        <Header onOpenCart={() => setIsCartOpen(true)} />

        <main className="min-h-[60vh]">
          {/* Each new page fades in. Opacity only: a transform here would break the hero's sticky
              stage and every position:fixed popup inside the page. */}
          <div key={pathname} className="animate-page-in">
            <Suspense fallback={<PageLoader />}>
              <Outlet context={{ openCart: () => setIsCartOpen(true) }} />
            </Suspense>
          </div>
        </main>

        <Footer />
        <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        <ToastContainer />
        <SantaLayer onOpenCart={() => setIsCartOpen(true)} />
      </SantaProvider>
    </SmoothScroll>
  );
};

export default RootLayout;
