import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';

const MOBILE_NAV = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/enquiries', label: 'Enquiries' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/showrooms', label: 'Showrooms' },
  { to: '/admin/testimonials', label: 'Testimonials' },
  { to: '/admin/settings', label: 'Settings' },
];

const AdminTopbar = () => {
  const { session, logout } = useAdminAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-gold-400/20 bg-surface/95 px-5 py-3.5 backdrop-blur-[12px] md:px-8">
      <div className="flex items-center gap-2 text-[0.78rem] text-text-muted">
        <ShieldCheck size={15} strokeWidth={2} className="text-gold-400" />
        <span>Shop admin: changes go live on the website straight away</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Phones and tablets: the sidebar is hidden, so its pages are a wrapping row of links. */}
        <nav className="flex flex-wrap gap-x-3 gap-y-1 lg:hidden">
          {MOBILE_NAV.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `text-[0.8rem] ${isActive ? 'font-semibold text-gold-300 underline underline-offset-4' : 'text-text-secondary hover:text-text-primary'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <span className="hidden font-mono text-[0.78rem] text-gold-300 sm:inline">
          {session?.username}
        </span>
        <button
          onClick={() => {
            logout();
            navigate('/admin/login');
          }}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-gold-400/20 bg-contrast/5 px-3 py-2 text-[0.8rem] text-text-secondary transition-all hover:border-ruby-500/50 hover:text-ruby-500"
        >
          <LogOut size={14} strokeWidth={2} />
          Sign out
        </button>
      </div>
    </header>
  );
};

export default AdminTopbar;
