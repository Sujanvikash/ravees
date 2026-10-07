import Eyebrow from './Eyebrow.jsx';
import Reveal from './Reveal.jsx';
import Flourish from './Flourish.jsx';

export const GRADIENT_TITLE =
  'bg-[linear-gradient(135deg,#ffffff_0%,var(--color-gold-200)_50%,var(--color-gold-500)_100%)] bg-clip-text text-transparent';

// Gold flourishes frame the title (both sides when centred, after it when left-aligned). They hide on
// phones, where a long title wraps and there's no room beside it.
const SectionHeading = ({ eyebrow, title, subtitle, centered = true, className = '' }) => {
  return (
    <Reveal
      // Wide enough for the title plus its flourishes on one line; the subtitle keeps its own reading width.
      className={`${centered ? 'mx-auto mb-12 max-w-260 text-center' : 'mb-8'} ${className}`.trim()}
    >
      {eyebrow && (
        <Eyebrow>
          {eyebrow}
        </Eyebrow>
      )}
      {title && (
        <div className={`mb-3.5 flex items-center gap-4 ${centered ? 'justify-center' : ''}`}>
          {centered && <Flourish side="left" className="hidden sm:block" />}
          <h2
            className={`font-serif text-[2rem] font-bold leading-[1.2] tracking-[0.04em] sm:text-[2.5rem] ${GRADIENT_TITLE}`}
          >
            {title}
          </h2>
          <Flourish side="right" className="hidden sm:block" />
        </div>
      )}
      {subtitle && (
        <p className={`text-[1.05rem] leading-[1.7] text-text-secondary ${centered ? 'mx-auto max-w-195' : ''}`}>{subtitle}</p>
      )}
    </Reveal>
  );
};

export default SectionHeading;
