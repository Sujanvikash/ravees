import { Phone, Mail } from 'lucide-react';
import WhatsAppLink from '../components/WhatsAppLink.jsx';
import { PHONE_HREF, PHONE_DISPLAY, EMAIL } from '../data/site.js';
import ConsultForm from '../components/ConsultForm.jsx';
import { useStorefront } from '../context/StorefrontContext.jsx';
import Container from '../components/Container.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import Reveal from '../components/Reveal.jsx';
import PageBackdrop from '../components/PageBackdrop.jsx';
import { useSanta } from '../context/SantaContext.jsx';
import { contactBg } from '../assets/backgrounds';
import PageTitle from '../components/PageTitle.jsx';
import { cardClass } from '../components/cardClass.js';

const METHOD_ROW =
  `${cardClass('glass')} group flex items-center gap-5 px-6 py-5 text-text-secondary no-underline transition-all duration-300 hover:border-gold-400/40 hover:bg-gold-400/12 hover:text-text-primary`;

// The row's icon gives a little springy tilt when the row is hovered.
const METHOD_ICON = 'shrink-0 transition-transform duration-300 ease-spring group-hover:scale-115 group-hover:-rotate-8';

/**
 * Contact: the client's ivory background fills the section. The invitation on top (centred from lg), then
 * on the left three ways to reach the concierge and on the right the consultation form in its card, which
 * stays pinned under the header while the page scrolls.
 */
const Contact = () => {
  const { showrooms } = useStorefront();
  const { celebrate } = useSanta();
  // The hotline is the flagship showroom's lines (kept in the showroom data, so it is written in one place).
  const hotline = showrooms.find((room) => room.isFlagship)?.phone || PHONE_DISPLAY;

  return (
    <section className="relative isolate z-20 overflow-x-clip bg-bg-darker pt-6 pb-10 md:pt-8 md:pb-14 lg:flex lg:min-h-[min(56.28vw,1080px)] lg:items-center">
      {/* The client's ivory background (pine corners, a gold ribbon wave): light, so the page keeps its
          light palette; shown as it is. From lg the section is as tall as the picture's own shape, so the
          corners and the ribbon show whole, and the heading is centred in its plain middle, clear of them. */}
      <PageBackdrop src={contactBg} align="center" light />
      <Container className="w-full">
        <Reveal className="mb-8 lg:mb-10 lg:text-center">
          <Eyebrow>✦ CONCIERGE SUPPORT ✦</Eyebrow>
          <PageTitle size="xl" className="mb-5">
            Speak With A
            <br />
            Holiday Specialist
          </PageTitle>
          <p className="max-w-[36rem] text-[0.98rem] leading-[1.75] text-text-secondary lg:mx-auto">
            Whether you need advice on tree heights for high ceilings, commercial installations for corporate
            headquarters, or personalised home delivery, our concierge is here to assist.
          </p>
        </Reveal>

        <div className="grid items-start gap-7 lg:grid-cols-[1fr_1.05fr] lg:gap-10">
          <div>
            {/* The three ways to reach us rise in one after another. */}
            <div className="flex max-w-[36rem] flex-col gap-4 lg:max-w-none">
              <Reveal delay={1}>
                <a href={PHONE_HREF} className={METHOD_ROW}>
                  <Phone size={26} strokeWidth={1.6} className={`${METHOD_ICON} text-gold-400`} />
                  <div>
                    <strong className="block text-[1.02rem] text-text-primary">Hotline / Orders</strong>
                    <span className="text-[0.92rem]">{hotline}</span>
                  </div>
                </a>
              </Reveal>

              <Reveal delay={2}>
                <WhatsAppLink className={METHOD_ROW} iconSize={26} iconClassName={`${METHOD_ICON} text-emerald-400`}>
                  <div>
                    <strong className="block text-[1.02rem] text-text-primary">WhatsApp Concierge</strong>
                    <span className="text-[0.92rem]">Chat live with our tree designers</span>
                  </div>
                </WhatsAppLink>
              </Reveal>

              <Reveal delay={3}>
                <a href={`mailto:${EMAIL}`} className={METHOD_ROW}>
                  <Mail size={26} strokeWidth={1.6} className={`${METHOD_ICON} text-gold-400`} />
                  <div>
                    <strong className="block text-[1.02rem] text-text-primary">Email Us</strong>
                    <span className="text-[0.92rem]">{EMAIL}</span>
                  </div>
                </a>
              </Reveal>
            </div>
          </div>

          <div className={`${cardClass('raised')} p-7 md:p-9 lg:sticky lg:top-[calc(var(--header-h)+24px)]`}>
            <h2 className="mb-6 font-serif text-[1.3rem] text-text-primary">Request Personal Styling Consultation</h2>
            {/* Santa cheers (with confetti) alongside the form's thank-you toast. */}
            <ConsultForm onSent={() => celebrate()} />
            <p className="mt-4 text-center text-[0.82rem] text-text-muted">
              Our stylist will get back to you within 24 hours.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Contact;
