import { useState } from 'react';
import { Plus, Trash2, RotateCcw, Save, X } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import FormField from '../../components/FormField.jsx';
import Button from '../../components/Button.jsx';
import IconButton from '../../components/IconButton.jsx';
import { useAdminData } from '../context/AdminDataContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Input, Textarea } from '../../components/Input.jsx';

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
          <Button size="sm" onClick={() => setEditing({ ...BLANK, __new: true })}>
            <Plus size={15} strokeWidth={2.5} />
            New testimonial
          </Button>
        </div>
      </div>

      {editing && (
        <div className="flex max-w-[720px] flex-col gap-4 rounded-xl border border-gold-400/30 bg-[rgba(8,28,20,0.9)] p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-[1.1rem] text-white">
              {isNew ? 'New testimonial' : `Editing ${editing.__originalAuthor}`}
            </h2>
            <IconButton label="Close" onClick={() => setEditing(null)}>
              <X size={20} />
            </IconButton>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Author" labelClassName={LABEL}>
              <Input
                size="sm"
                value={editing.author}
                onChange={(e) => setEditing((prev) => ({ ...prev, author: e.target.value }))}
              />
            </FormField>
            <FormField label="Location" labelClassName={LABEL}>
              <Input
                size="sm"
                value={editing.location}
                onChange={(e) => setEditing((prev) => ({ ...prev, location: e.target.value }))}
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Product owned" labelClassName={LABEL}>
              <Input
                size="sm"
                value={editing.treeModel}
                onChange={(e) => setEditing((prev) => ({ ...prev, treeModel: e.target.value }))}
              />
            </FormField>
            <FormField label="Rating (1–5)" labelClassName={LABEL}>
              <Input
                size="sm"
                type="number"
                min="1"
                max="5"
                value={editing.rating}
                onChange={(e) => setEditing((prev) => ({ ...prev, rating: e.target.value }))}
              />
            </FormField>
          </div>

          <FormField label="Quote" labelClassName={LABEL}>
            <Textarea
              size="sm"
              rows="4"
              value={editing.quote}
              onChange={(e) => setEditing((prev) => ({ ...prev, quote: e.target.value }))}
            />
          </FormField>

          <Button size="sm" onClick={save} className="self-start">
            <Save size={15} strokeWidth={2} />
            {isNew ? 'Add testimonial' : 'Save changes'}
          </Button>
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
