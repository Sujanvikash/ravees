import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Heart, ShoppingBag, User } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import { useRequireLogin } from '../auth/useRequireLogin.js';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useCustomerAuth } from '../auth/context/CustomerAuthContext.jsx';
import PopBadge from '../components/PopBadge.jsx';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Collections' },
  { to: '/tree-studio', label: 'Tree Studio', tag: 'NEW' },
  { to: '/about', label: 'Why Raave' },
  { to: '/showrooms', label: 'Showrooms' },
  { to: '/contact', label: 'Contact' },
];

const UTIL_BTN =
  'inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[0.8rem] text-text-primary transition-all duration-300 hover:border-gold-400/40 hover:bg-white/10';

const BADGE_COUNT =
  'flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ruby-500 px-1 text-[0.68rem] font-bold text-white';

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
};

// The red NEW tag next to a link (Tree Studio).
const NewTag = ({ children }) => (
  <span className="ml-1 rounded bg-ruby-500 px-1.5 py-0.5 text-[0.6rem] font-bold text-white">{children}</span>
);

// The sparkle over a desktop link: springs in on hover / keyboard focus, steady over the active page.
const SPARKLE =
  "relative after:pointer-events-none after:absolute after:-top-2.5 after:left-1/2 after:-translate-x-1/2 after:text-[0.62rem] after:leading-none after:text-gold-400 after:drop-shadow-[0_0_6px_--alpha(var(--color-gold-400)/85%)] after:transition-[opacity,scale,rotate] after:duration-400 after:ease-spring after:content-['✦']";

/**
 * One navigation link, for the desktop bar and the phone menu alike. On desktop a small gold sparkle springs
 * in above the word (it sits on the label, so a tag like NEW doesn't pull it off-centre); in the phone menu
 * the link closes the menu when tapped.
 */
const NavItem = ({ link: { to, label, tag, end }, mobile = false, onClick }) => (
  <NavLink
    to={to}
    end={end}
    onClick={onClick}
    className={({ isActive }) =>
      mobile
        ? `py-2 text-[0.95rem] font-medium tracking-[0.04em] no-underline ${isActive ? 'text-gold-300' : 'text-text-secondary'}`
        : `group whitespace-nowrap py-1.5 text-[0.88rem] font-medium tracking-[0.04em] no-underline transition-colors duration-300 ${
            isActive ? 'text-gold-300' : 'text-text-secondary hover:text-gold-300 focus-visible:text-gold-300'
          }`
    }
  >
    {({ isActive }) => (
      <>
        {mobile ? (
          label
        ) : (
          <span
            className={`${SPARKLE} ${
              isActive
                ? 'after:scale-100 after:opacity-100'
                : 'after:scale-50 after:-rotate-45 after:opacity-0 group-hover:after:scale-100 group-hover:after:rotate-0 group-hover:after:opacity-100 group-focus-visible:after:scale-100 group-focus-visible:after:rotate-0 group-focus-visible:after:opacity-100'
            }`}
          >
            {label}
          </span>
        )}
        {tag && <NewTag>{tag}</NewTag>}
      </>
    )}
  </NavLink>
);

const Header = ({ onOpenCart }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { totalCount } = useCart();
  const requireLogin = useRequireLogin();
  const { wishlistCount } = useWishlist();
  const { session, isAuthenticated } = useCustomerAuth();

  return (
    // On the home page the hero sets --hero-chrome (0 → 1): the header shows on arrival, slides away once the
    // hero starts scrolling and slides back in as the next section arrives. Fully hidden, it is also invisible (out of the tab order, no clicks).
    // Every other page never sets it, so the header just shows.
    <header
      style={{ opacity: 'var(--hero-chrome, 1)', translate: '0 calc((var(--hero-chrome, 1) - 1) * 100%)' }}
      className="sticky top-0 z-[100] h-[var(--header-h)] border-b border-gold-400/15 bg-bg-primary/96 [html[data-hero-chrome-hidden]_&]:invisible"
    >
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
          {/* The brand logo (assets/logo.svg) laid out side by side for the header: its emblem, then the
              wordmark in the logo's gold gradient and its tagline. */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Logo
              size="1em"
              className="shrink-0 text-[28px] drop-shadow-[0_0_8px_--alpha(var(--color-gold-400)/40%)] sm:text-[34px]"
            />
            <div className="flex min-w-0 flex-col sm:self-stretch sm:justify-between">
              <span className="whitespace-nowrap bg-[linear-gradient(135deg,var(--color-gold-100)_0%,var(--color-gold-400)_35%,var(--color-gold-550)_70%,var(--color-gold-250)_100%)] bg-clip-text font-serif text-[clamp(0.72rem,3.4vw,0.9rem)] font-semibold leading-[1.1] tracking-[0.16em] text-transparent sm:text-[1.25rem] sm:leading-none sm:tracking-[0.12em]">
                RAAVE&apos;S EVERGREEN
              </span>
              <span className="hidden text-[0.6rem] font-normal leading-none tracking-[0.14em] text-text-tagline sm:block">
                EUROPEAN STANDARD SINCE 1998
              </span>
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-5 xl:flex 2xl:gap-7">
          {NAV_LINKS.map((link) => (
            <NavItem key={link.to} link={link} />
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2.5">
          {/* On phones, saved items live in the menu panel to keep the bar one line */}
          <Link to="/shop?wishlist=1" className={`${UTIL_BTN} max-md:hidden`} title="Saved items">
            <Heart size={18} strokeWidth={2} />
            <PopBadge count={wishlistCount} className={BADGE_COUNT} />
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-gold-400/30 bg-[linear-gradient(135deg,--alpha(var(--color-gold-400)/20%),--alpha(var(--color-surface)/80%))] px-3 py-1.5 text-[0.8rem] text-gold-300 transition-all duration-300 hover:border-gold-400"
            title="View cart"
            onClick={() => requireLogin('Please sign in to view your cart.') && onOpenCart()}
          >
            <ShoppingBag size={18} strokeWidth={2} />
            <PopBadge count={totalCount} className={BADGE_COUNT} />
            <span className="hidden font-mono font-bold tracking-widest text-gold-300 sm:inline">
              CART
            </span>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav className="relative flex flex-col gap-1 border-b border-gold-400/30 bg-bg-primary px-4 py-4 shadow-[0_20px_40px_--alpha(var(--color-black)/60%)] sm:px-6 xl:hidden">
          <Link
            to="/shop?wishlist=1"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 text-[0.95rem] font-medium tracking-[0.04em] text-text-secondary no-underline md:hidden"
          >
            <Heart size={16} strokeWidth={2} className="text-gold-400" />
            Saved items
            <PopBadge count={wishlistCount} className={BADGE_COUNT} />
          </Link>
          <Link
            to={isAuthenticated ? '/account' : '/login'}
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 text-[0.95rem] font-medium tracking-[0.04em] text-text-secondary no-underline md:hidden"
          >
            <User size={16} strokeWidth={2} className="text-gold-400" />
            {isAuthenticated ? `My Account (${session.name.split(' ')[0]})` : 'Sign In'}
          </Link>
          {NAV_LINKS.map((link) => (
            <NavItem key={link.to} link={link} mobile onClick={() => setMobileMenuOpen(false)} />
          ))}
        </nav>
      )}
    </header>
  );
};

export default Header;
