import { useEffect, useEffectEvent, useState } from 'react';
import Backdrop from './components/Backdrop.jsx';
import Sidebar from './components/Sidebar.jsx';
import { SessionContext } from './context/SessionContext.jsx';
import { StoreProvider, useStore } from './context/StoreContext.jsx';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { billKey } from './hooks/useBill.js';
import { loadLocations } from './config.js';
import { api } from './lib/api.js';
import { signOut } from './lib/auth.js';
import { loadCatalogue } from './lib/catalogue.js';
import { NAV } from './lib/nav.js';
import { ordersNeedingAction } from './lib/orders.js';
import { overdueCredit } from './lib/payment.js';
import Boxes from './pages/Boxes.jsx';
import CashClose from './pages/CashClose.jsx';
import Counter from './pages/Counter.jsx';
import Credit from './pages/Credit.jsx';
import Customers from './pages/Customers.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Inventory from './pages/Inventory.jsx';
import Login from './pages/Login.jsx';
import Stores from './pages/Stores.jsx';
import PurchaseOrders from './pages/PurchaseOrders.jsx';
import Quotations from './pages/Quotations.jsx';
import Sales from './pages/Sales.jsx';
import Settings from './pages/Settings.jsx';
import StockReturns from './pages/StockReturns.jsx';
import TranslitLayer from './components/TranslitLayer.jsx';

/**
 * Sign-in, then the app: a collapsible menu on the left and the chosen page. A showroom login opens on its
 * billing counter, the admin on the dashboard. A reload keeps the page it was on; signing in again starts at home.
 */
const Shell = ({ session, onSignOut }) => {
  const { orders, stockReturns, sales } = useStore();
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
          badges={{
            orders: ordersNeedingAction(orders, session),
            returns: session.role === 'admin' ? stockReturns.filter((r) => r.status === 'sent').length : 0,
            credit: overdueCredit(sales),
          }}
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
          {page === 'credit' && <Credit key={session.username} {...props} />}
          {page === 'customers' && <Customers key={session.username} {...props} />}
          {page === 'inventory' && <Inventory {...props} />}
          {page === 'orders' && <PurchaseOrders {...props} />}
          {page === 'returns' && <StockReturns {...props} />}
          {page === 'boxes' && <Boxes key={session.username} {...props} />}
          {page === 'cash' && <CashClose key={session.username} {...props} />}
          {page === 'stores' && session.role === 'admin' && <Stores {...props} />}
          {page === 'quotes' && <Quotations key={session.username} {...props} />}
          {page === 'settings' && <Settings {...props} />}
        </div>
      </div>
    </SessionContext.Provider>
  );
};

/** Loads the product catalogue and the showrooms' records from the server before the app opens; says so if the
 * server can't be reached. */
const CatalogueGate = ({ children, onSignOut }) => {
  const { load: loadStore } = useStore();
  const [state, setState] = useState({ loading: true, error: '' });
  const fetchIt = () =>
    Promise.all([loadCatalogue(), loadStore()]).then(
      () => setState({ loading: false, error: '' }),
      (err) => setState({ loading: false, error: err.message }),
    );
  const load = () => {
    setState({ loading: true, error: '' });
    fetchIt();
  };
  const firstLoad = useEffectEvent(fetchIt);
  useEffect(() => {
    firstLoad();
  }, []);

  if (!state.loading && !state.error) return children;
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border glass p-6 text-center">
        {state.loading ? (
          <p className="text-[13px] text-ink-3">Loading products and sales…</p>
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

/** The screens, around the signed-in login's records (or the sign-in screen). */
const Screens = ({ session, setSession }) => {
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

  // The theme and text-size (Settings → Appearance) go on <html>; index.css styles each one. Appearance is per
  // showroom, so this is whatever the signed-in showroom chose (or the admin's default before sign-in).
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.theme = settings.theme;
    html.dataset.wash = settings.wash;
    html.dataset.font = settings.font;
    html.dataset.lang = settings.lang;
    html.lang = settings.lang;
  }, [settings.theme, settings.wash, settings.font, settings.lang]);

  return (
    <>
      {/* shows the app in Tamil script when the showroom chose it; a no-op in English */}
      <TranslitLayer lang={settings.lang} />
      {/* on the sign-in screen the snow falls in front; inside the app it stays behind the panels */}
      <Backdrop effect={settings.effect} amount={settings.snow} front={!session} />
      {session ? (
        <CatalogueGate key={session.username} onSignOut={leave}>
          <Shell key={session.username} session={session} onSignOut={leave} />
        </CatalogueGate>
      ) : (
        <Login
          onSignedIn={(next) => {
            // every sign-in opens on the home page (billing or dashboard), not where the last session left off,
            // and with an empty counter — a fresh sign-in starts a new bill, not whatever the last one left scanned.
            // (A reload restores the session without coming through here, so it still keeps a bill in progress.)
            try {
              window.localStorage.removeItem(`billing-page-${next.username}`);
              window.localStorage.removeItem(billKey(next.location, 'current', next.demo));
            } catch {
              // ignore storage failures (private browsing, etc.)
            }
            setSession(next);
          }}
        />
      )}
    </>
  );
};

/** Loads the store list from the server before anything renders — the sign-in screen and every picker need it,
 *  and it is public (no token), so it runs before sign-in. */
const StoresGate = ({ children }) => {
  const [state, setState] = useState({ loading: true, error: '' });
  const fetchIt = () =>
    api('/locations').then(
      (stores) => {
        loadLocations(stores);
        setState({ loading: false, error: '' });
      },
      (err) => setState({ loading: false, error: err.message }),
    );
  const retry = () => {
    setState({ loading: true, error: '' });
    fetchIt();
  };
  const firstLoad = useEffectEvent(fetchIt);
  useEffect(() => {
    firstLoad();
  }, []);

  if (!state.loading && !state.error) return children;
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border glass p-6 text-center">
        {state.loading ? (
          <p className="text-[13px] text-ink-3">Starting up…</p>
        ) : (
          <>
            <p className="text-[15px] font-semibold">Couldn’t reach the server</p>
            <p className="mt-1 text-[13px] text-ink-3">{state.error}</p>
            <button type="button" onClick={retry} className="mt-4 h-9 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white hover:bg-evergreen-900">
              Try again
            </button>
          </>
        )}
      </div>
    </main>
  );
};

const App = () => {
  const [session, setSession] = useLocalStorage('billing-session', null);
  return (
    <StoresGate>
      <StoreProvider key={session ? `${session.demo ? 'demo-' : ''}${session.username}` : 'signed-out'} session={session}>
        <Screens session={session} setSession={setSession} />
      </StoreProvider>
    </StoresGate>
  );
};

export default App;
