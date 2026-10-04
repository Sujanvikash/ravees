import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Heart, ShoppingBag, User } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import { useRequireLogin } from '../auth/useRequireLogin.js';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useCustomerAuth } from '../auth/context/CustomerAuthContext.jsx';

const NAV_LINKS = [
  { to: '/', label: '3D Tree Experience', end: true },
  { to: '/shop', label: 'Collections' },
  { to: '/tree-studio', label: 'Tree Studio', tag: 'NEW' },
  { to: '/about', label: 'Why Raave' },
  { to: '/showrooms', label: 'Showrooms' },
  { to: '/contact', label: 'Contact' },
];

const UTIL_BTN =
  'inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[0.8rem] text-text-primary transition-all duration-300 hover:border-gold-400/40 hover:bg-white/10';

const BADGE_COUNT =
  'flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ruby-500 px-1 text-[0.68rem] font-bold text-white';

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export default function Header({ onOpenCart }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { totalCount } = useCart();
  const requireLogin = useRequireLogin();
  const { wishlistCount } = useWishlist();
  const { session, isAuthenticated } = useCustomerAuth();

  return (
    <header className="sticky top-0 z-[100] h-[var(--header-h)] border-b border-gold-400/15 bg-[rgba(5,22,15,0.96)]">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-3 px-4 sm:gap-5 sm:px-6">
        <button
          className="flex shrink-0 cursor-pointer flex-col gap-[5px] border-none bg-transparent xl:hidden"
          aria-label="Toggle navigation menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className="h-0.5 w-6 bg-gold-400" />
          <span className="h-0.5 w-6 bg-gold-400" />
          <span className="h-0.5 w-6 bg-gold-400" />
        </button>

        <Link
          to="/"
          className="flex min-w-0 items-center no-underline max-xl:mr-auto xl:min-w-fit xl:shrink-0"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Logo
              size="1em"
              className="shrink-0 text-[30px] drop-shadow-[0_0_8px_rgba(229,199,139,0.4)] sm:text-[40px]"
            />
            <div className="flex min-w-0 flex-col">
              <span className="whitespace-nowrap font-serif text-[clamp(0.72rem,3.4vw,0.9rem)] font-bold leading-[1.1] tracking-[0.14em] text-white sm:text-[1.15rem] sm:tracking-[0.22em]">
                RAAVE&apos;S EVERGREEN
              </span>
              <span className="hidden text-[0.58rem] font-medium tracking-[0.22em] text-gold-400 sm:block">
                EUROPEAN STANDARD &bull; EST. 1998
              </span>
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 xl:flex">
          {NAV_LINKS.map(({ to, label, tag, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative py-1.5 text-[0.88rem] font-medium tracking-[0.04em] no-underline transition-all duration-300 ${
                  isActive
                    ? 'text-gold-300 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-sm after:bg-gold-400 after:shadow-[0_0_8px_rgba(229,199,139,0.4)] after:content-[""]'
                    : 'text-text-secondary hover:text-gold-300'
                }`
              }
            >
              {label}
              {tag && (
                <span className="ml-1 rounded bg-ruby-500 px-1.5 py-0.5 text-[0.6rem] font-bold text-white">
                  {tag}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2.5">
          {/* On phones, saved items live in the menu panel to keep the bar one line */}
          <Link to="/shop?wishlist=1" className={`${UTIL_BTN} max-md:hidden`} title="Saved items">
            <Heart size={18} strokeWidth={2} />
            <span className={BADGE_COUNT}>{wishlistCount}</span>
          </Link>

          <Link
            to={isAuthenticated ? '/account' : '/login'}
            className={`${UTIL_BTN} max-md:hidden`}
            title={isAuthenticated ? `Signed in as ${session.name}` : 'Sign in'}
          >
            {isAuthenticated ? (
              <span className="text-[0.8rem] font-bold leading-none tracking-[0.04em] text-gold-300">
                {getInitials(session.name)}
              </span>
            ) : (
              <User size={18} strokeWidth={2} />
            )}
          </Link>

          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-gold-400/30 bg-[linear-gradient(135deg,rgba(229,199,139,0.2),rgba(8,28,20,0.8))] px-3.5 py-2 text-[0.8rem] text-gold-300 transition-all duration-300 hover:border-gold-400"
            title="View cart"
            onClick={() => requireLogin('Please sign in to view your cart.') && onOpenCart()}
          >
            <ShoppingBag size={18} strokeWidth={2} />
            <span className={BADGE_COUNT}>{totalCount}</span>
            <span className="hidden font-mono font-bold tracking-widest text-gold-300 sm:inline">
              CART
            </span>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav className="relative flex flex-col gap-1 border-b border-gold-400/30 bg-bg-primary px-4 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.6)] sm:px-6 xl:hidden">
          <Link
            to="/shop?wishlist=1"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 text-[0.95rem] font-medium tracking-[0.04em] text-text-secondary no-underline md:hidden"
          >
            <Heart size={16} strokeWidth={2} className="text-gold-400" />
            Saved items
            <span className={BADGE_COUNT}>{wishlistCount}</span>
          </Link>
          <Link
            to={isAuthenticated ? '/account' : '/login'}
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 text-[0.95rem] font-medium tracking-[0.04em] text-text-secondary no-underline md:hidden"
          >
            <User size={16} strokeWidth={2} className="text-gold-400" />
            {isAuthenticated ? `My Account (${session.name.split(' ')[0]})` : 'Sign In'}
          </Link>
          {NAV_LINKS.map(({ to, label, tag, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `py-2 text-[0.95rem] font-medium tracking-[0.04em] no-underline ${
                  isActive ? 'text-gold-300' : 'text-text-secondary'
                }`
              }
            >
              {label}
              {tag && (
                <span className="ml-1 rounded bg-ruby-500 px-1.5 py-0.5 text-[0.6rem] font-bold text-white">
                  {tag}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
