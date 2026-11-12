import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { buildPages, CONTENT_WIDTH, pdfOf } from '../lib/docPages.js';

/**
 * Draws a document off screen, once, and hands its PDF to `onMade` (or the error to `onFail`): an invoice's own PDF,
 * made in the background as soon as it is raised or edited, so its preview opens at once. `children` is the document
 * (InvoiceDocument), laid out at the printed width as DocumentPreview lays it out; `footer` as there.
 */
const PdfKeeper = ({ footer, onMade, onFail, children }) => {
  const docRef = useRef(null);
  const latest = useRef({ onMade, onFail });
  useEffect(() => {
    latest.current = { onMade, onFail };
  });

  useEffect(() => {
    let current = true;
    buildPages(docRef.current.firstElementChild, { footer })
      .then(pdfOf)
      .then(
        (pdf) => current && latest.current.onMade(pdf),
        (err) => current && latest.current.onFail?.(err),
      );
    return () => {
      current = false;
    };
  }, [footer]);

  return createPortal(
    <div aria-hidden="true" className="pointer-events-none fixed top-0 left-[-10000px] bg-white print:hidden" style={{ width: CONTENT_WIDTH }}>
      <div ref={docRef}>{children}</div>
    </div>,
    document.body,
  );
};

export default PdfKeeper;
