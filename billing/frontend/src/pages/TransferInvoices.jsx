import { useEffect, useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import { InvoiceDetail, InvoiceEditor } from '../components/InvoiceDialogs.jsx';
import DocumentPreview from '../components/DocumentPreview.jsx';
import InvoicePrint, { InvoiceDocument } from '../components/InvoicePrint.jsx';
import { LocationPicker, SearchBox, Segmented } from '../components/Filters.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Pager from '../components/Pager.jsx';
import { locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { usePages } from '../hooks/usePages.js';
import { STATUS, storeBuyer } from '../lib/invoices.js';
import { inr } from '../lib/money.js';
import { rowClick } from '../lib/rowClick.js';

const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const TABS = [
  { id: 'raised', label: 'To pay' },
  { id: 'paid', label: 'Paid' },
  { id: 'stocked', label: 'Added to store' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'all', label: 'All' },
];

/**
 * Invoices, how stock goes from the admin's warehouse to a showroom: the admin scans boxes and single products and
 * raises an invoice for a showroom (each product at its cost price, D.Rate, with 18% GST on top), records the e-way bill or bill from the GST portal,
 * marks it paid, then adds the products to the showroom's stock. A showroom's purchase order can be answered by
 * an invoice (Create invoice on the order opens this page with the order filled in).
 */
const TransferInvoices = ({ intent, onMenu }) => {
  const { invoices, settings } = useStore();
  const [printing, setPrinting] = useState(null); // { invoice, buyer } on the print page
  const [printJob, setPrintJob] = useState(0);
  const [preview, setPreview] = useState(null); // { invoice, buyer } in the preview
  const [tab, setTab] = useState('raised');
  const [location, setLocation] = useState(null);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(() => (intent?.order ? { order: intent.order } : null)); // { order? }
  const [openId, setOpenId] = useState(null);
  const [editing, setEditing] = useState(null); // an invoice not paid yet, being changed
  const [flash, setFlash] = useState(null);

  const mine = invoices.filter((i) => !location || i.location === location);
  const count = (id) => mine.filter((i) => id === 'all' || i.status === id).length;
  const q = query.trim().toLowerCase();
  const list = mine
    .filter((i) => tab === 'all' || i.status === tab)
    .filter((i) => !q || `${i.number} ${i.ewayNo} ${i.billNo} ${locationById(i.location)?.city ?? ''}`.toLowerCase().includes(q))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
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

  const created = (invoice) => {
    setCreating(null);
    setTab('raised');
    setOpenId(invoice.id);
    setFlash(`${invoice.number} raised for ${locationById(invoice.location)?.city}. Mark it paid when the money comes in.`);
  };

  const edit = (invoice) => {
    setOpenId(null);
    setEditing(invoice);
  };

  const edited = (invoice) => {
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
                Send stock to a showroom: scan boxes and single products onto an invoice at cost price (D.Rate) plus 18% GST, record the e-way bill or bill, and mark it
                paid. Then add the products to the showroom’s stock.
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

            {flash && (
              <div role="status" className="animate-pop rounded-xl bg-ok-50 px-4 py-2.5 text-[13px] font-medium text-ok-ink">
                {flash}
              </div>
            )}

            <section className="overflow-hidden rounded-2xl border glass">
              {list.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                  <FileText size={22} className="text-ink-3" aria-hidden="true" />
                  <div className="text-[15px] font-semibold">{q ? 'No invoice matches that search' : 'No invoices here'}</div>
                  <div className="max-w-sm text-[13px] text-ink-3">Raise an invoice to send boxes or single products to a showroom.</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[52rem] text-[13px] tabular-nums">
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
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Updated
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
                          <td className="py-2 pr-3 text-ink-2">{locationById(i.location)?.city}</td>
                          <td className="py-2 pr-3">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS[i.status].className}`}>
                              {STATUS[i.status].label}
                            </span>
                          </td>
                          <td className="py-2 pr-3 font-mono text-xs text-ink-2">{[i.ewayNo, i.billNo].filter(Boolean).join(' · ') || '—'}</td>
                          <td className="py-2 pr-3 text-right">{i.boxIds.length || '—'}</td>
                          <td className="py-2 pr-3 text-right">{i.lines.reduce((s, l) => s + l.qty, 0)}</td>
                          <td className="py-2 pr-3 text-right font-medium">{inr(i.total)}</td>
                          <td className="py-2 pr-4 whitespace-nowrap text-ink-2">{when.format(new Date(i.updatedAt))}</td>
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
        {openId && <InvoiceDetail id={openId} onClose={() => setOpenId(null)} onPreview={openPreview} onPrint={print} onEdit={edit} />}
        {preview && (
          <DocumentPreview
            id="invoice-preview"
            title={`Invoice ${preview.invoice.number}`}
            subtitle={`${preview.buyer.name} · ${inr(preview.invoice.total)}`}
            stamp={`${preview.invoice.id}|${preview.invoice.updatedAt}`}
            fileName={`${preview.invoice.number}.pdf`}
            footer={`${preview.invoice.number} · ${preview.buyer.name}`}
            onClose={() => setPreview(null)}
            onPrint={() => print(preview.invoice)}
          >
            <InvoiceDocument invoice={preview.invoice} seller={settings} buyer={preview.buyer} />
          </DocumentPreview>
        )}
      </div>
      {printing && <InvoicePrint invoice={printing.invoice} seller={settings} buyer={printing.buyer} />}
    </>
  );
};

export default TransferInvoices;
