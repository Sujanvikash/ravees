import { Award, MessageCircle, Store, TreePine } from 'lucide-react';
import Container from '../Container.jsx';
import Reveal from '../Reveal.jsx';
import FeatureItem from '../FeatureItem.jsx';
import { ALL_STORES } from '../../data/showrooms.js';

// Four plain facts about the brand (from the old site), not promises we can't back up.
const ITEMS = [
  { Icon: TreePine, title: 'European-Standard Trees', body: 'Lush, lifelike, easy to set up' },
  { Icon: Award, title: 'India’s Largest Importer', body: 'Since 1997, our 27th year' },
  { Icon: Store, title: `${ALL_STORES.length} Stores Across India`, body: 'Chennai to Goa, six cities' },
  { Icon: MessageCircle, title: 'Order on WhatsApp', body: 'Prices and stock on request' },
];

/** A slim row of four brand facts, under a hero. */
const TrustBar = ({ className = '' }) => (
  <section className={`relative z-20 border-y border-gold-400/15 bg-[linear-gradient(180deg,var(--color-bg-darker)_0%,var(--color-bg-primary)_100%)] py-3.5 ${className}`}>
    <Container>
      <Reveal className="grid grid-cols-2 gap-x-3 gap-y-3.5 sm:gap-x-4 lg:grid-cols-4 lg:gap-0">
        {ITEMS.map(({ Icon, title, body }) => (
          <FeatureItem
            key={title}
            variant="trust"
            Icon={Icon}
            title={title}
            body={body}
            className="lg:border-r lg:border-gold-400/15 lg:px-6 lg:first:pl-0 lg:last:border-r-0"
          />
        ))}
      </Reveal>
    </Container>
  </section>
);

export default TrustBar;
