import Container from '../components/Container.jsx';
import Reveal from '../components/Reveal.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import StoryCard from '../components/StoryCard.jsx';
import { sectionClass } from '../components/sectionClass.js';
import { STORIES } from '../data/stories.js';

/** Stories: every story (blog post) as a card, newest first. */
const Stories = () => (
  <section className={sectionClass('listing')}>
    <Container>
      <SectionHeading
        eyebrow="✦ From our journal ✦"
        title="Christmas Stories"
        subtitle="Traditions, celebrations and ideas for the season, from the Raave’s family to yours."
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {STORIES.map((story, i) => (
          <Reveal key={story.slug} delay={i} className="h-full">
            <StoryCard story={story} />
          </Reveal>
        ))}
      </div>
    </Container>
  </section>
);

export default Stories;
