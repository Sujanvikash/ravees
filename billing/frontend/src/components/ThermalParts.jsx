import { createContext, useContext } from 'react';
import logo from '../assets/logo.svg';
import { BRAND } from '../config.js';

/**
 * The parts the 80mm thermal slips are made of (the bill, the credit note, the payment receipt), in the look the admin
 * picked for each (Settings → Documents, lib/docLook.js):
 *   boxed   solid black bands for the title and the total, light grey boxes for the details, the totals and the payment
 *   plain   dashed rules only, the lightest on the roll
 *   framed  a black frame round the whole slip, the title in an outlined box, solid rules, grey stripes on the items
 *           and the total in a black box
 * Only solid black and light greys, so a thermal printer draws them cleanly. Every part's text starts the same
 * distance in (INSET), so the left edges line up down the slip. A slip is a <Slip> whose parts read its look; on a
 * page it is hidden and is the only thing that prints (lib/print.js measures it), and `screen` shows it instead (a
 * preview in Settings), without marking it as the receipt to print.
 */
const LookOf = createContext('boxed');
const useLook = () => useContext(LookOf);

// how far in each look's text sits from the slip's edge, the same for every part
const INSET = { boxed: 'px-1.5', plain: '', framed: 'px-1' };
const GREY = 'bg-[#e6e6e6]';
const dashed = 'border-t border-dashed border-black pt-1.5';

export const Slip = ({ look, screen = false, children }) => (
  <LookOf.Provider value={look}>
    <div
      data-receipt={screen ? undefined : true}
      className={`${screen ? 'block bg-white' : 'hidden print:block'} w-[72mm] font-mono text-[11px] leading-snug text-black [-webkit-print-color-adjust:exact] [print-color-adjust:exact] ${
        look === 'framed' ? 'rounded-[2.5mm] border-2 border-black px-[1.5mm] py-[2mm]' : ''
      }`}
    >
      {children}
    </div>
  </LookOf.Provider>
);

/** A "label  value" line. */
export const Line = ({ label, value, className = '' }) => (
  <div className={`flex justify-between gap-2 ${className}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

/** The showroom at the top: the Raave's logo as a small mark, the showroom's own name large under it. */
export const SlipHead = ({ storeName, address = [], phone, gstin, composition = false }) => (
  <div className="flex flex-col items-center gap-0.5 text-center">
    <img src={logo} alt={BRAND.name} className="print-ink mb-1 w-[20mm]" />
    {storeName && <div className="text-[18px] leading-tight font-bold tracking-wide uppercase">{storeName}</div>}
    {address.map((a) => (
      <div key={a}>{a}</div>
    ))}
    {phone && <div>Ph: {phone}</div>}
    {gstin && <div>GSTIN: {gstin}</div>}
    {composition && <div className="font-bold">Composition Dealer</div>}
  </div>
);

/** The slip's title (BILL OF SUPPLY, CREDIT NOTE…): white on a black band, between dashed rules, or in an outlined box. */
export const SlipTitle = ({ children }) => {
  const look = useLook();
  if (look === 'boxed') return <div className="my-2 bg-black py-1 text-center text-[12px] font-bold tracking-[0.2em] text-white">{children}</div>;
  if (look === 'framed') return <div className="my-2 rounded-[1.5mm] border-2 border-black py-1 text-center text-[12px] font-bold tracking-[0.2em]">{children}</div>;
  return <div className="my-2 border-y border-dashed border-black py-1 text-center font-bold tracking-[0.18em]">{children}</div>;
};

/** A block of lines: a light grey box, under a solid rule (framed), or (plain) under a dashed rule when `ruled`. */
export const SlipBox = ({ ruled = true, className = '', children }) => {
  const look = useLook();
  if (look === 'boxed') return <div className={`mt-2 ${GREY} ${INSET.boxed} py-1 ${className}`}>{children}</div>;
  if (look === 'framed') return <div className={`mt-2 ${INSET.framed} ${ruled ? 'border-t border-black pt-1.5' : ''} ${className}`}>{children}</div>;
  return <div className={`${ruled ? `mt-2 ${dashed}` : ''} ${className}`}>{children}</div>;
};

/** The figure that matters (TOTAL, BALANCE DUE, AMOUNT RECEIVED): white on a black band, between solid rules, or in a
 *  black box. */
export const SlipTotal = ({ label, value, size = 'text-[15px]' }) => {
  const look = useLook();
  if (look === 'boxed') return <Line label={label} value={value} className={`my-2 bg-black ${INSET.boxed} py-1 font-bold text-white ${size}`} />;
  if (look === 'framed') return <Line label={label} value={value} className={`my-2 rounded-[1.5mm] bg-black ${INSET.framed} py-1.5 font-bold text-white ${size}`} />;
  return <Line label={label} value={value} className={`my-2 border-y border-black py-1 font-bold ${size}`} />;
};

/** A centred word in the total's place (BILL PAID IN FULL). */
export const SlipStamp = ({ children }) => {
  const look = useLook();
  const box =
    look === 'boxed' ? 'bg-black text-white' : look === 'framed' ? 'rounded-[1.5mm] border-2 border-black' : 'border-y-2 border-black';
  return <div className={`my-2 py-1 text-center text-[13px] font-bold ${box}`}>{children}</div>;
};

/** The heading over the item lines. */
export const SlipColumns = ({ children, className = '' }) => {
  const look = useLook();
  if (look === 'boxed') return <div className={`mt-2 border-y-2 border-black ${INSET.boxed} py-0.5 text-[9.5px] font-bold ${className}`}>{children}</div>;
  if (look === 'framed') return <div className={`mt-2 rounded-[1mm] ${GREY} ${INSET.framed} py-0.5 text-[9.5px] font-bold ${className}`}>{children}</div>;
  return <div className={`mt-2 text-[9.5px] font-bold ${dashed} ${className}`}>{children}</div>;
};

/** The item lines under the heading, each child one item: grey stripes on every other one when framed. */
export const SlipItems = ({ children }) => {
  const look = useLook();
  if (look === 'framed')
    // the stripe runs to the frame's edges, its text in by the framed INSET (px-1)
    return <div className="mt-1 flex flex-col [&>*]:rounded-[1mm] [&>*]:px-1 [&>*]:py-0.5 [&>*:nth-child(even)]:bg-[#eeeeee]">{children}</div>;
  return <div className={`mt-1 flex flex-col gap-1.5 ${INSET[look] ?? ''}`}>{children}</div>;
};

/** A line to sign on (Customer signature, Received by): a rule across the slip with the words under it. */
export const SlipSign = ({ className = 'mt-4', children }) => {
  const look = useLook();
  return <div className={`${className} border-t ${look === 'plain' ? 'border-dashed' : ''} border-black pt-1.5 ${INSET[look] ?? ''}`}>{children}</div>;
};

/** The foot of the slip: centred lines, under a rule (a heavier one when boxed or framed). */
export const SlipFoot = ({ children }) =>
  useLook() === 'plain' ? (
    <div className={`mt-2 flex flex-col items-center gap-0.5 pt-2 text-center ${dashed}`}>{children}</div>
  ) : (
    <div className="mt-3 flex flex-col items-center gap-0.5 border-t-2 border-black pt-2 text-center">{children}</div>
  );

/** The Christmas wish at the very end: in a grey box, between solid rules, or in an outlined box. */
export const SlipWish = ({ children }) => {
  const look = useLook();
  const box = look === 'boxed' ? `${GREY} px-2` : look === 'framed' ? 'rounded-[1.5mm] border border-black px-2' : 'border-y border-black';
  return (
    <div className={`mt-2 py-1.5 text-center ${box}`}>
      <div className="tracking-[0.3em]" aria-hidden="true">
        * * * * *
      </div>
      <div className="mt-1 font-display text-[12px] italic">{children}</div>
    </div>
  );
};
