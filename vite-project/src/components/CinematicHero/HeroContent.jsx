import { ArrowRight } from "lucide-react";
import Button from "../Button.jsx";
import Eyebrow from "../Eyebrow.jsx";
import { HERO_COPY } from "./heroConfig";

// The text sits straight on the picture (no card); a soft shadow plus the scrim keep it legible.
const TEXT_SHADOW = "[text-shadow:0_2px_18px_rgba(0,0,0,0.8),0_0_2px_rgba(0,0,0,0.5)]";

/**
 * Placement per visual. Desktop: a left column beside the tree, the same at the start and the end.
 * Phone video: the opening shot has open sky at the top and the tree low, the finished shot has the
 * tree filling the top 80%, so the copy starts at the top and comes back at the bottom (`data-placement`,
 * switched by CinematicHero while the copy is hidden). The return is headline + buttons only, lifted
 * clear of the bottom-right corner the site's floating Santa button takes.
 */
const LAYOUT = {
  desktop:
    "left-6 top-1/2 w-[min(34rem,40vw)] -translate-y-1/2 sm:left-10 xl:left-16",
  mobile:
    "inset-x-5 top-6 sm:inset-x-8 data-[placement=final]:top-auto data-[placement=final]:bottom-[max(5.25rem,env(safe-area-inset-bottom))]",
};
const INTRO_ONLY = "group-data-[placement=final]/content:hidden";

const TITLE = {
  desktop: "text-[clamp(2.1rem,min(3.6vw,7.4svh),3.9rem)]",
  // The closing phone headline is a size down: the finished tree fills the screen above it.
  mobile:
    "text-[clamp(2rem,9vw,2.7rem)] md:text-[3.4rem] group-data-[placement=final]/content:text-[clamp(1.75rem,7.6vw,2.3rem)] md:group-data-[placement=final]/content:text-[3rem]",
};

/** Eyebrow, headline, supporting text and the two calls to action. Real HTML over the visual. */
const HeroContent = ({ ref, mode }) => {
  const mobile = mode === "mobile";
  return (
    <div
      ref={ref}
      className={`group/content absolute z-20 will-change-[transform,opacity] ${LAYOUT[mode]}`}
    >
      <Eyebrow className={`mb-0! text-gold-300! sm:text-[0.8rem]! ${TEXT_SHADOW} ${mobile ? INTRO_ONLY : ""}`}>
        ✦ {HERO_COPY.eyebrow}
      </Eyebrow>

      <h1
        className={`mt-3 font-serif font-bold uppercase leading-[1.06] tracking-[0.03em] text-white short:mt-2 ${TITLE[mode]} ${TEXT_SHADOW}`}
      >
        {HERO_COPY.titleLines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h1>

      <p
        className={`mt-5 max-w-[34ch] border-l-2 border-gold-400/70 pl-4 text-[1rem] leading-relaxed text-white/95 sm:text-[1.08rem] lg:text-[1.2rem] short:mt-3 lg:short:text-[1.02rem] ${TEXT_SHADOW} ${
          mobile ? `${INTRO_ONLY} max-sm:short:hidden` : ""
        }`}
      >
        {HERO_COPY.text}
      </p>

      {/* Phones keep both buttons on one row (narrower padding) so the block stays short. */}
      <div className={`flex gap-3 ${mobile ? "mt-5 max-sm:gap-2.5" : "mt-8 flex-wrap short:mt-5"}`}>
        <Button
          to={HERO_COPY.primary.href}
          variant="gold"
          size="lg"
          className={`uppercase ${mobile ? "max-sm:px-4! max-sm:text-[0.8rem]!" : ""}`}
        >
          {HERO_COPY.primary.label}
          <ArrowRight className="h-4.5 w-4.5" strokeWidth={2} aria-hidden="true" />
        </Button>
        {/* No backdrop blur here: blurring over a moving canvas/video is the biggest scroll-jank cost. */}
        <Button
          to={HERO_COPY.secondary.href}
          variant="outline"
          size="lg"
          className={`uppercase backdrop-blur-none! bg-[rgba(7,18,13,0.6)]! ${mobile ? "max-sm:px-4! max-sm:text-[0.8rem]!" : ""}`}
        >
          {HERO_COPY.secondary.label}
        </Button>
      </div>
    </div>
  );
};

export default HeroContent;
