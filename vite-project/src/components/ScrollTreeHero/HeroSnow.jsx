import { useEffect, useRef } from "react";

// Three depths of flakes: far ones are small, faint and slow, near ones bigger, brighter and faster,
// which reads as depth over the tree. radius in CSS px, speed in px per second.
const LAYERS = [
  { share: 0.48, radius: [0.7, 1.4], speed: [18, 34], alpha: [0.35, 0.6], sway: 10 },
  { share: 0.33, radius: [1.4, 2.4], speed: [34, 60], alpha: [0.55, 0.85], sway: 16 },
  { share: 0.19, radius: [2.4, 3.8], speed: [60, 92], alpha: [0.7, 1], sway: 24 },
];
// Flakes for a 1440 x 824 stage; other sizes scale by area, within these bounds.
const BASE_COUNT = 240;
const MIN_COUNT = 80;
const MAX_COUNT = 320;
const MAX_DPR = 1.5; // soft dots gain nothing from more pixels
const SPRITE = 32; // px: one pre-drawn soft flake, scaled per flake (cheaper than a gradient per flake)

const rand = ([a, b]) => a + Math.random() * (b - a);

// Fewer flakes where the device reports few cores or little memory (browsers that don't report keep all).
const isLowEnd = () =>
  (navigator.hardwareConcurrency ?? 8) <= 4 || (navigator.deviceMemory ?? 8) <= 4;

const makeSprite = () => {
  const c = document.createElement("canvas");
  c.width = c.height = SPRITE;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.45, "rgba(250,252,255,0.8)");
  grad.addColorStop(1, "rgba(250,252,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, SPRITE, SPRITE);
  return c;
};

const makeFlake = (layer, w, h, anywhere) => ({
  layer,
  x: Math.random() * w,
  // New flakes start just above the top; the first batch is spread over the whole stage.
  y: anywhere ? Math.random() * h : -10 - Math.random() * 40,
  r: rand(layer.radius),
  speed: rand(layer.speed),
  alpha: rand(layer.alpha),
  phase: Math.random() * Math.PI * 2,
  freq: 0.4 + Math.random() * 0.8, // sway cycles per ~2π seconds
});

/**
 * Falling snow over the hero stage: a transparent canvas between the picture and the cards.
 * It only animates while the stage is on screen. Not rendered at all with reduced motion
 * (ScrollTreeHero leaves it out), so there is no motion to switch off here.
 */
const HeroSnow = ({ visible = true }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    const sprite = makeSprite();
    const lowEnd = isLowEnd();

    let w = 0;
    let h = 0;
    let dpr = 1;
    let flakes = [];

    const populate = () => {
      const count = Math.round(
        Math.min(MAX_COUNT, Math.max(MIN_COUNT, (BASE_COUNT * w * h) / (1440 * 824))) * (lowEnd ? 0.5 : 1)
      );
      flakes = LAYERS.flatMap((layer) =>
        Array.from({ length: Math.round(count * layer.share) }, () => makeFlake(layer, w, h, true))
      );
    };

    const resize = () => {
      const { clientWidth, clientHeight } = canvas;
      if (!clientWidth || !clientHeight) return;
      const first = !w;
      // Keep flakes where they are (proportionally) when the stage changes size.
      const sx = first ? 1 : clientWidth / w;
      const sy = first ? 1 : clientHeight / h;
      w = clientWidth;
      h = clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      if (first) populate();
      else for (const f of flakes) { f.x *= sx; f.y *= sy; }
    };

    let raf = 0;
    let last = 0;
    let t = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      // Clamp the step so a stalled tab doesn't teleport every flake.
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
      last = now;
      t += dt;
      // A soft breeze that slowly changes strength and direction.
      const wind = 6 + Math.sin(t * 0.13) * 12;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.y += f.speed * dt;
        f.x += (wind * (f.speed / 50) + Math.cos(t * f.freq + f.phase) * f.layer.sway) * dt;
        if (f.y - f.r > h) Object.assign(f, makeFlake(f.layer, w, h, false));
        if (f.x < -10) f.x += w + 20;
        else if (f.x > w + 10) f.x -= w + 20;
        const size = f.r * 2.6; // the sprite's soft edge makes the visible dot ~r
        ctx.globalAlpha = f.alpha;
        ctx.drawImage(sprite, f.x - size / 2, f.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    };

    const start = () => {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    // Only snow while the stage is on screen (it scrolls away after the hero).
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    io.observe(canvas);

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-1000 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    />
  );
};

export default HeroSnow;
