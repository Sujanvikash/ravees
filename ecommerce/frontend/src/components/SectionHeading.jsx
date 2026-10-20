import Eyebrow from './Eyebrow.jsx';
import Reveal from './Reveal.jsx';
import Flourish from './Flourish.jsx';
import PageTitle from './PageTitle.jsx';


// Gold flourishes frame the title (both sides when centred, after it when left-aligned). They hide on
// phones, where a long title wraps and there's no room beside it. flourishes={false} leaves them out.
const SectionHeading = ({ eyebrow, title, subtitle, centered = true, flourishes = true, className = '' }) => {
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
          {flourishes && centered && <Flourish side="left" className="hidden sm:block" />}
          <PageTitle as="h2" size="lg">{title}</PageTitle>
          {flourishes && <Flourish side="right" className="hidden sm:block" />}
        </div>
      )}
      {subtitle && (
        <p className={`text-[1.05rem] leading-[1.7] text-text-secondary ${centered ? 'mx-auto max-w-195' : ''}`}>{subtitle}</p>
      )}
    </Reveal>
  );
};

export default SectionHeading;
