import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Tags,
  Store,
  MessageSquareQuote,
  Inbox,
  ExternalLink,
  ReceiptText,
  Users,
  Settings,
} from 'lucide-react';
import Logo from '../../components/Logo.jsx';

const NAV = [
  { to: '/admin', label: 'Overview', Icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', Icon: ReceiptText },
  { to: '/admin/enquiries', label: 'Enquiries', Icon: Inbox },
  { to: '/admin/products', label: 'Products', Icon: Package },
  { to: '/admin/categories', label: 'Categories', Icon: Tags },
  { to: '/admin/customers', label: 'Customers', Icon: Users },
  { to: '/admin/showrooms', label: 'Showrooms', Icon: Store },
  { to: '/admin/testimonials', label: 'Testimonials', Icon: MessageSquareQuote },
  { to: '/admin/settings', label: 'Settings', Icon: Settings },
];

const AdminSidebar = () => {
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-gold-400/20 bg-surface p-5 lg:flex">
      {/* The shop's own logo on its white plate, as in the website's header, with what this is under it. */}
      <div className="mb-7 flex flex-col items-start gap-2">
        <Logo height={46} />
        <span className="font-mono text-[0.62rem] tracking-[0.2em] text-gold-400">ADMIN CONSOLE</span>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[0.88rem] no-underline transition-all duration-200 ${
                // The chosen page in the shop's evergreen, like its chosen chips; the rest plain.
                isActive
                  ? 'bg-cta-from font-semibold text-on-cta'
                  : 'text-text-secondary hover:bg-gold-400/10 hover:text-text-primary'
              }`
            }
          >
            <Icon size={17} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <NavLink
        to="/"
        className="mt-auto flex items-center gap-2 rounded-lg border border-gold-400/15 px-3.5 py-2.5 text-[0.82rem] text-text-secondary no-underline transition-all hover:border-gold-400/40 hover:text-gold-300"
      >
        <ExternalLink size={15} strokeWidth={2} />
        View storefront
      </NavLink>
    </aside>
  );
};

export default AdminSidebar;
