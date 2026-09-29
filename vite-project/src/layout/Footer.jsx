import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaFacebookF, FaInstagram, FaYoutube, FaWhatsapp } from 'react-icons/fa';
import { useToast } from '../context/ToastContext.jsx';
import { SHOWROOMS } from '../data/showrooms.js';

const COLLECTION_LINKS = [
  { label: 'European Christmas Trees', to: '/shop?category=christmas-trees' },
  { label: 'Tree Hangings & Baubles', to: '/shop?category=tree-hangings' },
  { label: 'LED Cluster Lights', to: '/shop?category=christmas-lights' },
  { label: 'Wreaths & Garlands', to: '/shop?category=wreath-garlands' },
  { label: 'Nativity & Crib Sets', to: '/shop?category=nativity-sets' },
  { label: 'Santa Toys & Home Decor', to: '/shop?category=santa-toy' },
];

const SOCIALS = [
  { Icon: FaFacebookF, title: 'Facebook', href: 'https://www.facebook.com/' },
  { Icon: FaInstagram, title: 'Instagram', href: 'https://www.instagram.com/' },
  { Icon: FaYoutube, title: 'YouTube', href: 'https://www.youtube.com/' },
  { Icon: FaWhatsapp, title: 'WhatsApp', href: 'https://wa.me/919840788950' },
];

const FOOTER_LINK = 'text-[0.85rem] text-text-secondary no-underline transition-colors hover:text-gold-300';

export default function Footer() {
  const [email, setEmail] = useState('');
  const { showToast } = useToast();

  const handleNewsletter = (e) => {
    e.preventDefault();
    showToast('Welcome to the Raave family! Use code RAAVE27 for 10% off.');
    setEmail('');
  };

  return (
    <footer className="relative z-20 border-t border-gold-400/15 bg-[#020704] pt-20 pb-8">
      <div className="mx-auto max-w-[1360px] px-6">
        <div className="mb-14 grid gap-10 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.5fr]">
          <div>
            <img src="/logo.svg" alt="Raave's Evergreen" className="mb-4 h-20 w-[180px] object-contain" />
            <p className="mb-5 text-[0.88rem] leading-[1.7] text-text-secondary">
              India&apos;s largest importer of European-standard artificial Christmas trees, cluster lights,
              and luxury holiday decor. Celebrating 27 glorious years in India.
            </p>
            <div className="flex gap-2.5">
              {SOCIALS.map(({ Icon, title, href }) => (
                <a
                  key={title}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  title={title}
                  aria-label={title}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-400/15 bg-white/6 text-gold-300 no-underline transition-all duration-300 hover:bg-gold-400 hover:text-[#04120a]"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-5 font-serif text-[1.05rem] tracking-[0.05em] text-white">
              Showroom Locations
            </h4>
            <ul className="flex list-none flex-col gap-2.5">
              {SHOWROOMS.map((room) => (
                <li key={room.city}>
                  <Link to="/showrooms" className={FOOTER_LINK}>
                    {room.city}
                    {room.isFlagship ? ' Flagship' : ''}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-5 font-serif text-[1.05rem] tracking-[0.05em] text-white">
              Signature Collections
            </h4>
            <ul className="flex list-none flex-col gap-2.5">
              {COLLECTION_LINKS.map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className={FOOTER_LINK}>
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/testimonials" className={FOOTER_LINK}>
                  Customer Stories
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-5 font-serif text-[1.05rem] tracking-[0.05em] text-white">
              Holiday Newsletter
            </h4>
            <p className="mb-3.5 text-[0.85rem] text-text-secondary">
              Join the Raave family for early seasonal preview access and exclusive customer invitations.
            </p>
            <form className="mb-5 flex gap-2" onSubmit={handleNewsletter}>
              <input
                type="email"
                required
                placeholder="Enter your email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-lg border border-white/10 bg-white/6 px-3.5 py-2.5 text-[0.85rem] text-white outline-none focus:border-gold-400 placeholder:text-text-muted"
              />
              <button
                type="submit"
                className="cursor-pointer rounded-lg border border-gold-200 bg-[linear-gradient(135deg,var(--color-gold-400),var(--color-gold-600))] px-5 py-2.5 text-[0.85rem] font-semibold text-[#04140b] transition-all hover:bg-[linear-gradient(135deg,#fff0c4,var(--color-gold-400))]"
              >
                Join
              </button>
            </form>
            <div>
              <span className="block text-[0.75rem] text-text-muted">Direct Orders Hotline:</span>
              <a href="tel:+919840788950" className="font-mono text-[1.05rem] text-gold-300 no-underline">
                +91 98407 88950
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/6 pt-6 text-[0.78rem] text-text-muted sm:flex-row">
          <p>&copy; 2026 Raave&apos;s Evergreen. All rights reserved. 27th Anniversary Edition.</p>
          <div className="flex gap-3">
            <Link to="/about" className="text-text-muted no-underline hover:text-gold-400">
              Privacy Policy
            </Link>
            <span>&bull;</span>
            <Link to="/about" className="text-text-muted no-underline hover:text-gold-400">
              Terms &amp; Warranty
            </Link>
            <span>&bull;</span>
            <Link to="/contact" className="text-text-muted no-underline hover:text-gold-400">
              Shipping Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
