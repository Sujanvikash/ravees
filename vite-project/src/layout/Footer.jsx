import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaFacebookF, FaInstagram, FaYoutube, FaWhatsapp } from 'react-icons/fa';
import { PHONE_HREF, PHONE_DISPLAY, whatsappHref } from '../data/site.js';
import { useToast } from '../context/ToastContext.jsx';
import { SHOWROOMS } from '../data/showrooms.js';
import Container from '../components/Container.jsx';
import Button from '../components/Button.jsx';
import { Input } from '../components/Input.jsx';
import Decoration from '../components/Decoration.jsx';
import { garlandDivider, pineBranchLeft, pineBranchRight } from '../assets/decorations';

// Bottom-corner branches sit in the space beside the 1360px content column.
const FOOTER_CORNER = 'bottom-0 h-[280px] w-[min(380px,calc((100vw-1360px)/2+100px))]';

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
  { Icon: FaWhatsapp, title: 'WhatsApp', href: whatsappHref() },
];

// The header's gold sparkle, adapted for the footer (Tailwind classes on the link's ::before).
// Column lists: the ✦ springs in to the left and the link slides right to make room for it
// (inline-block, because a translate doesn't move an inline element).
const FOOTER_LINK =
  "relative inline-block text-[0.85rem] text-text-secondary no-underline transition-[color,translate] duration-300 ease-premium before:pointer-events-none before:absolute before:top-1/2 before:-left-3.5 before:-translate-y-1/2 before:scale-50 before:-rotate-45 before:text-[0.6rem] before:leading-none before:text-gold-400 before:opacity-0 before:drop-shadow-[0_0_6px_rgba(229,199,139,0.85)] before:transition-[opacity,scale,rotate] before:duration-400 before:ease-spring before:content-['✦'] hover:translate-x-3.5 hover:text-gold-300 hover:before:scale-100 hover:before:rotate-0 hover:before:opacity-100 focus-visible:translate-x-3.5 focus-visible:text-gold-300 focus-visible:before:scale-100 focus-visible:before:rotate-0 focus-visible:before:opacity-100";

// Legal links in a row along the bottom: a smaller ✦ springs in above the word, like the header.
const FOOTER_LEGAL =
  "relative text-text-muted no-underline transition-colors duration-300 after:pointer-events-none after:absolute after:-top-2.5 after:left-1/2 after:-translate-x-1/2 after:scale-50 after:-rotate-45 after:text-[0.5rem] after:leading-none after:text-gold-400 after:opacity-0 after:drop-shadow-[0_0_6px_rgba(229,199,139,0.85)] after:transition-[opacity,scale,rotate] after:duration-400 after:ease-spring after:content-['✦'] hover:text-gold-400 hover:after:scale-100 hover:after:rotate-0 hover:after:opacity-100 focus-visible:text-gold-400 focus-visible:after:scale-100 focus-visible:after:rotate-0 focus-visible:after:opacity-100";

const Footer = () => {
  const [email, setEmail] = useState('');
  const { showToast } = useToast();

  const handleNewsletter = (e) => {
    e.preventDefault();
    showToast('Welcome to the Raave family! Use code RAAVE27 for 10% off.');
    setEmail('');
  };

  return (
    <footer className="relative z-20 border-t border-gold-400/15 bg-[#020704] pt-20 pb-8">
      {/* Garland laid across the top edge: 48px over the section above (its bottom padding), the rest
          inside the footer's top padding, so it never reaches any text. */}
      <Decoration src={garlandDivider} fade="strip" className="inset-x-0 -top-12 h-32" imgClassName="object-[center_48%]" />
      {/* Pine branches growing up from both bottom corners (the pictures flipped upside down). */}
      <Decoration side src={pineBranchLeft} fade="left" className={`left-0 ${FOOTER_CORNER}`} imgClassName="-scale-y-100 object-left-top" />
      <Decoration side src={pineBranchRight} fade="right" className={`right-0 ${FOOTER_CORNER}`} imgClassName="-scale-y-100 object-right-top" />
      <Container>
        {/* Phones: the brand and the newsletter span the width, with the two link lists side by side
            between them, so the footer isn't one long column. */}
        <div className="mb-10 grid grid-cols-2 gap-x-6 gap-y-9 md:mb-14 md:gap-10 lg:grid-cols-[2fr_1fr_1fr_1.5fr]">
          <div className="col-span-2 md:col-span-1">
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
            <h4 className="mb-4 font-serif text-[1rem] tracking-[0.05em] text-white sm:mb-5 sm:text-[1.05rem]">
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
            <h4 className="mb-4 font-serif text-[1rem] tracking-[0.05em] text-white sm:mb-5 sm:text-[1.05rem]">
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

          <div className="col-span-2 md:col-span-1">
            <h4 className="mb-4 font-serif text-[1rem] tracking-[0.05em] text-white sm:mb-5 sm:text-[1.05rem]">
              Holiday Newsletter
            </h4>
            <p className="mb-3.5 text-[0.85rem] text-text-secondary">
              Join the Raave family for early seasonal preview access and exclusive customer invitations.
            </p>
            <form className="mb-5 flex gap-2" onSubmit={handleNewsletter}>
              <Input
                type="email"
                required
                placeholder="Enter your email..."
                aria-label="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-w-0 flex-1"
              />
              <Button size="sm" type="submit">
                Join
              </Button>
            </form>
            <div>
              <span className="block text-[0.75rem] text-text-muted">Direct Orders Hotline:</span>
              <a href={PHONE_HREF} className="font-mono text-[1.05rem] text-gold-300 no-underline">
                {PHONE_DISPLAY}
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/6 pt-6 text-[0.78rem] text-text-muted sm:flex-row">
          <p>&copy; 2026 Raave&apos;s Evergreen. All rights reserved. 27th Anniversary Edition.</p>
          <div className="flex gap-3">
            <Link to="/about" className={FOOTER_LEGAL}>
              Privacy Policy
            </Link>
            <span>&bull;</span>
            <Link to="/about" className={FOOTER_LEGAL}>
              Terms &amp; Warranty
            </Link>
            <span>&bull;</span>
            <Link to="/contact" className={FOOTER_LEGAL}>
              Shipping Policy
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
