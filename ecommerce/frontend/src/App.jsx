import RequireCustomer from './auth/RequireCustomer.jsx';
import { Suspense, lazy, useLayoutEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import RootLayout from './layout/RootLayout.jsx';
import PageLoader from './components/PageLoader.jsx';

// Storefront
const Home = lazy(() => import('./pages/Home.jsx'));
const Shop = lazy(() => import('./pages/Shop.jsx'));
const ProductDetail = lazy(() => import('./pages/ProductDetail.jsx'));
const Cart = lazy(() => import('./pages/Cart.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const Showrooms = lazy(() => import('./pages/Showrooms.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const Testimonials = lazy(() => import('./pages/Testimonials.jsx'));
const Stories = lazy(() => import('./pages/Stories.jsx'));
const StoryPost = lazy(() => import('./pages/StoryPost.jsx'));
const Login = lazy(() => import('./auth/pages/Login.jsx'));
const Signup = lazy(() => import('./auth/pages/Signup.jsx'));
const ForgotPassword = lazy(() => import('./auth/pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./auth/pages/ResetPassword.jsx'));
const Account = lazy(() => import('./auth/pages/Account.jsx'));
const OrderDetail = lazy(() => import('./auth/pages/OrderDetail.jsx'));
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
const AdminOrders = lazy(() => import('./admin/pages/AdminOrders.jsx'));
const AdminCustomers = lazy(() => import('./admin/pages/AdminCustomers.jsx'));
const AdminSettings = lazy(() => import('./admin/pages/AdminSettings.jsx'));

const App = () => {
  const isAdmin = useLocation().pathname.startsWith('/admin');

  // The admin keeps the dark palette. It goes on <html> so popups rendered into <body> get it too.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('theme-dark', isAdmin);
  }, [isAdmin]);

  return (
    <Routes>
      {/* Storefront */}
      <Route element={<RootLayout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="product/:slug" element={<ProductDetail />} />
        <Route path="cart" element={<RequireCustomer><Cart /></RequireCustomer>} />
        <Route path="checkout" element={<RequireCustomer><Checkout /></RequireCustomer>} />
        <Route path="showrooms" element={<Showrooms />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="testimonials" element={<Testimonials />} />
        <Route path="stories" element={<Stories />} />
        <Route path="stories/:slug" element={<StoryPost />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="account" element={<Account />} />
        <Route path="account/orders/:id" element={<RequireCustomer><OrderDetail /></RequireCustomer>} />
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
        <Route path="orders" element={<AdminOrders />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
  );
};

export default App;
