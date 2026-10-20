import SectionHeading from '../components/SectionHeading.jsx';
import TestimonialCard from '../components/TestimonialCard.jsx';
import Button from '../components/Button.jsx';
import { ArrowRight } from 'lucide-react';
import { TESTIMONIALS } from '../data/testimonials.js';
import Container from '../components/Container.jsx';
import Aurora from '../components/Aurora.jsx';
import Reveal from '../components/Reveal.jsx';
import { cardClass } from '../components/cardClass.js';
import { sectionClass } from '../components/sectionClass.js';

const Testimonials = () => {
  return (
    <section className={sectionClass('listing')}>
      <Aurora />
      <Container>
        <SectionHeading
          eyebrow="✦ TESTIMONIALS ✦"
          title="Loved Across Generations"
          subtitle="Families who have decorated with Raave's for over a decade — and the trees still look like the day they opened the box."
        />

        <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.author} delay={i % 3} className="h-full">
              <TestimonialCard testimonial={t} />
            </Reveal>
          ))}
        </div>

        <Reveal className={`${cardClass('panel')} mt-14 p-8 text-center md:p-12`}>
          <h3 className="mb-3 font-serif text-[1.4rem] text-white">Ready to start your own tradition?</h3>
          <p className="mx-auto mb-6 max-w-[520px] text-[0.95rem] leading-[1.7] text-text-secondary">
            Browse the collections or book a styling consultation with one of our holiday specialists.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button to="/shop">
              Explore Collections
              <ArrowRight size={16} strokeWidth={2} />
            </Button>
            <Button variant="outline" to="/contact">
              Book a Consultation
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
};

export default Testimonials;
