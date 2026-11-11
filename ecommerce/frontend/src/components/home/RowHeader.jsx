import { ArrowRight } from 'lucide-react';
import Button from '../Button.jsx';
import Eyebrow from '../Eyebrow.jsx';
import Flourish from '../Flourish.jsx';
import PageTitle from '../PageTitle.jsx';
import Reveal from '../Reveal.jsx';

/**
 * A shop row's heading: eyebrow and title on the left, a "View all" button on the right (it drops under
 * the title on phones). The ecommerce counterpart of SectionHeading, which centres.
 *
 * tone  "dark" (gold title, for the dark sections) | "light" (ink title, for the cream ones)
 */
const RowHeader = ({ eyebrow, title, action, to, tone = 'dark', className = '' }) => (
  <Reveal className={`mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 ${className}`}>
    <div className="min-w-0">
      {eyebrow && <Eyebrow className={tone === 'light' ? 'text-gold-ink!' : ''}>{eyebrow}</Eyebrow>}
      <div className="flex items-center gap-4">
        {tone === 'light' ? (
          <h2 className="font-serif text-[1.6rem] font-bold leading-[1.2] tracking-[0.02em] text-ink sm:text-[1.95rem]">
            {title}
          </h2>
        ) : (
          <PageTitle as="h2" size="lg">
            {title}
          </PageTitle>
        )}
        <Flourish tone={tone} className="hidden md:block" />
      </div>
    </div>
    {to && (
      <Button
        variant="outline"
        size="sm"
        to={to}
        className={tone === 'light' ? 'border-gold-ink/40! bg-transparent! text-gold-ink! hover:bg-gold-ink/10! hover:text-ink!' : ''}
      >
        {action ?? 'View All'}
        <ArrowRight size={15} strokeWidth={2} />
      </Button>
    )}
  </Reveal>
);

export default RowHeader;
