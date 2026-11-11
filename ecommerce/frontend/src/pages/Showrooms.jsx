import { useLayoutEffect, useRef, useState } from 'react';
import SectionHeading from '../components/SectionHeading.jsx';
import ShowroomCard from '../components/ShowroomCard.jsx';
import { useStorefront } from '../context/StorefrontContext.jsx';
import Container from '../components/Container.jsx';
import Reveal from '../components/Reveal.jsx';
import Decoration from '../components/Decoration.jsx';
import { CHIP_ACTIVE, CHIP_GLOW, CHIP_IDLE } from '../components/Chip.jsx';
import { ornamentBerryCorner } from '../assets/decorations';

// Pine-and-berry cut-outs in the top corners (shown whole, the right one mirrored), from lg, beside the
// centred heading and city row.
const CORNER = 'top-0 aspect-900/697 w-[clamp(150px,16vw,250px)]';

const Showrooms = () => {
  const { showrooms, stores } = useStorefront();
  const [activeIdx, setActiveIdx] = useState(0);
  // Set on the first city switch: from then on the card slides in on every change (its first
  // appearance is the scroll Reveal's job).
  const [switched, setSwitched] = useState(false);
  const showroom = showrooms[activeIdx] ?? showrooms[0];

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
    <section className="relative isolate z-20 overflow-hidden bg-bg-primary pt-3 pb-10 md:pt-5 md:pb-14">
      <Decoration side="hidden lg:block" src={ornamentBerryCorner} fade="none" imgClassName="object-contain!" className={`left-0 ${CORNER}`} />
      <Decoration side="hidden lg:block" src={ornamentBerryCorner} fade="none" imgClassName="object-contain! -scale-x-100" className={`right-0 ${CORNER}`} />
      <Container>
        <SectionHeading
          flourishes={false}
          className="mb-5!"
          eyebrow={`✦ ${stores.length} STORES ACROSS INDIA ✦`}
          title="Visit Our Stores"
          subtitle="Wherever you are, step into the nearest Christmas Raaves store and let us help you create a magical and memorable festive season!"
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
            {showrooms.map((room, i) => (
              <button
                key={room.id ?? room.city}
                ref={(el) => {
                  pillRefs.current[i] = el;
                }}
                type="button"
                aria-pressed={i === activeIdx}
                onClick={() => choose(i)}
                className={`cursor-pointer rounded-full border px-7 py-3 font-serif text-[0.95rem] font-semibold transition-colors duration-300 ${
                  // The gold behind the chosen city is the sliding pill above; the button itself stays clear.
                  i === activeIdx ? 'border-transparent text-on-cta' : CHIP_IDLE
                }`}
              >
                {room.city}
              </button>
            ))}
          </div>
        </Reveal>

        {showroom && (
          <Reveal>
            {/* Keyed by city, so each switch remounts it and replays the slide-in. */}
            <div key={showroom.city} className={switched ? 'animate-slide-in' : ''}>
              <ShowroomCard showroom={showroom} />
            </div>
          </Reveal>
        )}
      </Container>
    </section>
  );
};

export default Showrooms;
