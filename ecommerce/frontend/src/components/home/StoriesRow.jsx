import StoryCard from '../StoryCard.jsx';
import RowHeader from './RowHeader.jsx';
import Reveal from '../Reveal.jsx';
import { STORIES } from '../../data/stories.js';

/** "Christmas stories": the latest stories as cards, with a link to all of them. */
const StoriesRow = ({ limit = 3, tone = 'dark', className = '' }) => (
  <div className={className}>
    <RowHeader eyebrow="✦ From our journal ✦" title="Christmas Stories" to="/stories" action="All Stories" tone={tone} />
    <div className={`grid gap-5 sm:grid-cols-2 ${limit > 3 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
      {STORIES.slice(0, limit).map((story, i) => (
        <Reveal key={story.slug} delay={i} className={`h-full ${i === 2 && limit === 3 ? 'sm:max-lg:hidden' : ''}`}>
          <StoryCard story={story} tone={tone} />
        </Reveal>
      ))}
    </div>
  </div>
);

export default StoriesRow;
