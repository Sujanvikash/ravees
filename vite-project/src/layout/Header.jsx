import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, Heart, ShoppingBag, X } from 'lucide-react';
import { TbChristmasTreeFilled } from 'react-icons/tb';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';

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

export default function Header({ onOpenCart }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { totalCount } = useCart();
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();

  const submitSearch = () => {
    setIsSearchOpen(false);
    navigate(searchQuery.trim() ? `/shop?q=${encodeURIComponent(searchQuery.trim())}` : '/shop');
  };

  return (
    <header className="sticky top-0 z-[100] h-[76px] border-b border-gold-400/15 bg-[rgba(5,22,15,0.88)] backdrop-blur-[16px]">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-3 px-4 sm:gap-5 sm:px-6">
        <button
          className="flex shrink-0 cursor-pointer flex-col gap-[5px] border-none bg-transparent lg:hidden"
          aria-label="Toggle navigation menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className="h-0.5 w-6 bg-gold-400" />
          <span className="h-0.5 w-6 bg-gold-400" />
          <span className="h-0.5 w-6 bg-gold-400" />
        </button>

        <Link
          to="/"
          className="flex min-w-0 items-center no-underline max-lg:mr-auto"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <TbChristmasTreeFilled
              size="1em"
              className="shrink-0 text-[30px] text-gold-400 drop-shadow-[0_0_8px_rgba(229,199,139,0.4)] sm:text-[40px]"
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

        <nav className="hidden items-center gap-7 lg:flex">
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
          {/* On phones, search and saved items live in the menu panel to keep the bar one line */}
          <button
            className={`${UTIL_BTN} max-sm:hidden ${isSearchOpen ? 'border-gold-400/40 bg-white/10' : ''}`}
            title="Search products"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            <Search size={18} strokeWidth={2} />
          </button>

          <Link to="/shop?wishlist=1" className={`${UTIL_BTN} max-sm:hidden`} title="Saved items">
            <Heart size={18} strokeWidth={2} />
            <span className={BADGE_COUNT}>{wishlistCount}</span>
          </Link>

          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-gold-400/30 bg-[linear-gradient(135deg,rgba(229,199,139,0.2),rgba(8,28,20,0.8))] px-3.5 py-2 text-[0.8rem] text-gold-300 transition-all duration-300 hover:border-gold-400"
            title="View cart"
            onClick={onOpenCart}
          >
            <ShoppingBag size={18} strokeWidth={2} />
            <span className={BADGE_COUNT}>{totalCount}</span>
            <span className="hidden font-mono font-bold tracking-[0.1em] text-gold-300 sm:inline">
              ENQUIRE
            </span>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav className="relative flex flex-col gap-1 border-b border-gold-400/30 bg-bg-primary px-4 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.6)] sm:px-6 lg:hidden">
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-gold-400/20 bg-white/5 px-3 py-2 sm:hidden">
            <Search size={16} strokeWidth={2} className="shrink-0 text-gold-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setMobileMenuOpen(false);
                  submitSearch();
                }
              }}
              placeholder="Search trees, lights, baubles..."
              className="min-w-0 flex-1 border-none bg-transparent font-sans text-[0.9rem] text-white outline-none placeholder:text-text-muted"
            />
          </div>
          <Link
            to="/shop?wishlist=1"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 text-[0.95rem] font-medium tracking-[0.04em] text-text-secondary no-underline sm:hidden"
          >
            <Heart size={16} strokeWidth={2} className="text-gold-400" />
            Saved items
            <span className={BADGE_COUNT}>{wishlistCount}</span>
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

      {isSearchOpen && (
        <div className="absolute inset-x-0 top-full border-b border-gold-400/30 bg-[rgba(5,20,14,0.96)] px-6 py-4 backdrop-blur-[20px]">
          <div className="mx-auto flex max-w-[800px] items-center gap-3">
            <Search size={20} strokeWidth={2} className="text-gold-400" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
              placeholder="Search Norway Spruce, cluster lights, rose gold garland, crib sets..."
              className="flex-1 border-none bg-transparent font-sans text-[1.1rem] text-white outline-none placeholder:text-text-muted"
            />
            <button
              className="cursor-pointer border-none bg-transparent text-text-muted transition-colors hover:text-white"
              onClick={() => setIsSearchOpen(false)}
              aria-label="Close search"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
