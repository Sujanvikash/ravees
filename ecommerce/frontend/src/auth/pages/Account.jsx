import { Navigate, useLocation } from 'react-router-dom';
import { Package } from 'lucide-react';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import ProfileCard from '../components/ProfileCard.jsx';
import PasswordCard from '../components/PasswordCard.jsx';
import OrderList from '../components/OrderList.jsx';
import Eyebrow from '../../components/Eyebrow.jsx';
import Aurora from '../../components/Aurora.jsx';
import PageTitle from '../../components/PageTitle.jsx';
import { sectionClass } from '../../components/sectionClass.js';

/** My account: the profile (name and phone editable), a password change, and the customer's orders. */
const Account = () => {
  const { session, isAuthenticated } = useCustomerAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return (
    <section className={sectionClass('panel')}>
      <Aurora />
      <div className="mx-auto max-w-225 px-6">
        <Eyebrow>
          ✦ MY ACCOUNT ✦
        </Eyebrow>
        <PageTitle className="mb-5">
          Welcome, {session.name.split(' ')[0]}
        </PageTitle>

        <div className="mb-8 grid gap-5 md:grid-cols-[1fr_1.2fr]">
          <ProfileCard />
          <PasswordCard />
        </div>

        <h2 className="mb-4 flex items-center gap-2 font-serif text-[1.25rem] text-white">
          <Package size={18} strokeWidth={2} className="text-gold-400" />
          My Orders
        </h2>
        <OrderList />
      </div>
    </section>
  );
};

export default Account;
