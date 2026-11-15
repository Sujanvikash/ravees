/**
 * Printing on the counter's 80mm thermal (POS) printer. A receipt prints on the printer's own paper with no page
 * margins (styles/index.css): it starts at the top of the paper, and the browser prints no header or footer (date,
 * title, the site's address). An A4 bill instead gets an A4 page with margins while it prints, put back after.
 */
const STYLE_ID = 'receipt-page-size';

/** Prints the receipt (or credit note) on the page: the element marked data-receipt. */
export const printReceipt = () => {
  const el = document.querySelector('[data-receipt]');
  if (el?.dataset.paper === 'a4') {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = Object.assign(document.createElement('style'), { id: STYLE_ID });
      document.head.append(style);
    }
    style.textContent = '@page { size: A4; margin: 14mm; }';
    window.addEventListener('afterprint', () => style.remove(), { once: true });
  }
  window.print();
};

/** Prints a receipt drawn outside the app (in a portal on <body>) on its own, from any page: the page itself is
 *  hidden from the print while it runs (see html[data-print-alone] in styles/index.css). */
export const printAlone = () => {
  const html = document.documentElement;
  html.dataset.printAlone = '';
  window.addEventListener('afterprint', () => delete html.dataset.printAlone, { once: true });
  printReceipt();
};
