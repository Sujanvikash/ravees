import { useId } from 'react';

// Sphere shading per colour: highlight, body, shadow.
const TONES = {
  gold: ['#fff3cf', '#e5c78b', '#8d6a24'],
  ruby: ['#ff9db0', '#c8102e', '#4a0012'],
  emerald: ['#9af2c9', '#0f6b45', '#04241a'],
};

// Where each bauble hangs: x across the gutter (%), string length (px), radius (px), colour, sway timing.
const LAYOUTS = {
  left: [
    { x: 30, len: 64, r: 17, tone: 'gold', dur: 7, delay: 0 },
    { x: 60, len: 150, r: 12, tone: 'ruby', dur: 8.5, delay: -2 },
    { x: 84, len: 36, r: 9, tone: 'emerald', dur: 6, delay: -4 },
  ],
  right: [
    { x: 18, len: 30, r: 9, tone: 'emerald', dur: 6.5, delay: -3 },
    { x: 44, len: 132, r: 13, tone: 'gold', dur: 8, delay: -1 },
    { x: 72, len: 58, r: 17, tone: 'ruby', dur: 7.5, delay: -5 },
  ],
};

// Small four-point sparkles between the baubles: x (%), y (px), size (px), twinkle delay.
const SPARKLES = {
  left: [
    { x: 46, y: 70, s: 10, delay: 0 },
    { x: 20, y: 190, s: 8, delay: -1.2 },
    { x: 78, y: 120, s: 7, delay: -2.4 },
  ],
  right: [
    { x: 60, y: 160, s: 10, delay: -0.6 },
    { x: 30, y: 96, s: 7, delay: -1.8 },
    { x: 86, y: 210, s: 8, delay: -2.8 },
  ],
};

const Bauble = ({ len, r, tone, gradId }) => {
  const w = r * 2 + 6;
  const cx = w / 2;
  const capY = len;
  const cy = capY + 6 + r;
  const [hi, body, shade] = TONES[tone];
  return (
    <svg width={w} height={cy + r + 2} viewBox={`0 0 ${w} ${cy + r + 2}`} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={gradId} cx="35%" cy="32%" r="75%">
          <stop offset="0%" stopColor={hi} />
          <stop offset="45%" stopColor={body} />
          <stop offset="100%" stopColor={shade} />
        </radialGradient>
      </defs>
      <line x1={cx} y1="0" x2={cx} y2={capY} stroke="var(--color-gold-400)" strokeOpacity="0.55" strokeWidth="1" />
      <rect x={cx - 4} y={capY} width="8" height="6" rx="1.5" fill="var(--color-gold-500)" />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${gradId})`} />
      {/* a thin gold band and a glint, so it reads as glass, not a dot */}
      {tone !== 'gold' && (
        <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.28} fill="none" stroke="var(--color-gold-300)" strokeOpacity="0.55" strokeWidth="1" />
      )}
      <ellipse cx={cx - r * 0.38} cy={cy - r * 0.42} rx={r * 0.22} ry={r * 0.13} fill="#fff" fillOpacity="0.55" transform={`rotate(-35 ${cx - r * 0.38} ${cy - r * 0.42})`} />
    </svg>
  );
};

/**
 * A few glass baubles hanging on gold threads, with sparkles between them, in the empty space beside the
 * 1360px content column. Its width is exactly that space, so it never covers a product or a heading; it is
 * only shown from 1600px wide, where the space is wide enough to hold it.
 *
 * Put it inside a section that is `relative` with a z-index (every page section here is `relative z-20`),
 * like Decoration and Aurora.
 *
 * side       "left" | "right"
 * className  extra positioning (e.g. a top offset)
 */
const HangingOrnaments = ({ side = 'left', className = '' }) => {
  const id = useId();
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute top-0 -z-10 hidden h-[260px] w-[calc((100vw-1360px)/2)] min-[1600px]:block ${
        side === 'left' ? 'left-0' : 'right-0'
      } ${className}`}
    >
      {LAYOUTS[side].map((b, i) => (
        <div
          key={i}
          className="absolute top-0 origin-top -translate-x-1/2 animate-sway"
          style={{ left: `${b.x}%`, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }}
        >
          <Bauble {...b} gradId={`${id}-b${i}`} />
        </div>
      ))}
      {SPARKLES[side].map((s, i) => (
        <svg
          key={i}
          viewBox="0 0 10 10"
          width={s.s}
          height={s.s}
          className="absolute animate-twinkle text-gold-300"
          style={{ left: `${s.x}%`, top: s.y, animationDelay: `${s.delay}s` }}
        >
          <path d="M5 0 C5.4 3.6 6.4 4.6 10 5 C6.4 5.4 5.4 6.4 5 10 C4.6 6.4 3.6 5.4 0 5 C3.6 4.6 4.6 3.6 5 0 Z" fill="currentColor" />
        </svg>
      ))}
    </div>
  );
};

export default HangingOrnaments;
