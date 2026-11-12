import { DocContext, useDoc, useDocLook } from '../lib/docLook.js';

/**
 * The parts every A4 document is made of, in the look the admin picked (lib/docLook.js: band, classic or clean) and
 * the colours picked on its preview (lib/quoteColour.js). A document is a <DocFrame> whose children are its parts in
 * order; each child is one top-level block, so lib/docPages.js keeps it whole on a page, and a <table> child (styled
 * with useDocTable from lib/docLook.js) has its rows shared out over the pages. The parts read the look and colours from the frame.
 *
 *   <DocFrame colour={colour} kind="invoice" look={look}>
 *     <DocHead title="TAX INVOICE" number=… date=… name=… lines={[…]} taxLine=… />
 *     <Parties> <PartyBox label="Bill to">…</PartyBox> <PartyBox label="Invoice details" tinted>…</PartyBox> </Parties>
 *     <table className={t.table}>…</table>
 *     <DocSums words=… rows=… grand=… />
 *     <SignOff forName=… />
 *   </DocFrame>
 */
/** A small heading over a block (BILL TO, AMOUNT IN WORDS…). */
export const Label = ({ children }) => {
  const { look } = useDoc();
  return (
    <div className={`mb-1.5 text-[9.5px] font-bold uppercase ${look === 'clean' ? 'tracking-[0.2em] text-black/55' : 'tracking-[0.16em] text-(--q-accent)'}`}>
      {children}
    </div>
  );
};

/** One "label  value" line in a details box. */
export const Meta = ({ label, value }) => (
  <div className="flex justify-between gap-4 py-px">
    <span className="text-black/65">{label}</span>
    <span className="text-right font-semibold">{value}</span>
  </div>
);

/** The page: the colours as CSS variables, the look for its parts, and a CANCELLED (or other) stamp across it. */
export const DocFrame = ({ colour, kind, look: chosen, stamp, children }) => {
  const look = useDocLook(kind, chosen);
  return (
    <DocContext.Provider value={{ look, mono: Boolean(colour.mono) }}>
      <div
        style={{ '--q-accent': colour.accent, '--q-soft': colour.soft, '--q-line': colour.line }}
        className="relative text-[11px] leading-normal text-black [print-color-adjust:exact]"
      >
        {stamp && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center" aria-hidden="true">
            <span className="-rotate-12 border-4 border-black/30 px-6 py-2 text-[64px] font-bold tracking-[0.2em] text-black/20">{stamp}</span>
          </div>
        )}
        {children}
      </div>
    </DocContext.Provider>
  );
};

/**
 * The top of the page: the document's title (TAX INVOICE, QUOTATION, PURCHASE RETURN…) at the very top, its number
 * and date, and who issues it: `name`, address `lines`, `contact` (one line), `taxLine` (GSTIN | State), `logo` (an
 * <img>, a showroom's bill only). `tag` is a small note by the title ("Original for recipient").
 */
export const DocHead = ({ title, tag, number, date, name, lines = [], contact, taxLine, logo }) => {
  const { look, mono } = useDoc();
  const issuer = (align) => (
    <div className={`text-[10.5px] leading-snug ${align}`}>
      <div className={`mb-1 text-[20px] leading-tight font-bold tracking-[0.02em] ${look === 'clean' ? 'text-black' : 'text-(--q-accent)'}`}>{name}</div>
      {lines.map((l) => (
        <div key={l}>{l}</div>
      ))}
      {contact && <div>{contact}</div>}
      {taxLine && <div className="mt-0.5 font-bold">{taxLine}</div>}
    </div>
  );

  if (look === 'classic')
    return (
      <div>
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-(--q-accent)" />
          <div className="font-display text-[22px] leading-none font-bold tracking-[0.22em] whitespace-nowrap text-(--q-accent)">{title}</div>
          <div className="h-px flex-1 bg-(--q-accent)" />
        </div>
        <div className="mt-1 flex justify-between text-[9.5px] text-black/60">
          <span>{tag}</span>
          <span className="font-mono">{number}</span>
        </div>
        <div className="mt-2.5 flex flex-col items-center">
          {logo}
          {issuer('text-center')}
        </div>
        <div className="mt-3 h-[5px] border-y border-(--q-accent)" />
      </div>
    );

  if (look === 'clean')
    return (
      <div>
        <div className="flex items-start justify-between gap-8 pb-4">
          <div className="shrink-0">
            <div className="text-[30px] leading-none font-light tracking-[0.04em] whitespace-nowrap text-(--q-accent)">{title}</div>
            <div className="mt-2.5 text-[10.5px] text-black/60">
              <span className="font-mono text-[12px] font-semibold text-black">{number}</span>
              {date && <span> · {date}</span>}
            </div>
            {tag && <div className="mt-1 text-[9.5px] tracking-[0.12em] text-black/50 uppercase">{tag}</div>}
          </div>
          <div className="flex min-w-0 flex-col items-end">
            {logo}
            {issuer('text-right')}
          </div>
        </div>
        <div className="h-px bg-black/20" />
      </div>
    );

  // band
  return (
    <div>
      <div
        className={`flex items-center justify-between gap-6 rounded-md px-4 py-2.5 ${mono ? 'border-2 border-black text-black' : 'bg-(--q-accent) text-white'}`}
      >
        <div>
          <div className="text-[19px] leading-none font-bold tracking-[0.18em] whitespace-nowrap">{title}</div>
          {tag && <div className="mt-1 text-[9px] tracking-[0.12em] uppercase opacity-80">{tag}</div>}
        </div>
        <div className="text-right text-[10.5px] leading-snug">
          <div className="font-mono text-[13px] font-semibold">{number}</div>
          {date && <div className="opacity-90">Date: {date}</div>}
        </div>
      </div>
      <div className="flex items-start justify-between gap-6 pt-3.5 pb-3">
        {issuer('pl-4 text-left')}
        {logo}
      </div>
      <div className="border-t-2 border-(--q-accent)" />
    </div>
  );
};

/** The two boxes under the head: who it goes to, and the document's details. */
export const Parties = ({ children }) => <div className="mt-4 grid grid-cols-[1fr_17rem] gap-6">{children}</div>;

export const PartyBox = ({ label, tinted = false, children }) => {
  const { look, mono } = useDoc();
  const box =
    look === 'classic'
      ? 'border border-(--q-accent)'
      : look === 'clean'
        ? `border-l-2 ${tinted ? 'border-(--q-accent)' : 'border-black/15'} pl-3`
        : `rounded-md border border-(--q-line) ${tinted && !mono ? 'bg-(--q-soft)' : ''}`;
  return (
    <div className={box}>
      {look === 'classic' ? (
        <div className={`border-b border-(--q-accent) px-3 py-1 ${mono ? '' : 'bg-(--q-soft)'}`}>
          <Label>{label}</Label>
        </div>
      ) : null}
      <div className={look === 'classic' ? 'px-3 py-2' : look === 'clean' ? 'py-0.5' : 'px-[15px] py-2.5'}>
        {look !== 'classic' && <Label>{label}</Label>}
        {children}
      </div>
    </div>
  );
};

/** The amount in words (and a note under it) on the left, the totals on the right with the grand total last.
 *  rows: [[label, value]]; grand: [label, value]. */
export const DocSums = ({ words, note, rows, grand }) => {
  const { look, mono } = useDoc();
  const line = look === 'clean' ? '[&>*+*]:border-black/10' : look === 'classic' ? '[&>*+*]:border-(--q-accent)/40' : '[&>*+*]:border-(--q-line)';
  const box = look === 'clean' ? '' : look === 'classic' ? 'border border-(--q-accent)' : 'overflow-hidden rounded-md border border-(--q-line)';
  const grandRow =
    look === 'clean' ? 'border-t-2! border-(--q-accent)! text-[14px] text-(--q-accent)' : mono ? 'border-t-2! border-black!' : 'bg-(--q-accent) text-white';
  return (
    <div className="mt-4 flex items-start justify-between gap-8 break-inside-avoid">
      <div className="max-w-[55%] text-[10.5px]">
        {words && (
          <div
            className={
              look === 'clean'
                ? ''
                : look === 'classic'
                  ? 'border border-(--q-accent) px-3 py-2'
                  : `border-l-4 border-(--q-accent) px-3 py-2 ${mono ? '' : 'bg-(--q-soft)'}`
            }
          >
            <Label>Amount in words</Label>
            <div className="font-bold">{words}</div>
          </div>
        )}
        {/* in line with the text inside the words box above it */}
        {note && <div className={look === 'band' ? 'pl-4' : look === 'classic' ? 'pl-[13px]' : ''}>{note}</div>}
      </div>
      <div className={`w-[17rem] text-[10.5px] tabular-nums [&>*+*]:border-t ${line} ${box}`}>
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 px-2.5 py-[3px]">
            <span>{label}</span>
            <span>{value}</span>
          </div>
        ))}
        {grand && (
          <div className={`flex justify-between gap-4 px-2.5 py-1.5 text-[13px] font-bold ${grandRow}`}>
            <span>{grand[0]}</span>
            <span>{grand[1]}</span>
          </div>
        )}
      </div>
    </div>
  );
};

/** The signatures at the foot: `left` (the receiver's) and "For <forName> / Authorised Signatory". */
export const SignOff = ({ forName, left = 'Receiver’s Signature' }) => {
  const { look } = useDoc();
  return (
    <div className="mt-8 grid grid-cols-2 items-end gap-16 break-inside-avoid text-[10.5px]">
      <div>{left && <div className="border-t border-black/50 pt-1">{left}</div>}</div>
      <div className="text-right">
        <div className={`font-bold ${look === 'clean' ? 'text-black' : 'text-(--q-accent)'}`}>For {forName}</div>
        <div className="mt-14 border-t border-black/50 pt-1">Authorised Signatory</div>
      </div>
    </div>
  );
};

/** The line at the very foot of the page. */
export const DocFoot = ({ children }) => {
  const { look } = useDoc();
  return (
    <div
      className={`mt-6 border-t pt-1.5 text-center text-[9px] tracking-[0.06em] text-black/60 ${look === 'clean' ? 'border-black/15' : 'border-(--q-accent)'}`}
    >
      {children}
    </div>
  );
};
