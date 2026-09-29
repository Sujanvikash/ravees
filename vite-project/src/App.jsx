import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import RootLayout from './layout/RootLayout.jsx';
import PageLoader from './components/PageLoader.jsx';

// Storefront
const Home = lazy(() => import('./pages/Home.jsx'));
const Shop = lazy(() => import('./pages/Shop.jsx'));
const ProductDetail = lazy(() => import('./pages/ProductDetail.jsx'));
const TreeStudioPage = lazy(() => import('./pages/TreeStudioPage.jsx'));
const Cart = lazy(() => import('./pages/Cart.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const Showrooms = lazy(() => import('./pages/Showrooms.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const Testimonials = lazy(() => import('./pages/Testimonials.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

// Admin dashboard — its own chunk, never downloaded by storefront-only visitors
const AdminLayout = lazy(() => import('./admin/layout/AdminLayout.jsx'));
const AdminLogin = lazy(() => import('./admin/pages/AdminLogin.jsx'));
const AdminDashboard = lazy(() => import('./admin/pages/AdminDashboard.jsx'));
const AdminProducts = lazy(() => import('./admin/pages/AdminProducts.jsx'));
const AdminProductForm = lazy(() => import('./admin/pages/AdminProductForm.jsx'));
const AdminCategories = lazy(() => import('./admin/pages/AdminCategories.jsx'));
const AdminShowrooms = lazy(() => import('./admin/pages/AdminShowrooms.jsx'));
const AdminTestimonials = lazy(() => import('./admin/pages/AdminTestimonials.jsx'));
const AdminEnquiries = lazy(() => import('./admin/pages/AdminEnquiries.jsx'));

export default function App() {
  return (
    <Routes>
      {/* Storefront */}
      <Route element={<RootLayout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="product/:slug" element={<ProductDetail />} />
        <Route path="tree-studio" element={<TreeStudioPage />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="showrooms" element={<Showrooms />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="testimonials" element={<Testimonials />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin */}
      <Route
        path="admin/login"
        element={
          <Suspense fallback={<PageLoader />}>
            <AdminLogin />
          </Suspense>
        }
      />
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="products/new" element={<AdminProductForm />} />
        <Route path="products/:id/edit" element={<AdminProductForm />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="showrooms" element={<AdminShowrooms />} />
        <Route path="testimonials" element={<AdminTestimonials />} />
        <Route path="enquiries" element={<AdminEnquiries />} />
      </Route>
    </Routes>
  );
}
