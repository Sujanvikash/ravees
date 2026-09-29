import { useState } from 'react';
import { Plus, Trash2, RotateCcw, Save, X } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useAdminData } from '../context/AdminDataContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const FIELD =
  'rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[0.85rem] text-white outline-none transition-all focus:border-gold-400 placeholder:text-text-muted';
const LABEL = 'text-[0.75rem] text-gold-300';

const BLANK = { author: '', location: '', quote: '', rating: 5, treeModel: '' };

export default function AdminTestimonials() {
  const { testimonials } = useAdminData();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const isNew = editing?.__new;

  const save = () => {
    if (!editing.author.trim()) return;
    if (isNew) {
      const record = { ...editing };
      delete record.__new;
      testimonials.add({ ...record, rating: Number(record.rating) || 5 });
      showToast('Testimonial added');
    } else {
      testimonials.update(editing.__originalAuthor, {
        ...editing,
        rating: Number(editing.rating) || 5,
      });
      showToast('Testimonial updated');
    }
    setEditing(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[1.6rem] font-bold tracking-[0.03em] text-white">Testimonials</h1>
          <p className="mt-1 text-[0.85rem] text-text-secondary">
            {testimonials.items.length} published{testimonials.isOverridden && ' · locally edited'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {testimonials.isOverridden && (
            <button
              onClick={testimonials.reset}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gold-400/25 px-4 py-2.5 text-[0.82rem] text-text-secondary transition-all hover:border-gold-400 hover:text-white"
            >
              <RotateCcw size={14} strokeWidth={2} />
              Reset
            </button>
          )}
          <button
            onClick={() => setEditing({ ...BLANK, __new: true })}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gold-200 bg-[linear-gradient(135deg,var(--color-gold-400),var(--color-gold-600))] px-4 py-2.5 text-[0.85rem] font-semibold text-[#04140b] transition-all hover:bg-[linear-gradient(135deg,#fff0c4,var(--color-gold-400))]"
          >
            <Plus size={15} strokeWidth={2.5} />
            New testimonial
          </button>
        </div>
      </div>

      {editing && (
        <div className="flex max-w-[720px] flex-col gap-4 rounded-xl border border-gold-400/30 bg-[rgba(8,28,20,0.9)] p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-[1.1rem] text-white">
              {isNew ? 'New testimonial' : `Editing ${editing.__originalAuthor}`}
            </h2>
            <button
              onClick={() => setEditing(null)}
              className="cursor-pointer border-none bg-transparent text-text-muted hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Author</label>
              <input
                value={editing.author}
                onChange={(e) => setEditing((prev) => ({ ...prev, author: e.target.value }))}
                className={FIELD}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Location</label>
              <input
                value={editing.location}
                onChange={(e) => setEditing((prev) => ({ ...prev, location: e.target.value }))}
                className={FIELD}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Product owned</label>
              <input
                value={editing.treeModel}
                onChange={(e) => setEditing((prev) => ({ ...prev, treeModel: e.target.value }))}
                className={FIELD}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Rating (1–5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={editing.rating}
                onChange={(e) => setEditing((prev) => ({ ...prev, rating: e.target.value }))}
                className={FIELD}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Quote</label>
            <textarea
              rows="4"
              value={editing.quote}
              onChange={(e) => setEditing((prev) => ({ ...prev, quote: e.target.value }))}
              className={`${FIELD} resize-y`}
            />
          </div>

          <button
            onClick={save}
            className="inline-flex cursor-pointer items-center justify-center gap-2 self-start rounded-lg border border-gold-200 bg-[linear-gradient(135deg,var(--color-gold-400),var(--color-gold-600))] px-5 py-2.5 text-[0.85rem] font-semibold text-[#04140b]"
          >
            <Save size={15} strokeWidth={2} />
            {isNew ? 'Add testimonial' : 'Save changes'}
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {testimonials.items.map((t) => (
          <div key={t.author} className="flex flex-col rounded-xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] p-5">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.92rem] font-semibold text-gold-300">{t.author}</p>
                <span className="text-[0.75rem] text-text-muted">
                  {t.location} · {t.rating}★
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setEditing({ ...t, __originalAuthor: t.author })}
                  className="cursor-pointer rounded-lg border border-gold-400/20 px-2.5 py-1.5 text-[0.75rem] text-gold-300 transition-all hover:border-gold-400 hover:bg-gold-400/15"
                >
                  Edit
                </button>
                <button
                  onClick={() => setPendingDelete(t)}
                  className="flex cursor-pointer items-center rounded-lg border border-white/10 px-2 py-1.5 text-text-muted transition-all hover:border-ruby-500 hover:text-ruby-500"
                >
                  <Trash2 size={13} strokeWidth={2} />
                </button>
              </div>
            </div>
            <p className="font-quote text-[0.88rem] italic leading-[1.65] text-text-secondary">
              &ldquo;{t.quote}&rdquo;
            </p>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete testimonial"
        message={`Remove the testimonial from ${pendingDelete?.author}?`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          testimonials.remove(pendingDelete.author);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
