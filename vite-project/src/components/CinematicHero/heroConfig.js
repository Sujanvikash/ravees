import heroFrames from "../../data/heroFrames.json";
import heroFramesAlt from "../../data/heroFramesAlt.json";
import heroMobileVideo from "../../data/heroMobileVideo.json";

// ---- Assets ------------------------------------------------------------------------------------------
// The manifests are written by scripts (make-frames.mjs, make-frames.mjs --alt, make-mobile-video.mjs),
// so the hero always follows the latest export: frame count, folder and sizes are never typed in by hand.
// The desktop toggle switches between these frame sets; the first one is shown by default.
export const FRAME_SETS = [
  { id: "forest", label: "Forest", frames: heroFrames },
  { id: "home", label: "Home", frames: heroFramesAlt },
];
export const MOBILE_VIDEO = heroMobileVideo;

// ---- Responsive switch -------------------------------------------------------------------------------
// The phone video is a portrait composition, so it also suits a tablet held upright (where the 16:9
// frames would be cropped to a narrow strip). Everything else gets the canvas frame sequence.
// Tailwind's md (768px) and lg (1024px) breakpoints.
export const MOBILE_QUERY = "(max-width: 767.98px), (orientation: portrait) and (max-width: 1023.98px)";
// Phones are narrower than the video, so only its sides are trimmed and the whole height shows. An upright
// tablet is wider, so height is trimmed: 20% puts most of that trim below the tree, keeping the star
// (about 12% down the video) clear of the top edge.
export const MOBILE_VIDEO_POSITION = "50% 20%";

// ---- Scroll ------------------------------------------------------------------------------------------
// Height of the scroll track. svh rather than vh: on phones vh changes as the address bar slides away,
// which would make the animation jump.
export const HERO_SCROLL_HEIGHT = "400svh";

// ---- Choreography (shares of the scroll, 0 → 1) ------------------------------------------------------
export const SCROLL_HINT_FADE_END = 0.05;
export const CONTENT_FADE_START = 0.2;
export const CONTENT_FADE_END = 0.4;
export const CONTENT_REVEAL_START = 0.7;
export const CONTENT_REVEAL_END = 0.85;
export const BADGE_REVEAL_START = 0.85;
export const BADGE_REVEAL_END = 0.95;
// How far the content drifts while fading out / in (px).
export const CONTENT_SHIFT = 30;

// ---- Copy ----------------------------------------------------------------------------------------------
export const HERO_COPY = {
  eyebrow: "Premium Christmas Trees",
  titleLines: ["European", "Perfection", "In Every Needle"],
  text: "For 27 years, we've brought the grandeur of European winter forests into Indian homes.",
  primary: { label: "Explore Collection", href: "/shop" },
  secondary: { label: "Tree Studio", href: "/tree-studio" },
  scrollHint: "Scroll to explore",
  badge: { title: ["Crafted for", "the season"], caption: ["27 years of", "European craft"] },
};
