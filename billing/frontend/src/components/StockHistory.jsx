import { Fragment, useState } from 'react';
import { ChevronRight, FileSpreadsheet, History, PackageCheck, Tag } from 'lucide-react';
import { locationById } from '../config.js';

const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const KIND = {
  import: { label: 'Excel import', Icon: FileSpreadsheet, className: 'bg-evergreen-50 text-evergreen-900' },
  product: { label: 'New product', Icon: Tag, className: 'bg-warn-50 text-warn-ink' },
  order: { label: 'Purchase order', Icon: PackageCheck, className: 'bg-mist text-ink-2' },
};

/**
 * The audit trail of stock coming in (see lib/stockLog.js): when, which showroom, who added it, how, and the
 * file or order it came from. A row opens to list its products.
 */
const StockHistory = ({ entries, showShop }) => {
  const [open, setOpen] = useState(null);

  if (!entries.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center lg:flex-1">
        <History size={22} className="text-ink-3" aria-hidden="true" />
        <div className="text-[15px] font-semibold">No stock added yet</div>
        <div className="text-[13px] text-ink-3">Excel imports and purchase orders counted in are listed here, with who added them.</div>
      </div>
    );
  }

  return (
    <div className="max-h-[70dvh] overflow-auto xl:max-h-none xl:overflow-visible">
      <table className="w-full min-w-[48rem] text-[13px] tabular-nums">
        <thead className="sticky top-0 z-1 bg-white/95 shadow-[0_1px_0_var(--color-line-soft)] backdrop-blur">
          <tr className="border-b border-line-soft text-left text-xs text-ink-3">
            <th scope="col" className="py-1.5 pr-3 pl-4 font-medium">When</th>
            {showShop && <th scope="col" className="py-1.5 pr-3 font-medium">Showroom</th>}
            <th scope="col" className="py-1.5 pr-3 font-medium">Added by</th>
            <th scope="col" className="py-1.5 pr-3 font-medium">How</th>
            <th scope="col" className="py-1.5 pr-3 font-medium">File, order or code</th>
            <th scope="col" className="py-1.5 pr-3 text-right font-medium">Products</th>
            <th scope="col" className="py-1.5 pr-4 text-right font-medium">Units added</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const kind = KIND[e.kind];
            const isOpen = open === e.id;
            const shop = locationById(e.location);
            return (
              <Fragment key={e.id}>
                <tr className={`border-b border-line-soft ${isOpen ? 'bg-mist-2' : 'row-hover'}`}>
                  <td className="py-1.5 pr-3 pl-4 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : e.id)}
                      aria-expanded={isOpen}
                      className="inline-flex items-center gap-1.5 rounded-md text-ink hover:text-evergreen-800"
                    >
                      <ChevronRight size={14} className={`text-ink-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} aria-hidden="true" />
                      {when.format(new Date(e.at)).replace(' at ', ', ')}
                    </button>
                  </td>
                  {showShop && <td className="py-1.5 pr-3">{shop ? `${shop.city} · ${shop.area}` : e.location}</td>}
                  <td className="py-1.5 pr-3 font-medium">{e.by || '—'}</td>
                  <td className="py-1.5 pr-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${kind.className}`}>
                      <kind.Icon size={12} aria-hidden="true" /> {kind.label}
                    </span>
                  </td>
                  <td className="max-w-56 truncate py-1.5 pr-3 font-mono text-xs" title={e.ref}>
                    {e.ref}
                  </td>
                  <td className="py-1.5 pr-3 text-right text-ink-2">{e.lines.length}</td>
                  <td className="py-1.5 pr-4 text-right font-semibold text-ok-ink">+{e.units.toLocaleString('en-IN')}</td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-line-soft bg-mist-2">
                    <td colSpan={showShop ? 7 : 6} className="px-4 pt-1 pb-3">
                      {e.note && <p className="mb-2 pl-5 text-xs text-ink-3">Note: {e.note}</p>}
                      <ul className="grid gap-x-6 gap-y-1 pl-5 sm:grid-cols-2 lg:grid-cols-3">
                        {e.lines.map((l) => (
                          <li key={l.code} className="flex items-baseline gap-2 text-xs">
                            <span className="font-mono text-ink-3">{l.code}</span>
                            <span className="min-w-0 flex-1 truncate">{l.name}</span>
                            <span className="font-semibold text-ok-ink">+{l.qty}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default StockHistory;
