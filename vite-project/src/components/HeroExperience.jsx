import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, Truck, TreePine, Sparkles, Star } from 'lucide-react';
import { Renderer4K } from '../engines/renderer-4k.js';
import { ParticleEngine } from '../engines/particles.js';
import { PRODUCTS } from '../data/products.js';

// 240 stills at 1280x720 (the video's native size), extracted at high JPEG quality.
const TOTAL_FRAMES = 240;
const SOURCE_WIDTH = 1280;
const FRAME_RATIO = 16 / 9;
// Share of the remaining gap to the scroll target closed per 60 Hz frame.
const SCRUB_FOLLOW = 0.2;
const NARROW_ORBIT_COUNT = 4;
const framePath = (i) => `/frames-hd/frame-${String(i + 1).padStart(3, '0')}.jpg`;

/** Orbit positions: angle on the ellipse (deg), pointer-parallax depth, entry tilt. */
const ORBIT_SLOTS = [
  { angle: 158, depth: 1.0, tilt: -14 },
  { angle: 206, depth: 0.62, tilt: 11 },
  { angle: 246, depth: 1.28, tilt: -9 },
  { angle: 338, depth: 1.18, tilt: 13 },
  { angle: 22, depth: 0.68, tilt: -12 },
  { angle: 300, depth: 0.92, tilt: 8 },
];

const SPEC_ITEMS = [
  {
    Icon: ShieldCheck,
    title: 'European Safety Certified',
    detail: '100% fire-retardant & non-toxic',
  },
  { Icon: Zap, title: 'Instant Power Trunk', detail: 'Zero wire tangling, snap-lock poles' },
  { Icon: Truck, title: 'White-Glove Pan-India Setup', detail: 'Doorstep delivery & 10-Yr warranty' },
];

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/** One representative product per orbit slot, drawn from the live catalog. */
function pickOrbitProducts() {
  const wanted = [
    'christmas-trees',
    'christmas-lights',
    'tree-hangings',
    'christmas-trees',
    'tree-hangings',
    'wreath-garlands',
  ];
  const used = new Set();
  return wanted.map((category, slot) => {
    const match =
      PRODUCTS.find((p) => p.category === category && !used.has(p.id)) ??
      PRODUCTS.find((p) => !used.has(p.id));
    if (match) used.add(match.id);
    return { ...ORBIT_SLOTS[slot], product: match };
  });
}

const ORBIT_ITEMS = pickOrbitProducts();

export default function HeroExperience() {
  const canvasRef = useRef(null);
  const particleCanvasRef = useRef(null);
  const heroSectionRef = useRef(null);
  const scrollTrackRef = useRef(null);
  const leftCardRef = useRef(null);
  const rightCardRef = useRef(null);
  const orbitRefs = useRef([]);
  const lineRefs = useRef([]);
  const nodeRefs = useRef([]);
  const captionRefs = useRef([]);

  const [isCompleted, setIsCompleted] = useState(false);
  const orbitItems = ORBIT_ITEMS;
  const navigate = useNavigate();

  useEffect(() => {
    const canvas = canvasRef.current;
    const particleCanvas = particleCanvasRef.current;
    if (!canvas || !particleCanvas) return;

    // 2D canvas, not WebGL: on integrated GPUs a WebGL texture upload of each new
    // 1280x720 frame costs ~8 ms on the main thread, which alone exceeds a 144 Hz
    // frame budget (6.9 ms) during continuous scrolling. drawImage does not.
    const renderer = new Renderer4K(canvas, { mode: '2d' });
    const particles = new ParticleEngine(particleCanvas);

    // Plain <img> frames: measured on this project's target hardware, Chrome's
    // own image path uploads these to WebGL faster than pre-decoded ImageBitmaps.
    const frames = new Array(TOTAL_FRAMES);
    let currentFrame = 0;
    // Hero geometry, measured on resize rather than read inside the scroll handler
    // (reading layout there, after the loop has written styles, forces a relayout).
    let heroTop = 0;
    let heroTravel = window.innerHeight;
    let targetFrame = 0;
    let lastScrollY = window.scrollY;
    let animationFrameId = null;

    let scrollProgress = 0;
    let smoothProgress = 0;
    let completedFlag = false;
    let pointerX = 0;
    let pointerY = 0;
    let smoothPointerX = 0;
    let smoothPointerY = 0;
    let orbitClock = 0;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resizeCanvases = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Never render more pixels than the 1280px source frame actually has: on a
      // retina laptop a 2x canvas quadruples the shader work for zero extra detail.
      const shownFrameWidth = w / h >= FRAME_RATIO ? h * FRAME_RATIO : Math.min(w * 2.1, h * FRAME_RATIO);
      const dpr = Math.min(window.devicePixelRatio || 1, Math.max(1, SOURCE_WIDTH / shownFrameWidth));

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      particles.resize();
      renderer.invalidate();
      measureHero();
      drawFrameAt(currentFrame);
      lastDrawnFrame = Math.round(currentFrame);
    };

    const measureHero = () => {
      heroTop = heroSectionRef.current?.offsetTop ?? 0;
      const track = scrollTrackRef.current;
      heroTravel = (track ? track.offsetHeight - window.innerHeight : window.innerHeight) || 1;
    };

    const nearestLoaded = (i) => {
      if (frames[i]) return frames[i];
      for (let d = 1; d < TOTAL_FRAMES; d++) {
        if (frames[i - d]) return frames[i - d];
        if (frames[i + d]) return frames[i + d];
      }
      return null;
    };

    /**
     * Whole-frame scrub: snap to the nearest still and draw it once. With this many
     * frames a cross-fade is invisible, and skipping it halves the per-frame draw cost.
     */
    const drawFrameAt = (position) => {
      const index = Math.round(Math.max(0, Math.min(TOTAL_FRAMES - 1, position)));
      const frame = nearestLoaded(index);
      if (!frame) return;
      renderer.frameSeed = index;
      renderer.render(frame, frame, 0, 'contain');
    };

    const updateCardFade = (card, p) => {
      if (!card) return;
      if (p < 0.05) {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
        card.style.pointerEvents = 'auto';
      } else if (p < 0.32) {
        const fade = Math.max(0, (0.32 - p) / (0.32 - 0.05));
        card.style.opacity = `${fade.toFixed(3)}`;
        card.style.transform = `translateY(${((1 - fade) * -20).toFixed(1)}px)`;
        card.style.pointerEvents = fade < 0.2 ? 'none' : 'auto';
      } else {
        card.style.opacity = '0';
        card.style.transform = 'translateY(-20px)';
        card.style.pointerEvents = 'none';
      }
    };

    const applyProgress = (p) => {
      targetFrame = p * (TOTAL_FRAMES - 1);
      scrollProgress = p;

      updateCardFade(leftCardRef.current, p);
      updateCardFade(rightCardRef.current, p);

      const done = p >= 0.95;
      if (done !== completedFlag) {
        completedFlag = done;
        setIsCompleted(done);
      }
    };

    /**
     * Pure two-way scrub: progress tracks the scroll position directly, so
     * scrolling down plays the sequence forward and scrolling back up rewinds it.
     */
    const handleScroll = () => {
      const scrollY = window.scrollY;
      applyProgress(clamp01((scrollY - heroTop) / heroTravel));

      particles.updateVelocity(scrollY - lastScrollY);
      lastScrollY = scrollY;
    };

    const handlePointerMove = (e) => {
      pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const handlePointerLeave = () => {
      pointerX = 0;
      pointerY = 0;
    };

    /** Chips burst out of the tree centre and settle onto an ellipse. */
    const updateConstellation = (p, dt) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const compact = w < 1180;
      const narrow = w < 620;
      const rx = w * (narrow ? 0.3 : compact ? 0.32 : 0.345);
      const ry = h * (narrow ? 0.3 : compact ? 0.27 : 0.315);
      const par = narrow ? 0.4 : 1;
      const spin = (p - 0.5) * 26;

      orbitClock += dt;

      for (let i = 0; i < orbitItems.length; i++) {
        const el = orbitRefs.current[i];
        if (!el) continue;

        // Phones only have room for a few cards around the tree
        if (narrow && i >= NARROW_ORBIT_COUNT) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          lineRefs.current[i]?.style.setProperty('opacity', '0');
          nodeRefs.current[i]?.style.setProperty('opacity', '0');
          continue;
        }

        const cfg = orbitItems[i];
        const enter = easeOutCubic(clamp01((p - (0.19 + i * 0.048)) / 0.21));
        const settle = clamp01((p - 0.72) / 0.28);
        const a = ((cfg.angle + spin) * Math.PI) / 180;

        const reach = (0.26 + 0.74 * enter) * (1 + settle * 0.045);
        const bob = reducedMotion ? 0 : Math.sin(orbitClock * 0.9 + i * 1.7) * 6 * enter;
        const sway = reducedMotion ? 0 : Math.cos(orbitClock * 0.7 + i * 2.3) * 4 * enter;

        const px = Math.cos(a) * rx * reach + smoothPointerX * cfg.depth * 26 * par + sway;
        const py = Math.sin(a) * ry * reach + smoothPointerY * cfg.depth * 22 * par + bob;

        const scale = 0.42 + 0.58 * enter;
        const rot =
          (1 - enter) * cfg.tilt + (reducedMotion ? 0 : Math.sin(orbitClock * 0.6 + i) * 1.1 * enter);

        el.style.transform =
          `translate(-50%, -50%) translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) ` +
          `scale(${scale.toFixed(3)}) rotate(${rot.toFixed(2)}deg)`;
        el.style.opacity = enter.toFixed(3);
        // Caption fades in over the last stretch of the card's entrance. Written
        // directly rather than via a CSS custom property, which would force a style
        // recalculation of every card's subtree on every frame.
        const caption = captionRefs.current[i];
        if (caption) {
          caption.style.opacity = clamp01((enter - 0.55) * 2.6).toFixed(3);
          caption.style.transform = `translateY(${((1 - enter) * 10).toFixed(1)}px)`;
        }
        el.style.pointerEvents = enter > 0.9 ? 'auto' : 'none';

        const line = lineRefs.current[i];
        const node = nodeRefs.current[i];
        const outerX = 50 + ((Math.cos(a) * rx * reach * 0.78 + sway) / w) * 100;
        const outerY = 50 + ((Math.sin(a) * ry * reach * 0.78 + bob) / h) * 100;
        const innerX = 50 + ((Math.cos(a) * rx * reach * 0.46) / w) * 100;
        const innerY = 50 + ((Math.sin(a) * ry * reach * 0.46) / h) * 100;

        if (line) {
          line.setAttribute('x1', `${innerX.toFixed(2)}%`);
          line.setAttribute('y1', `${innerY.toFixed(2)}%`);
          line.setAttribute('x2', `${outerX.toFixed(2)}%`);
          line.setAttribute('y2', `${outerY.toFixed(2)}%`);
          line.style.strokeDashoffset = `${(1 - enter).toFixed(3)}`;
          line.style.opacity = (enter * 0.85).toFixed(3);
        }
        if (node) {
          node.setAttribute('cx', `${innerX.toFixed(2)}%`);
          node.setAttribute('cy', `${innerY.toFixed(2)}%`);
          node.style.opacity = (enter * 0.9).toFixed(3);
        }
      }
    };

    /** Fraction of the remaining gap to close this frame, independent of refresh rate. */
    const follow = (perFrame60, dt) => 1 - Math.pow(1 - perFrame60, dt * 60);

    let lastTime = performance.now();
    let lastDrawnFrame = -1;
    let heroVisible = true;

    const renderLoop = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const frameDiff = targetFrame - currentFrame;
      if (Math.abs(frameDiff) > 0.01) {
        currentFrame += frameDiff * follow(SCRUB_FOLLOW, dt);
      } else {
        currentFrame = targetFrame;
      }

      // Only repaint when the displayed still actually changes.
      const shownFrame = Math.round(currentFrame);
      if (shownFrame !== lastDrawnFrame) {
        drawFrameAt(shownFrame);
        lastDrawnFrame = shownFrame;
      }

      smoothProgress += (scrollProgress - smoothProgress) * follow(0.2, dt);
      smoothPointerX += (pointerX - smoothPointerX) * follow(0.06, dt);
      smoothPointerY += (pointerY - smoothPointerY) * follow(0.06, dt);
      updateConstellation(smoothProgress, dt);

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    const startLoops = () => {
      if (animationFrameId) return;
      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(renderLoop);
      particles.start();
    };

    const stopLoops = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
      particles.stop();
    };

    // Once the visitor has scrolled past the hero, nothing in it is on screen, so
    // stop redrawing instead of burning GPU/CPU under the rest of the page.
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      if (heroVisible && !document.hidden) startLoops();
      else stopLoops();
    });
    visibilityObserver.observe(heroSectionRef.current);

    const handleTabVisibility = () => {
      if (document.hidden) stopLoops();
      else if (heroVisible) startLoops();
    };
    document.addEventListener('visibilitychange', handleTabVisibility);

    resizeCanvases();
    handleScroll();
    window.addEventListener('resize', resizeCanvases, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    // Frame 0 first so the stage paints immediately, then the rest in parallel.
    const loadFrame = (i) =>
      new Promise((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          // Decode now, off the scroll path, so the first pass over a frame doesn't
          // stall the main thread while the JPEG is decompressed inside drawImage.
          const ready = () => {
            frames[i] = img;
            if (i === Math.round(currentFrame)) lastDrawnFrame = -1; // the frame on screen just arrived: repaint
            resolve();
          };
          if (img.decode) img.decode().then(ready, ready);
          else ready();
        };
        img.onerror = () => resolve();
        img.src = framePath(i);
      });
    let nextFrame = 1;
    loadFrame(0).then(() =>
      Promise.all(
        Array.from({ length: 6 }, async () => {
          while (nextFrame < TOTAL_FRAMES) await loadFrame(nextFrame++);
        })
      )
    );
    // Web fonts landing after mount can nudge the hero's offset; re-measure once.
    document.fonts?.ready.then(() => {
      measureHero();
      handleScroll();
    });

    startLoops();

    return () => {
      window.removeEventListener('resize', resizeCanvases);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pointermove', handlePointerMove);
      document.documentElement.removeEventListener('pointerleave', handlePointerLeave);
      document.removeEventListener('visibilitychange', handleTabVisibility);
      visibilityObserver.disconnect();
      stopLoops();
      particles.destroy();
    };
  }, [orbitItems]);

  const scrollPastHero = () => {
    const heroTop = heroSectionRef.current?.offsetTop ?? 0;
    const track = scrollTrackRef.current;
    const heroHeight = track ? track.offsetHeight - window.innerHeight : window.innerHeight;
    window.scrollTo({ top: heroTop + heroHeight, behavior: 'smooth' });
  };

  return (
    <section ref={heroSectionRef} className="relative w-full">
      {/* Sticky canvas viewport */}
      <div className="sticky top-0 z-[1] flex h-screen w-screen items-center justify-center overflow-hidden bg-bg-darker">
        <canvas
          ref={canvasRef}
          className="absolute top-1/2 left-1/2 z-[2] block -translate-x-1/2 -translate-y-1/2 will-change-transform"
        />
        {/* Vignette that seats the tree in the frame (formerly done in the WebGL shader) */}
        <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(2,8,5,0.35)_100%)]" />
        <canvas ref={particleCanvasRef} className="pointer-events-none absolute inset-0 z-[3] h-full w-full" />

        {/* Tethers linking each ornament back to the tree */}
        <svg className="pointer-events-none absolute inset-0 z-[5] h-full w-full overflow-visible" aria-hidden="true">
          {orbitItems.map((item, i) => (
            <g key={`tether-${i}`}>
              <line
                ref={(el) => {
                  lineRefs.current[i] = el;
                }}
                x1="50%"
                y1="50%"
                x2="50%"
                y2="50%"
                pathLength="1"
                stroke="var(--color-gold-400)"
                strokeWidth="1"
                strokeDasharray="1"
                strokeDashoffset="1"
                opacity="0"
              />
              <circle
                ref={(el) => {
                  nodeRefs.current[i] = el;
                }}
                cx="50%"
                cy="50%"
                r="2.6"
                fill="var(--color-gold-300)"
                opacity="0"
              />
            </g>
          ))}
        </svg>

        {/* Ornament constellation: real catalog imagery orbiting the tree */}
        <div className="pointer-events-none absolute inset-0 z-[6]">
          {orbitItems.map((item, i) =>
            item.product ? (
              <figure
                key={item.product.id}
                ref={(el) => {
                  orbitRefs.current[i] = el;
                }}
                onClick={() => navigate(`/product/${item.product.id}`)}
                className="group absolute top-1/2 left-1/2 m-0 w-[128px] sm:w-[208px] cursor-pointer opacity-0 will-change-[transform,opacity]"
              >
                <div className="relative overflow-hidden rounded-[14px] border border-gold-400/30 bg-bg-dark-emerald shadow-[0_18px_44px_rgba(0,0,0,0.65)] transition-all duration-300 after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(160deg,rgba(6,22,16,0)_35%,rgba(5,22,15,0.72)_100%)] after:content-[''] group-hover:border-gold-400 group-hover:shadow-[0_24px_56px_rgba(0,0,0,0.7),0_0_40px_rgba(229,199,139,0.34)]">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    loading="lazy"
                    decoding="async"
                    style={{ animationDelay: `${-3 * i}s` }}
                    className="animate-ken-burns block h-[84px] sm:h-[146px] w-full object-cover"
                  />
                  <span
                    style={{ animationDelay: `${1.1 * i}s` }}
                    className="animate-orbit-shine pointer-events-none absolute -top-[60%] left-0 h-[220%] w-[40%] will-change-transform bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,246,223,0.34)_50%,rgba(255,255,255,0)_100%)]"
                  />
                </div>
                <figcaption
                  ref={(el) => {
                    captionRefs.current[i] = el;
                  }}
                  className="pointer-events-none absolute inset-x-3 bottom-2.5 opacity-0"
                >
                  <strong className="block text-[0.66rem] leading-[1.25] sm:text-[0.8rem] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.85)]">
                    {item.product.name}
                  </strong>
                  <span className="mt-0.5 hidden font-mono text-[0.62rem] sm:block uppercase tracking-[0.14em] text-gold-300 [text-shadow:0_2px_8px_rgba(0,0,0,0.9)]">
                    {item.product.categoryLabel}
                  </span>
                </figcaption>
              </figure>
            ) : null
          )}
        </div>

        {/* Completion pill */}
        <div
          className={`absolute bottom-9 left-1/2 z-[15] flex items-center gap-3.5 rounded-full border border-gold-400/30 bg-[rgba(6,24,17,0.92)] px-6 py-2.5 text-[0.86rem] text-white shadow-[0_10px_30px_rgba(0,0,0,0.6),0_0_20px_rgba(229,199,139,0.4)] transition-all duration-500 ${
            isCompleted
              ? 'pointer-events-auto -translate-x-1/2 translate-y-0 opacity-100'
              : 'pointer-events-none -translate-x-1/2 translate-y-5 opacity-0'
          }`}
        >
          <span className="animate-pulse-dot h-2 w-2 rounded-full bg-gold-400 shadow-[0_0_10px_var(--color-gold-400)]" />
          <span className="hidden sm:inline">
            <strong className="font-semibold">Raave&apos;s Signature Tree</strong> &bull; Fully Illuminated
          </span>
          <button
            onClick={() => navigate('/shop')}
            className="cursor-pointer rounded-full border border-gold-400/15 bg-gold-400/20 px-3.5 py-1.5 text-[0.82rem] font-bold tracking-[0.04em] text-gold-300 transition-all duration-300 hover:bg-gold-400 hover:text-[#04120a]"
          >
            Explore Collection →
          </button>
        </div>
      </div>

      {/* Scroll track: three viewports of travel scrub the whole sequence */}
      <div ref={scrollTrackRef} className="pointer-events-none relative z-10 -mt-[100vh] h-[400vh] w-full">
        <div className="pointer-events-none sticky top-0 flex h-screen items-center justify-between px-[4vw]">
          {/* Story card */}
          <div
            ref={leftCardRef}
            className="pointer-events-auto w-full min-w-0 max-w-[440px] rounded-[18px] border border-gold-400/30 bg-[rgba(8,28,20,0.85)] px-5 py-6 shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_30px_rgba(229,199,139,0.12)] transition-[opacity,transform] duration-[350ms] sm:px-9 sm:py-8"
          >
            <div className="mb-3 inline-flex items-center gap-1.5 font-mono text-[0.68rem] tracking-[0.22em] text-gold-400">
              <span className="text-gold-400">✦</span> RAAVE&apos;S HERITAGE COLLECTION
            </div>
            <h2 className="mb-3.5 bg-[linear-gradient(135deg,#ffffff_0%,var(--color-gold-200)_100%)] bg-clip-text font-serif text-[1.8rem] font-bold leading-[1.2] tracking-[0.03em] text-transparent sm:text-[2.1rem]">
              European Perfection In Every Needle
            </h2>
            <p className="mb-5 text-[0.95rem] leading-[1.7] text-text-secondary">
              For 27 years, Raave&apos;s has brought the grandeur of European winter forests into Indian homes.
              Scroll to bring our signature tree to life — scroll back up to rewind it.
            </p>
            <div className="mb-4 flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/shop')}
                className="inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-gold-200 bg-[linear-gradient(135deg,var(--color-gold-400),var(--color-gold-600))] px-6.5 py-3 text-[0.88rem] font-semibold tracking-[0.06em] text-[#04140b] shadow-[0_0_20px_rgba(229,199,139,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#fff0c4,var(--color-gold-400))]"
              >
                <span>Shop Collection</span>
                <ArrowRight size={16} strokeWidth={2} />
              </button>
              <button
                onClick={() => navigate('/tree-studio')}
                className="inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-gold-400/30 bg-[rgba(8,28,20,0.6)] px-6.5 py-3 text-[0.88rem] font-semibold tracking-[0.06em] text-gold-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-400 hover:bg-gold-400/15 hover:text-white"
              >
                Tree Studio
              </button>
            </div>
            <div className="my-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/15 bg-gold-400/12 px-2.5 py-1 text-[0.74rem] text-gold-200">
                <TreePine size={12} strokeWidth={2} /> 2,400+ PE/PVC Tips
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/15 bg-gold-400/12 px-2.5 py-1 text-[0.74rem] text-gold-200">
                <Sparkles size={12} strokeWidth={2} /> 3,000 Cluster LEDs
              </span>
            </div>
            <div
              onClick={scrollPastHero}
              className="flex cursor-pointer select-none items-center gap-2.5 text-[0.78rem] tracking-[0.04em] text-gold-400 transition-all duration-[250ms] hover:translate-y-px hover:text-white"
            >
              <span className="flex h-7 w-[18px] justify-center rounded-xl border-2 border-gold-400 pt-1">
                <span className="animate-mouse-wheel h-1.5 w-[3px] rounded-sm bg-gold-400" />
              </span>
              <span>Scroll to illuminate — scroll up to rewind</span>
            </div>
          </div>

          {/* Specification deck */}
          <div
            ref={rightCardRef}
            className="pointer-events-auto hidden max-w-[360px] rounded-[18px] border border-gold-400/15 bg-[rgba(6,24,17,0.85)] px-[30px] py-7 shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_30px_rgba(229,199,139,0.08)] transition-[opacity,transform] duration-[350ms] lg:block"
          >
            <div className="mb-4 flex items-center gap-1.5 font-mono text-[0.68rem] tracking-[0.2em] text-gold-400">
              <span>✦</span> CRAFTSMANSHIP STANDARDS
            </div>
            <div className="mb-4.5 flex flex-col gap-3.5">
              {SPEC_ITEMS.map(({ Icon, title, detail }) => (
                <div key={title} className="flex items-start gap-3">
                  <Icon size={20} strokeWidth={2} className="mt-0.5 shrink-0 text-gold-400" />
                  <div>
                    <strong className="mb-0.5 block text-[0.86rem] text-white">{title}</strong>
                    <span className="block text-[0.76rem] text-text-secondary">{detail}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-3 font-mono text-[0.76rem] text-gold-300">
              <span className="flex items-center gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={11} strokeWidth={2} fill="currentColor" />
                ))}
                4.98
              </span>
              <span>14,200+ Homes</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
