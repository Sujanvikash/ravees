import { useSyncExternalStore } from 'react';

/** The colours a quotation or an invoice is printed in: the brand's evergreen, another colour, or black and white for
 *  a plain laser printer. `accent` heads the page and the table, `soft` fills alternate rows, `line` rules the rows and
 *  `mark` is the QUOTATION watermark. Chosen per computer, quotations and invoices each their own, kept in this
 *  browser, and offered on the preview. */
export const QUOTE_COLOURS = [
  { id: 'evergreen', label: 'Evergreen', accent: '#175c26', soft: '#eef6f0', line: '#cfe3d4', mark: 'rgb(23 92 38 / 0.13)' },
  { id: 'red', label: 'Red', accent: '#b8141b', soft: '#fdecec', line: '#f3c6c8', mark: 'rgb(184 20 27 / 0.12)' },
  { id: 'gold', label: 'Gold', accent: '#86650f', soft: '#fbf5e3', line: '#e9d9a8', mark: 'rgb(134 101 15 / 0.14)' },
  { id: 'navy', label: 'Navy', accent: '#1d3a63', soft: '#eef3fa', line: '#c9d6e9', mark: 'rgb(29 58 99 / 0.13)' },
  { id: 'mono', label: 'Black & white', accent: '#000000', soft: '#ffffff', line: 'rgb(0 0 0 / 0.25)', mark: 'rgb(0 0 0 / 0.14)', mono: true },
];

/** One kept colour choice: get, set and a hook that follows it. */
const colourChoice = (key) => {
  const listeners = new Set();
  const get = () => {
    try {
      const id = window.localStorage.getItem(key);
      return QUOTE_COLOURS.find((c) => c.id === id) ?? QUOTE_COLOURS[0];
    } catch {
      return QUOTE_COLOURS[0];
    }
  };
  const set = (id) => {
    try {
      window.localStorage.setItem(key, id);
    } catch {
      // ignore write failures (private browsing, quota, etc.)
    }
    listeners.forEach((l) => l());
  };
  const subscribe = (l) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };
  return { get, set, use: () => useSyncExternalStore(subscribe, get) };
};

const quote = colourChoice('billing-quote-colour');
export const getQuoteColour = quote.get;
export const setQuoteColour = quote.set;
export const useQuoteColour = quote.use;

const invoice = colourChoice('billing-invoice-colour');
export const setInvoiceColour = invoice.set;
export const useInvoiceColour = invoice.use;

// purchase returns and purchase orders share one, picked on a return's preview
const stockDoc = colourChoice('billing-stock-doc-colour');
export const setStockDocColour = stockDoc.set;
export const useStockDocColour = stockDoc.use;
