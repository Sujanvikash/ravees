import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaWhatsapp } from 'react-icons/fa';
import {
  ArrowRight,
  ArrowUp,
  CircleDashed,
  Gift,
  Lightbulb,
  MapPin,
  MessageSquareQuote,
  Phone,
  Sparkles,
  Star,
  TreePine,
} from 'lucide-react';
import { PHONE_HREF, PHONE_DISPLAY, whatsappHref } from '../data/site.js';
import { useToast } from '../context/ToastContext.jsx';
import { useStorefront } from '../context/StorefrontContext.jsx';
import Button from '../components/Button.jsx';
import { Input } from '../components/Input.jsx';
import Logo from '../components/Logo.jsx';
import Decoration from '../components/Decoration.jsx';
import { footerBottomLeft, footerBottomRight, footerTopLeft, footerTopRight } from '../assets/decorations';

// Cut-outs are transparent, so they are shown whole (contain), never cropped or edge-faded.
const CUTOUT = { fade: 'none', imgClassName: 'object-contain!' };

const COLLECTION_LINKS = [
  { label: 'European Christmas Trees', to: '/shop?category=christmas-trees', Icon: TreePine },
  { label: 'Tree Hangings & Baubles', to: '/shop?category=tree-hangings', Icon: Sparkles },
  { label: 'LED Cluster Lights', to: '/shop?category=christmas-lights', Icon: Lightbulb },
  { label: 'Wreaths & Garlands', to: '/shop?category=wreath-garlands', Icon: CircleDashed },
  { label: 'Nativity & Crib Sets', to: '/shop?category=nativity-sets', Icon: Star },
  { label: 'Santa Toys & Home Decor', to: '/shop?category=santa-toy', Icon: Gift },
  { label: 'Christmas Stories', to: '/stories', Icon: MessageSquareQuote },
];

const SOCIALS = [
  { Icon: FaFacebookF, title: 'Facebook', href: 'https://www.facebook.com/raveechristmas' },
  { Icon: FaInstagram, title: 'Instagram', href: 'https://www.instagram.com/christmasraave.in/' },
  { Icon: FaLinkedinIn, title: 'LinkedIn', href: 'https://www.linkedin.com/company/christmasraave/' },
  { Icon: FaWhatsapp, title: 'WhatsApp', href: whatsappHref() },
];

// Column headings: gold serif capitals over a short gold rule.
const HEADING =
  "mb-5 font-serif text-[0.95rem] font-semibold uppercase leading-[1.35] tracking-[0.12em] text-gold-300 after:mt-3 after:block after:h-px after:w-8 after:bg-gold-400/70 after:content-[''] sm:mb-6 sm:text-[1.05rem]";

// Column list links: a gold line icon, then the label; both brighten and the label slides right on hover.
const FOOTER_LINK =
  'group inline-flex items-center gap-3 text-[0.88rem] text-text-secondary no-underline transition-colors duration-300 hover:text-gold-300 focus-visible:text-gold-300';
const FOOTER_LINK_ICON = 'shrink-0 text-gold-400/80 transition-colors duration-300 group-hover:text-gold-300';
const FOOTER_LINK_LABEL = 'transition-transform duration-300 ease-premium group-hover:translate-x-1 group-focus-visible:translate-x-1';

// Legal links in a row along the bottom: a smaller ✦ springs in above the word, like the header.
const FOOTER_LEGAL =
  "relative whitespace-nowrap text-text-muted no-underline transition-colors duration-300 after:pointer-events-none after:absolute after:-top-2.5 after:left-1/2 after:-translate-x-1/2 after:scale-50 after:-rotate-45 after:text-[0.5rem] after:leading-none after:text-gold-400 after:opacity-0 after:drop-shadow-[0_0_6px_--alpha(var(--color-gold-400)/85%)] after:transition-[opacity,scale,rotate] after:duration-400 after:ease-spring after:content-['✦'] hover:text-gold-400 hover:after:scale-100 hover:after:rotate-0 hover:after:opacity-100 focus-visible:text-gold-400 focus-visible:after:scale-100 focus-visible:after:rotate-0 focus-visible:after:opacity-100";

// Thin gold rules between the four columns once they sit in one row.
const COLUMN_DIVIDER = 'xl:border-l xl:border-gold-400/15 xl:pl-12';

const Footer = () => {
  const [email, setEmail] = useState('');
  const { showToast } = useToast();
  const { showrooms } = useStorefront();

  const handleNewsletter = (e) => {
    e.preventDefault();
    showToast('You have been successfully subscribed!');
    setEmail('');
  };

  return (
    <footer className="relative z-20 overflow-hidden border-t border-gold-400/15 bg-bg-deepest pt-8 pb-6">
      {/* The client's footer corners (cut-outs). The top two hang into the empty space either side of the
          R mark: small on phones, as wide as the margin beside the columns from 1440px (so they never sit
          behind the logo). The bottom two stand in that margin, beside the copyright line, so only from 1440px. */}
      <Decoration
        {...CUTOUT}
        src={footerTopLeft}
        className="top-0 left-0 aspect-459/318 w-24 sm:w-[clamp(130px,calc(50vw-576px),300px)]"
      />
      <Decoration
        {...CUTOUT}
        src={footerTopRight}
        className="top-0 right-0 aspect-445/285 w-24 sm:w-[clamp(130px,calc(50vw-576px),300px)]"
      />
      <Decoration
        {...CUTOUT}
        side="hidden min-[1440px]:block"
        src={footerBottomLeft}
        className="bottom-0 left-0 aspect-629/313 w-[min(360px,calc(50vw-576px))]"
      />
      <Decoration
        {...CUTOUT}
        side="hidden min-[1440px]:block"
        src={footerBottomRight}
        className="right-0 bottom-0 aspect-667/390 w-[min(360px,calc(50vw-576px))]"
      />

      {/* Narrower than the page width (Container), so the branches at the sides frame the columns. */}
      <div className="relative mx-auto max-w-300 px-6">
        {/* Top ornament: the logo's R mark between two short gold rules. */}
        <div aria-hidden="true" className="mb-6 flex items-center justify-center gap-4 md:mb-8">
          <span className="h-px w-16 bg-linear-to-r from-transparent to-gold-400/70 sm:w-28" />
          <Logo mark height={34} />
          <span className="h-px w-16 bg-linear-to-l from-transparent to-gold-400/70 sm:w-28" />
        </div>

        {/* Phones: the brand and the newsletter span the width, with the two link lists side by side
            between them, so the footer isn't one long column. Tablets: a 2×2 grid. Wide screens: one row. */}
        <div className="mb-6 grid grid-cols-2 gap-x-6 gap-y-6 md:mb-8 md:gap-8 xl:grid-cols-[1.35fr_0.85fr_1.15fr_1.5fr] xl:gap-0">
          <div className="col-span-2 md:col-span-1 xl:pr-12">
            {/* The brand logo (assets/logo.svg) at a readable size. */}
            <Logo height={84} className="mb-6" />
            <p className="mb-6 max-w-[360px] text-[0.9rem] leading-[1.75] text-text-secondary">
              India&apos;s largest importer of European-standard artificial Christmas trees, cluster lights,
              and luxury holiday decor. Celebrating 27 glorious years in India.
            </p>
            <div className="flex gap-3">
              {SOCIALS.map(({ Icon, title, href }) => (
                <a
                  key={title}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  title={title}
                  aria-label={title}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-gold-400/35 bg-surface text-gold-300 no-underline transition-all duration-300 hover:border-gold-400 hover:bg-gold-400 hover:text-on-gold"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          <div className={COLUMN_DIVIDER}>
            <h4 className={HEADING}>Showroom Locations</h4>
            <ul className="flex list-none flex-col gap-3.5">
              {showrooms.map((room) => (
                <li key={room.id ?? room.city}>
                  <Link to="/showrooms" className={FOOTER_LINK}>
                    <MapPin size={17} strokeWidth={1.6} className={FOOTER_LINK_ICON} />
                    <span className={FOOTER_LINK_LABEL}>
                      {room.city}
                      {room.isFlagship ? ' Flagship' : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={COLUMN_DIVIDER}>
            <h4 className={HEADING}>Signature Collections</h4>
            <ul className="flex list-none flex-col gap-3.5">
              {COLLECTION_LINKS.map(({ label, to, Icon }) => (
                <li key={label}>
                  <Link to={to} className={FOOTER_LINK}>
                    <Icon size={17} strokeWidth={1.6} className={FOOTER_LINK_ICON} />
                    <span className={FOOTER_LINK_LABEL}>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={`col-span-2 md:col-span-1 ${COLUMN_DIVIDER}`}>
            <h4 className={HEADING}>Holiday Newsletter</h4>
            <p className="mb-5 text-[0.9rem] leading-[1.7] text-text-secondary">
              Join the Raave family for early seasonal preview access and exclusive customer invitations.
            </p>
            <form className="mb-6 flex gap-2.5" onSubmit={handleNewsletter}>
              <Input
                type="email"
                required
                placeholder="Enter your email..."
                aria-label="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-w-0 flex-1 bg-surface px-4 py-3"
              />
              <Button size="sm" type="submit" className="px-5">
                Join
                <ArrowRight size={16} strokeWidth={2} />
              </Button>
            </form>
            <a
              href={PHONE_HREF}
              className="group flex items-center gap-4 border-t border-contrast/8 pt-6 no-underline"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold-400/45 text-gold-300 transition-colors duration-300 group-hover:bg-gold-400 group-hover:text-on-gold">
                <Phone size={19} strokeWidth={1.8} />
              </span>
              <span className="flex flex-col">
                <span className="text-[0.8rem] text-text-secondary">Direct Orders Hotline:</span>
                <span className="text-[1.3rem] font-semibold tracking-[0.04em] text-gold-200 sm:text-[1.45rem]">
                  {PHONE_DISPLAY}
                </span>
              </span>
            </a>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-gold-400/20 pt-6 text-[0.8rem] text-text-muted sm:flex-row">
          <p className="text-center sm:text-left">
            &copy; 2026 Raave&apos;s Evergreen. All rights reserved. 27th Anniversary Edition.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link to="/about" className={FOOTER_LEGAL}>
              Privacy Policy
            </Link>
            <span aria-hidden="true" className="h-3.5 w-px bg-contrast/15" />
            <Link to="/about" className={FOOTER_LEGAL}>
              Terms &amp; Warranty
            </Link>
            <span aria-hidden="true" className="h-3.5 w-px bg-contrast/15" />
            <Link to="/contact" className={FOOTER_LEGAL}>
              Shipping Policy
            </Link>
            <button
              type="button"
              aria-label="Back to top"
              title="Back to top"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="ml-2 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-gold-400/40 bg-transparent text-gold-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-400 hover:bg-gold-400 hover:text-on-gold"
            >
              <ArrowUp size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
