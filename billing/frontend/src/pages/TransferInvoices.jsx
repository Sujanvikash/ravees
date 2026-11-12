import { useEffect, useState } from 'react';
import { Eye, FileText, Paperclip, Plus } from 'lucide-react';
import ColourPicker from '../components/ColourPicker.jsx';
import { InvoiceDetail, InvoiceEditor } from '../components/InvoiceDialogs.jsx';
import DocumentPreview from '../components/DocumentPreview.jsx';
import InvoicePrint, { InvoiceDocument } from '../components/InvoicePrint.jsx';
import { LocationPicker, SearchBox, Segmented } from '../components/Filters.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Pager from '../components/Pager.jsx';
import PdfKeeper from '../components/PdfKeeper.jsx';
import { locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { usePages } from '../hooks/usePages.js';
import { useDocLook } from '../lib/docLook.js';
import { STATUS, storeBuyer } from '../lib/invoices.js';
import { inr } from '../lib/money.js';
import { setInvoiceColour, useInvoiceColour } from '../lib/quoteColour.js';
import { rowClick } from '../lib/rowClick.js';

const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'raised', label: 'To pay' },
  { id: 'paid', label: 'Paid' },
  { id: 'stocked', label: 'Added to store' },
  { id: 'cancelled', label: 'Cancelled' },
];

const rowButton =
  'inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-xs font-medium whitespace-nowrap text-ink-2 hover:bg-mist hover:text-ink';


/**
 * Invoices, how stock goes from the admin's warehouse to a showroom: the admin scans boxes and single products and
 * raises an invoice for a showroom (each product at its cost price, D.Rate, with 18% GST on top), records the e-way bill or bill from the GST portal,
 * marks it paid, then adds the products to the showroom's stock. A showroom's purchase order can be answered by
 * an invoice (Create invoice on the order opens this page with the order filled in).
 * Each row opens its invoice to view and its e-way bill (made by hand on the GST portal) to view, or to attach where it
 * is still missing.
 */
const TransferInvoices = ({ intent, onMenu }) => {
  const { invoices, settings, viewInvoiceDocument, invoicePdf, keepInvoicePdf } = useStore();
  const colour = useInvoiceColour();
  // what an invoice's own PDF is drawn in: kept with it, and drawn again only when these change (or the invoice does).
  // The last part is the invoice's layout: raise it when InvoiceDocument changes, so the PDFs kept are drawn again.
  const pdfStamp = `${colour.id}:${useDocLook('invoice')}:2`;
  const [keeping, setKeeping] = useState([]); // ids of invoices just raised or edited, whose PDF is being drawn to keep
  const [printing, setPrinting] = useState(null); // { invoice, buyer } on the print page
  const [printJob, setPrintJob] = useState(0);
  const [preview, setPreview] = useState(null); // { invoice, buyer } in the preview
  const [tab, setTab] = useState('all');
  const [location, setLocation] = useState(null);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(() => (intent?.order ? { order: intent.order } : null)); // { order? }
  const [openId, setOpenId] = useState(null);
  const [focus, setFocus] = useState(null); // 'eway': the invoice opens at its e-way bill
  const [problem, setProblem] = useState(null);
  const [editing, setEditing] = useState(null); // an invoice not paid yet, being changed
  const [flash, setFlash] = useState(null);

  const mine = invoices.filter((i) => !location || i.location === location);
  const count = (id) => mine.filter((i) => id === 'all' || i.status === id).length;
  const q = query.trim().toLowerCase();
  const list = mine
    .filter((i) => tab === 'all' || i.status === tab)
    .filter((i) => !q || `${i.number} ${i.ewayNo} ${i.billNo} ${locationById(i.location)?.label ?? ''}`.toLowerCase().includes(q))
    // by invoice number, newest first
    .sort((a, b) => b.number.localeCompare(a.number, 'en', { numeric: true }));
  const paged = usePages(list, 50, `${tab}|${location}|${q}`);

  useEffect(() => {
    if (printJob) window.print();
  }, [printJob]);

  // The showroom is the buyer, as the invoice names it; one raised before that takes the showroom's details as they are now.
  const buyerOf = async (invoice) => invoice.buyer ?? (await storeBuyer(invoice.location));
  const print = async (invoice) => {
    setPrinting({ invoice, buyer: await buyerOf(invoice) });
    setPrintJob((n) => n + 1);
  };
  const openPreview = async (invoice) => setPreview({ invoice, buyer: await buyerOf(invoice) });
  const open = (invoice, at = null) => {
    setFocus(at);
    setOpenId(invoice.id);
  };
  const showEway = (invoice) => {
    setProblem(null);
    viewInvoiceDocument(invoice).catch((err) => setProblem(`${invoice.number}: ${err.message}`));
  };

  // draws the invoice's own PDF in the background, so its preview opens at once
  const keepPdf = (invoice) => setKeeping((ids) => [...ids.filter((id) => id !== invoice.id), invoice.id]);
  const nextToKeep = keeping.map((id) => invoices.find((i) => i.id === id)).find((i) => i?.buyer);
  const kept = () => setKeeping((ids) => ids.filter((id) => id !== nextToKeep.id));

  const created = (invoice) => {
    keepPdf(invoice);
    setCreating(null);
    setTab('all');
    setOpenId(invoice.id);
    setFlash(`${invoice.number} raised for ${locationById(invoice.location)?.label}. Mark it paid when the money comes in.`);
  };

  const edit = (invoice) => {
    setOpenId(null);
    setEditing(invoice);
  };

  const edited = (invoice) => {
    keepPdf(invoice);
    setEditing(null);
    setOpenId(invoice.id);
    setFlash(`${invoice.number} saved.`);
  };

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col print:hidden">
        <PageHeader crumbs={['Admin', 'Invoices']} onMenu={onMenu} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-[100rem] flex-col gap-4 p-3 lg:px-5 lg:py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-3xl text-[13px] text-ink-3">
                Send stock to a showroom: scan boxes and single products onto an invoice at cost price (D.Rate) plus 18% GST, attach its e-way bill (made on the GST
                portal), and mark it paid. Then add the products to the showroom’s stock. Each invoice and its e-way bill can be viewed from the list.
              </p>
              <button
                type="button"
                onClick={() => setCreating({})}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white hover:bg-evergreen-900"
              >
                <Plus size={16} aria-hidden="true" /> New invoice
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                label="Invoices"
                options={TABS.map((t) => ({ ...t, label: `${t.label}${count(t.id) ? ` · ${count(t.id)}` : ''}` }))}
                value={tab}
                onChange={setTab}
              />
              <LocationPicker value={location} onChange={setLocation} />
              <div className="flex flex-1 justify-end">
                <SearchBox value={query} onChange={setQuery} placeholder="Invoice, e-way bill or bill number" />
              </div>
            </div>

            {problem && (
              <div role="alert" className="rounded-xl bg-warn-50 px-4 py-2.5 text-[13px] font-medium text-warn-ink">
                {problem}
              </div>
            )}
            {flash && (
              <div role="status" className="animate-pop rounded-xl bg-ok-50 px-4 py-2.5 text-[13px] font-medium text-ok-ink">
                {flash}
              </div>
            )}

            <section className="overflow-hidden rounded-2xl border glass">
              {list.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                  <FileText size={22} className="text-ink-3" aria-hidden="true" />
                  <div className="text-[15px] font-semibold">
                    {q ? 'No invoice matches that search' : 'No invoices here'}
                  </div>
                  <div className="max-w-sm text-[13px] text-ink-3">Raise an invoice to send boxes or single products to a showroom.</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[68rem] text-[13px] tabular-nums">
                    <thead>
                      <tr className="border-b border-line-soft text-left text-xs text-ink-3">
                        <th scope="col" className="py-2 pr-3 pl-4 font-medium">
                          Invoice
                        </th>
                        <th scope="col" className="py-2 pr-3 font-medium">
                          Showroom
                        </th>
                        <th scope="col" className="py-2 pr-3 font-medium">
                          Status
                        </th>
                        <th scope="col" className="py-2 pr-3 font-medium">
                          E-way bill / bill
                        </th>
                        <th scope="col" className="py-2 pr-3 text-right font-medium">
                          Boxes
                        </th>
                        <th scope="col" className="py-2 pr-3 text-right font-medium">
                          Units
                        </th>
                        <th scope="col" className="py-2 pr-3 text-right font-medium">
                          Total
                        </th>
                        <th scope="col" className="py-2 pr-3 font-medium">
                          Updated
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          <span className="sr-only">View</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.rows.map((i) => (
                        <tr key={i.id} onClick={rowClick(() => setOpenId(i.id))} className="row-hover cursor-pointer border-b border-line-soft">
                          <td className="py-2 pr-3 pl-4">
                            <button
                              type="button"
                              onClick={() => setOpenId(i.id)}
                              className="font-mono text-xs font-semibold text-evergreen-900 hover:underline"
                            >
                              {i.number}
                            </button>
                          </td>
                          <td className="py-2 pr-3 text-ink-2">{[locationById(i.location)?.city, locationById(i.location)?.area].filter(Boolean).join(' · ')}</td>
                          <td className="py-2 pr-3">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS[i.status].className}`}>
                              {STATUS[i.status].label}
                            </span>
                          </td>
                          <td className="py-2 pr-3 font-mono text-xs text-ink-2">{[i.ewayNo, i.billNo].filter(Boolean).join(' · ') || '—'}</td>
                          <td className="py-2 pr-3 text-right">{i.boxIds.length || '—'}</td>
                          <td className="py-2 pr-3 text-right">{i.lines.reduce((s, l) => s + l.qty, 0)}</td>
                          <td className="py-2 pr-3 text-right font-medium">{inr(i.total)}</td>
                          <td className="py-2 pr-3 whitespace-nowrap text-ink-2">{when.format(new Date(i.updatedAt))}</td>
                          <td className="py-2 pr-4">
                            <div className="flex justify-end gap-1.5">
                              <button type="button" onClick={() => openPreview(i)} className={rowButton}>
                                <FileText size={14} aria-hidden="true" /> Invoice
                              </button>
                              {i.hasDocument ? (
                                <button type="button" onClick={() => showEway(i)} className={rowButton}>
                                  <Eye size={14} aria-hidden="true" /> E-way bill
                                </button>
                              ) : (
                                i.status !== 'cancelled' && (
                                  <button type="button" onClick={() => open(i, 'eway')} className={`${rowButton} border-dashed text-warn-ink`}>
                                    <Paperclip size={14} aria-hidden="true" /> {i.ewayNo ? 'Attach its PDF' : 'Attach e-way bill'}
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pager {...paged.pager} className="border-t border-line-soft px-4 py-2" />
            </section>
          </div>
        </div>

        {creating && <InvoiceEditor order={creating.order} onClose={() => setCreating(null)} onDone={created} />}
        {editing && <InvoiceEditor invoice={editing} onClose={() => setEditing(null)} onDone={edited} />}
        {openId && <InvoiceDetail key={`${openId}|${focus}`} id={openId} focus={focus} onClose={() => setOpenId(null)} onPreview={openPreview} onPrint={print} onEdit={edit} />}
        {preview && (
          <DocumentPreview
            id="invoice-preview"
            title={`Invoice ${preview.invoice.number}`}
            subtitle={`${preview.buyer.name} · ${inr(preview.invoice.total)}`}
            stamp={`${preview.invoice.id}|${preview.invoice.updatedAt}|${pdfStamp}`}
            kept={invoices.find((i) => i.id === preview.invoice.id)?.pdfStamp === pdfStamp ? () => invoicePdf(preview.invoice) : null}
            onBuilt={(pdf) => keepInvoicePdf(preview.invoice, pdfStamp, pdf).catch(() => {})}
            fileName={`${preview.invoice.number}.pdf`}
            footer={`${preview.invoice.number} · ${preview.buyer.name}`}
            onClose={() => setPreview(null)}
            onPrint={() => print(preview.invoice)}
            toolbar={<ColourPicker value={colour.id} onChange={setInvoiceColour} />}
          >
            <InvoiceDocument invoice={preview.invoice} seller={settings} buyer={preview.buyer} colour={colour} />
          </DocumentPreview>
        )}
        {nextToKeep && (
          <PdfKeeper
            key={`${nextToKeep.id}|${nextToKeep.updatedAt}|${pdfStamp}`}
            footer={`${nextToKeep.number} · ${nextToKeep.buyer.name}`}
            onMade={(pdf) => keepInvoicePdf(nextToKeep, pdfStamp, pdf).catch(() => {}).finally(kept)}
            onFail={kept}
          >
            <InvoiceDocument invoice={nextToKeep} seller={settings} buyer={nextToKeep.buyer} colour={colour} />
          </PdfKeeper>
        )}
      </div>
      {printing && <InvoicePrint invoice={printing.invoice} seller={settings} buyer={printing.buyer} />}
    </>
  );
};

export default TransferInvoices;
