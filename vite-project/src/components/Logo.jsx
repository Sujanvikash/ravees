import { useId } from 'react';

// Literal class names so Tailwind can detect them.
const GLOW = {
  16: 'drop-shadow-[0_0_16px_rgba(229,199,139,0.4)]',
  20: 'drop-shadow-[0_0_20px_rgba(229,199,139,0.4)]',
};

/**
 * The brand emblem: the star and three-tier tree from src/assets/logo.svg (same shapes, cropped to the mark,
 * without the wordmark), so it can sit beside text at icon size. The full logo with its wordmark is
 * assets/logo.svg (also served as /logo.svg).
 *
 * size   width and height (a number in px, or a CSS length such as "1em")
 */
const Logo = ({ size = 30, className = '', glow }) => {
  // Each emblem on the page needs its own gradient id.
  const gold = `logo-gold-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const fill = `url(#${gold})`;

  return (
    <svg
      viewBox="160 44 180 196"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={`${GLOW[glow] ?? ''} ${className}`.trim()}
    >
      <defs>
        <linearGradient id={gold} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff0c4" />
          <stop offset="35%" stopColor="#e5c78b" />
          <stop offset="70%" stopColor="#c99e52" />
          <stop offset="100%" stopColor="#f5e1a4" />
        </linearGradient>
      </defs>
      <g transform="translate(0, 10)">
        {/* star topper */}
        <polygon points="250,42 256,60 275,60 260,72 265,90 250,79 235,90 240,72 225,60 244,60" fill={fill} />
        {/* outer tier */}
        <path d="M 250,98 Q 285,170 330,225 C 310,215 285,200 250,212 C 215,200 190,215 170,225 Q 215,170 250,98 Z" fill={fill} />
        {/* middle tier: dark cut, then gold */}
        <path d="M 250,140 Q 278,185 305,225 C 285,218 268,212 250,220 C 232,212 215,218 195,225 Q 222,185 250,140 Z" fill="#061c14" />
        <path d="M 250,145 Q 275,188 300,224 C 282,216 266,210 250,218 C 234,210 218,216 200,224 Q 225,188 250,145 Z" fill={fill} />
        {/* inner tier: dark cut, then gold */}
        <path d="M 250,175 Q 268,205 285,224 C 272,220 260,216 250,221 C 240,216 228,220 215,224 Q 232,205 250,175 Z" fill="#061c14" />
        <path d="M 250,180 Q 266,206 280,224 C 270,219 260,216 250,220 C 240,216 230,219 220,224 Q 234,206 250,180 Z" fill={fill} />
        {/* central spine */}
        <line x1="250" y1="98" x2="250" y2="218" stroke={fill} strokeWidth="1.5" opacity="0.6" />
      </g>
    </svg>
  );
};

export default Logo;
