import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useFrameSequence } from "./useFrameSequence";
import { HeroCard, CraftCard } from "./HeroCards";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const FRAME_COUNT = 242;
const MAX_DPR = 2; // above 2x the extra pixels cost fill-rate without visible gain
// Pixel size of each frame set: the canvas never needs more pixels than the frames have.
const NATIVE = { desktop: [1920, 1080], mobile: [1280, 720] };
// Desktop parallax: how far each card drifts either side of its resting place (px).
const PARALLAX = { hero: 32, craft: 12 };
// Each frame set has a "-small" twin (desktop 480×270, mobile 320×180; ~3 MB / ~1.8 MB for all 242),
// kept decoded for EVERY frame (~120 MB / ~55 MB). A scroll faster than the sharp decoder can follow
// shows these, softer, until the sharp frame is ready. Phones get the smaller ones on purpose:
// decoded frames are what a phone has least room for.
const SMALL_SUFFIX = "-small";
// A small frame stretched to fill the screen is soft anyway, so the cheap filter looks the same.
// The expensive "high" filter on those stretched frames made fast scrolls drop frames (measured:
// fling 10% of screen refreshes missed vs 2% with "low"). Sharp frames keep "high".
const smoothingFor = (img) => (img.width < 960 ? "low" : "high");

/** HD frames for large or dense screens, lighter frames for phones and data-saver. */
function pickFrameSet() {
  if (typeof window === "undefined") return "desktop";
  const saveData = navigator.connection?.saveData;
  const physicalWidth = window.innerWidth * Math.min(window.devicePixelRatio || 1, MAX_DPR);
  return !saveData && physicalWidth > 1300 ? "desktop" : "mobile";
}

function usePrefersReducedMotion() {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

// Card placement. Phones: pinned to the bottom, cards take turns. lg+: left and right of the tree.
const PIN_MOBILE =
  "absolute inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-6 lg:inset-x-auto lg:bottom-auto";
const POS = {
  hero: "lg:left-10 lg:top-1/2 lg:w-[clamp(19rem,26vw,29rem)] lg:-translate-y-1/2",
  craft: "lg:right-10 lg:top-1/2 lg:w-[clamp(17rem,23vw,23rem)] lg:-translate-y-[42%]",
};

/**
 * Scroll-scrubbed image-sequence hero.
 *
 * Props
 *  scrollLength  height of the scroll track in viewport heights (default 450)
 *  shopHref      overrides the primary CTA link from heroContent.js
 *  studioHref    overrides the secondary CTA link from heroContent.js
 */
export default function ScrollTreeHero({ scrollLength = 450, shopHref, studioHref }) {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  // Mutable render state lives in a ref so scrolling never triggers a React render.
  const renderState = useRef({ frame: 0, drawnKey: "", drawnA: null, drawnB: null });

  const reduced = usePrefersReducedMotion();
  const [frameSet] = useState(pickFrameSet);
  // Full 1080p at every scroll speed needs all 242 frames decoded (~1.9 GB), so it is only used
  // where the browser reports 8 GB or more (Chrome/Edge; others report nothing and keep the small frames).
  const [fullQuality] = useState(() => frameSet === "desktop" && (navigator.deviceMemory ?? 0) >= 8);

  const getSrc = useMemo(() => {
    const base = import.meta.env.BASE_URL;
    return (i) => `${base}frames-v2/${frameSet}/frame_${String(i + 1).padStart(4, "0")}.webp`;
  }, [frameSet]);
  // Reduced motion only ever shows the last frame, so it has no use for the small ones.
  const previewSrc = useMemo(() => {
    if (reduced) return undefined;
    const base = import.meta.env.BASE_URL;
    return (i) => `${base}frames-v2/${frameSet}${SMALL_SUFFIX}/frame_${String(i + 1).padStart(4, "0")}.webp`;
  }, [frameSet, reduced]);

  // Declared before the hook so the loader can request a redraw when a closer frame arrives.
  const getFrameRef = useRef(() => null);
  const warmRef = useRef(() => {});

  const draw = useCallback((force = false) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const state = renderState.current;
    const f = state.frame;
    const i0 = Math.floor(f);
    warmRef.current(Math.round(f));

    // The video has one frame per ~13px of scroll, so slow scrolling would step visibly.
    // Crossfading into the next frame by the fractional position makes it continuous.
    // Alpha is quantised to 1/16 so tiny scroll moves don't redraw for no visible change.
    const a = getFrameRef.current(i0);
    if (!a) return;
    const next = i0 + 1 < FRAME_COUNT ? getFrameRef.current(i0 + 1, true) : null;
    const alpha = next ? Math.round((f - i0) * 16) / 16 : 0;
    const base = alpha === 1 ? next : a;
    const over = alpha > 0 && alpha < 1 ? next : null;

    // Skip the draw entirely when the visible result hasn't changed.
    const key = over ? alpha : 0;
    if (!force && base === state.drawnA && over === state.drawnB && key === state.drawnKey) return;
    state.drawnA = base;
    state.drawnB = over;
    state.drawnKey = key;

    // object-fit: cover, centred on the tree
    const cw = canvas.width;
    const ch = canvas.height;
    const iw = base.naturalWidth || base.width;
    const ih = base.naturalHeight || base.height;
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const x = (cw - dw) / 2;
    const y = (ch - dh) / 2;
    ctx.imageSmoothingQuality = smoothingFor(base);
    ctx.drawImage(base, x, y, dw, dh);
    if (over) {
      ctx.imageSmoothingQuality = smoothingFor(over);
      ctx.globalAlpha = alpha;
      ctx.drawImage(over, x, y, dw, dh);
      ctx.globalAlpha = 1;
    }
  }, []);

  const { getFrame, warm, firstFrameReady, progress } = useFrameSequence({
    count: FRAME_COUNT,
    getSrc,
    onFrameLoad: () => draw(),
    // Decoded window either side of the playhead: ~8 MB per desktop frame, ~3.7 MB per mobile one.
    keepDecoded: frameSet === "desktop" ? 12 : 8,
    decodeAll: fullQuality,
    previewSrc,
    // Reduced motion only ever shows the last frame, so it skips the other 241.
    lastFrameOnly: reduced,
  });
  // Layout effect: runs before the loader's first onFrameLoad → draw() can reach getFrame.
  useLayoutEffect(() => {
    getFrameRef.current = getFrame;
    warmRef.current = warm;
  }, [getFrame, warm]);

  // Canvas sizing: match the CSS box at device pixel ratio, redraw on resize.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const [frameW, frameH] = NATIVE[frameSet];
    const resize = () => {
      const { clientWidth, clientHeight } = canvas;
      // With cover-fit, one canvas pixel per frame pixel is all the detail there is to show.
      const dpr = Math.max(
        1,
        Math.min(window.devicePixelRatio || 1, MAX_DPR, frameW / clientWidth, frameH / clientHeight)
      );
      const w = Math.round(clientWidth * dpr);
      const h = Math.round(clientHeight * dpr);
      if (canvas.width === w && canvas.height === h && ctxRef.current) return;
      canvas.width = w;
      canvas.height = h;
      // Resizing resets context state, so reconfigure it every time.
      const ctx = canvas.getContext("2d", { alpha: false });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctxRef.current = ctx;
      draw(true);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw, frameSet]);

  // Scroll choreography: one timeline drives both the frames and the cards.
  useGSAP(
    () => {
      if (reduced) {
        renderState.current.frame = FRAME_COUNT - 1;
        draw(true);
        return undefined;
      }

      ScrollTrigger.config({ ignoreMobileResize: true });
      renderState.current.frame = 0;

      // The stage sticks at --header-h; reading its resolved `top` gives px whatever unit the variable uses.
      const stage = canvasRef.current.parentElement;
      const headerH = () => parseFloat(getComputedStyle(stage).top) || 0;

      const mm = gsap.matchMedia();
      // Both conditions are listed on purpose: matchMedia only runs the callback when one of them matches.
      mm.add({ wide: "(min-width: 1024px)", narrow: "(max-width: 1023.98px)" }, (ctx) => {
        const { wide } = ctx.conditions;

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: sectionRef.current,
            start: () => `top ${headerH()}px`,
            end: "bottom bottom",
            // Lenis already smooths wheel input on desktop. Native touch scrolling
            // gets a short catch-up so frame changes don't look stepped.
            scrub: ScrollTrigger.isTouch ? 0.5 : true,
            invalidateOnRefresh: true,
          },
        });

        // Frames span the full timeline (0 → 1).
        tl.to(renderState.current, { frame: FRAME_COUNT - 1, duration: 1, onUpdate: () => draw() }, 0);

        // The scroll hint goes as soon as the person starts scrolling.
        tl.to("[data-part='hint']", { autoAlpha: 0, duration: 0.04 }, 0.02);

        if (wide) {
          // Desktop: the heritage card stays on the left the whole way. The craftsmanship
          // card slides in on the right once the branches and lights are in.
          tl.fromTo(
            "[data-beat='craft']",
            { autoAlpha: 0, x: 40 },
            { autoAlpha: 1, x: 0, duration: 0.12, ease: "power1.out" },
            0.5
          );

          // Parallax: the cards drift upward at different speeds while the tree holds still,
          // so they read as layers in front of it. The drift is capped by the free space
          // above and below each card (re-measured on resize), so short screens never clip it.
          const drift = (selector, max) => {
            const card = sectionRef.current.querySelector(selector);
            const stage = canvasRef.current.parentElement;
            return Math.min(max, Math.max(0, (stage.clientHeight - card.offsetHeight) / 2 - 8));
          };
          tl.fromTo(
            "[data-beat='hero']",
            { y: () => drift("[data-beat='hero']", PARALLAX.hero) },
            { y: () => -drift("[data-beat='hero']", PARALLAX.hero), duration: 1 },
            0
          ).fromTo(
            "[data-beat='craft']",
            { y: () => drift("[data-beat='craft']", PARALLAX.craft) },
            { y: () => -drift("[data-beat='craft']", PARALLAX.craft), duration: 0.5 },
            0.5
          );
        } else {
          // Phones: one card at a time at the bottom, so the tree stays visible.
          tl.to("[data-beat='hero']", { autoAlpha: 0, y: -24, duration: 0.1, ease: "power1.in" }, 0.14)
            .fromTo(
              "[data-beat='craft']",
              { autoAlpha: 0, y: 32 },
              { autoAlpha: 1, y: 0, duration: 0.1, ease: "power1.out" },
              0.36
            )
            .to("[data-beat='craft']", { autoAlpha: 0, y: -24, duration: 0.1, ease: "power1.in" }, 0.62)
            // The paragraph and hint are dropped on the return so the card is short and leaves the tree visible.
            .set("[data-part='lede'], [data-part='hint']", { display: "none" }, 0.79)
            .fromTo(
              "[data-beat='hero']",
              { autoAlpha: 0, y: 32 },
              { autoAlpha: 1, y: 0, duration: 0.1, ease: "power1.out", immediateRender: false },
              0.8
            );
        }
      });

      return () => mm.revert();
    },
    { scope: sectionRef, dependencies: [reduced, draw] }
  );

  const pin = (key) =>
    reduced ? `relative lg:absolute ${POS[key]}` : `${PIN_MOBILE} ${POS[key]}`;

  return (
    <section
      ref={sectionRef}
      aria-label="Raave's Evergreen hero"
      className="relative bg-[#0B1A14]"
      style={reduced ? undefined : { height: `${scrollLength}svh` }}
    >
      <div
        className={
          reduced
            ? "relative min-h-[calc(100svh-var(--header-h))] w-full overflow-hidden"
            : "sticky top-[var(--header-h)] h-[calc(100svh-var(--header-h))] w-full overflow-hidden [contain:layout_paint]"
        }
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full bg-[#0B1A14] transition-opacity duration-700 ${
            firstFrameReady ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Legibility scrim: bottom-up on phones, sides-in on desktop so the tree stays clean. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,rgba(7,18,13,0.92)_0%,rgba(7,18,13,0.5)_36%,transparent_60%)] lg:bg-[linear-gradient(90deg,rgba(7,18,13,0.8)_0%,transparent_34%,transparent_66%,rgba(7,18,13,0.7)_100%)]"
        />

        <div
          className={`relative mx-auto w-full max-w-[1680px] ${
            reduced ? "flex min-h-[calc(100svh-var(--header-h))] flex-col justify-end gap-4 p-4 pt-8 sm:p-6 lg:block" : "h-full"
          }`}
        >
          <div className={pin("hero")}>
            <HeroCard shopHref={shopHref} studioHref={studioHref} reduced={reduced} />
          </div>
          {/* The timeline hides this card on load and reveals it on scroll. */}
          <div className={pin("craft")}>
            <CraftCard />
          </div>
        </div>

        {/* Load progress: a hairline that fills while frames stream in, then fades. */}
        <div
          aria-hidden="true"
          className={`absolute inset-x-0 bottom-0 h-px bg-gold-400/15 transition-opacity duration-700 ${
            progress >= 1 ? "opacity-0" : "opacity-100"
          }`}
        >
          <div
            className="h-full origin-left bg-gold-400 transition-transform duration-300"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
      </div>
    </section>
  );
}
