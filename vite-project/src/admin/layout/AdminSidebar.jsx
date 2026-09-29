import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Tags,
  Store,
  MessageSquareQuote,
  Inbox,
  ExternalLink,
} from 'lucide-react';
import { TbChristmasTreeFilled } from 'react-icons/tb';

const NAV = [
  { to: '/admin', label: 'Overview', Icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', Icon: Package },
  { to: '/admin/categories', label: 'Categories', Icon: Tags },
  { to: '/admin/showrooms', label: 'Showrooms', Icon: Store },
  { to: '/admin/testimonials', label: 'Testimonials', Icon: MessageSquareQuote },
  { to: '/admin/enquiries', label: 'Enquiries', Icon: Inbox },
];

export default function AdminSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-gold-400/15 bg-[#020704] p-5 lg:flex">
      <div className="mb-8 flex items-center gap-2.5">
        <TbChristmasTreeFilled size={30} className="text-gold-400" />
        <div className="flex flex-col">
          <span className="font-serif text-[0.92rem] font-bold tracking-[0.12em] text-white">RAAVE&apos;S</span>
          <span className="font-mono text-[0.58rem] tracking-[0.2em] text-gold-400">ADMIN CONSOLE</span>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[0.88rem] no-underline transition-all duration-200 ${
                isActive
                  ? 'bg-gold-400/15 font-semibold text-gold-300'
                  : 'text-text-secondary hover:bg-white/5 hover:text-white'
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
}
