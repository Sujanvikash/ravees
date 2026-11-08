/**
 * Printing on the counter's 80mm thermal (POS) printer. A receipt is 72mm wide (an 80mm roll's printable width)
 * and exactly as long as it is: just before printing, the receipt is measured and the page size set to 80mm × its
 * length, so the printer feeds no more paper than the bill needs (no A4 page, no long blank tail). The size is put
 * back after printing, so an A4 quotation is not affected.
 */
const MM = 96 / 25.4; // CSS pixels per millimetre
const STYLE_ID = 'receipt-page-size';

/** Prints the receipt (or credit note) on the page: the element marked data-receipt. */
export const printReceipt = () => {
  const el = document.querySelector('[data-receipt]');
  if (el?.dataset.paper === 'a4') {
    // an A4 bill is a normal page: no measuring
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = Object.assign(document.createElement('style'), { id: STYLE_ID });
      document.head.append(style);
    }
    style.textContent = '@page { size: A4; margin: 14mm; }';
    window.addEventListener('afterprint', () => style.remove(), { once: true });
  } else if (el) {
    // the receipt is hidden on screen: measure a copy laid out at print width, off screen
    const copy = el.cloneNode(true);
    Object.assign(copy.style, { display: 'block', position: 'absolute', left: '-10000px', top: '0', width: '72mm' });
    document.body.append(copy);
    // + top and bottom margins, and a little spare so a late-loading logo never pushes the end onto a second slip
    const height = Math.ceil(copy.getBoundingClientRect().height / MM) + 14;
    copy.remove();
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = Object.assign(document.createElement('style'), { id: STYLE_ID });
      document.head.append(style);
    }
    style.textContent = `@page { size: 80mm ${height}mm; margin: 4mm 4mm; }`;
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
