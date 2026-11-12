import { Award, CreditCard, Store, TreePine } from 'lucide-react';
import Container from '../Container.jsx';
import Reveal from '../Reveal.jsx';
import FeatureItem from '../FeatureItem.jsx';
import { useStorefront } from '../../context/StorefrontContext.jsx';

// Four plain facts (three about the brand; one about paying here), not promises we can't back up.
const itemsFor = (storeCount, cityCount) => [
  { Icon: Award, title: 'No. 1 in Christmas', body: 'India’s largest importer, since 1997' },
  { Icon: TreePine, title: 'European-Standard Trees', body: 'Lush, lifelike, easy to set up' },
  { Icon: Store, title: `${storeCount} Stores Across India`, body: `In ${cityCount} cities, Chennai to Kochi` },
  { Icon: CreditCard, title: 'Pay Securely Online', body: 'UPI, cards, net banking and wallets' },
];

/** A slim row of four brand facts, under a hero. */
const TrustBar = ({ className = '' }) => {
  const { showrooms, stores } = useStorefront();
  return (
  <section className={`relative z-20 border-y border-gold-400/15 bg-[linear-gradient(180deg,var(--color-bg-darker)_0%,var(--color-bg-primary)_100%)] py-3.5 ${className}`}>
    <Container>
      <Reveal className="grid grid-cols-2 gap-x-3 gap-y-3.5 sm:gap-x-4 lg:grid-cols-4 lg:gap-0">
        {itemsFor(stores.length, showrooms.length).map(({ Icon, title, body }) => (
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
};

export default TrustBar;
