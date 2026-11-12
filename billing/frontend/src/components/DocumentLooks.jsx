import { useState } from 'react';
import { Check, Eye } from 'lucide-react';
import { DOC_KINDS, DOC_LOOKS, RECEIPT_LOOKS } from '../lib/docLook.js';
import { CONTENT_WIDTH } from '../lib/docPages.js';
import Dialog from './Dialog.jsx';
import DocSample from './DocSamples.jsx';
import DocumentPreview from './DocumentPreview.jsx';

const A4_SCALE = 0.36; // the printed width (182mm) shrunk to a card
const SLIP_SCALE = 0.64; // the 72mm slip, small enough to show its items and total
const GROUPS = [
  { paper: 'a4', label: 'A4 documents', looks: DOC_LOOKS },
  { paper: 'thermal', label: '80mm roll', looks: RECEIPT_LOOKS },
];
const lookName = (paper, id) => (paper === 'a4' ? DOC_LOOKS : RECEIPT_LOOKS).find((l) => l.id === id)?.label ?? '—';

/** One look of the chosen document as a card: a sample of it, shrunk to fit, its name and what it is like. */
const LookCard = ({ kind, paper, look, on, onPick, onPreview }) => (
  <div className={`flex flex-col overflow-hidden rounded-xl border-2 bg-white ${on ? 'border-evergreen-800' : 'border-line-soft hover:border-line'}`}>
    <button type="button" onClick={onPick} aria-pressed={on} aria-label={`${look.label} look`} className="relative block h-[22rem] overflow-hidden bg-mist-2 text-left">
      {paper === 'a4' ? (
        <div aria-hidden="true" className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 bg-white shadow-[0_1px_3px_rgba(9,9,11,0.12)]" style={{ width: `calc((${CONTENT_WIDTH} + 28mm) * ${A4_SCALE})` }}>
          <div className="origin-top-left p-[14mm]" style={{ width: `calc(${CONTENT_WIDTH} + 28mm)`, transform: `scale(${A4_SCALE})` }}>
            <DocSample kind={kind} look={look.id} />
          </div>
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-3 bg-white p-[4mm] shadow-[0_1px_3px_rgba(9,9,11,0.12)]"
          style={{ left: '50%', transform: `translateX(-50%) scale(${SLIP_SCALE})`, transformOrigin: 'top center' }}
        >
          <DocSample kind={kind} look={look.id} />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-mist-2 to-transparent" />
    </button>
    <div className="flex items-start gap-3 border-t border-line-soft px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold">
          {on && <Check size={14} className="text-evergreen-800" aria-hidden="true" />} {look.label}
          {on && <span className="text-xs font-normal text-ink-3">· in use</span>}
        </div>
        <div className="mt-0.5 text-xs text-ink-3">{look.hint}</div>
      </div>
      <button
        type="button"
        onClick={onPreview}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-medium text-ink-2 hover:bg-mist hover:text-ink"
      >
        <Eye size={13} aria-hidden="true" /> Preview
      </button>
    </div>
  </div>
);

/**
 * Settings → Documents: each document the app prints (lib/docLook.js DOC_KINDS) with its three looks side by side, as
 * a sample of that very document (DocSamples.jsx). Choosing one changes that document for every showroom; "Use for
 * every…" gives the same look to all the documents on the same paper. Preview shows a sample full size: an A4 one as
 * it prints and goes out as a PDF. `looks` is settings.docLooks; `onChange(next)` saves the whole set.
 */
const DocumentLooks = ({ looks, onChange }) => {
  const [kind, setKind] = useState(DOC_KINDS[0].id);
  const [full, setFull] = useState(null); // the look shown full size
  const doc = DOC_KINDS.find((k) => k.id === kind);
  const group = GROUPS.find((g) => g.paper === doc.paper);
  const value = looks[kind] ?? group.looks[0].id;
  const choose = (id) => onChange({ ...looks, [kind]: id });
  const sameForAll = DOC_KINDS.filter((k) => k.paper === doc.paper).every((k) => (looks[k.id] ?? group.looks[0].id) === value);
  const noun = doc.paper === 'a4' ? 'A4 document' : 'slip on the roll';
  const useForAll = () => onChange({ ...looks, ...Object.fromEntries(DOC_KINDS.filter((k) => k.paper === doc.paper).map((k) => [k.id, value])) });

  return (
    <div className="grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <nav aria-label="Documents" className="border-b border-line-soft p-3 lg:border-r lg:border-b-0">
        {GROUPS.map((g) => (
          <div key={g.paper} className="mb-2 last:mb-0">
            <div className="px-2 pt-1 pb-1.5 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">{g.label}</div>
            <ul className="flex flex-col gap-0.5">
              {DOC_KINDS.filter((k) => k.paper === g.paper).map((k) => {
                const on = k.id === kind;
                return (
                  <li key={k.id}>
                    <button
                      type="button"
                      onClick={() => setKind(k.id)}
                      aria-current={on ? 'true' : undefined}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] ${on ? 'bg-evergreen-50 font-semibold text-evergreen-900' : 'text-ink-2 hover:bg-mist hover:text-ink'}`}
                    >
                      <span className="min-w-0 truncate">{k.label}</span>
                      <span className={`shrink-0 text-xs ${on ? 'text-evergreen-800' : 'text-ink-3'}`}>{lookName(k.paper, looks[k.id] ?? g.looks[0].id)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="flex min-w-0 flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div>
            <h3 className="text-[14px] font-semibold">{doc.label}</h3>
            <p className="text-xs text-ink-3">{doc.from} · pick one of three looks</p>
          </div>
          <button
            type="button"
            onClick={useForAll}
            disabled={sameForAll}
            className="text-xs font-semibold text-evergreen-900 hover:underline disabled:text-ink-3 disabled:no-underline"
          >
            {sameForAll ? `Every ${noun} uses ${lookName(doc.paper, value)}` : `Use ${lookName(doc.paper, value)} for every ${noun}`}
          </button>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(18.5rem,1fr))] gap-3">
          {group.looks.map((look) => (
            <LookCard key={look.id} kind={kind} paper={doc.paper} look={look} on={value === look.id} onPick={() => choose(look.id)} onPreview={() => setFull(look)} />
          ))}
        </div>
      </div>

      {full && doc.paper === 'a4' && (
        <DocumentPreview
          id="look-preview"
          title={`${doc.label} · ${full.label}`}
          subtitle="A sample, as it prints and goes out as a PDF"
          stamp={`${kind}|${full.id}`}
          fileName={`sample-${kind}-${full.id}.pdf`}
          onClose={() => setFull(null)}
          actions={
            <button
              type="button"
              onClick={() => {
                choose(full.id);
                setFull(null);
              }}
              disabled={value === full.id}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-evergreen-800 px-3.5 text-[13px] font-semibold text-white hover:bg-evergreen-900 disabled:bg-line disabled:text-ink-3"
            >
              <Check size={15} aria-hidden="true" /> {value === full.id ? 'In use' : 'Use this look'}
            </button>
          }
        >
          <DocSample kind={kind} look={full.id} />
        </DocumentPreview>
      )}
      {full && doc.paper === 'thermal' && (
        <Dialog id="slip-preview" title={`${doc.label} · ${full.label}`} subtitle="A sample, at the width it prints on the 80mm roll" onClose={() => setFull(null)} size="max-w-md">
          <div className="max-h-[70vh] overflow-y-auto border-t border-line-soft bg-mist px-4 py-5">
            <div className="mx-auto w-fit bg-white p-[4mm] shadow-[0_1px_3px_rgba(9,9,11,0.12)]">
              <DocSample kind={kind} look={full.id} />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-line-soft bg-mist-2 px-6 py-3">
            <button type="button" onClick={() => setFull(null)} className="h-9 rounded-xl px-3.5 text-[13px] font-medium text-ink-2 hover:bg-mist">
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                choose(full.id);
                setFull(null);
              }}
              disabled={value === full.id}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-evergreen-800 px-3.5 text-[13px] font-semibold text-white hover:bg-evergreen-900 disabled:bg-line disabled:text-ink-3"
            >
              <Check size={15} aria-hidden="true" /> {value === full.id ? 'In use' : 'Use this look'}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default DocumentLooks;
