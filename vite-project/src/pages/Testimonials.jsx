import SectionHeading from '../components/SectionHeading.jsx';
import TestimonialCard from '../components/TestimonialCard.jsx';
import Button from '../components/Button.jsx';
import { ArrowRight } from 'lucide-react';
import { TESTIMONIALS } from '../data/testimonials.js';

export default function Testimonials() {
  return (
    <section className="relative z-20 bg-bg-primary py-16 md:py-25">
      <div className="mx-auto max-w-[1360px] px-6">
        <SectionHeading
          eyebrow="✦ TESTIMONIALS ✦"
          title="Loved Across Generations"
          subtitle="Families who have decorated with Raave's for over a decade — and the trees still look like the day they opened the box."
        />

        <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.author} testimonial={t} />
          ))}
        </div>

        <div className="mt-14 rounded-3xl border border-gold-400/20 bg-[rgba(8,28,20,0.85)] p-8 text-center md:p-12">
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
        </div>
      </div>
    </section>
  );
}
