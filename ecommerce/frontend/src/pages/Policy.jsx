import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowRight, Mail, Phone } from 'lucide-react';
import { EMAIL, PHONE_DISPLAY, PHONE_HREF } from '../data/site.js';
import { POLICIES, POLICIES_UPDATED } from '../data/policies.js';
import { useStorefront } from '../context/StorefrontContext.jsx';
import { CHIP_ACTIVE, CHIP_IDLE } from '../components/Chip.jsx';
import WhatsAppLink from '../components/WhatsAppLink.jsx';
import Container from '../components/Container.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import PageTitle from '../components/PageTitle.jsx';
import { cardClass } from '../components/cardClass.js';
import NotFound from './NotFound.jsx';

const CONTACT_ROW =
  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.9rem] text-text-secondary no-underline transition-colors duration-300 hover:bg-gold-400/10 hover:text-text-primary';

/** A section's body: strings are paragraphs, arrays are bulleted lists. */
const Body = ({ items }) =>
  items.map((item, i) =>
    Array.isArray(item) ? (
      <ul key={i} className="flex list-disc flex-col gap-2 pl-5 marker:text-gold-400">
        {item.map((point) => (
          <li key={point} className="pl-1">
            {point}
          </li>
        ))}
      </ul>
    ) : (
      <p key={i}>{item}</p>
    )
  );

/**
 * One of the shop's policies (data/policies.js), chosen by the address: the four policies as chips (a row on
 * phones, a column beside the text from lg), then the title, its three key points, the sections and the ways to
 * reach us, on the plain ivory page.
 */
const Policy = () => {
  const { pathname } = useLocation();
  const { settings } = useStorefront();
  const policy = POLICIES.find((p) => p.path === pathname);
  if (!policy) return <NotFound />;

  const sections = typeof policy.sections === 'function' ? policy.sections(settings) : policy.sections;

  return (
    <section className="relative isolate z-20 bg-bg-primary pt-4 pb-12 md:pt-6 md:pb-16">
      <Container>
        <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12 xl:gap-16">
          <nav aria-label="Shop policies" className="lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start lg:pt-8">
            <ul className="flex list-none flex-wrap gap-2 lg:flex-col">
              {POLICIES.map(({ path, label }) => (
                <li key={path}>
                  <NavLink
                    to={path}
                    className={({ isActive }) =>
                      `block rounded-full border px-4 py-2 text-[0.85rem] no-underline transition-all lg:rounded-lg ${isActive ? CHIP_ACTIVE : CHIP_IDLE}`
                    }
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <article className="max-w-[46rem]">
            <Eyebrow>✦ Shop Policies ✦</Eyebrow>
            <PageTitle size="xl" className="mb-2">
              {policy.title}
            </PageTitle>
            <p className="mb-5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-text-muted">
              Last updated {POLICIES_UPDATED}
            </p>
            <p className="mb-7 text-[1.02rem] leading-[1.75] text-text-secondary">{policy.intro}</p>

            <ul className="mb-9 grid list-none gap-3 sm:grid-cols-3">
              {policy.highlights.map(({ Icon, title, text }) => (
                <li key={title} className={`${cardClass('tile')} flex gap-3 p-4 sm:flex-col sm:gap-2.5`}>
                  <Icon size={22} strokeWidth={1.7} className="mt-0.5 shrink-0 text-gold-400 sm:mt-0" aria-hidden="true" />
                  <span>
                    <strong className="block text-[0.92rem] leading-snug text-text-primary">{title}</strong>
                    <span className="text-[0.84rem] leading-normal text-text-secondary">{text}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-8">
              {sections.map(({ heading, body, links }) => (
                <section key={heading} className="border-t border-gold-400/15 pt-6">
                  <h2 className="mb-3 font-serif text-[1.25rem] font-semibold text-text-primary">{heading}</h2>
                  <div className="flex flex-col gap-3 text-[0.95rem] leading-[1.75] text-text-secondary">
                    <Body items={body} />
                  </div>
                  {links && (
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                      {links.map(({ to, label }) => (
                        <Link
                          key={to}
                          to={to}
                          className="inline-flex items-center gap-1.5 text-[0.9rem] font-medium text-gold-300 underline-offset-4 hover:underline"
                        >
                          Read the {label}
                          <ArrowRight size={15} strokeWidth={2} />
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>

            <div className={`${cardClass('panel')} mt-10 p-5 sm:p-6`}>
              <h2 className="mb-1 font-serif text-[1.15rem] font-semibold text-text-primary">Questions?</h2>
              <p className="mb-3 text-[0.9rem] text-text-secondary">Write to us or call, and quote your order number.</p>
              <div className="-mx-3 flex flex-col sm:flex-row sm:flex-wrap">
                <a href={`mailto:${EMAIL}`} className={CONTACT_ROW}>
                  <Mail size={18} strokeWidth={1.8} className="shrink-0 text-gold-400" />
                  <span className="min-w-0 break-all">{EMAIL}</span>
                </a>
                <WhatsAppLink className={CONTACT_ROW} iconSize={18} iconClassName="shrink-0 text-emerald-400">
                  WhatsApp {PHONE_DISPLAY}
                </WhatsAppLink>
                <a href={PHONE_HREF} className={CONTACT_ROW}>
                  <Phone size={18} strokeWidth={1.8} className="shrink-0 text-gold-400" />
                  Call {PHONE_DISPLAY}
                </a>
              </div>
            </div>
          </article>
        </div>
      </Container>
    </section>
  );
};

export default Policy;
