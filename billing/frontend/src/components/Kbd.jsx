const TONES = {
  light: 'border-line bg-surface text-ink-3 shadow-[0_1px_0_rgba(9,9,11,0.06)]',
  dark: 'border-[rgb(255_255_255/0.2)] bg-[rgb(255_255_255/0.1)] text-[rgb(255_255_255/0.85)]',
};

/** A keycap-style shortcut hint, e.g. <Kbd>F12</Kbd>; tone="dark" on green buttons. */
const Kbd = ({ children, tone = 'light', className = '' }) => (
  <kbd
    className={`inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border px-1 font-mono text-[10px] leading-none font-medium ${TONES[tone]} ${className}`}
  >
    {children}
  </kbd>
);

export default Kbd;
