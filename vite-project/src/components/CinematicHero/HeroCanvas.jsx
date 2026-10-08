import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrameSequence } from "./useFrameSequence";

const MAX_DPR = 2; // above 2x the extra pixels cost fill-rate without visible gain
// A small frame stretched to fill the screen is soft anyway, so the cheap filter looks the same (and
// the "high" filter on them made fast scrolls drop frames). Sharp frames keep "high".
const smoothingFor = (img) => (img.width < 600 ? "low" : "high");

/** Full HD (1920 px) frames on every screen. (The 1280 px "landscape-lite" set is still built but unused.) */
const pickFrameSet = (frames) => ({ folder: "landscape", size: frames.landscape.full, full: true });

const frameUrl = (dir, folder) => (i) =>
  `${import.meta.env.BASE_URL}${dir}/${folder}/frame_${String(i + 1).padStart(4, "0")}.webp`;

/**
 * Desktop visual: the frame sequence drawn on a canvas. Scroll never re-renders it: the parent calls
 * `ref.current.render(progress)` from its animation frame, and this draws the matching frame.
 *
 * `frames` is one manifest from heroConfig's FRAME_SETS. It is fixed for the component's life: the parent
 * remounts it (key) to switch sets, so the loader and its decoded frames start clean.
 */
const HeroCanvas = ({ ref, reduced, frames }) => {
  const FRAME_COUNT = frames.count;
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const state = useRef({ frame: 0, drawnA: null, drawnB: null, drawnKey: -1 });

  const [frameSet] = useState(() => pickFrameSet(frames));
  // Every 1080p frame decoded at once is ~1.5 GB, so that is only done where the browser reports 8 GB+.
  const decodeAll = frameSet.full && (navigator.deviceMemory ?? 0) >= 8;
  const getSrc = useMemo(() => frameUrl(frames.dir, frameSet.folder), [frames.dir, frameSet]);
  // Small stand-ins shown while a sharp frame decodes during a fast scroll. A still has no use for them.
  const previewSrc = useMemo(
    () => (reduced ? undefined : frameUrl(frames.dir, "landscape-small")),
    [frames.dir, reduced]
  );

  const getFrameRef = useRef(() => null);
  const warmRef = useRef(() => {});

  const draw = useCallback((force = false) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const s = state.current;
    const i0 = Math.floor(s.frame);
    warmRef.current(Math.round(s.frame));

    // ~14 px of scroll per frame: crossfading into the next frame by the fractional position makes slow
    // scrolling continuous instead of stepped. Alpha is quantised to 1/16 so tiny moves skip the redraw.
    const a = getFrameRef.current(i0);
    if (!a) return;
    const next = i0 + 1 < FRAME_COUNT ? getFrameRef.current(i0 + 1, true) : null;
    const alpha = next ? Math.round((s.frame - i0) * 16) / 16 : 0;
    const base = alpha === 1 ? next : a;
    const over = alpha > 0 && alpha < 1 ? next : null;
    const key = over ? alpha : 0;
    if (!force && base === s.drawnA && over === s.drawnB && key === s.drawnKey) return;
    s.drawnA = base;
    s.drawnB = over;
    s.drawnKey = key;

    // Cover fit, centred sideways. Vertically it is pinned to the TOP: the star on the finished tree
    // touches the top edge of the frames, so any height that has to go comes off the bottom (snow).
    const cw = canvas.width;
    const ch = canvas.height;
    const iw = base.naturalWidth || base.width;
    const ih = base.naturalHeight || base.height;
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const x = (cw - dw) / 2;
    ctx.imageSmoothingQuality = smoothingFor(base);
    ctx.drawImage(base, x, 0, dw, dh);
    if (over) {
      ctx.imageSmoothingQuality = smoothingFor(over);
      ctx.globalAlpha = alpha;
      ctx.drawImage(over, x, 0, dw, dh);
      ctx.globalAlpha = 1;
    }
  }, [FRAME_COUNT]);

  const { getFrame, warm, firstFrameReady, progress } = useFrameSequence({
    count: FRAME_COUNT,
    getSrc,
    onFrameLoad: () => draw(),
    keepDecoded: frameSet.full ? 12 : 8,
    decodeAll,
    previewSrc,
    lastFrameOnly: reduced,
  });
  // Layout effect: in place before the loader's first onFrameLoad → draw() needs it.
  useLayoutEffect(() => {
    getFrameRef.current = getFrame;
    warmRef.current = warm;
  }, [getFrame, warm]);

  useImperativeHandle(
    ref,
    () => ({
      render: (p) => {
        // p = 1 is exactly the last frame: never past it, never wrapping round.
        state.current.frame = p * (FRAME_COUNT - 1);
        draw();
      },
    }),
    [draw, FRAME_COUNT]
  );

  // Canvas backing store = CSS box × devicePixelRatio (capped, and never finer than the frames have detail for).
  useEffect(() => {
    const canvas = canvasRef.current;
    const [frameW, frameH] = frameSet.size;
    const resize = () => {
      const { clientWidth, clientHeight } = canvas;
      if (!clientWidth || !clientHeight) return;
      const dpr = Math.max(
        1,
        Math.min(window.devicePixelRatio || 1, MAX_DPR, frameW / clientWidth, frameH / clientHeight)
      );
      const w = Math.round(clientWidth * dpr);
      const h = Math.round(clientHeight * dpr);
      if (canvas.width === w && canvas.height === h && ctxRef.current) return;
      canvas.width = w;
      canvas.height = h;
      // Resizing resets the context, so configure it again.
      const ctx = canvas.getContext("2d", { alpha: false });
      ctx.imageSmoothingEnabled = true;
      ctxRef.current = ctx;
      draw(true);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw, frameSet]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${
          firstFrameReady ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* Load progress: a hairline that fills while the frames stream in, then fades. */}
      <progress
        aria-hidden="true"
        value={progress}
        max={1}
        className={`absolute inset-x-0 bottom-0 z-10 h-px w-full appearance-none border-0 bg-gold-400/15 transition-opacity duration-700 [&::-moz-progress-bar]:bg-gold-400 [&::-webkit-progress-bar]:bg-gold-400/15 [&::-webkit-progress-value]:bg-gold-400 [&::-webkit-progress-value]:transition-[width] [&::-webkit-progress-value]:duration-300 ${
          progress >= 1 ? "opacity-0" : "opacity-100"
        }`}
      />
    </>
  );
};

export default HeroCanvas;
