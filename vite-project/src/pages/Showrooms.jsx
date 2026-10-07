import { useState } from 'react';
import SectionHeading from '../components/SectionHeading.jsx';
import ShowroomCard from '../components/ShowroomCard.jsx';
import { SHOWROOMS } from '../data/showrooms.js';
import Container from '../components/Container.jsx';
import Aurora from '../components/Aurora.jsx';
import Reveal from '../components/Reveal.jsx';

const Showrooms = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  const showroom = SHOWROOMS[activeIdx];

  return (
    <section className="relative z-20 bg-[radial-gradient(circle_at_center,#071f15_0%,#030c08_100%)] py-16 md:py-25">
      <Aurora />
      <Container>
        <SectionHeading
          eyebrow="✦ 5 FLAGSHIP DESTINATIONS ✦"
          title="Visit Our Experience Showrooms"
          subtitle="Walk through 10,000+ sq.ft of European winter wonder. Touch the foliage, explore lighting displays, and consult with our master holiday stylists."
        />

        <div className="mb-10 flex flex-wrap justify-center gap-3">
          {SHOWROOMS.map((room, i) => (
            <button
              key={room.city}
              onClick={() => setActiveIdx(i)}
              className={`cursor-pointer rounded-full border px-7 py-3 font-serif text-[0.95rem] font-semibold transition-all duration-300 ${
                i === activeIdx
                  ? 'border-gold-300 bg-gold-500 text-[#04120a] shadow-[0_0_16px_rgba(229,199,139,0.4)]'
                  : 'border-gold-400/15 bg-[rgba(8,28,20,0.85)] text-text-secondary hover:border-gold-400 hover:text-white'
              }`}
            >
              {room.city}
            </button>
          ))}
        </div>

        <Reveal>
          <ShowroomCard showroom={showroom} />
        </Reveal>
      </Container>
    </section>
  );
};

export default Showrooms;
