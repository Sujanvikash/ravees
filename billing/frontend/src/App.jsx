import { useEffect, useEffectEvent, useState } from 'react';
import Backdrop from './components/Backdrop.jsx';
import Sidebar from './components/Sidebar.jsx';
import { SessionContext } from './context/SessionContext.jsx';
import { useStore } from './context/StoreContext.jsx';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { signOut } from './lib/auth.js';
import { loadCatalogue } from './lib/catalogue.js';
import { NAV } from './lib/nav.js';
import { ordersNeedingAction } from './lib/orders.js';
import Counter from './pages/Counter.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Inventory from './pages/Inventory.jsx';
import Login from './pages/Login.jsx';
import Logins from './pages/Logins.jsx';
import PurchaseOrders from './pages/PurchaseOrders.jsx';
import Quotations from './pages/Quotations.jsx';
import Sales from './pages/Sales.jsx';
import Settings from './pages/Settings.jsx';

/**
 * Sign-in, then the app: a collapsible menu on the left and the chosen page. A showroom login opens on its
 * billing counter, the admin on the dashboard; each remembers the last page it was on.
 */
const Shell = ({ session, onSignOut }) => {
  const { orders } = useStore();
  const items = NAV[session.role];
  const [saved, setPage] = useLocalStorage(`billing-page-${session.username}`, items[0].id);
  const page = items.some((i) => i.id === saved) ? saved : items[0].id;
  const [collapsed, setCollapsed] = useLocalStorage('billing-menu-collapsed', false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Ctrl+Shift+S opens or closes the menu rail, as in ChatGPT.
  const onKey = useEffectEvent((e) => {
    if (!(e.ctrlKey || e.metaKey) || !e.shiftKey || e.altKey || e.code !== 'KeyS') return;
    e.preventDefault();
    setCollapsed(!collapsed);
  });
  useEffect(() => {
    const handler = (e) => onKey(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // A page can open another one at a particular view, e.g. Purchase orders → Inventory's history.
  const [intent, setIntent] = useState(null);
  const navigate = (id, next = null) => {
    setPage(id);
    setIntent(next);
  };
  const props = { session, intent, onMenu: () => setMenuOpen(true), onNavigate: navigate };

  return (
    <SessionContext.Provider value={session}>
      <div className="flex min-h-dvh lg:h-dvh lg:overflow-hidden">
        <Sidebar
          session={session}
          page={page}
          onPage={(id) => navigate(id)}
          badges={{ orders: ordersNeedingAction(orders, session) }}
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          mobileOpen={menuOpen}
          onMobileClose={() => setMenuOpen(false)}
          onSignOut={onSignOut}
        />
        <div className="flex min-w-0 flex-1 flex-col lg:min-h-0">
          {page === 'counter' && <Counter key={session.location} location={session.location} {...props} />}
          {page === 'dashboard' && <Dashboard {...props} />}
          {page === 'sales' && <Sales {...props} />}
          {page === 'inventory' && <Inventory {...props} />}
          {page === 'orders' && <PurchaseOrders {...props} />}
          {page === 'logins' && session.role === 'admin' && <Logins {...props} />}
          {page === 'quotes' && <Quotations key={session.username} {...props} />}
          {page === 'settings' && session.role === 'admin' && <Settings {...props} />}
        </div>
      </div>
    </SessionContext.Provider>
  );
};

/** Loads the product catalogue from the server before the app opens; says so if the server can't be reached. */
const CatalogueGate = ({ children, onSignOut }) => {
  const [state, setState] = useState({ loading: true, error: '' });
  const fetchIt = () =>
    loadCatalogue().then(
      () => setState({ loading: false, error: '' }),
      (err) => setState({ loading: false, error: err.message }),
    );
  const load = () => {
    setState({ loading: true, error: '' });
    fetchIt();
  };
  useEffect(() => {
    fetchIt();
  }, []);

  if (!state.loading && !state.error) return children;
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border glass p-6 text-center">
        {state.loading ? (
          <p className="text-[13px] text-ink-3">Loading products…</p>
        ) : (
          <>
            <p className="text-[15px] font-semibold">Couldn’t load the products</p>
            <p className="mt-1 text-[13px] text-ink-3">{state.error}</p>
            <div className="mt-4 flex justify-center gap-2">
              <button type="button" onClick={onSignOut} className="h-9 rounded-xl px-3.5 text-[13px] font-medium text-ink-2 hover:bg-mist">
                Sign out
              </button>
              <button type="button" onClick={load} className="h-9 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white hover:bg-evergreen-900">
                Try again
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

const App = () => {
  const [session, setSession] = useLocalStorage('billing-session', null);
  const { settings } = useStore();
  const leave = () => {
    signOut();
    setSession(null);
  };

  // The server ended the session (expired, or the admin changed this login's password): back to sign-in.
  useEffect(() => {
    const onSignedOut = () => setSession(null);
    window.addEventListener('billing-signed-out', onSignedOut);
    return () => window.removeEventListener('billing-signed-out', onSignedOut);
  }, [setSession]);

  // The admin's theme (Settings → Appearance) goes on <html>; index.css styles each one.
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.theme = settings.theme;
    html.dataset.wash = settings.wash;
  }, [settings.theme, settings.wash]);

  return (
    <>
      {/* on the sign-in screen the snow falls in front; inside the app it stays behind the panels */}
      {(session ? settings.effectWhere === 'everywhere' : true) && <Backdrop effect={settings.effect} amount={settings.snow} front={!session} />}
      {session ? (
        <CatalogueGate key={session.username} onSignOut={leave}>
          <Shell key={session.username} session={session} onSignOut={leave} />
        </CatalogueGate>
      ) : (
        <Login onSignedIn={setSession} />
      )}
    </>
  );
};

export default App;
