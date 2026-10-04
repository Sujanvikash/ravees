import Eyebrow from './Eyebrow.jsx';
import { GRADIENT_TITLE } from './SectionHeading.jsx';

/**
 * Centered sign-in style page: dark radial background, a heading, and the form in a card.
 * Used by Login, Signup and the admin sign-in.
 *
 * eyebrow / title  the standard storefront heading; or pass `header` for a custom one
 * maxWidth         Tailwind max-width class for the card (written out in full, e.g. "max-w-[480px]")
 * fullHeight       fill the whole screen (the admin page has no site header or footer around it)
 * onSubmit         the form's submit handler; children are the form's contents
 */
export default function AuthCard({
  eyebrow,
  title,
  header,
  maxWidth = 'max-w-[440px]',
  fullHeight = false,
  onSubmit,
  children,
}) {
  return (
    <section
      className={`relative z-20 flex ${fullHeight ? 'min-h-screen' : 'min-h-[70vh]'} items-center justify-center bg-[radial-gradient(circle_at_center,#071f15_0%,#030c08_100%)] px-6 py-16`}
    >
      <div className={`w-full ${maxWidth}`}>
        <div className="mb-7 text-center">
          {header ?? (
            <>
              <Eyebrow>{eyebrow}</Eyebrow>
              <h1 className={`font-serif text-[1.8rem] font-bold leading-[1.2] tracking-[0.03em] ${GRADIENT_TITLE}`}>
                {title}
              </h1>
            </>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-gold-400/25 bg-[rgba(8,28,20,0.9)] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
        >
          {children}
        </form>
      </div>
    </section>
  );
}
