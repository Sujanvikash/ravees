import { TreePine, Leaf, Gem, Heart } from 'lucide-react';
import Container from '../components/Container.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import CountUp from '../components/CountUp.jsx';
import Reveal from '../components/Reveal.jsx';
import FeatureItem from '../components/FeatureItem.jsx';
import PageBackdrop from '../components/PageBackdrop.jsx';
import { whyRaaveBg } from '../assets/backgrounds';
import PageTitle from '../components/PageTitle.jsx';
import { cardClass } from '../components/cardClass.js';

// Numbers count up when they scroll into view; the suffix is shown as-is. A stat without a value is a word.
const STATS = [
  { value: 27, suffix: '+', label: 'Years of Holiday Magic' },
  { value: 100, suffix: 'K+', label: 'Homes & Sanctuaries Blessed' },
  { value: 5, suffix: '', label: 'Flagship Destinations' },
  { word: 'Countless', label: 'Cherished Memories' },
];

const PROMISES = [
  { Icon: TreePine, text: 'European-standard craftsmanship' },
  { Icon: Leaf, text: 'Non-shedding & fire-retardant' },
  { Icon: Gem, text: 'Trusted by cathedrals, hotels & residences' },
  { Icon: Heart, text: 'A greener, happier holiday season' },
];

/**
 * Why Raave, after the client's reference design and on their background (ivory, with the nativity in its
 * right 41%): the story and its numbers on the left, John 3:16 on a dark green card at the nativity's base,
 * and the four promises in a band below the background's gold ribbon.
 *
 * From xl the background spans the top at its own shape (1828×860, so 47.05vw tall) and the page is laid
 * out on it: the text beside the nativity, the card over the snow at its foot, the promises under the
 * ribbon. Below xl the background covers the section (cropped to its plain middle) and everything stacks,
 * the nativity shown as a framed crop of the same picture above the card.
 */
const About = () => {
  return (
    <section className="relative isolate z-20 overflow-hidden bg-bg-why pt-4 md:pt-5 xl:flex xl:min-h-[47.05vw] xl:flex-col">
      {/* Below xl the picture is a quarter taller than the section, so its gold ribbon (83-91% down) falls
          below the bottom edge instead of running through the stacked promises, and it is cropped left of
          centre, so neither the nativity (from 59% across) nor the bauble shows behind the text. */}
      <PageBackdrop
        src={whyRaaveBg}
        position="object-[40%_center]"
        light
        className="h-[125%] xl:h-auto xl:aspect-1828/860"
      />
      <Container className="w-full xl:flex xl:flex-1 xl:flex-col">
        <div className="grid gap-8 py-6 xl:min-h-[calc(42.6vw-1.25rem)] xl:grid-cols-[1.1fr_1fr] xl:items-center xl:gap-10 xl:py-0">
          {/* Clear of the hanging bauble at the background's left edge, while the page is narrow enough to reach it. */}
          <div className="xl:pl-12 min-[1440px]:pl-6 2xl:pl-0">
            <Reveal>
              <Eyebrow>✦ 27 YEARS IN INDIA &bull; EST. 1998 ✦</Eyebrow>
              <PageTitle size="xl" className="mb-5">
                More Than A Brand
                <br />
                Raave Is An Emotion
              </PageTitle>
            </Reveal>

            <Reveal delay={1}>
              <p className="max-w-[38rem] text-[1.02rem] leading-[1.8] text-text-secondary">
                Twenty-seven years ago, Raave&apos;s Evergreen embarked on a single mission: to replace brittle,
                flimsy plastic trees in India with genuine, breathtaking European-standard artificial Christmas
                trees that honour the sanctity and joy of the festive season.
              </p>
            </Reveal>

            <div className="mt-6 grid max-w-[44rem] grid-cols-2 gap-3 sm:grid-cols-4">
              {STATS.map(({ value, suffix, word, label }, i) => (
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

          <div className="mx-auto w-full max-w-2xl">
            {/* Below xl: the nativity, cropped out of the background (its right 42%, from 12% to 74% down: the
                picture is 1828/768 = 238% of the frame's width, and 100px of its 860 down is 18.5% of the
                frame's height), in a frame the card overlaps at the bottom. */}
            <div className="relative aspect-768/540 overflow-hidden rounded-2xl border border-gold-400/20 xl:hidden">
              <img src={whyRaaveBg} alt="" aria-hidden="true" className="absolute top-[-18.5%] right-0 w-[238%] max-w-none" />
            </div>
            {/* From xl the card is placed on the background, over the snow at the nativity's foot: its top 63%
                of the picture down (29.6vw), from 57% to 94% across (the nativity spans 59-100%). It stays
                compact there, so it ends above the gold ribbon (85% down on that side) even at 1280px. */}
            <Reveal
              delay={2}
              className="theme-dark relative mx-3 -mt-10 rounded-2xl bg-forest px-6 py-7 text-center shadow-[0_20px_50px_--alpha(var(--color-shadow)/25%)] sm:mx-6 sm:py-8 xl:absolute xl:top-[29.6vw] xl:right-[6%] xl:left-[57%] xl:mx-0 xl:mt-0 xl:py-5 2xl:py-6"
            >
              <p className="font-quote text-[1.3rem] italic leading-[1.5] text-text-primary sm:text-[1.5rem] xl:text-[1.3rem] 2xl:text-[1.5rem]">
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

        {/* The four promises. From xl they sit under the background's gold ribbon, divided by thin lines. */}
        <div className="grid grid-cols-1 gap-6 border-t border-gold-400/15 py-9 sm:grid-cols-2 xl:grid-cols-4 xl:gap-0 xl:divide-x xl:divide-gold-400/25 xl:border-t-0 xl:py-6">
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
