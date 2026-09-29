import { TbChristmasTreeFilled } from 'react-icons/tb';

// Literal class names so Tailwind can detect them.
const GLOW = {
  16: 'drop-shadow-[0_0_16px_rgba(229,199,139,0.4)]',
  20: 'drop-shadow-[0_0_20px_rgba(229,199,139,0.4)]',
};

export default function Logo({ size = 30, className = '', glow }) {
  return (
    <TbChristmasTreeFilled
      size={size}
      className={`text-gold-400 ${GLOW[glow] ?? ''} ${className}`.trim()}
    />
  );
}
