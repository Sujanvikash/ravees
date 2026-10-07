/** Small gold mono label above a heading ("✦ Our Story", "Your Cart", …). */
const Eyebrow = ({ className = '', children }) => {
  return (
    <span
      className={`mb-3 inline-block font-mono text-[0.72rem] uppercase tracking-[0.28em] text-gold-400 ${className}`}
    >
      {children}
    </span>
  );
};

export default Eyebrow;
