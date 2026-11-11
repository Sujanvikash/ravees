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
 * "Visit us": a full-width ivory band with the old site's invitation on the left and a card per city on the
 * right (its stores, the first phone number, and a link to the Showrooms page).
 */
const StoresBand = () => {
  const { showrooms, stores } = useStorefront();
  return (
  <section className="relative isolate z-20 overflow-hidden border-y border-gold-400/15 bg-bg-darker py-10 md:py-14">
    <Container className="grid items-center gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-12">
      <Reveal>
        <Eyebrow>
          ✦ {stores.length} stores across India ✦
        </Eyebrow>
        <PageTitle as="h2" size="lg" className="mb-3">
          {VISIT_US.title}
        </PageTitle>
        <p className="mb-6 text-[0.95rem] leading-[1.7] text-text-secondary">{VISIT_US.text}</p>
        <Button to="/showrooms">
          Find a Store
          <ArrowRight size={16} strokeWidth={2} />
        </Button>
      </Reveal>

      <ul className="grid list-none gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {showrooms.map((room, i) => (
          <Reveal as="li" key={room.id ?? room.city} delay={i}>
            <div className="flex h-full flex-col rounded-xl border border-gold-400/20 bg-surface p-4 shadow-[0_8px_24px_--alpha(var(--color-shadow)/15%)]">
              <Link to="/showrooms" className="mb-1.5 flex items-center gap-2 font-serif text-[1.05rem] font-bold text-text-primary no-underline hover:text-gold-300">
                <MapPin size={17} strokeWidth={1.8} className="text-gold-400" aria-hidden="true" />
                {room.city}
              </Link>
              <p className="mb-3 text-[0.82rem] leading-[1.5] text-text-secondary">
                {room.stores.map((store) => store.name).join(' · ')}
              </p>
              <a
                href={telHref(room.phone)}
                className="mt-auto inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-gold-300 no-underline hover:text-text-primary"
              >
                <Phone size={14} strokeWidth={2} aria-hidden="true" />
                {room.phone.split('/')[0].trim()}
              </a>
            </div>
          </Reveal>
        ))}
      </ul>
    </Container>
  </section>
  );
};

export default StoresBand;
