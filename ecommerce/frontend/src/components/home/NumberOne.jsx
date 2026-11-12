import { Award, Gem, Store, TreePine } from 'lucide-react';
import Container from '../Container.jsx';
import Reveal from '../Reveal.jsx';
import Eyebrow from '../Eyebrow.jsx';
import PageTitle from '../PageTitle.jsx';
import Decoration from '../Decoration.jsx';
import { useStorefront } from '../../context/StorefrontContext.jsx';
import { NUMBER_ONE } from '../../data/home.js';
import { ornamentBowCorner } from '../../assets/decorations';

const ICONS = [Award, Gem, Store, TreePine];

// The pine-and-bow cut-outs in the two top corners, the right one mirrored.
const CORNER = 'top-0 aspect-900/566 w-[clamp(150px,18vw,300px)]';

/**
 * "India's No. 1 in Christmas": pine corners with a gold bow framing the centre, where a gold "No. 1" seal sits
 * over the brand's claim, then the four facts behind it (the store count is the shop's own). On ivory, like the
 * rest of the home page.
 */
const NumberOne = () => {
  const { showrooms, stores } = useStorefront();
  const fill = (text) => text.replace('{stores}', stores.length).replace('{cities}', showrooms.length);

  return (
    <section className="relative z-20 bg-bg-primary py-10 md:py-14">
      <Decoration fade="none" imgClassName="object-contain!" side="hidden sm:block" src={ornamentBowCorner} className={`left-0 ${CORNER}`} />
      <Decoration fade="none" imgClassName="object-contain! -scale-x-100" side="hidden sm:block" src={ornamentBowCorner} className={`right-0 ${CORNER}`} />
      <Container>
        <Reveal className="mx-auto flex max-w-[760px] flex-col items-center text-center">
          {/* The seal: "No. 1" in a gold ring, "in Christmas" beneath. */}
          <div className="mb-5 flex size-40 flex-col items-center justify-center rounded-full border-4 border-gold-400 bg-surface shadow-[0_14px_36px_--alpha(var(--color-shadow)/35%),inset_0_0_0_6px_var(--color-bg-primary),inset_0_0_0_7px_--alpha(var(--color-gold-400)/50%)] sm:size-44">
            <span className="font-mono text-[0.62rem] tracking-[0.22em] text-gold-300 uppercase">India’s</span>
            <span className="font-serif text-[3rem] leading-none font-bold text-forest sm:text-[3.4rem]">No. 1</span>
            <span className="mt-1 font-serif text-[0.92rem] font-semibold tracking-[0.04em] text-gold-300">in Christmas</span>
          </div>
          <Eyebrow>✦ {NUMBER_ONE.eyebrow} ✦</Eyebrow>
          <PageTitle as="h2" size="lg" className="mb-3">
            {NUMBER_ONE.title}
          </PageTitle>
          <p className="text-[0.98rem] leading-[1.75] text-text-secondary">{NUMBER_ONE.text}</p>
        </Reveal>

        <ul className="mt-8 grid list-none gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {NUMBER_ONE.points.map(({ title, text }, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <Reveal as="li" key={title} delay={i} className="flex gap-3 rounded-xl border border-gold-400/20 bg-surface p-4">
                <Icon size={22} strokeWidth={1.6} className="mt-0.5 shrink-0 text-gold-400" aria-hidden="true" />
                <div>
                  <h3 className="font-serif text-[1rem] font-bold text-text-primary">{fill(title)}</h3>
                  <p className="mt-0.5 text-[0.82rem] leading-snug text-text-secondary">{fill(text)}</p>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </Container>
    </section>
  );
};

export default NumberOne;
