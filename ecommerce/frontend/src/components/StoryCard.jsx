import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays } from 'lucide-react';

/**
 * One story (blog post) as a card: its photo, the date, the title and the opening line, all one link to
 * the story. Used on the home page and the Stories page.
 *
 * tone  "dark" (on the green page) | "light" (on cream)
 */
const StoryCard = ({ story, tone = 'dark' }) => {
  const light = tone === 'light';
  return (
    <Link
      to={`/stories/${story.slug}`}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border no-underline transition-all duration-400 ease-premium hover:-translate-y-1 ${
        light
          ? 'border-cream-200 bg-cream-50 shadow-[0_10px_28px_--alpha(var(--color-forest)/12%)] hover:shadow-[0_18px_40px_--alpha(var(--color-forest)/20%)]'
          : 'border-gold-400/15 bg-surface/85 hover:border-gold-400/40 hover:shadow-[0_18px_40px_--alpha(var(--color-black)/50%)]'
      }`}
    >
      <span className="block aspect-16/10 overflow-hidden">
        <img
          src={story.image}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-[scale] duration-700 ease-premium group-hover:scale-[1.05]"
        />
      </span>
      <span className="flex flex-1 flex-col p-5">
        <span className={`mb-2 inline-flex items-center gap-1.5 text-[0.74rem] tracking-[0.06em] ${light ? 'text-gold-ink' : 'text-gold-400'}`}>
          <CalendarDays size={13} strokeWidth={2} aria-hidden="true" />
          {story.dateLabel}
        </span>
        <span
          className={`mb-2 line-clamp-2 font-serif text-[1.05rem] font-bold leading-[1.35] transition-colors ${
            light ? 'text-ink group-hover:text-gold-ink' : 'text-white group-hover:text-gold-300'
          }`}
        >
          {story.title}
        </span>
        <span className={`mb-4 line-clamp-3 text-[0.88rem] leading-[1.65] ${light ? 'text-ink-soft' : 'text-text-secondary'}`}>
          {story.excerpt}
        </span>
        <span
          className={`mt-auto inline-flex items-center gap-1.5 text-[0.82rem] font-semibold ${light ? 'text-forest' : 'text-gold-300'}`}
        >
          Read the story
          <ArrowRight size={14} strokeWidth={2} className="transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </span>
    </Link>
  );
};

export default StoryCard;
