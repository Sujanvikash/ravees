import { Phone, Clock, MapPin } from 'lucide-react';
import WhatsAppLink from '../components/WhatsAppLink.jsx';
import { PHONE_HREF } from '../data/site.js';
import { GRADIENT_TITLE } from '../components/SectionHeading.jsx';
import ConsultForm from '../components/ConsultForm.jsx';
import { useCustomerAuth } from '../auth/context/CustomerAuthContext.jsx';
import { addEnquiry } from '../lib/enquiries.js';
import Container from '../components/Container.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import Aurora from '../components/Aurora.jsx';
import Decoration from '../components/Decoration.jsx';
import Reveal from '../components/Reveal.jsx';
import { useSanta } from '../context/SantaContext.jsx';
import { goldenBellsCluster, luxuryWreathAccent } from '../assets/decorations';

// Corner accents just outside the form card, partly tucked behind it.
const CORNER_ACCENT = 'h-[230px] w-[230px]';
// Both cards share this look (the single card this page used to have).
const CARD =
  'rounded-3xl border border-gold-400/30 bg-[rgba(8,28,20,0.85)] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.7)] md:p-12';

const METHOD_ROW =
  'group flex h-full items-center gap-4 rounded-xl border border-gold-400/15 bg-white/4 p-4 text-text-secondary no-underline transition-all duration-300 hover:border-gold-400/30 hover:bg-gold-400/15 hover:text-white';

// The row's icon gives a little springy tilt when the row is hovered.
const METHOD_ICON = 'shrink-0 transition-transform duration-300 ease-spring group-hover:scale-115 group-hover:-rotate-8';

const Contact = () => {
  const { session } = useCustomerAuth();
  const { celebrate } = useSanta();

  return (
    <section className="relative z-20 overflow-x-clip bg-[radial-gradient(circle_at_center,#071f15_0%,#030c08_100%)] pt-10 pb-16 md:pt-14 md:pb-25">
      <Aurora />
      <Container className="relative w-full">
        <Decoration side src={goldenBellsCluster} className={`-top-14 -left-[150px] ${CORNER_ACCENT}`} />
        <Decoration side src={luxuryWreathAccent} className={`-right-[150px] -bottom-14 ${CORNER_ACCENT}`} />
        {/* Two cards side by side (stacked below lg). The left one rises in and scrolls with the page; the
            form card is static, only as tall as the form, and stays pinned under the header meanwhile. */}
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Reveal className={CARD}>
            <Eyebrow>
              ✦ CONCIERGE SUPPORT ✦
            </Eyebrow>
            <h1 className={`mb-3.5 font-serif text-[1.9rem] font-bold leading-[1.2] tracking-[0.04em] sm:text-[2.3rem] ${GRADIENT_TITLE}`}>
              Speak With A Holiday Specialist
            </h1>
            <p className="text-[0.98rem] leading-[1.7] text-text-secondary">
              Whether you need advice on tree heights for high ceilings, commercial installations for corporate
              headquarters, or personalised home delivery, our concierge is here to assist.
            </p>

            {/* The four ways to reach us rise in one after another, after the card. */}
            <div className="mt-7 flex flex-col gap-4">
              <Reveal delay={1}>
                <a href={PHONE_HREF} className={METHOD_ROW}>
                  <Phone size={20} strokeWidth={2} className={`${METHOD_ICON} text-gold-400`} />
                  <div>
                    <strong className="block text-white">Hotline / Orders</strong>
                    <span className="text-[0.88rem]">+91 98407 88950 / +91 44 2819 3715</span>
                  </div>
                </a>
              </Reveal>

              <Reveal delay={2}>
                <WhatsAppLink className={METHOD_ROW} iconSize={20} iconClassName={`${METHOD_ICON} text-emerald-400`}>
                  <div>
                    <strong className="block text-white">WhatsApp Concierge</strong>
                    <span className="text-[0.88rem]">Chat live with our tree designers</span>
                  </div>
                </WhatsAppLink>
              </Reveal>

              <Reveal delay={3}>
                <div className={METHOD_ROW}>
                  <Clock size={20} strokeWidth={2} className={`${METHOD_ICON} text-gold-400`} />
                  <div>
                    <strong className="block text-white">Showroom Operating Hours</strong>
                    <span className="text-[0.88rem]">8:00 AM – 10:00 PM (Monday to Sunday)</span>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={4}>
                <a href="/showrooms" className={METHOD_ROW}>
                  <MapPin size={20} strokeWidth={2} className={`${METHOD_ICON} text-gold-400`} />
                  <div>
                    <strong className="block text-white">Visit A Showroom</strong>
                    <span className="text-[0.88rem]">Chennai · Bengaluru · Mumbai · Pune · Goa</span>
                  </div>
                </a>
              </Reveal>
            </div>
          </Reveal>

          <div className={`${CARD} lg:sticky lg:top-[calc(var(--header-h)+24px)]`}>
            <h2 className="mb-5 font-serif text-[1.25rem] text-white">
              Request Personal Styling Consultation
            </h2>
            <ConsultForm
              onSubmitted={(data) => {
                addEnquiry({ ...data, customerEmail: session?.email ?? null });
                celebrate(); // Santa cheers (with confetti) alongside the form's thank-you toast
              }}
            />
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Contact;
