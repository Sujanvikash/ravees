import { useState } from 'react';
import { Save, RotateCcw, Plus, Trash2, X } from 'lucide-react';
import { useAdminData } from '../context/AdminDataContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const FIELD =
  'rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[0.88rem] text-white outline-none focus:border-gold-400';
const LABEL = 'text-[0.75rem] text-gold-300';

export default function AdminCategories() {
  const { categories, products } = useAdminData();
  const { showToast } = useToast();
  const [drafts, setDrafts] = useState({});
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', icon: '✦' });

  const editable = categories.items.filter((c) => c.id !== 'all');

  const save = (cat) => {
    const draft = drafts[cat.id];
    if (!draft) return;
    categories.update(cat.id, draft);
    setDrafts((prev) => ({ ...prev, [cat.id]: undefined }));
    showToast(`Updated "${draft.name ?? cat.name}"`);
  };

  const startAdding = () => {
    setNewCat({ name: '', icon: '✦' });
    setIsAdding(true);
  };

  const idTaken = (id) => id === 'all' || categories.items.some((c) => c.id === id);

  /** Turns "Gift Hampers" into a free id, resolving collisions as -2, -3, ... */
  const uniqueIdFor = (name) => {
    const base = slugify(name) || 'collection';
    if (!idTaken(base)) return base;
    let n = 2;
    while (idTaken(`${base}-${n}`)) n++;
    return `${base}-${n}`;
  };

  const saveNewCategory = (e) => {
    e.preventDefault();
    const name = newCat.name.trim();
    if (!name) return;
    const id = uniqueIdFor(name);
    categories.add({ id, name, icon: newCat.icon.trim() || '✦', count: 0 });
    showToast(`Added "${name}"`);
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[1.6rem] font-bold tracking-[0.03em] text-white">Categories</h1>
          <p className="mt-1 text-[0.85rem] text-text-secondary">
            {editable.length} collections{categories.isOverridden && ' · locally edited'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {categories.isOverridden && (
            <button
              onClick={categories.reset}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gold-400/25 px-4 py-2.5 text-[0.82rem] text-text-secondary transition-all hover:border-gold-400 hover:text-white"
            >
              <RotateCcw size={14} strokeWidth={2} />
              Reset to scraped data
            </button>
          )}
          <button
            onClick={startAdding}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gold-200 bg-[linear-gradient(135deg,var(--color-gold-400),var(--color-gold-600))] px-4 py-2.5 text-[0.85rem] font-semibold text-[#04140b] transition-all hover:bg-[linear-gradient(135deg,#fff0c4,var(--color-gold-400))]"
          >
            <Plus size={15} strokeWidth={2.5} />
            New collection
          </button>
        </div>
      </div>

      {isAdding && (
        <form
          onSubmit={saveNewCategory}
          className="flex max-w-[720px] flex-col gap-4 rounded-xl border border-gold-400/30 bg-[rgba(8,28,20,0.9)] p-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-[1.1rem] text-white">New collection</h2>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="cursor-pointer border-none bg-transparent text-text-muted hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_80px]">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Display name</label>
              <input
                autoFocus
                required
                value={newCat.name}
                onChange={(e) => setNewCat((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Gift Hampers"
                className={FIELD}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Icon</label>
              <input
                value={newCat.icon}
                onChange={(e) => setNewCat((prev) => ({ ...prev, icon: e.target.value }))}
                className={FIELD}
              />
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex cursor-pointer items-center justify-center gap-2 self-start rounded-lg border border-gold-200 bg-[linear-gradient(135deg,var(--color-gold-400),var(--color-gold-600))] px-5 py-2.5 text-[0.85rem] font-semibold text-[#04140b]"
          >
            <Plus size={15} strokeWidth={2} />
            Add collection
          </button>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {editable.map((cat) => {
          const draft = drafts[cat.id] ?? {};
          const liveCount = products.items.filter((p) => p.category === cat.id).length;
          const dirty = Object.keys(draft).length > 0;

          return (
            <div key={cat.id} className="rounded-xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[1.4rem]">{cat.icon}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[0.72rem] text-text-muted">{cat.id}</span>
                  <button
                    onClick={() => setPendingDelete(cat)}
                    className="flex cursor-pointer items-center rounded-lg border border-white/10 p-1.5 text-text-muted transition-all hover:border-ruby-500 hover:text-ruby-500"
                    title="Delete collection"
                  >
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.75rem] text-gold-300">Display name</label>
                  <input
                    value={draft.name ?? cat.name}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [cat.id]: { ...draft, name: e.target.value } }))
                    }
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[0.88rem] text-white outline-none focus:border-gold-400"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.75rem] text-gold-300">Icon</label>
                  <input
                    value={draft.icon ?? cat.icon}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [cat.id]: { ...draft, icon: e.target.value } }))
                    }
                    className="w-20 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[0.88rem] text-white outline-none focus:border-gold-400"
                  />
                </div>

                <p className="text-[0.78rem] text-text-muted">
                  {liveCount} product{liveCount === 1 ? '' : 's'} currently in this collection
                </p>

                <button
                  onClick={() => save(cat)}
                  disabled={!dirty}
                  className={`mt-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-[0.82rem] font-semibold transition-all ${
                    dirty
                      ? 'cursor-pointer border border-gold-200 bg-[linear-gradient(135deg,var(--color-gold-400),var(--color-gold-600))] text-[#04140b]'
                      : 'cursor-not-allowed border border-white/10 bg-white/5 text-text-muted'
                  }`}
                >
                  <Save size={14} strokeWidth={2} />
                  {dirty ? 'Save changes' : 'No changes'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete collection"
        message={`Remove "${pendingDelete?.name}"? Products already assigned to it keep that category id but it will no longer appear as a filter on the storefront.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          categories.remove(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
