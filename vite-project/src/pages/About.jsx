import { GRADIENT_TITLE } from '../components/SectionHeading.jsx';
import Button from '../components/Button.jsx';
import { ArrowRight } from 'lucide-react';

const STATS = [
  { num: '27+', label: 'Years of Holiday Magic' },
  { num: '100K+', label: 'Homes & Sanctuaries Blessed' },
  { num: '5', label: 'Flagship Showrooms' },
  { num: '100%', label: 'European Certified Safe' },
];

export default function About() {
  return (
    <section className="relative z-20 border-t border-b border-gold-400/15 bg-bg-darker py-16 md:py-25">
      <div className="mx-auto max-w-[1360px] px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_440px]">
          <div>
            <span className="mb-3 inline-block font-mono text-[0.72rem] uppercase tracking-[0.28em] text-gold-400">
              ✦ 27 YEARS IN INDIA &bull; EST. 1998 ✦
            </span>
            <h1 className={`mb-3.5 font-serif text-[2rem] font-bold leading-[1.2] tracking-[0.04em] sm:text-[2.5rem] ${GRADIENT_TITLE}`}>
              More Than A Brand &bull; Raave Is An Emotion
            </h1>

            <p className="mb-5 text-[1.05rem] leading-[1.8] text-text-secondary">
              Twenty-seven years ago, Raave&apos;s Evergreen embarked on a single mission: to replace brittle,
              flimsy plastic trees in India with genuine, breathtaking European-standard artificial Christmas
              trees that honour the sanctity and joy of the festive season.
            </p>
            <p className="mb-5 text-[1.05rem] leading-[1.8] text-text-secondary">
              Today, Raave is trusted by over 100,000 families, cathedral sanctuaries, luxury hotels, and
              diplomatic residences across India. Our trees are built with non-shedding, fire-retardant memory
              materials engineered to bring warm smiles and timeless memories year after year.
            </p>

            <div className="mt-9 grid grid-cols-2 gap-5">
              {STATS.map(({ num, label }) => (
                <div key={label} className="rounded-xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] p-5">
                  <span className="block font-serif text-[2rem] font-bold text-gold-300 sm:text-[2.2rem]">
                    {num}
                  </span>
                  <span className="text-[0.78rem] uppercase tracking-[0.08em] text-text-muted">{label}</span>
                </div>
              ))}
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              <Button to="/shop">
                Explore the Collections
                <ArrowRight size={16} strokeWidth={2} />
              </Button>
              <Button variant="outline" to="/showrooms">
                Visit a Showroom
              </Button>
            </div>
          </div>

          <div className="rounded-[20px] border border-gold-400/30 bg-[radial-gradient(circle_at_center,#0a291c_0%,#041009_100%)] px-8 py-10 text-center shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            <img
              src="/logo.svg"
              alt="Raave's Evergreen emblem"
              className="mx-auto mb-6 h-[180px] w-[220px] object-contain drop-shadow-[0_0_25px_rgba(229,199,139,0.4)]"
            />
            <p className="mb-3 font-quote text-[1.15rem] italic leading-[1.6] text-gold-200">
              &ldquo;For God so loved the world that He gave His one and only Son...&rdquo;
            </p>
            <span className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-gold-400">
              John 3:16 &bull; The reason for the season
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
