import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useFrameSequence } from "./useFrameSequence";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const FRAME_COUNT = 242;
const MAX_DPR = 2; // above 2x the extra pixels cost fill-rate without visible gain

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

/**
 * Scroll-scrubbed image-sequence hero.
 *
 * Props
 *  scrollLength  height of the scroll track in viewport heights (default 450)
 *  shopHref      link for the primary CTA
 *  studioHref    link for the secondary CTA
 */
export default function ScrollTreeHero({
  scrollLength = 450,
  shopHref = "/collections",
  studioHref = "/tree-studio",
}) {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  // Mutable render state lives in a ref so scrolling never triggers a React render.
  const renderState = useRef({ frame: 0, drawnImg: null });

  const reduced = usePrefersReducedMotion();
  const [frameSet] = useState(pickFrameSet);

  const getSrc = useMemo(() => {
    const base = import.meta.env.BASE_URL;
    return (i) => `${base}frames/${frameSet}/frame_${String(i + 1).padStart(4, "0")}.webp`;
  }, [frameSet]);

  // Declared before the hook so the loader can request a redraw when a closer frame arrives.
  const getFrameRef = useRef(() => null);

  const draw = useCallback((force = false) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const img = getFrameRef.current(Math.round(renderState.current.frame));
    // Skip the draw entirely when the visible frame hasn't changed.
    if (!img || (!force && img === renderState.current.drawnImg)) return;
    renderState.current.drawnImg = img;

    // object-fit: cover, centred on the tree
    const cw = canvas.width;
    const ch = canvas.height;
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  }, []);

  const { getFrame, firstFrameReady, progress } = useFrameSequence({
    count: FRAME_COUNT,
    getSrc,
    onFrameLoad: () => draw(),
  });
  getFrameRef.current = getFrame;

  // Canvas sizing: match the CSS box at device pixel ratio, redraw on resize.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const { clientWidth, clientHeight } = canvas;
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
  }, [draw]);

  // Scroll choreography: one timeline drives both the frames and the copy.
  useGSAP(
    () => {
      if (reduced) {
        renderState.current.frame = FRAME_COUNT - 1;
        draw(true);
        return;
      }

      ScrollTrigger.config({ ignoreMobileResize: true });
      renderState.current.frame = 0;

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom bottom",
          // Lenis already smooths wheel input on desktop. Native touch scrolling
          // gets a short catch-up so frame changes don't look stepped.
          scrub: ScrollTrigger.isTouch ? 0.5 : true,
          invalidateOnRefresh: true,
        },
      });

      // Frames span the full timeline (0 → 1).
      tl.to(renderState.current, { frame: FRAME_COUNT - 1, duration: 1, onUpdate: () => draw() }, 0);

      // Copy beats, positioned in timeline "progress" units.
      tl.to("[data-beat='hint']", { autoAlpha: 0, duration: 0.04 }, 0.02)
        .to("[data-beat='intro']", { autoAlpha: 0, y: -32, duration: 0.1, ease: "power1.in" }, 0.14)
        .fromTo("[data-beat='craft']", { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 0.1, ease: "power1.out" }, 0.34)
        .to("[data-beat='craft']", { autoAlpha: 0, y: -32, duration: 0.1, ease: "power1.in" }, 0.6)
        .fromTo("[data-beat='finale']", { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 0.1, ease: "power1.out" }, 0.8);
    },
    { scope: sectionRef, dependencies: [reduced, draw] }
  );

  const beatBase = reduced
    ? ""
    : "[grid-area:1/1] will-change-[transform,opacity]";

  return (
    <section
      ref={sectionRef}
      aria-label="Raave's Evergreen hero"
      className="relative bg-[#0B1A14]"
      style={{ height: reduced ? "100svh" : `${scrollLength}svh` }}
    >
      <div className="sticky top-0 h-svh w-full overflow-hidden [contain:layout_paint]">
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full bg-[#0B1A14] transition-opacity duration-700 ${
            firstFrameReady ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Legibility scrim: bottom-up on phones, left-to-right on desktop. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,rgba(7,18,13,0.94)_0%,rgba(7,18,13,0.55)_38%,transparent_62%)] lg:bg-[linear-gradient(90deg,rgba(7,18,13,0.9)_0%,rgba(7,18,13,0.55)_30%,transparent_52%)]"
        />

        <div className="relative mx-auto flex h-full max-w-7xl items-end px-6 pb-[max(3rem,env(safe-area-inset-bottom))] lg:items-center lg:px-10 lg:pb-0">
          <div
            className={
              reduced
                ? "flex max-w-xl flex-col gap-10"
                : "grid max-w-xl items-end lg:items-center"
            }
          >
            {/* Beat 1: empty stage, before the tree appears */}
            <div data-beat="intro" className={beatBase}>
              <h1 className="font-['Cinzel',Georgia,serif] text-[clamp(2.25rem,5.2vw,4.25rem)] leading-[1.08] tracking-[0.01em] text-[#F3EBDD]">
                European perfection in every needle
              </h1>
              <p className="mt-5 max-w-md text-[1.0625rem] leading-relaxed text-[#CFC6B4]">
                For 27 years, Raave's has brought the grandeur of European winter forests into Indian homes.
              </p>
              {!reduced && (
                <p data-beat="hint" className="mt-10 flex items-center gap-3 text-sm text-[#C9A96E]">
                  <span
                    aria-hidden="true"
                    className="relative block h-8 w-5 rounded-full border border-[#C9A96E]/70"
                  >
                    <span className="absolute left-1/2 top-1.5 h-1.5 w-0.5 -translate-x-1/2 animate-bounce rounded-full bg-[#C9A96E]" />
                  </span>
                  Scroll to watch it grow
                </p>
              )}
            </div>

            {/* Beat 2: while the branches and lights come in */}
            {!reduced && (
              <div data-beat="craft" className={`${beatBase} invisible opacity-0`}>
                <h2 className="font-['Cinzel',Georgia,serif] text-[clamp(1.75rem,3.6vw,3rem)] leading-[1.1] text-[#F3EBDD]">
                  Built branch by branch
                </h2>
                <p className="mt-4 max-w-md text-[1.0625rem] leading-relaxed text-[#CFC6B4]">
                  2,400+ PE/PVC tips and 3,000 cluster LEDs on an instant-power trunk, so there are no wires to untangle.
                </p>
              </div>
            )}

            {/* Beat 3: fully decorated tree with gifts */}
            <div data-beat="finale" className={reduced ? "" : `${beatBase} invisible opacity-0`}>
              <h2 className="font-['Cinzel',Georgia,serif] text-[clamp(1.75rem,3.6vw,3rem)] leading-[1.1] text-[#F3EBDD]">
                Ready for your living room
              </h2>
              <p className="mt-4 max-w-md text-[1.0625rem] leading-relaxed text-[#CFC6B4]">
                White-glove delivery and setup across India, backed by a 10-year warranty.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={shopHref}
                  className="rounded-lg bg-[linear-gradient(135deg,#E3C98F,#C9A96E_55%,#A9864A)] px-7 py-3.5 font-semibold text-[#0B1A14] shadow-[0_8px_30px_-10px_rgba(201,169,110,0.6)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3C98F]"
                >
                  Shop collection
                </a>
                <a
                  href={studioHref}
                  className="rounded-lg border border-[#C9A96E]/60 px-7 py-3.5 font-semibold text-[#F3EBDD] transition-colors duration-200 hover:bg-[#C9A96E]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3C98F]"
                >
                  Design in Tree Studio
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Load progress: a hairline that fills while frames stream in, then fades. */}
        <div
          aria-hidden="true"
          className={`absolute inset-x-0 bottom-0 h-px bg-[#C9A96E]/15 transition-opacity duration-700 ${
            progress >= 1 ? "opacity-0" : "opacity-100"
          }`}
        >
          <div
            className="h-full origin-left bg-[#C9A96E] transition-transform duration-300"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
      </div>
    </section>
  );
}
