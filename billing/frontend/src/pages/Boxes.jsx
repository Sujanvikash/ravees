import { Fragment, useRef, useState } from 'react';
import { ChevronDown, FileSpreadsheet, Package, PackageOpen, Pencil, Plus, ScanBarcode, Trash2 } from 'lucide-react';
import { BoxEditor, BoxImport } from '../components/BoxDialogs.jsx';
import { SearchBox, Segmented } from '../components/Filters.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Pager from '../components/Pager.jsx';
import { locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { usePages } from '../hooks/usePages.js';
import { useScanner } from '../hooks/useScanner.js';
import { boxUnits, findBox } from '../lib/boxes.js';
import { rowClick } from '../lib/rowClick.js';

const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const TABS = [
  { id: 'in_stock', label: 'In warehouse' },
  { id: 'invoiced', label: 'On an invoice' },
  { id: 'stocked', label: 'Added to store' },
  { id: 'all', label: 'All' },
];

const STATUS = {
  in_stock: { label: 'In warehouse', className: 'bg-evergreen-50 text-evergreen-900' },
  invoiced: { label: 'On an invoice', className: 'bg-warn-50 text-warn-ink' },
  stocked: { label: 'Added to store', className: 'bg-ok-50 text-ok-ink' },
};
const ACTION = { packed: 'Entered', edited: 'Edited', invoiced: 'Put on invoice', released: 'Back in the warehouse', stocked: 'Added to store stock' };

const primary = 'inline-flex h-10 items-center gap-2 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white hover:bg-evergreen-900';
const secondary =
  'inline-flex h-10 items-center gap-2 rounded-xl border border-evergreen-800/25 bg-white px-4 text-[13px] font-semibold text-evergreen-900 hover:border-evergreen-800/50 hover:bg-evergreen-50';
const small = 'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink';

/**
 * The admin's boxes: the supplier's boxes, with the products in each. The admin enters each box and what is in
 * it, by hand or from the packing-list Excel; that adds them to the admin's own stock (the warehouse). A box
 * leaves the warehouse when it goes on an invoice to a showroom, and reaches the showroom's stock when
 * that invoice is paid and the admin adds it.
 */
const Boxes = ({ onMenu }) => {
  const { boxes, saveBoxes, deleteBox } = useStore();
  const [tab, setTab] = useState('in_stock');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);
  const [editing, setEditing] = useState(null); // a box, or {} for a new one
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [flash, setFlash] = useState(null);
  const [scan, setScan] = useState('');
  const scanRef = useRef(null);

  const count = (id) => boxes.filter((b) => id === 'all' || b.status === id).length;
  const q = query.trim().toLowerCase();
  const list = boxes
    .filter((b) => tab === 'all' || b.status === tab)
    .filter((b) => !q || `${b.boxNo} ${b.stockNo} ${b.shipment} ${b.supplier} ${b.lines.map((l) => l.code).join(' ')}`.toLowerCase().includes(q))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const paged = usePages(list, 50, `${tab}|${q}`);

  const fail = (err) => setFlash({ tone: 'warn', text: `Not saved: ${err.message}` });

  // Scanning a box's label (or typing its number) finds it in the list and opens it.
  const find = (code) => {
    const box = findBox(boxes, code);
    setScan('');
    if (!box) return setFlash({ tone: 'warn', text: `No box “${code.trim()}” is entered yet.` });
    setTab('all');
    setQuery('');
    setOpen(box.id);
    setFlash({ tone: 'ok', text: `Box ${box.boxNo}: ${STATUS[box.status].label.toLowerCase()}${box.location ? ` · ${locationById(box.location)?.city}` : ''}.` });
  };
  useScanner(find, !editing && !importing);

  const save = async (box) => {
    await saveBoxes([box]);
    setEditing(null);
    setFlash({ tone: 'ok', text: `Box ${box.boxNo.toUpperCase()} saved and added to the warehouse stock.` });
  };

  const saveMany = async (list) => {
    await saveBoxes(list);
    setImporting(false);
    setTab('in_stock');
    setFlash({ tone: 'ok', text: `${list.length} ${list.length === 1 ? 'box' : 'boxes'} saved from the packing list and added to the warehouse stock.` });
  };

  const remove = async (box) => {
    setDeleting(null);
    try {
      await deleteBox(box.id);
      setFlash({ tone: 'ok', text: `Box ${box.boxNo} deleted and taken off the warehouse stock.` });
    } catch (err) {
      fail(err);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader crumbs={['Admin', 'Boxes']} onMenu={onMenu} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[100rem] flex-col gap-4 p-3 lg:px-5 lg:py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-3xl text-[13px] text-ink-3">
              Your boxes from the supplier. Enter each box and the products inside (or import the packing list): they are added to your own stock. To send boxes to
              a showroom, put them on an invoice (Invoices → New invoice).
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setImporting(true)} className={secondary}>
                <FileSpreadsheet size={16} aria-hidden="true" /> Import packing list
              </button>
              <button type="button" onClick={() => setEditing({})} className={primary}>
                <Plus size={16} aria-hidden="true" /> New box
              </button>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (scan.trim()) find(scan);
            }}
            className="flex h-14 items-center gap-3 rounded-2xl border glass px-4 focus-within:border-evergreen-800/50"
          >
            <ScanBarcode size={20} className="text-ink-3" aria-hidden="true" />
            <label htmlFor="box-scan" className="sr-only">
              Box number
            </label>
            <input
              id="box-scan"
              ref={scanRef}
              value={scan}
              onChange={(e) => setScan(e.target.value)}
              placeholder="Scan a box label, or type the box number (154.CHN) and press Enter, to find it"
              autoComplete="off"
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-ink-3"
            />
            <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-evergreen-800 px-3.5 text-[13px] font-semibold text-white hover:bg-evergreen-900">
              <PackageOpen size={15} aria-hidden="true" /> Find box
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label="Boxes"
              options={TABS.map((t) => ({ ...t, label: `${t.label}${count(t.id) ? ` · ${count(t.id)}` : ''}` }))}
              value={tab}
              onChange={setTab}
            />
            <div className="flex flex-1 justify-end">
              <SearchBox value={query} onChange={setQuery} placeholder="Box, stock no., shipment or product code" />
            </div>
          </div>

          {flash && (
            <div role="status" className={`animate-pop rounded-xl px-4 py-2.5 text-[13px] font-medium ${flash.tone === 'warn' ? 'bg-warn-50 text-warn-ink' : 'bg-ok-50 text-ok-ink'}`}>
              {flash.text}
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border glass">
            {list.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <Package size={22} className="text-ink-3" aria-hidden="true" />
                <div className="text-[15px] font-semibold">{q ? 'No box matches that search' : 'No boxes here'}</div>
                <div className="max-w-sm text-[13px] text-ink-3">Enter a box by hand, or import the packing list for a whole shipment.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[60rem] text-[13px] tabular-nums">
                  <thead>
                    <tr className="border-b border-line-soft text-left text-xs text-ink-3">
                      <th scope="col" className="w-10 py-2 pl-4">
                        <span className="sr-only">Show products</span>
                      </th>
                      <th scope="col" className="py-2 pr-3 font-medium">Box</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Stock no.</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Shipment</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Showroom</th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">Products</th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">Units</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Status</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Updated</th>
                      <th scope="col" className="py-2 pr-4 text-right font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.rows.map((b) => {
                      const isOpen = open === b.id;
                      const st = STATUS[b.status];
                      return (
                        <Fragment key={b.id}>
                          <tr className="row-hover cursor-pointer border-b border-line-soft" onClick={rowClick(() => setOpen(isOpen ? null : b.id))}>
                            <td className="py-1.5 pl-4">
                              <button
                                type="button"
                                onClick={() => setOpen(isOpen ? null : b.id)}
                                aria-expanded={isOpen}
                                aria-label={`${isOpen ? 'Hide' : 'Show'} the products in box ${b.boxNo}`}
                                className="inline-flex size-6 items-center justify-center rounded-md text-ink-3 hover:bg-mist hover:text-ink"
                              >
                                <ChevronDown size={15} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                              </button>
                            </td>
                            <td className="py-1.5 pr-3 font-mono text-xs font-semibold">{b.boxNo}</td>
                            <td className="py-1.5 pr-3 font-mono text-xs text-ink-2">{b.stockNo || '—'}</td>
                            <td className="max-w-56 truncate py-1.5 pr-3 text-ink-2" title={b.supplier ? `${b.shipment} · ${b.supplier}` : b.shipment}>
                              {b.shipment || '—'}
                            </td>
                            <td className="py-1.5 pr-3 text-ink-2">{b.location ? locationById(b.location)?.city : '—'}</td>
                            <td className="py-1.5 pr-3 text-right">{b.lines.length}</td>
                            <td className="py-1.5 pr-3 text-right">{boxUnits(b.lines)}</td>
                            <td className="py-1.5 pr-3">
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${st.className}`}>{st.label}</span>
                            </td>
                            <td className="py-1.5 pr-3 whitespace-nowrap text-ink-2">{when.format(new Date(b.updatedAt))}</td>
                            <td className="py-1.5 pr-4">
                              <div className="flex justify-end gap-1">
                                {b.status === 'in_stock' && (
                                  <>
                                    <button type="button" onClick={() => setEditing(b)} className={small}>
                                      <Pencil size={14} aria-hidden="true" /> Edit
                                    </button>
                                    {deleting === b.id ? (
                                      <button
                                        type="button"
                                        onClick={() => remove(b)}
                                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ruby px-2.5 text-[13px] font-semibold text-white hover:bg-ruby-ink"
                                      >
                                        Delete box?
                                      </button>
                                    ) : (
                                      <button type="button" onClick={() => setDeleting(b.id)} aria-label={`Delete box ${b.boxNo}`} className={`${small} hover:bg-ruby-50 hover:text-ruby-ink`}>
                                        <Trash2 size={14} aria-hidden="true" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="border-b border-line-soft bg-mist-2">
                              <td colSpan={10} className="px-4 pt-1 pb-4">
                                <div className="ml-8 grid animate-pop gap-3 md:grid-cols-[minmax(0,1fr)_16rem]">
                                  <ul className="flex flex-col rounded-xl border border-line-soft bg-surface p-2">
                                    {b.lines.map((l) => (
                                      <li key={l.code} className="flex items-center gap-3 px-2 py-1.5">
                                        <span className="rounded-md bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{l.code}</span>
                                        <span className="min-w-0 flex-1 truncate">{l.name}</span>
                                        <span className="w-10 text-right text-xs text-ink-2">{l.qty}</span>
                                      </li>
                                    ))}
                                    <li className="flex justify-between border-t border-line-soft px-2 pt-1.5 text-xs font-semibold">
                                      <span>Total</span>
                                      <span>{boxUnits(b.lines)}</span>
                                    </li>
                                  </ul>
                                  <ol aria-label="History" className="flex flex-col gap-2 text-xs">
                                    {b.supplier && <li className="text-ink-2">Supplier: {b.supplier}</li>}
                                    {b.history.map((h) => (
                                      <li key={h.at + h.action} className="flex gap-2">
                                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-line-strong" aria-hidden="true" />
                                        <span>
                                          <span className="font-medium">{ACTION[h.action] ?? h.action}</span>{' '}
                                          <span className="text-ink-3">
                                            · {h.by} · {when.format(new Date(h.at))}
                                          </span>
                                          {h.note && <span className="block text-ink-2">“{h.note}”</span>}
                                        </span>
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Pager {...paged.pager} className="border-t border-line-soft px-4 py-2" />
          </section>
        </div>
      </div>

      {editing && <BoxEditor box={editing.id ? editing : null} onClose={() => setEditing(null)} onSave={save} />}
      {importing && <BoxImport boxes={boxes} onClose={() => setImporting(false)} onSave={saveMany} />}
    </div>
  );
};

export default Boxes;
