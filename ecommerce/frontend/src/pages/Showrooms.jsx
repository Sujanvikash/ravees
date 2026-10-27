import { useLayoutEffect, useRef, useState } from 'react';
import SectionHeading from '../components/SectionHeading.jsx';
import ShowroomCard from '../components/ShowroomCard.jsx';
import { SHOWROOMS } from '../data/showrooms.js';
import Container from '../components/Container.jsx';
import Reveal from '../components/Reveal.jsx';
import PageBackdrop from '../components/PageBackdrop.jsx';
import { CHIP_ACTIVE, CHIP_GLOW, CHIP_IDLE } from '../components/Chip.jsx';
import { showroomsBg } from '../assets/backgrounds';

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
    <section className="relative isolate z-20 overflow-hidden bg-bg-darker pt-3 pb-10 md:pt-5 md:pb-14">
      {/* The storefront backdrop: the centred heading sits in its dark middle, the shop front to the right. */}
      <PageBackdrop src={showroomsBg} fade="center" />
      <Container>
        <SectionHeading
          flourishes={false}
          className="mb-5!"
          eyebrow="✦ 5 FLAGSHIP DESTINATIONS ✦"
          title="Visit Our Experience Showrooms"
          subtitle="Walk through 10,000+ sq.ft of European winter wonder. Touch the foliage, explore lighting displays, and consult with our master holiday stylists."
        />

        <Reveal>
          <div ref={rowRef} className="relative isolate mb-5 flex flex-wrap justify-center gap-3">
            <span
              aria-hidden="true"
              className={`absolute -z-10 rounded-full border ${CHIP_ACTIVE} ${CHIP_GLOW} transition-[left,top,width,height] duration-500 ease-premium ${
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
                  // The gold behind the chosen city is the sliding pill above; the button itself stays clear.
                  i === activeIdx ? 'border-transparent text-on-gold' : CHIP_IDLE
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
