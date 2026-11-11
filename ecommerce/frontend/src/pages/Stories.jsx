import Container from '../components/Container.jsx';
import HangingBauble from '../components/HangingBauble.jsx';
import Reveal from '../components/Reveal.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import StoryCard from '../components/StoryCard.jsx';
import { sectionClass } from '../components/sectionClass.js';
import { STORIES } from '../data/stories.js';

/** Stories: every story (blog post) as a card, newest first. */
const Stories = () => (
  <section className={sectionClass('listing')}>
    {/* Either side of the centred heading, at the content column's edges, from xl (where the heading leaves
        room): a pair of baubles hanging from the top edge, swaying gently. */}
    <HangingBauble side="hidden xl:block" className="left-[max(1.5rem,calc(50%-656px))]" width={72} drop={30} />
    <HangingBauble side="hidden xl:block" className="left-[max(7rem,calc(50%-570px))]" width={56} drop={8} delay={3} />
    <HangingBauble side="hidden xl:block" className="right-[max(7rem,calc(50%-570px))]" width={56} drop={8} delay={5} />
    <HangingBauble side="hidden xl:block" className="right-[max(1.5rem,calc(50%-656px))]" width={72} drop={30} delay={1.5} />
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
