import { Fragment, useRef, useState } from 'react';
import { ChevronDown, FileSpreadsheet, Package, PackageCheck, PackageOpen, Pencil, Plus, ScanBarcode, Tag, Trash2 } from 'lucide-react';
import { BoxEditor, BoxImport, ShowroomSelect } from '../components/BoxDialogs.jsx';
import CountInDialog from '../components/CountInDialog.jsx';
import { LocationPicker, SearchBox, Segmented } from '../components/Filters.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Pager from '../components/Pager.jsx';
import { locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { usePages } from '../hooks/usePages.js';
import { useScanner } from '../hooks/useScanner.js';
import { boxUnits, findBox } from '../lib/boxes.js';
import { rowClick } from '../lib/rowClick.js';

const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const TABS = {
  location: [
    { id: 'packed', label: 'To receive' },
    { id: 'received', label: 'Received' },
    { id: 'all', label: 'All' },
  ],
  admin: [
    { id: 'untagged', label: 'Not tagged' },
    { id: 'packed', label: 'On the way' },
    { id: 'received', label: 'Received' },
    { id: 'all', label: 'All' },
  ],
};
const inTab = (b, tab) =>
  tab === 'all' || (tab === 'untagged' ? b.status === 'packed' && !b.location : tab === 'packed' ? b.status === 'packed' && Boolean(b.location) : b.status === tab);

const STATUS = {
  packed: { label: 'On the way', className: 'bg-warn-50 text-warn-ink' },
  untagged: { label: 'Not tagged', className: 'bg-mist text-ink-2' },
  received: { label: 'Received', className: 'bg-ok-50 text-ok-ink' },
};
const ACTION = { packed: 'Entered', edited: 'Edited', tagged: 'Tagged for', untagged: 'Tag taken off', received: 'Counted in' };

const primary = 'inline-flex h-10 items-center gap-2 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white hover:bg-evergreen-900';
const secondary =
  'inline-flex h-10 items-center gap-2 rounded-xl border border-evergreen-800/25 bg-white px-4 text-[13px] font-semibold text-evergreen-900 hover:border-evergreen-800/50 hover:bg-evergreen-50';
const small = 'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink';

/**
 * Boxes, the way packed stock reaches a showroom: the supplier packs the boxes (box 154.GOA, with its list of
 * products); the admin enters each box and what is in it, by hand or from the packing-list Excel, and tags the
 * showroom it goes to; the showroom scans the box's label when it arrives, checks the products and counts it in,
 * which adds them to its stock. Anything missing is kept on the box for the admin to see.
 */
const Boxes = ({ session, onMenu }) => {
  const admin = session.role === 'admin';
  const { boxes, saveBoxes, tagBoxes, deleteBox, receiveBox } = useStore();
  const [tab, setTab] = useState(TABS[session.role][0].id);
  const [location, setLocation] = useState(admin ? null : session.location);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);
  const [editing, setEditing] = useState(null); // a box, or {} for a new one
  const [importing, setImporting] = useState(false);
  const [counting, setCounting] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [tagTo, setTagTo] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [flash, setFlash] = useState(null);
  const [scan, setScan] = useState('');
  const scanRef = useRef(null);
  const shop = locationById(session.location);

  const mine = boxes.filter((b) => !location || b.location === location);
  const count = (id) => mine.filter((b) => inTab(b, id)).length;
  const q = query.trim().toLowerCase();
  const list = mine
    .filter((b) => inTab(b, tab))
    .filter((b) => !q || `${b.boxNo} ${b.stockNo} ${b.shipment} ${b.supplier} ${b.lines.map((l) => l.code).join(' ')}`.toLowerCase().includes(q))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const paged = usePages(list, 50, `${tab}|${location}|${q}`);
  const last = [...boxes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  const status = (b) => (b.status === 'packed' && !b.location ? 'untagged' : b.status);

  const fail = (err) => setFlash({ tone: 'warn', text: `Not saved: ${err.message}` });

  // A showroom scans a box's label (or types its number): open it to count in.
  const openBox = (code) => {
    const box = findBox(mine, code);
    setScan('');
    if (!box) return setFlash({ tone: 'warn', text: `No box “${code.trim()}” for ${shop?.city ?? 'this showroom'}. Check the number, or ask the admin to tag it for you.` });
    if (box.status === 'received') {
      setOpen(box.id);
      return setFlash({ tone: 'warn', text: `Box ${box.boxNo} was already counted in on ${when.format(new Date(box.updatedAt))}.` });
    }
    setFlash(null);
    setCounting(box);
  };
  useScanner(openBox, !admin && !counting);

  const receive = async (counted, note) => {
    const box = counting;
    setCounting(null);
    try {
      await receiveBox(box.id, counted, note);
      const got = boxUnits(counted);
      const sent = boxUnits(box.lines);
      setFlash({ tone: got === sent ? 'ok' : 'warn', text: `Box ${box.boxNo} counted in: ${got.toLocaleString('en-IN')} of ${sent.toLocaleString('en-IN')} units added to stock.` });
      scanRef.current?.focus();
    } catch (err) {
      fail(err);
    }
  };

  const save = async (box) => {
    await saveBoxes([box]);
    setEditing(null);
    setFlash({ tone: 'ok', text: `Box ${box.boxNo.toUpperCase()} saved${box.location ? ` for ${locationById(box.location).city}` : ' (not tagged yet)'}.` });
  };

  const saveMany = async (list) => {
    await saveBoxes(list);
    setImporting(false);
    setTab(list.some((b) => !b.location) ? 'untagged' : 'packed');
    setFlash({ tone: 'ok', text: `${list.length} ${list.length === 1 ? 'box' : 'boxes'} saved from the packing list.` });
  };

  const tag = async (ids, to) => {
    try {
      await tagBoxes(ids, to);
      setSelected(new Set());
      setFlash({ tone: 'ok', text: `${ids.length} ${ids.length === 1 ? 'box' : 'boxes'} ${to ? `tagged for ${locationById(to).city}` : 'untagged'}.` });
    } catch (err) {
      fail(err);
    }
  };

  const remove = async (box) => {
    setDeleting(null);
    try {
      await deleteBox(box.id);
      setFlash({ tone: 'ok', text: `Box ${box.boxNo} deleted.` });
    } catch (err) {
      fail(err);
    }
  };

  const selectable = paged.rows.filter((b) => b.status === 'packed');
  const allSelected = selectable.length > 0 && selectable.every((b) => selected.has(b.id));
  const toggle = (id) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const cols = admin ? 11 : 8;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader crumbs={[admin ? 'All showrooms' : `${shop.city} · ${shop.area}`, 'Boxes']} onMenu={onMenu} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[100rem] flex-col gap-4 p-3 lg:px-5 lg:py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-3xl text-[13px] text-ink-3">
              {admin
                ? 'Packed boxes from the supplier. Enter each box and the products inside (or import the packing list), then tag the showroom it goes to. The showroom scans the box when it arrives and the products go into its stock.'
                : 'Boxes the admin has sent you. When one arrives, scan its label (or type the box number), check the products and count it in: they are added to your stock.'}
            </p>
            {admin && (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setImporting(true)} className={secondary}>
                  <FileSpreadsheet size={16} aria-hidden="true" /> Import packing list
                </button>
                <button type="button" onClick={() => setEditing({})} className={primary}>
                  <Plus size={16} aria-hidden="true" /> New box
                </button>
              </div>
            )}
          </div>

          {!admin && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (scan.trim()) openBox(scan);
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
                placeholder="Scan the box label, or type the box number (154.GOA) and press Enter"
                autoComplete="off"
                autoFocus
                className="min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-ink-3"
              />
              <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-evergreen-800 px-3.5 text-[13px] font-semibold text-white hover:bg-evergreen-900">
                <PackageOpen size={15} aria-hidden="true" /> Open box
              </button>
            </form>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label="Boxes"
              options={TABS[session.role].map((t) => ({ ...t, label: `${t.label}${count(t.id) ? ` · ${count(t.id)}` : ''}` }))}
              value={tab}
              onChange={(t) => {
                setTab(t);
                setSelected(new Set());
              }}
            />
            {admin && <LocationPicker value={location} onChange={setLocation} />}
            <div className="flex flex-1 justify-end">
              <SearchBox value={query} onChange={setQuery} placeholder="Box, stock no., shipment or product code" />
            </div>
          </div>

          {flash && (
            <div role="status" className={`animate-pop rounded-xl px-4 py-2.5 text-[13px] font-medium ${flash.tone === 'warn' ? 'bg-warn-50 text-warn-ink' : 'bg-ok-50 text-ok-ink'}`}>
              {flash.text}
            </div>
          )}

          {admin && selected.size > 0 && (
            <div className="flex animate-pop flex-wrap items-center gap-2 rounded-xl border border-evergreen-800/20 bg-evergreen-50 px-4 py-2 text-[13px]">
              <Tag size={15} className="text-evergreen-900" aria-hidden="true" />
              <span className="font-semibold text-evergreen-900">
                {selected.size} {selected.size === 1 ? 'box' : 'boxes'} selected
              </span>
              <span className="text-ink-2">· send to</span>
              <ShowroomSelect
                value={tagTo}
                onChange={setTagTo}
                className="h-8 rounded-lg border border-line bg-surface px-2 text-[13px]"
              />
              <button type="button" onClick={() => tag([...selected], tagTo)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-evergreen-800 px-3 text-[13px] font-semibold text-white hover:bg-evergreen-900">
                {tagTo ? `Tag for ${locationById(tagTo).city}` : 'Take the tag off'}
              </button>
              <button type="button" onClick={() => setSelected(new Set())} className={`${small} ml-auto`}>
                Clear selection
              </button>
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border glass">
            {list.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <Package size={22} className="text-ink-3" aria-hidden="true" />
                <div className="text-[15px] font-semibold">{q ? 'No box matches that search' : 'No boxes here'}</div>
                <div className="max-w-sm text-[13px] text-ink-3">
                  {admin ? 'Enter a box by hand, or import the packing list for a whole shipment.' : 'Boxes the admin tags for you show up here before they arrive.'}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[60rem] text-[13px] tabular-nums">
                  <thead>
                    <tr className="border-b border-line-soft text-left text-xs text-ink-3">
                      {admin && (
                        <th scope="col" className="w-10 py-2 pl-4">
                          <input
                            type="checkbox"
                            aria-label="Select every packed box on this page"
                            checked={allSelected}
                            disabled={!selectable.length}
                            onChange={() => setSelected(allSelected ? new Set() : new Set(selectable.map((b) => b.id)))}
                            className="size-4 accent-evergreen-800"
                          />
                        </th>
                      )}
                      <th scope="col" className={`w-10 py-2 ${admin ? '' : 'pl-4'}`}>
                        <span className="sr-only">Show products</span>
                      </th>
                      <th scope="col" className="py-2 pr-3 font-medium">Box</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Stock no.</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Shipment</th>
                      {admin && <th scope="col" className="py-2 pr-3 font-medium">Goes to</th>}
                      <th scope="col" className="py-2 pr-3 text-right font-medium">Products</th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">Units</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Status</th>
                      {admin && <th scope="col" className="py-2 pr-3 font-medium">Updated</th>}
                      <th scope="col" className="py-2 pr-4 text-right font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.rows.map((b) => {
                      const isOpen = open === b.id;
                      const st = STATUS[status(b)];
                      return (
                        <Fragment key={b.id}>
                          <tr className="row-hover cursor-pointer border-b border-line-soft" onClick={rowClick(() => setOpen(isOpen ? null : b.id))}>
                            {admin && (
                              <td className="py-1.5 pl-4">
                                {b.status === 'packed' && (
                                  <input
                                    type="checkbox"
                                    aria-label={`Select box ${b.boxNo}`}
                                    checked={selected.has(b.id)}
                                    onChange={() => toggle(b.id)}
                                    className="size-4 accent-evergreen-800"
                                  />
                                )}
                              </td>
                            )}
                            <td className={`py-1.5 ${admin ? '' : 'pl-4'}`}>
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
                            {admin && (
                              <td className="py-1.5 pr-3">
                                {b.status === 'packed' ? (
                                  <ShowroomSelect
                                    value={b.location}
                                    onChange={(to) => tag([b.id], to)}
                                    className="h-8 rounded-lg border border-line bg-surface px-2 text-[13px]"
                                  />
                                ) : (
                                  <span className="text-ink-2">{locationById(b.location)?.city}</span>
                                )}
                              </td>
                            )}
                            <td className="py-1.5 pr-3 text-right">{b.lines.length}</td>
                            <td className="py-1.5 pr-3 text-right">
                              {b.status === 'received' && boxUnits(b.counted ?? []) !== boxUnits(b.lines)
                                ? `${boxUnits(b.counted ?? [])} of ${boxUnits(b.lines)}`
                                : boxUnits(b.lines)}
                            </td>
                            <td className="py-1.5 pr-3">
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${st.className}`}>{st.label}</span>
                            </td>
                            {admin && <td className="py-1.5 pr-3 whitespace-nowrap text-ink-2">{when.format(new Date(b.updatedAt))}</td>}
                            <td className="py-1.5 pr-4">
                              <div className="flex justify-end gap-1">
                                {admin && b.status === 'packed' && (
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
                                {!admin && b.status === 'packed' && (
                                  <button
                                    type="button"
                                    onClick={() => setCounting(b)}
                                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-evergreen-800 px-3 text-[13px] font-semibold text-white hover:bg-evergreen-900"
                                  >
                                    <PackageCheck size={14} aria-hidden="true" /> Count in
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="border-b border-line-soft bg-mist-2">
                              <td colSpan={cols} className="px-4 pt-1 pb-4">
                                <div className="ml-8 grid animate-pop gap-3 md:grid-cols-[minmax(0,1fr)_16rem]">
                                  <ul className="flex flex-col rounded-xl border border-line-soft bg-surface p-2">
                                    {b.lines.map((l) => {
                                      const got = b.counted?.find((c) => c.code === l.code)?.qty ?? 0;
                                      return (
                                        <li key={l.code} className="flex items-center gap-3 px-2 py-1.5">
                                          <span className="rounded-md bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{l.code}</span>
                                          <span className="min-w-0 flex-1 truncate">{l.name}</span>
                                          {b.status === 'received' && got !== l.qty && <span className="text-xs font-medium text-warn-ink">counted {got}</span>}
                                          <span className="w-10 text-right text-xs text-ink-2">{l.qty}</span>
                                        </li>
                                      );
                                    })}
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
                                          <span className="font-medium">
                                            {ACTION[h.action] ?? h.action}
                                            {h.action === 'tagged' && h.note ? ` ${locationById(h.note)?.city ?? h.note}` : ''}
                                          </span>{' '}
                                          <span className="text-ink-3">
                                            · {h.by} · {when.format(new Date(h.at))}
                                          </span>
                                          {h.note && h.action !== 'tagged' && h.action !== 'untagged' && <span className="block text-ink-2">“{h.note}”</span>}
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

      {editing && <BoxEditor box={editing.id ? editing : null} last={last} onClose={() => setEditing(null)} onSave={save} />}
      {importing && <BoxImport boxes={boxes} onClose={() => setImporting(false)} onSave={saveMany} />}
      {counting && (
        <CountInDialog
          order={{ number: `box ${counting.boxNo}`, lines: counting.lines }}
          subtitle="Check the products against the box’s list. What you count is added to your stock."
          onClose={() => {
            setCounting(null);
            scanRef.current?.focus();
          }}
          onConfirm={receive}
        />
      )}
    </div>
  );
};

export default Boxes;
