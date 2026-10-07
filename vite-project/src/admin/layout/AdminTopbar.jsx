import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, ShieldAlert } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';

const AdminTopbar = () => {
  const { session, logout } = useAdminAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-gold-400/15 bg-[rgba(4,18,10,0.92)] px-5 py-3.5 backdrop-blur-[12px] md:px-8">
      <div className="flex items-center gap-2 text-[0.78rem] text-text-muted">
        <ShieldAlert size={15} strokeWidth={2} className="text-gold-400" />
        <span>Local demo console — data is stored in this browser only</span>
      </div>

      <div className="flex items-center gap-3">
        <nav className="flex gap-2 lg:hidden">
          <NavLink to="/admin" end className="text-[0.8rem] text-gold-300">
            Overview
          </NavLink>
          <NavLink to="/admin/products" className="text-[0.8rem] text-text-secondary">
            Products
          </NavLink>
          <NavLink to="/admin/enquiries" className="text-[0.8rem] text-text-secondary">
            Enquiries
          </NavLink>
        </nav>

        <span className="hidden font-mono text-[0.78rem] text-gold-300 sm:inline">
          {session?.username}
        </span>
        <button
          onClick={() => {
            logout();
            navigate('/admin/login');
          }}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gold-400/20 bg-white/5 px-3 py-2 text-[0.8rem] text-text-secondary transition-all hover:border-ruby-500/50 hover:text-ruby-500"
        >
          <LogOut size={14} strokeWidth={2} />
          Sign out
        </button>
      </div>
    </header>
  );
};

export default AdminTopbar;
