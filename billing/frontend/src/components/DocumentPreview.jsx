import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleCheck, Download, LoaderCircle, Printer, Share2 } from 'lucide-react';
import { buildPages, canShareFiles, CONTENT_WIDTH, download, pdfOf, share } from '../lib/docPages.js';
import Dialog from './Dialog.jsx';

const secondary =
  'inline-flex h-9 items-center gap-1.5 rounded-xl border border-evergreen-800/25 bg-white px-3 text-[13px] font-semibold text-evergreen-900 hover:border-evergreen-800/50 hover:bg-evergreen-50 disabled:opacity-40';
const primary =
  'inline-flex h-9 items-center gap-1.5 rounded-xl bg-evergreen-800 px-3.5 text-[13px] font-semibold text-white hover:bg-evergreen-900 disabled:bg-line disabled:text-ink-3';

/**
 * A document's preview, page by page as it comes out on A4, and what can be done with it: print, download as a PDF
 * and share it (a phone's or computer's share sheet: WhatsApp, mail…). `children` is the document itself
 * (QuotationDocument, InvoiceDocument): it is laid out just off screen at the printed width and turned into the pages
 * shown (lib/docPages.js), which are also what the PDF holds. `stamp` changes whenever the document does (another
 * colour, say), so the pages are made again. `toolbar` sits on the left (a colour choice); `actions` replace the
 * print, download and share buttons (an unsaved quotation offers to save it instead); `note` says why some are missing.
 * A document that keeps its own PDF (an invoice): `kept` loads it (a Blob) when the one kept was drawn as the document
 * is now, and the preview shows that PDF straight away instead of drawing the pages again; `onBuilt(pdf)` is handed
 * each PDF drawn here, to keep. "Draw again" draws it afresh anyway (business details changed since, say).
 */
const DocumentPreview = ({ id, title, subtitle, stamp, fileName, watermark, footer, onClose, onPrint, canExport = true, toolbar, actions, note, kept, onBuilt, children }) => {
  const docRef = useRef(null);
  const [built, setBuilt] = useState({ key: null }); // { key, images, pdf } drawn, { key, url, pdf } kept, or { key, error }
  const [redraw, setRedraw] = useState(0);
  const [message, setMessage] = useState(null);
  const [shareable] = useState(canShareFiles);
  const key = `${stamp}|${redraw}`;
  const ready = built.key === key ? built : null;
  const [markText, markColor] = [watermark?.text, watermark?.color];
  // as they are now: the pages are only drawn (or the kept PDF loaded) again when the document itself changes
  const latest = useRef({ kept, onBuilt });
  useEffect(() => {
    latest.current = { kept, onBuilt };
  });

  // made ahead, so Download and Share answer at once (a phone only opens the share sheet straight after a tap)
  useEffect(() => {
    let current = true;
    let url = null;
    // the document's own element, so its parts (and a table's rows) are what's shared out over the pages
    const draw = () =>
      buildPages(docRef.current.firstElementChild, { watermark: markText && { text: markText, color: markColor }, footer }).then(async (pages) => {
        const pdf = await pdfOf(pages);
        if (!current) return;
        setBuilt({ key, images: pages.map((p) => p.toDataURL('image/jpeg', 0.85)), pdf });
        latest.current.onBuilt?.(pdf);
      });
    const load = !key.endsWith('|0') ? null : latest.current.kept;
    (load
      ? load().then((pdf) => {
          if (!current) return;
          url = URL.createObjectURL(pdf);
          setBuilt({ key, url, pdf });
        }, draw) // the kept one can't be had: draw it
      : draw()
    ).catch((err) => current && setBuilt({ key, error: err?.message || 'The preview could not be made.' }));
    return () => {
      current = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [key, markText, markColor, footer]);

  const save = () => {
    download(ready.pdf, fileName);
    setMessage({ tone: 'ok', text: `${fileName} saved to your downloads.` });
  };
  const send = async () => {
    setMessage(null);
    try {
      if (await share(ready.pdf, fileName)) setMessage({ tone: 'ok', text: `${fileName} shared.` });
    } catch (err) {
      setMessage({ tone: 'warn', text: `Not shared: ${err.message}. Download it and send it instead.` });
    }
  };

  return (
    <Dialog id={id} title={title} subtitle={subtitle} onClose={onClose} size="max-w-4xl">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-line-soft px-6 py-3">
        {toolbar}
        <div className="ml-auto flex flex-wrap gap-2">
          {actions ?? (
            <>
              {onPrint && (
                <button type="button" onClick={onPrint} className={secondary}>
                  <Printer size={15} aria-hidden="true" /> Print
                </button>
              )}
              {canExport && (
                <button type="button" onClick={save} disabled={!ready?.pdf} className={shareable ? secondary : primary}>
                  <Download size={15} aria-hidden="true" /> Download PDF
                </button>
              )}
              {canExport && shareable && (
                <button type="button" onClick={send} disabled={!ready?.pdf} className={primary}>
                  <Share2 size={15} aria-hidden="true" /> Share
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {ready?.url && !message && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-mist-2 px-6 py-2 text-[13px] text-ink-3">
          The PDF kept with it, opened as it was made.
          <button type="button" onClick={() => setRedraw((n) => n + 1)} className="font-semibold text-evergreen-900 hover:underline">
            Draw it again
          </button>
          <span>if the business details have changed since.</span>
        </p>
      )}
      {(message || note) && (
        <p
          role="status"
          className={`flex items-center gap-2 px-6 py-2 text-[13px] font-medium ${message?.tone === 'warn' ? 'bg-warn-50 text-warn-ink' : message ? 'bg-ok-50 text-ok-ink' : 'bg-mist-2 text-ink-3'}`}
        >
          {message && <CircleCheck size={15} className="shrink-0" aria-hidden="true" />} {message?.text ?? note}
        </p>
      )}

      {ready?.url ? (
        <iframe title={title} src={`${ready.url}#view=FitH`} className="block h-[68vh] w-full border-0 bg-mist" />
      ) : (
      <div className="max-h-[68vh] overflow-y-auto bg-mist px-4 py-5 sm:px-8">
        {ready?.error ? (
          <p className="py-16 text-center text-[13px] text-ruby-ink">{ready.error}</p>
        ) : !ready ? (
          <p className="flex items-center justify-center gap-2 py-16 text-[13px] text-ink-3">
            <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> Preparing the pages…
          </p>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {ready.images.map((src, i) => (
              <img
                key={src.length + i}
                src={src}
                alt={`Page ${i + 1} of ${ready.images.length}`}
                className="w-full max-w-[720px] bg-white shadow-[0_1px_3px_rgba(9,9,11,0.12),0_8px_24px_-8px_rgba(9,9,11,0.18)]"
              />
            ))}
          </div>
        )}
      </div>
      )}

      {/* the document itself, at the printed width just off screen: what the pages are made from */}
      {createPortal(
        <div aria-hidden="true" className="pointer-events-none fixed top-0 left-[-10000px] bg-white print:hidden" style={{ width: CONTENT_WIDTH }}>
          <div ref={docRef}>{children}</div>
        </div>,
        document.body,
      )}
    </Dialog>
  );
};

export default DocumentPreview;
