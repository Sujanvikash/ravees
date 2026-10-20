import { LogOut, PanelLeftClose, PanelLeftOpen, ShieldCheck, Store, X } from 'lucide-react';
import logo from '../assets/logo.svg';
import { BRAND, locationById } from '../config.js';
import { NAV } from '../lib/nav.js';

/**
 * The left menu. On a wide screen it collapses to an icon rail (remembered per computer); below lg it is
 * a drawer that slides in over the page.
 */
const Sidebar = ({ session, page, onPage, badges = {}, collapsed, onToggle, mobileOpen, onMobileClose, onSignOut }) => {
  const shop = locationById(session.location);
  const items = NAV[session.role];
  const rail = collapsed; // icon-only on lg+; the mobile drawer always shows labels

  const nav = (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {items.map(({ id, label, Icon }) => {
        const on = page === id;
        const badge = badges[id] ?? 0;
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              onPage(id);
              onMobileClose();
            }}
            aria-current={on ? 'page' : undefined}
            title={rail ? `${label}${badge ? ` (${badge} to do)` : ''}` : undefined}
            className={`relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13px] font-medium transition-colors ${
              on ? 'bg-mist text-ink' : 'text-ink-3 hover:bg-mist-2 hover:text-ink'
            } ${rail ? 'lg:justify-center lg:px-0' : ''}`}
          >
            <Icon size={17} strokeWidth={1.9} className={on ? 'text-evergreen-800' : ''} aria-hidden="true" />
            <span className={rail ? 'lg:sr-only' : ''}>{label}</span>
            {badge > 0 && (
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-raave-red px-1.5 text-[11px] font-semibold text-white ${
                  rail ? 'ml-auto lg:absolute lg:top-0.5 lg:right-1 lg:ml-0 lg:h-4 lg:min-w-4 lg:px-1 lg:text-[10px]' : 'ml-auto'
                }`}
              >
                {badge}
                <span className="sr-only"> to do</span>
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-zinc-950/30 backdrop-blur-[2px] lg:hidden print:hidden" onClick={onMobileClose} aria-hidden="true" />
      )}
      <aside
        aria-label="Menu"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-surface transition-[transform,width] duration-200 lg:static lg:z-auto lg:translate-x-0 print:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${rail ? 'lg:w-17' : 'lg:w-60'}`}
      >
        <div className={`flex h-14 shrink-0 items-center border-b border-line px-4 ${rail ? 'lg:justify-center lg:px-0' : ''}`}>
          <img src={logo} alt={BRAND.name} className={`h-9 w-auto ${rail ? 'lg:hidden' : ''}`} />
          <img src="/favicon.png" alt={BRAND.name} className={`hidden size-8 rounded-md ${rail ? 'lg:block' : ''}`} />
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close menu"
            className="ml-auto inline-flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-mist lg:hidden"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">{nav}</div>

        <div className="flex flex-col gap-1 border-t border-line p-3">
          <div className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${rail ? 'lg:justify-center lg:px-0' : ''}`} title={rail ? (shop?.city ?? 'Admin') : undefined}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-evergreen-50 text-evergreen-800">
              {session.role === 'admin' ? <ShieldCheck size={16} aria-hidden="true" /> : <Store size={16} aria-hidden="true" />}
            </span>
            <span className={`min-w-0 leading-tight ${rail ? 'lg:sr-only' : ''}`}>
              <span className="block truncate text-[13px] font-medium">{shop ? `${shop.city} · ${shop.area}` : 'Admin'}</span>
              <span className="block text-xs text-ink-3">{shop ? 'Showroom login' : 'All showrooms'}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            title={rail ? 'Sign out' : undefined}
            className={`flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13px] font-medium text-ink-3 hover:bg-mist-2 hover:text-ink ${rail ? 'lg:justify-center lg:px-0' : ''}`}
          >
            <LogOut size={16} aria-hidden="true" />
            <span className={rail ? 'lg:sr-only' : ''}>Sign out</span>
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label={rail ? 'Expand menu' : 'Collapse menu'}
            title={rail ? 'Expand menu' : 'Collapse menu'}
            className={`hidden h-9 items-center gap-3 rounded-lg px-2.5 text-[13px] font-medium text-ink-3 hover:bg-mist-2 hover:text-ink lg:flex ${rail ? 'lg:justify-center lg:px-0' : ''}`}
          >
            {rail ? <PanelLeftOpen size={16} aria-hidden="true" /> : <PanelLeftClose size={16} aria-hidden="true" />}
            <span className={rail ? 'lg:sr-only' : ''}>Collapse</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
