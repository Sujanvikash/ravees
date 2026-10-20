import { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import { useStore } from './context/StoreContext.jsx';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { NAV } from './lib/nav.js';
import { ordersNeedingAction } from './lib/orders.js';
import Counter from './pages/Counter.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Inventory from './pages/Inventory.jsx';
import Login from './pages/Login.jsx';
import PurchaseOrders from './pages/PurchaseOrders.jsx';
import Sales from './pages/Sales.jsx';

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

  const props = { session, onMenu: () => setMenuOpen(true), onNavigate: setPage };

  return (
    <div className="flex min-h-dvh lg:h-dvh lg:overflow-hidden">
      <Sidebar
        session={session}
        page={page}
        onPage={setPage}
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
      </div>
    </div>
  );
};

const App = () => {
  const [session, setSession] = useLocalStorage('billing-session', null);
  if (!session) return <Login onSignedIn={setSession} />;
  return <Shell key={session.username} session={session} onSignOut={() => setSession(null)} />;
};

export default App;
