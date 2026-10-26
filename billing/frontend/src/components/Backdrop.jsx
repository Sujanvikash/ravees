import { useEffect, useRef } from 'react';

const GLOWS = [
  { left: '86%', top: '-6%', size: 240, delay: '-.4s' },
  { left: '93%', top: '62%', size: 190, delay: '-1.8s' },
  { left: '-4%', top: '66%', size: 230, delay: '-2.6s' },
  { left: '44%', top: '-12%', size: 280, delay: '-1.1s' },
  { left: '82%', top: '86%', size: 160, delay: '-3s' },
];

// How much snow: window area per flake, flake size, fall speed and sideways wind.
const AMOUNT = {
  light: { per: 22000, r: [1.2, 2.6], speed: [0.25, 0.55], wind: 0.3, gust: 0 },
  heavy: { per: 3200, r: [1.4, 4], speed: [0.7, 1.6], wind: 0.6, gust: 0.3 },
  blizzard: { per: 1100, r: [1.4, 5.5], speed: [1.4, 3.2], wind: 1.2, gust: 1.4 },
};

/** Snow on a canvas the size of the window; still (but visible) for anyone who prefers reduced motion. */
const Snow = ({ amount }) => {
  const ref = useRef(null);
  useEffect(() => {
    const a = AMOUNT[amount] ?? AMOUNT.light;
    const cv = ref.current;
    const cx = cv.getContext('2d');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rand = ([lo, hi]) => lo + Math.random() * (hi - lo);
    let flakes = [];
    let frame = 0;
    let t = 0;
    const size = () => {
      cv.width = window.innerWidth;
      cv.height = window.innerHeight;
      flakes = Array.from({ length: Math.round((cv.width * cv.height) / a.per) }, () => {
        const r = rand(a.r);
        // bigger flakes fall faster and look nearer
        return { x: Math.random() * cv.width, y: Math.random() * cv.height, r, s: rand(a.speed) * (0.6 + r / 4), d: Math.random() * Math.PI * 2 };
      });
    };
    const draw = () => {
      t += 0.01;
      const gust = Math.sin(t * 0.7) * a.gust; // the wind swells and drops
      cx.clearRect(0, 0, cv.width, cv.height);
      cx.fillStyle = 'rgba(255,255,255,0.95)';
      cx.shadowColor = 'rgba(80,90,80,0.28)'; // a soft edge, so white flakes show on a white screen
      cx.shadowBlur = 3;
      for (const f of flakes) {
        cx.globalAlpha = Math.min(1, 0.55 + f.r / 5);
        cx.beginPath();
        cx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        cx.fill();
        if (!still) {
          f.y += f.s;
          f.d += 0.01;
          f.x += Math.sin(f.d) * a.wind + gust * (f.r / 2);
          if (f.y > cv.height + 10) {
            f.y = -10;
            f.x = Math.random() * cv.width;
          }
          if (f.x > cv.width + 10) f.x = -10;
          else if (f.x < -10) f.x = cv.width + 10;
        }
      }
      cx.globalAlpha = 1;
      if (!still) frame = requestAnimationFrame(draw);
    };
    size();
    draw();
    window.addEventListener('resize', size);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', size);
    };
  }, [amount]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
};

/**
 * The theme's festive effect: snowfall (light, heavy or a blizzard), a soft twinkle where the photo's lights
 * are, both, or nothing. Inside the app it sits under the page (z-index -1), so it never covers anything you
 * read; `front` (the sign-in screen) lets the snow fall in front of everything, still letting clicks through.
 */
const Backdrop = ({ effect, amount = 'light', front = false }) => {
  if (!effect || effect === 'none') return null;
  return (
    <div className={`pointer-events-none fixed inset-0 print:hidden ${front ? 'z-50' : '-z-1'}`} aria-hidden="true">
      {(effect === 'glow' || effect === 'both') &&
        GLOWS.map((g) => (
          <span
            key={g.left + g.top}
            className="absolute animate-twinkle rounded-full bg-[radial-gradient(circle,rgb(255_222_150/0.75),rgb(255_222_150/0)_70%)]"
            style={{ left: g.left, top: g.top, width: g.size, height: g.size, animationDelay: g.delay }}
          />
        ))}
      {(effect === 'snow' || effect === 'both') && <Snow amount={amount} />}
    </div>
  );
};

export default Backdrop;
