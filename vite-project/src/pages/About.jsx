import { TreePine, Leaf, Gem, Heart } from 'lucide-react';
import { GRADIENT_TITLE } from '../components/SectionHeading.jsx';
import Container from '../components/Container.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import CountUp from '../components/CountUp.jsx';
import Reveal from '../components/Reveal.jsx';
import PageBackdrop from '../components/PageBackdrop.jsx';
import { whyRaaveBg } from '../assets/backgrounds';

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
 * Why Raave: the nativity backdrop fills the screen, the story and its numbers on the left, John 3:16
 * over the nativity on the right, and the four promises in a band along the bottom.
 */
const About = () => {
  return (
    <section className="relative isolate z-20 overflow-hidden bg-bg-darker pt-4 md:pt-5">
      <PageBackdrop src={whyRaaveBg} fade="left" />
      <Container>
        <div className="grid min-h-[min(640px,calc(100svh-var(--header-h)-9rem))] items-center gap-10 py-6 lg:grid-cols-[1.25fr_1fr] lg:py-10">
          <div>
            <Reveal>
              <Eyebrow>✦ 27 YEARS IN INDIA &bull; EST. 1998 ✦</Eyebrow>
              <h1
                className={`mb-5 font-serif text-[2rem] font-bold leading-[1.15] tracking-[0.04em] sm:text-[2.6rem] xl:text-[2.9rem] ${GRADIENT_TITLE}`}
              >
                More Than A Brand
                <br />
                Raave Is An Emotion
              </h1>
            </Reveal>

            <Reveal delay={1}>
              <p className="max-w-[38rem] text-[1.02rem] leading-[1.8] text-text-secondary">
                Twenty-seven years ago, Raave&apos;s Evergreen embarked on a single mission: to replace brittle,
                flimsy plastic trees in India with genuine, breathtaking European-standard artificial Christmas
                trees that honour the sanctity and joy of the festive season.
              </p>
            </Reveal>

            <div className="mt-9 grid max-w-[44rem] grid-cols-2 gap-3 sm:grid-cols-4">
              {STATS.map(({ value, suffix, word, label }, i) => (
                <Reveal
                  key={label}
                  delay={i}
                  className="flex flex-col justify-center rounded-xl border border-gold-400/20 bg-[rgba(6,22,15,0.72)] px-4 py-5"
                >
                  {word ? (
                    <span className="block font-serif text-[1.15rem] font-bold uppercase tracking-[0.04em] text-gold-300 sm:text-[1.2rem]">
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

          {/* The verse sits low over the nativity, as a caption to it, on a soft dark glow so it reads over the figures. */}
          <Reveal
            delay={2}
            className="rounded-3xl bg-[radial-gradient(ellipse_at_center,rgba(4,15,10,0.82)_0%,rgba(4,15,10,0.55)_55%,transparent_78%)] px-6 py-8 text-center lg:self-end"
          >
            <p className="font-quote text-[1.3rem] italic leading-[1.5] text-gold-200 [text-shadow:0_2px_12px_rgba(0,0,0,0.9)] sm:text-[1.5rem]">
              &ldquo;For God so loved the world
              <br />
              that He gave His one and only Son...&rdquo;
            </p>
            <span className="mt-3 block font-mono text-[0.68rem] uppercase tracking-[0.2em] text-gold-400 [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
              John 3:16 &bull; The reason for the season
            </span>
          </Reveal>
        </div>

        {/* The four promises, in a band along the bottom of the page. */}
        <div className="grid grid-cols-1 gap-6 border-t border-gold-400/15 py-9 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map(({ Icon, text }, i) => (
            <Reveal key={text} delay={i} className="flex items-center gap-4">
              <Icon size={34} strokeWidth={1.3} className="shrink-0 text-gold-400" aria-hidden="true" />
              <span className="max-w-[15rem] font-mono text-[0.7rem] uppercase leading-[1.6] tracking-[0.14em] text-text-secondary">
                {text}
              </span>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default About;
