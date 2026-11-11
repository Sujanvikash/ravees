import Aurora from './Aurora.jsx';
import Eyebrow from './Eyebrow.jsx';
import Reveal from './Reveal.jsx';
import Decoration from './Decoration.jsx';
import { ornamentBowCorner } from '../assets/decorations';
import PageTitle from './PageTitle.jsx';
import { cardClass } from './cardClass.js';

// Pine-and-bow corners for the storefront sign-in pages, in the top corners beside the form (at most 480px
// wide, centred): narrow enough to stay clear of it, from md.
const CORNER = 'top-0 aspect-900/566 w-[clamp(150px,20vw,300px)]';

/**
 * Centered sign-in style page: dark radial background, a heading, and the form in a card.
 * Used by Login, Signup and the admin sign-in.
 *
 * eyebrow / title  the standard storefront heading; or pass `header` for a custom one
 * maxWidth         Tailwind max-width class for the card (written out in full, e.g. "max-w-[480px]")
 * fullHeight       fill the whole screen (the admin page has no site header or footer around it)
 * decorated        festive pictures either side of the form (storefront sign-in / sign-up, wide screens)
 * onSubmit         the form's submit handler; children are the form's contents
 * noValidate       skip the browser's own checks (the form validates itself and shows errors per field)
 */
const AuthCard = ({
  eyebrow,
  title,
  header,
  maxWidth = 'max-w-[440px]',
  fullHeight = false,
  decorated = false,
  onSubmit,
  noValidate = false,
  children,
}) => {
  return (
    <section
      className={`relative z-20 flex ${fullHeight ? 'min-h-screen' : 'min-h-[70vh]'} items-center justify-center bg-[radial-gradient(circle_at_center,var(--color-bg-dark-emerald)_0%,var(--color-bg-deepest)_100%)] px-6 py-10`}
    >
      <Aurora />
      {decorated && (
        <>
          {/* Cut-outs, shown whole on the ivory page (no edge fade); the right one mirrored to hug its corner */}
          <Decoration side="hidden md:block" src={ornamentBowCorner} fade="none" imgClassName="object-contain!" className={`left-0 ${CORNER}`} />
          <Decoration side="hidden md:block" src={ornamentBowCorner} fade="none" imgClassName="object-contain! -scale-x-100" className={`right-0 ${CORNER}`} />
        </>
      )}
      <Reveal className={`w-full ${maxWidth}`}>
        <div className="mb-7 text-center">
          {header ?? (
            <>
              <Eyebrow>{eyebrow}</Eyebrow>
              <PageTitle size="xs">
                {title}
              </PageTitle>
            </>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          noValidate={noValidate}
          className={`${cardClass('raised')} flex flex-col gap-4 p-7`}
        >
          {children}
        </form>
      </Reveal>
    </section>
  );
};

export default AuthCard;
