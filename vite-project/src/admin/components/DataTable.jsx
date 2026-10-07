import { useMemo, useState } from 'react';
import { Search, ArrowUpDown } from 'lucide-react';

/**
 * Generic searchable/sortable table for the admin list pages.
 * columns: [{ key, label, render?, sortable? }]
 */
const DataTable = ({ columns, rows, rowKey = 'id', searchKeys = [], emptyMessage = 'Nothing here yet.' }) => {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ key: null, dir: 'asc' });

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q
      ? rows.filter((row) =>
          searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(q))
        )
      : rows;

    if (sort.key) {
      list = [...list].sort((a, b) => {
        const av = String(a[sort.key] ?? '');
        const bv = String(b[sort.key] ?? '');
        return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return list;
  }, [rows, query, sort, searchKeys]);

  const toggleSort = (key) =>
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    );

  return (
    <div className="flex flex-col gap-4">
      {searchKeys.length > 0 && (
        <div className="flex w-full max-w-[320px] items-center gap-2 rounded-lg border border-gold-400/15 bg-[rgba(8,28,20,0.85)] px-3.5 py-2 text-text-secondary">
          <Search size={15} strokeWidth={2} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full border-none bg-transparent text-[0.85rem] text-white outline-none placeholder:text-text-muted"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gold-400/15 bg-[rgba(8,28,20,0.6)]">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-gold-400/15">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-gold-400"
                >
                  {col.sortable ? (
                    <button
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex cursor-pointer items-center gap-1 border-none bg-transparent font-mono text-[0.68rem] uppercase tracking-[0.12em] text-gold-400 hover:text-gold-200"
                    >
                      {col.label}
                      <ArrowUpDown size={11} strokeWidth={2} />
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr
                  key={row[rowKey]}
                  className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/3"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 align-middle text-[0.85rem] text-text-secondary">
                      {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[0.75rem] text-text-muted">
        Showing {visible.length} of {rows.length}
      </p>
    </div>
  );
};

export default DataTable;
