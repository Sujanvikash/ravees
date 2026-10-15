import Aurora from './Aurora.jsx';
import Eyebrow from './Eyebrow.jsx';
import Reveal from './Reveal.jsx';
import Decoration from './Decoration.jsx';
import { festiveLanternGlow, goldenReindeerStatue } from '../assets/decorations';
import PageTitle from './PageTitle.jsx';
import { cardClass } from './cardClass.js';

// Tall side pictures for the storefront sign-in pages: 300px wide, their inner edge 300px from the centre,
// so they stay clear of the form (at most 480px wide).
const SIDE_PICTURE = 'top-1/2 h-[400px] w-[300px] -translate-y-1/2';

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
      className={`relative z-20 flex ${fullHeight ? 'min-h-screen' : 'min-h-[70vh]'} items-center justify-center bg-[radial-gradient(circle_at_center,#071f15_0%,#030c08_100%)] px-6 py-16`}
    >
      <Aurora />
      {decorated && (
        <>
          <Decoration side src={festiveLanternGlow} className={`left-[calc(50%-600px)] ${SIDE_PICTURE}`} />
          <Decoration side src={goldenReindeerStatue} className={`right-[calc(50%-600px)] ${SIDE_PICTURE}`} />
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
