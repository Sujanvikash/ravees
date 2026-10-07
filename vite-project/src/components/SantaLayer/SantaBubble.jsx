// Santa's speech bubble, shown above him. The wrapper is a polite live region, so screen readers
// announce each new message (e.g. "Added to your sack!"). align: which side of Santa it lines up
// with, so it opens toward the middle of the screen and never off the edge.
const SantaBubble = ({ message, onPause, onResume }) => {
  const align = message?.align ?? "right";
  return (
    <div
      role="status"
      aria-live="polite"
      className={`absolute bottom-full mb-1 ${align === "right" ? "right-0" : "left-0"}`}
    >
      {message && (
        <div
          key={message.id}
          onMouseEnter={onPause}
          onMouseLeave={onResume}
          className="pointer-events-auto relative w-max max-w-[230px] rounded-xl border border-gold-400/40 bg-bg-dark-emerald px-3 py-2 text-[0.78rem] leading-snug text-white shadow-[0_10px_30px_rgba(0,0,0,0.6)] transition-[opacity,translate] duration-300 starting:translate-y-1 starting:opacity-0"
        >
          <p className="m-0">{message.text}</p>
          {message.actions?.length > 0 && (
            <div className="mt-1.5 flex flex-col items-start gap-1">
              {message.actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className="cursor-pointer border-0 bg-transparent p-0 text-left text-[0.76rem] font-semibold text-gold-300 underline-offset-2 hover:text-gold-200 hover:underline"
                >
                  {action.label} →
                </button>
              ))}
            </div>
          )}
          <span
            aria-hidden="true"
            className="absolute -bottom-[7px] h-3 w-3 rotate-45 border-r border-b border-gold-400/40 bg-bg-dark-emerald"
            style={align === "right" ? { right: 24 } : { left: 24 }}
          />
        </div>
      )}
    </div>
  );
};

export default SantaBubble;
