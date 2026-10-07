import { Sparkles, Target, HeartHandshake } from 'lucide-react';
import Reveal from './Reveal.jsx';
import Flourish from './Flourish.jsx';
import Decoration from './Decoration.jsx';
import { pineCornerCutout, santaChildGift } from '../assets/decorations';

// Draft copy: edit freely.
const PURPOSE = [
  {
    Icon: Sparkles,
    title: 'Vision',
    text: 'To inspire joy, warmth and togetherness in Indian homes by becoming the most trusted name in premium Christmas décor.',
  },
  {
    Icon: Target,
    title: 'Mission',
    text: 'To bring high-quality, timeless Christmas decorations that blend European tradition with modern style, and make every setup effortless.',
  },
  {
    Icon: HeartHandshake,
    title: 'Core Values',
    text: 'Quality, customer delight, craftsmanship and care for every family we serve guide everything we do.',
  },
];

/**
 * "Our Purpose": the cream band on the home page. A Santa photo on the left melts into the cream, with
 * Vision / Mission / Core Values on the right, their icons joined by a thin gold line. A cut-out pine
 * branch decorates the top-right corner on wide screens.
 */
const OurPurpose = () => {
  return (
    <section aria-labelledby="purpose-title" className="relative z-20 isolate overflow-hidden bg-cream-100 text-ink">
      <Decoration side src={pineCornerCutout} fade="right" className="top-0 right-0 h-[340px] w-[230px]" imgClassName="object-left-top" />

      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="relative h-[280px] sm:h-[380px] lg:h-auto lg:min-h-[500px]">
          <img
            src={santaChildGift}
            alt="Santa Claus handing a wrapped present to a smiling girl beside a lit Christmas tree"
            loading="lazy"
            decoding="async"
            className="purpose-photo-fade absolute inset-0 h-full w-full object-cover object-[55%_center]"
          />
        </div>

        <div className="relative px-6 py-14 sm:px-10 lg:py-20 lg:pr-16 xl:pr-24">
          <Reveal className="max-w-[780px]">
            <div className="mb-10 flex items-center gap-4">
              <h2 id="purpose-title" className="font-serif text-[2rem] font-bold leading-[1.2] tracking-[0.03em] text-ink sm:text-[2.4rem]">
                Our Purpose
              </h2>
              <Flourish tone="light" className="hidden sm:block" />
            </div>

            <div className="relative grid gap-10 md:grid-cols-3 md:gap-8">
              {/* thin gold line joining the three icon discs (centre of the first to centre of the last) */}
              <span
                aria-hidden="true"
                className="absolute top-7 left-7 hidden h-px bg-gold-ink/35 md:block md:right-[calc((100%-4rem)/3-1.75rem)]"
              />
              {PURPOSE.map(({ Icon, title, text }) => (
                <div key={title} className="relative">
                  <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold-500/60 bg-forest text-gold-300 shadow-[0_6px_16px_rgba(15,51,34,0.25)]">
                    <Icon size={24} strokeWidth={1.6} aria-hidden="true" />
                  </span>
                  <h3 className="mb-2 font-serif text-[1.15rem] font-bold text-ink">{title}</h3>
                  <p className="text-[0.95rem] leading-[1.7] text-ink-soft">{text}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default OurPurpose;
