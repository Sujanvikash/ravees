import { useCallback, useEffect, useRef, useState } from "react";
import HeroCanvas from "./HeroCanvas";
import MobileHeroVideo from "./MobileHeroVideo";
import HeroContent from "./HeroContent";
import HeroFinalBadge from "./HeroFinalBadge";
import HeroFrameToggle from "./HeroFrameToggle";
import {
  BADGE_REVEAL_END,
  BADGE_REVEAL_START,
  CONTENT_FADE_END,
  CONTENT_FADE_START,
  CONTENT_REVEAL_END,
  CONTENT_REVEAL_START,
  CONTENT_SHIFT,
  FRAME_SETS,
  HERO_COPY,
  HERO_SCROLL_HEIGHT,
  MOBILE_QUERY,
  SCROLL_HINT_FADE_END,
} from "./heroConfig";
import { clamp01, range, smooth, useMediaQuery, usePrefersReducedMotion } from "./heroUtils";

// Halfway through the hidden stretch: the copy is invisible, so it can move to its closing position.
const PLACEMENT_SWITCH = (CONTENT_FADE_END + CONTENT_REVEAL_START) / 2;

/** Opacity + vertical offset, written straight to the element. Hidden elements leave the tab order. */
const setLayer = (el, opacity, y = 0) => {
  if (!el) return;
  el.style.opacity = String(opacity);
  el.style.transform = y ? `translate3d(0, ${y.toFixed(2)}px, 0)` : "";
  el.style.visibility = opacity < 0.01 ? "hidden" : "visible";
};

// The chosen frame set is remembered per visitor (a convenience: storage may be blocked or empty).
const SET_KEY = "hero-frame-set";
const readSet = () => {
  try {
    const id = localStorage.getItem(SET_KEY);
    return FRAME_SETS.some((set) => set.id === id) ? id : FRAME_SETS[0].id;
  } catch {
    return FRAME_SETS[0].id;
  }
};

// The site header shows on arrival, slides away as soon as the visitor starts scrolling (together with the
// scroll hint), stays hidden for the rest of the hero so the tree has the full screen, and slides back in as
// the next section scrolls up into view. Scrolling back up reverses it. The hero publishes how far it is
// shown (0 → 1) on <html> (--hero-chrome, plus an attribute while fully hidden) and Header.jsx reads them,
// so neither component needs a reference to the other.
const setHeaderVisibility = (opacity) => {
  const root = document.documentElement;
  root.style.setProperty("--hero-chrome", opacity.toFixed(3));
  root.toggleAttribute("data-hero-chrome-hidden", opacity < 0.01);
};
const resetHeaderVisibility = () => {
  document.documentElement.style.removeProperty("--hero-chrome");
  document.documentElement.removeAttribute("data-hero-chrome-hidden");
};

// Legibility scrims, faded together with the copy so the cinematic middle is the untouched picture.
const SCRIM = {
  desktop:
    "bg-[linear-gradient(90deg,rgba(7,18,13,0.88)_0%,rgba(7,18,13,0.55)_24%,rgba(7,18,13,0.15)_40%,transparent_50%)]",
  intro: "bg-[linear-gradient(180deg,rgba(7,18,13,0.85)_0%,rgba(7,18,13,0.5)_32%,transparent_52%)]",
  final: "bg-[linear-gradient(0deg,rgba(7,18,13,0.92)_0%,rgba(7,18,13,0.6)_18%,transparent_34%)]",
};

/**
 * Scroll-driven cinematic hero: a walk through the winter forest up to the finished tree.
 *
 *   ≥ md (landscape)  HeroCanvas: the frame sequence on a canvas (src/data/heroFrames.json); a toggle
 *                     switches to the alternate sequence (src/data/heroFramesAlt.json)
 *   phones / upright  MobileHeroVideo: the portrait video, its time following the scroll
 *                     (src/data/heroMobileVideo.json)
 *
 * Only the active visual is mounted, so the other one's files are never requested.
 * Timing lives in heroConfig.js. One passive scroll listener schedules one requestAnimationFrame,
 * which computes progress (0 → 1) and hands it to the visual and the HTML layers; nothing re-renders.
 *
 * Props
 *  scrollHeight  CSS height of the scroll track (default HERO_SCROLL_HEIGHT)
 */
const CinematicHero = ({ scrollHeight = HERO_SCROLL_HEIGHT }) => {
  const reduced = usePrefersReducedMotion();
  const mode = useMediaQuery(MOBILE_QUERY) ? "mobile" : "desktop";
  const mobile = mode === "mobile";
  const [setId, setSetId] = useState(readSet);
  const frameSet = FRAME_SETS.find((set) => set.id === setId) ?? FRAME_SETS[0];
  const chooseSet = useCallback((id) => {
    setSetId(id);
    try {
      localStorage.setItem(SET_KEY, id);
    } catch {
      // Not remembered; the switch still works for this visit.
    }
  }, []);

  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const visualRef = useRef(null);
  const contentRef = useRef(null);
  const badgeRef = useRef(null);
  const hintRef = useRef(null);
  const scrimRef = useRef(null);
  const finalScrimRef = useRef(null);

  const apply = useCallback(
    (p) => {
      visualRef.current?.render(p);

      const final = p >= PLACEMENT_SWITCH;
      const out = smooth(range(p, CONTENT_FADE_START, CONTENT_FADE_END));
      const back = smooth(range(p, CONTENT_REVEAL_START, CONTENT_REVEAL_END));
      const opacity = final ? back : 1 - out;
      setLayer(contentRef.current, opacity, final ? (1 - back) * CONTENT_SHIFT : -out * CONTENT_SHIFT);
      if (contentRef.current) contentRef.current.dataset.placement = final ? "final" : "intro";

      if (mobile) {
        setLayer(scrimRef.current, final ? 0 : opacity);
        setLayer(finalScrimRef.current, final ? opacity : 0);
      } else {
        setLayer(scrimRef.current, opacity);
      }
      const badge = smooth(range(p, BADGE_REVEAL_START, BADGE_REVEAL_END));
      setLayer(badgeRef.current, badge, (1 - badge) * 12);
      setLayer(hintRef.current, 1 - range(p, 0, SCROLL_HINT_FADE_END));
    },
    [mobile]
  );

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    // Cached on resize so a scroll only reads one rect.
    const m = { top: 0, travel: 1, height: 0, header: 1 };
    const measure = () => {
      m.top = parseFloat(getComputedStyle(stage).top) || 0; // the sticky offset
      m.travel = Math.max(1, section.offsetHeight - stage.offsetHeight);
      m.height = section.offsetHeight;
      m.header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 76;
    };
    let raf = 0;
    const update = () => {
      raf = 0;
      const top = section.getBoundingClientRect().top;
      const p = reduced ? 1 : clamp01((m.top - top) / m.travel);
      apply(p);
      // Header: shown at the very start, gone by SCROLL_HINT_FADE_END; back once the hero's bottom edge rises
      // above the screen's, sliding in over the first header-height of the next section.
      // Reduced motion has no scroll story: it simply shows.
      const intro = 1 - range(p, 0, SCROLL_HINT_FADE_END);
      const after = clamp01((window.innerHeight - (top + m.height)) / m.header);
      setHeaderVisibility(reduced ? 1 : Math.max(intro, after));
    };
    const request = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onResize = () => {
      measure();
      request();
    };

    measure();
    update();
    window.addEventListener("scroll", request, { passive: true });
    const ro = new ResizeObserver(onResize);
    ro.observe(section);
    ro.observe(stage);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", request);
      ro.disconnect();
      resetHeaderVisibility(); // leaving the page (or re-measuring): the header is back to normal
    };
  }, [apply, reduced, mode, setId]);

  return (
    <section
      ref={sectionRef}
      aria-label="Raave's Evergreen: premium Christmas trees"
      // Pulled up under the sticky header (-mt), so the picture fills the screen from the very top: when the
      // header slides away with the copy, the tree shows in its place instead of an empty strip.
      className="relative -mt-(--header-h) bg-[#0B1A14]"
      style={reduced ? undefined : { height: scrollHeight }}
    >
      <div
        ref={stageRef}
        className={`${
          reduced ? "relative" : "sticky"
        } top-0 h-svh w-full overflow-hidden contain-[layout_paint]`}
      >
        {mobile ? (
          <MobileHeroVideo key="video" ref={visualRef} reduced={reduced} />
        ) : (
          <HeroCanvas key={frameSet.id} ref={visualRef} reduced={reduced} frames={frameSet.frames} />
        )}

        <div aria-hidden="true" ref={scrimRef} className={`pointer-events-none absolute inset-0 ${mobile ? SCRIM.intro : SCRIM.desktop}`} />
        {mobile && (
          <div aria-hidden="true" ref={finalScrimRef} className={`pointer-events-none absolute inset-0 ${SCRIM.final}`} />
        )}

        <div className="relative mx-auto h-full w-full max-w-[1680px]">
          <HeroContent ref={contentRef} mode={mode} />
          {!mobile && <HeroFinalBadge ref={badgeRef} />}
        </div>

        {!mobile && <HeroFrameToggle sets={FRAME_SETS} value={frameSet.id} onChange={chooseSet} />}

        {!reduced && (
          <p
            ref={hintRef}
            aria-hidden="true"
            className={`pointer-events-none absolute left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.26em] text-gold-300 [text-shadow:0_1px_10px_rgba(0,0,0,0.8)] ${
              mobile ? "bottom-5" : "bottom-8 short:hidden"
            }`}
          >
            {HERO_COPY.scrollHint}
            <span className="relative block h-8 w-5 rounded-full border border-gold-400/70">
              <span className="absolute left-1/2 top-1.5 h-1.5 w-0.5 -translate-x-1/2 animate-bounce rounded-full bg-gold-400" />
            </span>
          </p>
        )}
      </div>
    </section>
  );
};

export default CinematicHero;
