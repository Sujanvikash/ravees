import {
  PHONE_DISPLAY,
  ORDER_HOURS,
} from '../data/site.js';

const MESSAGES = [
  <span key="years">
    ✨ <strong className="font-bold">CELEBRATING 27 YEARS IN INDIA</strong> &bull; India&apos;s #1 European
    Standard Christmas Trees
  </span>,
  <span key="showrooms">📍 FLAGSHIP SHOWROOMS: CHENNAI &bull; BENGALURU &bull; MUMBAI &bull; PUNE &bull; GOA</span>,
  <span key="phone">
    📞 ORDER DIRECT: <strong className="font-bold">{PHONE_DISPLAY}</strong> ({ORDER_HOURS})
  </span>,
];

export default function AnnouncementBar() {
  return (
    <div className="relative z-[105] overflow-hidden whitespace-nowrap border-b border-gold-400/15 bg-[linear-gradient(90deg,#04120a,#0b2e1f,#04120a)] px-4 py-2 text-center text-[0.76rem] tracking-[0.08em] text-gold-200">
      <div className="inline-flex items-center gap-4">
        {MESSAGES.map((msg, i) => (
          <span key={i} className="inline-flex items-center gap-4">
            {msg}
            {i < MESSAGES.length - 1 && <span className="text-gold-400 opacity-60">✦</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
