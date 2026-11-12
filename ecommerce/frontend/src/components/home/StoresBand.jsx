import { Link } from 'react-router-dom';
import { MapPin, Phone, ArrowRight } from 'lucide-react';
import Container from '../Container.jsx';
import Reveal from '../Reveal.jsx';
import Button from '../Button.jsx';
import PageTitle from '../PageTitle.jsx';
import Eyebrow from '../Eyebrow.jsx';
import { telHref } from '../../data/site.js';
import { useStorefront } from '../../context/StorefrontContext.jsx';
import { VISIT_US } from '../../data/home.js';

/**
 * "Visit us": a full-width ivory band with the old site's invitation and "Find a Store" above a card per store
 * (Egmore and ECR each have their own), four to a row from lg: the city, the store and its first phone number.
 * Each card opens the Stores page at its city.
 */
const StoresBand = () => {
  const { showrooms, stores } = useStorefront();
  return (
    <section className="relative isolate z-20 overflow-hidden border-y border-gold-400/15 bg-bg-darker py-10 md:py-14">
      <Container>
        <Reveal className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="max-w-[640px]">
            <Eyebrow>
              ✦ {stores.length} stores in {showrooms.length} cities ✦
            </Eyebrow>
            <PageTitle as="h2" size="lg" className="mb-2">
              {VISIT_US.title}
            </PageTitle>
            <p className="text-[0.95rem] leading-[1.7] text-text-secondary">{VISIT_US.text}</p>
          </div>
          <Button to="/showrooms">
            Find a Store
            <ArrowRight size={16} strokeWidth={2} />
          </Button>
        </Reveal>

        <ul className="grid list-none grid-cols-2 gap-3 lg:grid-cols-4">
          {stores.map((store, i) => {
            const phone = (store.phone || showrooms.find((room) => room.city === store.city)?.phone || '').split('/')[0].trim();
            return (
              <Reveal as="li" key={`${store.city}-${store.name}`} delay={i % 4}>
                <div className="flex h-full flex-col rounded-xl border border-gold-400/20 bg-surface p-4 shadow-[0_8px_24px_--alpha(var(--color-shadow)/15%)]">
                  <Link
                    to={`/showrooms?city=${encodeURIComponent(store.city)}`}
                    className="mb-1.5 flex items-center gap-2 font-serif text-[1.05rem] font-bold text-text-primary no-underline hover:text-gold-300"
                  >
                    <MapPin size={17} strokeWidth={1.8} className="shrink-0 text-gold-400" aria-hidden="true" />
                    {store.city}
                  </Link>
                  {store.name && store.name !== store.city && (
                    <p className="mb-3 text-[0.82rem] leading-[1.5] text-text-secondary">{store.name}</p>
                  )}
                  {phone && (
                    <a
                      href={telHref(phone)}
                      className="mt-auto inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-gold-300 no-underline hover:text-text-primary"
                    >
                      <Phone size={14} strokeWidth={2} aria-hidden="true" />
                      {phone}
                    </a>
                  )}
                </div>
              </Reveal>
            );
          })}
        </ul>
      </Container>
    </section>
  );
};

export default StoresBand;
