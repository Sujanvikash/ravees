import { createContext, useContext } from 'react';
import { useStore } from '../context/StoreContext.jsx';

/**
 * The looks an A4 document can take (invoice, quotation, purchase order, purchase return, A4 bill), chosen by the
 * admin under Settings → Documents for each document. Each puts the document's title (TAX INVOICE, QUOTATION…) at
 * the very top of the page; the colours are still picked on each preview.
 */
export const DOC_LOOKS = [
  { id: 'band', label: 'Band', hint: 'The title in a coloured band across the top, the business right under it.' },
  { id: 'classic', label: 'Classic', hint: 'The title centred over the business, fully ruled, like a traditional tax invoice.' },
  { id: 'clean', label: 'Clean', hint: 'Airy and modern: the title large on the left, thin rules, no filled boxes.' },
];

/** The looks of a slip on the 80mm thermal roll (bill, credit note, payment receipt), chosen under Settings →
 *  Documents for each. */
export const RECEIPT_LOOKS = [
  { id: 'boxed', label: 'Boxed', hint: 'Black bands for the title and the total, grey boxes for the totals and payment.' },
  { id: 'plain', label: 'Plain', hint: 'Dashed rules only: the lightest on the paper roll.' },
  { id: 'framed', label: 'Framed', hint: 'A black frame round the slip, grey stripes on the items, the total in a black box.' },
];

/** Every document the app prints, each with its own look (settings.docLooks[id]): `paper` a4 (DOC_LOOKS) or thermal
 *  (RECEIPT_LOOKS); `from` who makes it. */
export const DOC_KINDS = [
  { id: 'invoice', label: 'Tax invoice', paper: 'a4', from: 'Admin to a showroom' },
  { id: 'purchaseOrder', label: 'Purchase order', paper: 'a4', from: 'A showroom to the admin' },
  { id: 'purchaseReturn', label: 'Purchase return', paper: 'a4', from: 'A showroom to the admin' },
  { id: 'quotation', label: 'Quotation', paper: 'a4', from: 'A showroom to a customer' },
  { id: 'bill', label: 'Bill on A4', paper: 'a4', from: 'A showroom to a customer' },
  { id: 'thermalBill', label: 'Bill on the 80mm roll', paper: 'thermal', from: 'A showroom to a customer' },
  { id: 'creditNote', label: 'Credit note', paper: 'thermal', from: 'A showroom to a customer' },
  { id: 'paymentReceipt', label: 'Payment receipt', paper: 'thermal', from: 'A showroom to a customer' },
];

const known = (looks, id) => (looks.some((l) => l.id === id) ? id : looks[0].id);

/** The look of an A4 document of `kind` (a DOC_KINDS id): `look` when given (a Settings preview), else the admin's
 *  choice for it. */
export const useDocLook = (kind, look) => {
  const { settings } = useStore();
  return known(DOC_LOOKS, look ?? settings.docLooks?.[kind]);
};

/** The look of a thermal slip of `kind` (thermalBill, creditNote, paymentReceipt): `look` when given (a Settings
 *  preview), else the admin's choice for it. */
export const useReceiptLook = (kind, look) => {
  const { settings } = useStore();
  return known(RECEIPT_LOOKS, look ?? settings.docLooks?.[kind]);
};

/** The look and colours a document's parts (components/DocParts.jsx) are drawn in, set by its <DocFrame>. */
export const DocContext = createContext({ look: 'band', mono: false });
export const useDoc = () => useContext(DocContext);

/** Class names for a document's table in the current look: table, the heading row, th, td, a body row. */
export const useDocTable = () => {
  const { look, mono } = useDoc();
  if (look === 'classic')
    return {
      table: 'mt-5 w-full border-collapse text-[10.5px] tabular-nums',
      head: `text-center text-(--q-accent) ${mono ? '' : 'bg-(--q-soft)'}`,
      th: 'border border-(--q-accent) px-1.5 py-1.5 text-[9px] font-bold tracking-[0.08em] uppercase',
      td: 'border border-(--q-accent)/40 px-1.5 py-[3px]',
      row: '',
      total: `font-bold ${mono ? '' : 'bg-(--q-soft)'}`,
    };
  if (look === 'clean')
    return {
      table: 'mt-6 w-full border-collapse text-[10.5px] tabular-nums',
      head: 'text-center text-black/60',
      th: 'border-b-2 border-(--q-accent) px-1.5 pt-1 pb-1.5 text-[8.5px] font-semibold tracking-[0.1em] whitespace-nowrap uppercase',
      td: 'border-b border-black/10 px-1.5 py-[4px]',
      row: '',
      total: 'font-bold [&>td]:border-b-0 [&>td]:border-t-2 [&>td]:border-(--q-accent)',
    };
  return {
    table: 'mt-5 w-full border-collapse text-[10.5px] tabular-nums',
    head: `text-center ${mono ? '' : 'bg-(--q-accent) text-white'}`,
    th: 'border border-(--q-accent) px-1.5 py-1.5 text-[9px] font-bold tracking-[0.08em] uppercase',
    td: 'border border-(--q-line) px-1.5 py-[3px]',
    row: mono ? '' : 'even:bg-(--q-soft)',
    total: `font-bold ${mono ? '' : 'bg-(--q-soft)'} [&>td]:border-t-2 [&>td]:border-t-(--q-accent)`,
  };
};
