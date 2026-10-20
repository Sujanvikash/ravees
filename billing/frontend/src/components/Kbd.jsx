/** A keyboard-shortcut hint, e.g. <Kbd>F12</Kbd>. */
const Kbd = ({ children, className = '' }) => (
  <kbd className={`font-mono text-[11px] font-medium text-ink-3 ${className}`}>{children}</kbd>
);

export default Kbd;
