import { useLayoutEffect, useRef, useState } from 'react';
import SectionHeading from '../components/SectionHeading.jsx';
import ShowroomCard from '../components/ShowroomCard.jsx';
import { SHOWROOMS } from '../data/showrooms.js';
import Container from '../components/Container.jsx';
import Aurora from '../components/Aurora.jsx';
import Reveal from '../components/Reveal.jsx';
import Decoration from '../components/Decoration.jsx';
import { pineCrateBaubles } from '../assets/decorations';

const Showrooms = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  // Set on the first city switch: from then on the card slides in on every change (its first
  // appearance is the scroll Reveal's job).
  const [switched, setSwitched] = useState(false);
  const showroom = SHOWROOMS[activeIdx];

  // The gold pill behind the active city slides to whichever button is chosen. Measured from the
  // buttons (they wrap onto two lines on phones), and again whenever the row resizes.
  const rowRef = useRef(null);
  const pillRefs = useRef([]);
  const [pill, setPill] = useState(null);
  useLayoutEffect(() => {
    const measure = () => {
      const btn = pillRefs.current[activeIdx];
      if (btn) setPill({ left: btn.offsetLeft, top: btn.offsetTop, width: btn.offsetWidth, height: btn.offsetHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(rowRef.current);
    return () => ro.disconnect();
  }, [activeIdx]);

  const choose = (i) => {
    if (i === activeIdx) return;
    setActiveIdx(i);
    setSwitched(true);
  };

  return (
    <section className="relative z-20 bg-[radial-gradient(circle_at_center,#071f15_0%,#030c08_100%)] pt-10 pb-16 md:pt-14 md:pb-25">
      <Aurora />
      <Decoration
        side
        src={pineCrateBaubles}
        className="top-6 right-0 h-[300px] w-[min(400px,calc((100vw-1360px)/2+120px))]"
      />
      <Container>
        <SectionHeading
          eyebrow="✦ 5 FLAGSHIP DESTINATIONS ✦"
          title="Visit Our Experience Showrooms"
          subtitle="Walk through 10,000+ sq.ft of European winter wonder. Touch the foliage, explore lighting displays, and consult with our master holiday stylists."
        />

        <Reveal>
          <div ref={rowRef} className="relative isolate mb-10 flex flex-wrap justify-center gap-3">
            <span
              aria-hidden="true"
              className={`absolute -z-10 rounded-full border border-gold-300 bg-gold-500 shadow-[0_0_16px_rgba(229,199,139,0.4)] transition-[left,top,width,height] duration-500 ease-premium ${
                pill ? '' : 'opacity-0'
              }`}
              style={pill ?? undefined}
            />
            {SHOWROOMS.map((room, i) => (
              <button
                key={room.city}
                ref={(el) => {
                  pillRefs.current[i] = el;
                }}
                type="button"
                aria-pressed={i === activeIdx}
                onClick={() => choose(i)}
                className={`cursor-pointer rounded-full border px-7 py-3 font-serif text-[0.95rem] font-semibold transition-colors duration-300 ${
                  i === activeIdx
                    ? 'border-transparent text-[#04120a]'
                    : 'border-gold-400/15 bg-[rgba(8,28,20,0.85)] text-text-secondary hover:border-gold-400 hover:text-white'
                }`}
              >
                {room.city}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal>
          {/* Keyed by city, so each switch remounts it and replays the slide-in. */}
          <div key={showroom.city} className={switched ? 'animate-slide-in' : ''}>
            <ShowroomCard showroom={showroom} />
          </div>
        </Reveal>
      </Container>
    </section>
  );
};

export default Showrooms;
