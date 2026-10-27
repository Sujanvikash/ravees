/** Small gold mono label above a heading ("✦ Our Story", "Your Cart", …). */
const Eyebrow = ({ className = '', children }) => {
  return (
    <span
      className={`mb-1.5 inline-block font-mono text-[0.66rem] uppercase tracking-[0.22em] text-gold-400 ${className}`}
    >
      {children}
    </span>
  );
};

export default Eyebrow;
