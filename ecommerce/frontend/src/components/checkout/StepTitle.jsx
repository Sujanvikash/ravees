/** ① YOUR DETAILS: a numbered checkout step heading with a one-line hint, and an optional action on the right. */
const StepTitle = ({ n, title, hint, action }) => (
  <div className="flex items-start justify-between gap-3">
    <div className="flex items-start gap-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold-400 font-sans text-[1.05rem] font-bold text-on-gold">
        {n}
      </span>
      <div>
        <h2 className="font-serif text-[1.15rem] font-semibold leading-tight tracking-[0.04em] text-white uppercase">{title}</h2>
        {hint && <p className="mt-0.5 text-[0.8rem] text-text-secondary">{hint}</p>}
      </div>
    </div>
    {action}
  </div>
);

export default StepTitle;
