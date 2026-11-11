import Reveal from '../Reveal.jsx';
import PageTitle from '../PageTitle.jsx';
import Eyebrow from '../Eyebrow.jsx';
import Flourish from '../Flourish.jsx';
import { WHY_CHOOSE } from '../../data/home.js';
import { pineCrateBaubles } from '../../assets/decorations';

/**
 * "Why choose Raave's": the old site's three numbered reasons beside a photo. The numbers are large gold
 * serif figures; on phones the photo sits above the list.
 *
 * tone  "dark" (on the green page) | "light" (on cream, ink text)
 */
const WhyChoose = ({ tone = 'dark', className = '' }) => {
  const light = tone === 'light';
  return (
    <div className={`grid items-center gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12 ${className}`}>
      <Reveal className="relative">
        <img
          src={pineCrateBaubles}
          alt="Green and gold baubles in a wooden crate among pine branches"
          loading="lazy"
          className="aspect-4/3 w-full rounded-2xl border border-gold-400/25 object-cover shadow-[0_20px_50px_--alpha(var(--color-black)/45%)]"
        />
        <span className="absolute -bottom-4 left-5 rounded-xl border border-gold-300 bg-[linear-gradient(135deg,var(--color-gold-300),var(--color-gold-500))] px-4 py-2 font-serif text-[0.95rem] font-bold text-on-gold shadow-[0_8px_20px_--alpha(var(--color-black)/35%)]">
          Since 1997
        </span>
      </Reveal>

      <div>
        <Reveal>
          <Eyebrow className={light ? 'text-gold-ink!' : ''}>✦ Why Raave’s ✦</Eyebrow>
          <div className="mb-6 flex items-center gap-4">
            {light ? (
              <h2 className="font-serif text-[1.6rem] font-bold leading-[1.2] text-ink sm:text-[1.95rem]">
                Why Choose Raave’s Christmas Tree and Decoration
              </h2>
            ) : (
              <PageTitle as="h2" size="lg">
                Why Choose Raave’s Christmas Tree and Decoration
              </PageTitle>
            )}
            <Flourish tone={tone} className="hidden xl:block" />
          </div>
        </Reveal>
        <ol className="flex list-none flex-col gap-5">
          {WHY_CHOOSE.map(({ title, text }, i) => (
            <Reveal as="li" key={title} delay={i} className="flex gap-5">
              <span
                className={`w-12 shrink-0 font-serif text-[2.2rem] leading-none font-bold ${light ? 'text-gold-ink' : 'text-gold-400'}`}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className={`border-l pl-5 ${light ? 'border-gold-ink/25' : 'border-gold-400/20'}`}>
                <h3 className={`mb-1 font-serif text-[1.08rem] font-bold ${light ? 'text-ink' : 'text-white'}`}>{title}</h3>
                <p className={`text-[0.93rem] leading-[1.7] ${light ? 'text-ink-soft' : 'text-text-secondary'}`}>{text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default WhyChoose;
