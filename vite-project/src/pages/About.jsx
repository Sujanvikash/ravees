import { GRADIENT_TITLE } from '../components/SectionHeading.jsx';
import Button from '../components/Button.jsx';
import { ArrowRight } from 'lucide-react';
import Container from '../components/Container.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import Aurora from '../components/Aurora.jsx';
import CountUp from '../components/CountUp.jsx';
import Reveal from '../components/Reveal.jsx';
import Decoration from '../components/Decoration.jsx';
import { nativityCribSet } from '../assets/decorations';

// Numbers count up when they scroll into view; the suffix is shown as-is.
const STATS = [
  { value: 27, suffix: '+', label: 'Years of Holiday Magic' },
  { value: 100, suffix: 'K+', label: 'Homes & Sanctuaries Blessed' },
  { value: 5, suffix: '', label: 'Flagship Showrooms' },
  { value: 100, suffix: '%', label: 'European Certified Safe' },
];

const About = () => {
  return (
    <section className="relative z-20 border-t border-b border-gold-400/15 bg-bg-darker py-16 md:py-25">
      <Aurora />
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_440px]">
          <div>
            <Reveal>
              <Eyebrow>
                ✦ 27 YEARS IN INDIA &bull; EST. 1998 ✦
              </Eyebrow>
              <h1 className={`mb-3.5 font-serif text-[2rem] font-bold leading-[1.2] tracking-[0.04em] sm:text-[2.5rem] ${GRADIENT_TITLE}`}>
                More Than A Brand &bull; Raave Is An Emotion
              </h1>
            </Reveal>

            <Reveal delay={1}>
              <p className="mb-5 text-[1.05rem] leading-[1.8] text-text-secondary">
                Twenty-seven years ago, Raave&apos;s Evergreen embarked on a single mission: to replace brittle,
                flimsy plastic trees in India with genuine, breathtaking European-standard artificial Christmas
                trees that honour the sanctity and joy of the festive season.
              </p>
            </Reveal>
            <Reveal delay={2}>
              <p className="mb-5 text-[1.05rem] leading-[1.8] text-text-secondary">
                Today, Raave is trusted by over 100,000 families, cathedral sanctuaries, luxury hotels, and
                diplomatic residences across India. Our trees are built with non-shedding, fire-retardant memory
                materials engineered to bring warm smiles and timeless memories year after year.
              </p>
            </Reveal>

            <div className="mt-9 grid grid-cols-2 gap-5">
              {STATS.map(({ value, suffix, label }, i) => (
                <Reveal key={label} delay={i} className="rounded-xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] p-5">
                  <CountUp
                    value={value}
                    suffix={suffix}
                    className="block font-serif text-[2rem] font-bold text-gold-300 sm:text-[2.2rem]"
                  />
                  <span className="text-[0.78rem] uppercase tracking-[0.08em] text-text-muted">{label}</span>
                </Reveal>
              ))}
            </div>

            <Reveal className="mt-9 flex flex-wrap gap-3">
              <Button to="/shop">
                Explore the Collections
                <ArrowRight size={16} strokeWidth={2} />
              </Button>
              <Button variant="outline" to="/showrooms">
                Visit a Showroom
              </Button>
            </Reveal>
          </div>

          <Reveal
            delay={2}
            className="relative isolate overflow-hidden rounded-[20px] border border-gold-400/30 bg-[radial-gradient(circle_at_center,#0a291c_0%,#041009_100%)] px-8 py-10 text-center shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
          >
            {/* The nativity, softly behind the John 3:16 verse, drifting very slowly closer. */}
            <Decoration src={nativityCribSet} opacity={0.38} className="inset-0" imgClassName="animate-ken-burns" />
            {/* The emblem's glow breathes gently. */}
            <img
              src="/logo.svg"
              alt="Raave's Evergreen emblem"
              className="mx-auto mb-6 h-[180px] w-[220px] animate-glow object-contain"
            />
            <p className="mb-3 font-quote text-[1.15rem] italic leading-[1.6] text-gold-200">
              &ldquo;For God so loved the world that He gave His one and only Son...&rdquo;
            </p>
            <span className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-gold-400">
              John 3:16 &bull; The reason for the season
            </span>
          </Reveal>
        </div>
      </Container>
    </section>
  );
};

export default About;
