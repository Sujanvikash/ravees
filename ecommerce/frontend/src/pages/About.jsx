import { TreePine, Leaf, Gem, Heart } from 'lucide-react';
import Container from '../components/Container.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import CountUp from '../components/CountUp.jsx';
import Reveal from '../components/Reveal.jsx';
import FeatureItem from '../components/FeatureItem.jsx';
import Decoration from '../components/Decoration.jsx';
import HangingBauble from '../components/HangingBauble.jsx';
import { ornamentBerryCorner } from '../assets/decorations';
import PageTitle from '../components/PageTitle.jsx';
import { cardClass } from '../components/cardClass.js';
import { useStorefront } from '../context/StorefrontContext.jsx';

// Numbers count up when they scroll into view; the suffix is shown as-is. A stat without a value is a word.
const statsFor = (storeCount) => [
  { word: 'No. 1', label: 'In Christmas, India-wide' },
  { value: new Date().getFullYear() - 1997, suffix: '+', label: 'Years of Holiday Magic' },
  { value: 100, suffix: 'K+', label: 'Homes & Sanctuaries Blessed' },
  { value: storeCount, suffix: '', label: 'Stores Across India' },
];

const PROMISES = [
  { Icon: TreePine, text: 'European-standard craftsmanship' },
  { Icon: Leaf, text: 'Non-shedding & fire-retardant' },
  { Icon: Gem, text: 'Trusted by cathedrals, hotels & residences' },
  { Icon: Heart, text: 'A greener, happier holiday season' },
];

/**
 * Why Raave, on the plain ivory page: the story and its numbers on the left, John 3:16 on a white card on
 * the right (stacked below on smaller screens), and the four promises in a band below. A pine-and-berry
 * corner and a hanging bauble decorate the empty top right on wide screens.
 */
const About = () => {
  const { stores } = useStorefront();
  return (
    <section className="relative isolate z-20 overflow-hidden bg-bg-primary pt-4 md:pt-5">
      <Decoration
        side="hidden xl:block"
        src={ornamentBerryCorner}
        fade="none"
        imgClassName="object-contain! -scale-x-100"
        className="top-0 right-0 aspect-900/697 w-[clamp(180px,16vw,260px)]"
      />
      <HangingBauble side="hidden xl:block" className="right-[calc(16vw+40px)]" width={64} drop={56} />
      <Container className="w-full">
        <div className="grid gap-8 py-6 lg:py-12 xl:grid-cols-[1.1fr_1fr] xl:items-center xl:gap-14">
          <div>
            <Reveal>
              <Eyebrow>✦ INDIA&apos;S NO. 1 IN CHRISTMAS &bull; SINCE 1997 ✦</Eyebrow>
              <PageTitle size="xl" className="mb-5">
                More Than A Brand
                <br />
                Raave Is An Emotion
              </PageTitle>
            </Reveal>

            <Reveal delay={1}>
              <p className="max-w-[38rem] text-[1.02rem] leading-[1.8] text-text-secondary">
                Since 1997, Raave&apos;s Evergreen has had a single mission: to replace brittle, flimsy plastic
                trees in India with genuine, breathtaking European-standard artificial Christmas trees that honour
                the sanctity and joy of the festive season. That mission made us India&apos;s No. 1 in Christmas.
              </p>
            </Reveal>

            <div className="mt-6 grid max-w-[44rem] grid-cols-2 gap-3 sm:grid-cols-4">
              {statsFor(stores.length).map(({ value, suffix, word, label }, i) => (
                <Reveal
                  key={label}
                  delay={i}
                  className={`${cardClass('glass')} @container flex flex-col justify-center px-4 py-5`}
                >
                  {/* The word is sized from its card's width (it is about 6.7 times as wide as it is tall),
                      so "Countless" fits however narrow the cards get. */}
                  {word ? (
                    <span className="block font-serif text-[min(1.2rem,14cqw)] font-bold uppercase tracking-[0.04em] text-gold-300">
                      {word}
                    </span>
                  ) : (
                    <CountUp
                      value={value}
                      suffix={suffix}
                      className="block font-serif text-[1.9rem] font-bold leading-none text-gold-300 sm:text-[2.1rem]"
                    />
                  )}
                  <span className="mt-2 text-[0.66rem] uppercase leading-snug tracking-[0.1em] text-text-muted">
                    {label}
                  </span>
                </Reveal>
              ))}
            </div>
          </div>

          <div className="mx-auto w-full max-w-xl xl:mt-16">
            <Reveal delay={2} className={`${cardClass('raised')} px-6 py-8 text-center sm:px-10 sm:py-10`}>
              <span aria-hidden="true" className="mb-3 block text-[1.1rem] text-gold-400">
                ✦
              </span>
              <p className="font-quote text-[1.3rem] italic leading-[1.5] text-text-primary sm:text-[1.5rem]">
                &ldquo;For God so loved the world
                <br />
                that He gave His one and only Son...&rdquo;
              </p>
              <span className="mt-3 block font-mono text-[0.68rem] uppercase tracking-[0.2em] text-gold-400">
                John 3:16 &bull; The reason for the season
              </span>
            </Reveal>
          </div>
        </div>

        {/* The four promises, divided by thin lines from xl. */}
        <div className="grid grid-cols-1 gap-6 border-t border-gold-400/15 py-9 sm:grid-cols-2 xl:grid-cols-4 xl:gap-0 xl:divide-x xl:divide-gold-400/25 xl:py-8">
          {PROMISES.map(({ Icon, text }, i) => (
            <FeatureItem
              key={text}
              as={Reveal}
              delay={i}
              variant="band"
              Icon={Icon}
              title={text}
              className="xl:justify-center xl:px-6"
            />
          ))}
        </div>
      </Container>
    </section>
  );
};

export default About;
