import { Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays } from 'lucide-react';
import Container from '../components/Container.jsx';
import Button from '../components/Button.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import PageTitle from '../components/PageTitle.jsx';
import StoryCard from '../components/StoryCard.jsx';
import Reveal from '../components/Reveal.jsx';
import NotFound from './NotFound.jsx';
import { STORIES, findStory } from '../data/stories.js';

// "**word**" in the story text is bold, as on the old site.
const withBold = (text) =>
  text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 ? (
      <strong key={i} className="font-semibold text-text-primary">
        {part}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );

/** One story: its photo, title and date, the text, and the other stories underneath. */
const StoryPost = () => {
  const { slug } = useParams();
  const story = findStory(slug);
  if (!story) return <NotFound />;
  const others = STORIES.filter((s) => s.slug !== slug).slice(0, 3);

  return (
    <article className="relative z-20 bg-bg-primary pt-4 pb-12 md:pt-6 md:pb-16">
      <Container className="max-w-[54rem]!">
        <Link
          to="/stories"
          className="mb-5 inline-flex items-center gap-1.5 text-[0.85rem] text-text-secondary no-underline hover:text-gold-300"
        >
          <ArrowLeft size={15} strokeWidth={2} /> All stories
        </Link>
        <Eyebrow className="flex! items-center gap-1.5">
          <CalendarDays size={13} strokeWidth={2} aria-hidden="true" />
          {story.dateLabel}
        </Eyebrow>
        <PageTitle size="md" className="mb-6">
          {story.title}
        </PageTitle>
        <img
          src={story.image}
          alt=""
          className="mb-8 aspect-16/9 w-full rounded-2xl border border-gold-400/20 object-cover shadow-[0_20px_50px_--alpha(var(--color-shadow)/50%)]"
        />

        <div className="text-[1.02rem] leading-[1.85] text-text-secondary">
          {story.body.map((block, i) =>
            block.type === 'h' ? (
              <h2 key={i} className="mt-8 mb-3 font-serif text-[1.3rem] font-bold text-gold-200">
                {block.text}
              </h2>
            ) : (
              <p key={i} className="mb-4">
                {withBold(block.text)}
              </p>
            )
          )}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold-400/20 bg-surface/85 p-6">
          <p className="font-serif text-[1.1rem] text-text-primary">Bring the season home with Raave’s.</p>
          <Button to="/shop">
            Shop the Collection
            <ArrowRight size={16} strokeWidth={2} />
          </Button>
        </div>
      </Container>

      <Container className="mt-12">
        <h2 className="mb-5 font-serif text-[1.4rem] font-bold text-text-primary">More Stories</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((s, i) => (
            <Reveal key={s.slug} delay={i} className="h-full">
              <StoryCard story={s} />
            </Reveal>
          ))}
        </div>
      </Container>
    </article>
  );
};

export default StoryPost;
