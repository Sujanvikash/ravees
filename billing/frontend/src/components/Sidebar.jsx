import { Fragment } from 'react';
import { LogOut, PanelLeft, ShieldCheck, Store, X } from 'lucide-react';
import logo from '../assets/logo.svg';
import { BRAND, locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { NAV } from '../lib/nav.js';
import Kbd from './Kbd.jsx';

const TOGGLE_KEYS = ['Ctrl', 'Shift', 'S'];

/** A dark label beside a control on hover or keyboard focus (wide screens only); the control needs `group relative`. */
const Tip = ({ label, keys }) => (
  <span
    role="tooltip"
    className="pointer-events-none absolute top-1/2 left-full z-50 ml-2.5 hidden -translate-y-1/2 items-center gap-2 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white shadow-[0_8px_20px_-6px_rgba(9,9,11,0.35)] lg:group-hover:flex lg:group-focus-visible:flex"
  >
    {label}
    {keys && (
      <span className="flex gap-0.5">
        {keys.map((k) => (
          <Kbd key={k} tone="dark">
            {k}
          </Kbd>
        ))}
      </span>
    )}
  </span>
);

const iconButton = 'group relative size-9 shrink-0 items-center justify-center rounded-lg text-ink-3 hover:bg-white/70 hover:text-ink';

/**
 * The left menu. On a wide screen it collapses to an icon rail (remembered per computer, toggled from the
 * top or with Ctrl+Shift+S); in the rail the shop mark turns into the open button on hover, and every icon
 * shows its name on hover. Below lg it is a drawer that slides in over the page.
 */
const Sidebar = ({ session, page, onPage, badges = {}, collapsed, onToggle, mobileOpen, onMobileClose, onSignOut }) => {
  const shop = locationById(session.location);
  const items = NAV[session.role];
  const rail = collapsed; // icon-only on lg+; the mobile drawer always shows labels
  const soft = useStore().settings.nav === 'soft'; // the admin's menu-highlight choice
  const who = shop ? `${shop.city} · ${shop.area}` : 'Admin';

  const nav = (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {items.map(({ id, label, Icon, group }, i) => {
        const on = page === id;
        const badge = badges[id] ?? 0;
        const heading = group && group !== items[i - 1]?.group;
        return (
          <Fragment key={id}>
            {heading && (
              <div className={`mb-1 px-2.5 ${i > 0 ? 'mt-2.5' : ''} ${i === 0 && rail ? 'lg:hidden' : ''}`} role="presentation">
                <span className={`text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase ${rail ? 'lg:sr-only' : ''}`}>{group}</span>
                {rail && <span className="mx-auto hidden h-px w-6 bg-ink/10 lg:block" aria-hidden="true" />}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                onPage(id);
                onMobileClose();
              }}
              aria-current={on ? 'page' : undefined}
              className={`group relative flex h-8 items-center gap-3 rounded-lg px-2.5 text-[13px] font-medium transition-colors ${
                on ? (soft ? 'bg-evergreen-50 font-semibold text-evergreen-900 shadow-[inset_3px_0_0_var(--color-evergreen-800)]' : 'brand-gradient font-semibold shadow-[0_1px_2px_rgba(9,9,11,0.15)]') : 'text-ink-2 hover:bg-white/60 hover:text-ink'
              } ${rail ? 'lg:justify-center lg:px-0' : ''}`}
            >
              <Icon size={17} strokeWidth={on ? 2.2 : 1.9} aria-hidden="true" />
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
              {rail && <Tip label={badge ? `${label} · ${badge} to do` : label} />}
            </button>
          </Fragment>
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
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r glass-heavy transition-[transform,width] duration-200 lg:static lg:z-20 lg:translate-x-0 print:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${rail ? 'lg:w-17' : 'lg:w-52'}`}
      >
        <div className={`flex h-16 shrink-0 items-center gap-2 px-4 ${rail ? 'lg:justify-center lg:px-0' : 'lg:pr-3'}`}>
          {/* the logo goes home: the dashboard for the admin, the billing counter for a showroom */}
          <button
            type="button"
            onClick={() => {
              onPage(items[0].id);
              onMobileClose();
            }}
            aria-label={`${BRAND.name}: go to ${items[0].label}`}
            className={`-ml-1 rounded-md p-1 ${rail ? 'lg:hidden' : ''}`}
          >
            <img src={logo} alt="" className="brand-logo h-12 w-auto" />
          </button>

          {/* rail: the shop mark, which becomes the open button on hover */}
          <button type="button" onClick={onToggle} aria-label="Open sidebar" className={`${iconButton} hidden ${rail ? 'lg:flex' : ''}`}>
            <img src="/favicon.png" alt="" className="size-8 rounded-md group-hover:hidden group-focus-visible:hidden" />
            <PanelLeft size={18} className="hidden group-hover:block group-focus-visible:block" aria-hidden="true" />
            <Tip label="Open sidebar" keys={TOGGLE_KEYS} />
          </button>

          <button type="button" onClick={onToggle} aria-label="Close sidebar" className={`${iconButton} ml-auto hidden ${rail ? '' : 'lg:flex'}`}>
            <PanelLeft size={18} aria-hidden="true" />
            <Tip label="Close sidebar" keys={TOGGLE_KEYS} />
          </button>

          <button type="button" onClick={onMobileClose} aria-label="Close menu" className={`${iconButton} ml-auto flex lg:hidden`}>
            <X size={17} />
          </button>
        </div>

        <div className={`flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 pt-1 pb-3 ${rail ? 'lg:overflow-visible' : ''}`}>{nav}</div>

        <div className={`flex flex-col gap-1 border-t border-white/60 p-3 ${rail ? 'lg:items-center' : ''}`}>
          <div className={`group relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${rail ? 'lg:px-0' : ''}`}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-evergreen-50 text-evergreen-800">
              {session.role === 'admin' ? <ShieldCheck size={16} aria-hidden="true" /> : <Store size={16} aria-hidden="true" />}
            </span>
            <span className={`min-w-0 leading-tight ${rail ? 'lg:sr-only' : ''}`}>
              <span className="block truncate text-[13px] font-medium">{shop ? shop.city : 'Admin'}</span>
              <span className="block truncate text-xs text-ink-3">{shop ? shop.area : 'All showrooms'}</span>
            </span>
            {rail && <Tip label={who} />}
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className={`group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 hover:bg-white/60 hover:text-ink ${
              rail ? 'lg:w-9 lg:justify-center lg:px-0' : ''
            }`}
          >
            <LogOut size={16} aria-hidden="true" />
            <span className={rail ? 'lg:sr-only' : ''}>Sign out</span>
            {rail && <Tip label="Sign out" />}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
