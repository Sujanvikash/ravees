import { Phone, Clock, MapPin } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { GRADIENT_TITLE } from '../components/SectionHeading.jsx';
import ConsultForm from '../components/ConsultForm.jsx';
import { addEnquiry } from '../lib/enquiries.js';

const METHOD_ROW =
  'flex items-center gap-4 rounded-xl border border-gold-400/15 bg-white/4 p-4 text-text-secondary no-underline transition-all duration-300 hover:border-gold-400/30 hover:bg-gold-400/15 hover:text-white';

export default function Contact() {
  return (
    <section className="relative z-20 bg-[radial-gradient(circle_at_center,#071f15_0%,#030c08_100%)] py-16 md:py-25">
      <div className="mx-auto max-w-[1360px] px-6">
        <div className="grid gap-10 rounded-3xl border border-gold-400/30 bg-[rgba(8,28,20,0.85)] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.7)] md:p-12 lg:grid-cols-2">
          <div>
            <span className="mb-3 inline-block font-mono text-[0.72rem] uppercase tracking-[0.28em] text-gold-400">
              ✦ CONCIERGE SUPPORT ✦
            </span>
            <h1 className={`mb-3.5 font-serif text-[1.9rem] font-bold leading-[1.2] tracking-[0.04em] sm:text-[2.3rem] ${GRADIENT_TITLE}`}>
              Speak With A Holiday Specialist
            </h1>
            <p className="text-[0.98rem] leading-[1.7] text-text-secondary">
              Whether you need advice on tree heights for high ceilings, commercial installations for corporate
              headquarters, or personalised home delivery, our concierge is here to assist.
            </p>

            <div className="mt-7 flex flex-col gap-4">
              <a href="tel:+919840788950" className={METHOD_ROW}>
                <Phone size={20} strokeWidth={2} className="shrink-0 text-gold-400" />
                <div>
                  <strong className="block text-white">Hotline / Orders</strong>
                  <span className="text-[0.88rem]">+91 98407 88950 / +91 44 2819 3715</span>
                </div>
              </a>

              <a
                href="https://wa.me/919840788950"
                target="_blank"
                rel="noreferrer"
                className={METHOD_ROW}
              >
                <FaWhatsapp size={20} className="shrink-0 text-emerald-400" />
                <div>
                  <strong className="block text-white">WhatsApp Concierge</strong>
                  <span className="text-[0.88rem]">Chat live with our tree designers</span>
                </div>
              </a>

              <div className={METHOD_ROW}>
                <Clock size={20} strokeWidth={2} className="shrink-0 text-gold-400" />
                <div>
                  <strong className="block text-white">Showroom Operating Hours</strong>
                  <span className="text-[0.88rem]">8:00 AM – 10:00 PM (Monday to Sunday)</span>
                </div>
              </div>

              <a href="/showrooms" className={METHOD_ROW}>
                <MapPin size={20} strokeWidth={2} className="shrink-0 text-gold-400" />
                <div>
                  <strong className="block text-white">Visit A Showroom</strong>
                  <span className="text-[0.88rem]">Chennai · Bengaluru · Mumbai · Pune · Goa</span>
                </div>
              </a>
            </div>
          </div>

          <div>
            <h2 className="mb-5 font-serif text-[1.25rem] text-white">
              Request Personal Styling Consultation
            </h2>
            <ConsultForm onSubmitted={addEnquiry} />
          </div>
        </div>
      </div>
    </section>
  );
}
