import Eyebrow from './Eyebrow.jsx';
import Reveal from './Reveal.jsx';

export const GRADIENT_TITLE =
  'bg-[linear-gradient(135deg,#ffffff_0%,var(--color-gold-200)_50%,var(--color-gold-500)_100%)] bg-clip-text text-transparent';

const SectionHeading = ({ eyebrow, title, subtitle, centered = true, className = '' }) => {
  return (
    <Reveal
      className={`${centered ? 'mx-auto mb-12 max-w-195 text-center' : 'mb-8'} ${className}`.trim()}
    >
      {eyebrow && (
        <Eyebrow>
          {eyebrow}
        </Eyebrow>
      )}
      {title && (
        <h2
          className={`mb-3.5 font-serif text-[2rem] font-bold leading-[1.2] tracking-[0.04em] sm:text-[2.5rem] ${GRADIENT_TITLE}`}
        >
          {title}
        </h2>
      )}
      {subtitle && (
        <p className="text-[1.05rem] leading-[1.7] text-text-secondary">{subtitle}</p>
      )}
    </Reveal>
  );
};

export default SectionHeading;
