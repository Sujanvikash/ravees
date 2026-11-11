import { useState } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import FormError from '../../components/FormError.jsx';
import FormField from '../../components/FormField.jsx';
import Button from '../../components/Button.jsx';
import IconButton from '../../components/IconButton.jsx';
import { useAdminData } from '../context/AdminDataContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Input, Textarea } from '../../components/Input.jsx';
import AdminPageHeader from '../components/AdminPageHeader.jsx';
import MoveButtons from '../components/MoveButtons.jsx';
import { cardClass } from '../../components/cardClass.js';
import { ADMIN_LABEL } from '../components/adminForm.js';

const BLANK = { author: '', location: '', quote: '', rating: 5, treeModel: '' };
const text = (value) => String(value ?? '').trim();

/** The testimonials on the website, in its order: add, edit, move and delete. */
const AdminTestimonials = () => {
  const { testimonials } = useAdminData();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(null); // a testimonial (with its id) or a new one (no id)
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [moving, setMoving] = useState(false);

  const isNew = editing && !editing.id;
  const set = (key) => (e) => setEditing((prev) => ({ ...prev, [key]: e.target.value }));

  const open = (testimonial) => {
    setError('');
    setEditing(testimonial);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!text(editing.author) || !text(editing.quote)) {
      setError('Please fill in the author and the quote.');
      return;
    }
    const { id, ...fields } = editing;
    const body = {
      author: text(fields.author),
      location: text(fields.location),
      quote: text(fields.quote),
      treeModel: text(fields.treeModel),
      rating: Math.min(5, Math.max(1, Math.round(Number(fields.rating)) || 5)),
    };
    setSaving(true);
    try {
      if (id) await testimonials.update(id, body);
      else await testimonials.create(body);
      showToast(id ? 'Testimonial saved' : 'Testimonial added');
      setEditing(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const move = async (i, dir) => {
    const ids = testimonials.items.map((t) => t.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    setMoving(true);
    try {
      await testimonials.reorder(ids);
    } catch (err) {
      showToast(err.message);
    } finally {
      setMoving(false);
    }
  };

  const remove = async () => {
    const t = pendingDelete;
    setPendingDelete(null);
    try {
      await testimonials.remove(t.id);
      showToast(`Deleted the testimonial from ${t.author}`);
      if (editing?.id === t.id) setEditing(null);
    } catch (err) {
      showToast(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Testimonials"
        subtitle={`${testimonials.items.length} on the website, in this order`}
        actions={
          <Button size="sm" onClick={() => open({ ...BLANK })}>
            <Plus size={15} strokeWidth={2.5} />
            New testimonial
          </Button>
        }
      />

      {editing && (
        <form onSubmit={save} noValidate className={`${cardClass('form')} flex max-w-[720px] flex-col gap-4 p-6`}>
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-[1.1rem] text-text-primary">{isNew ? 'New testimonial' : `Editing ${editing.author}`}</h2>
            <IconButton label="Close" onClick={() => setEditing(null)}>
              <X size={20} />
            </IconButton>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Author" htmlFor="t-author" labelClassName={ADMIN_LABEL}>
              <Input id="t-author" size="sm" value={editing.author ?? ''} onChange={set('author')} />
            </FormField>
            <FormField label="Location" htmlFor="t-location" labelClassName={ADMIN_LABEL}>
              <Input id="t-location" size="sm" value={editing.location ?? ''} onChange={set('location')} />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Product owned" htmlFor="t-tree" labelClassName={ADMIN_LABEL}>
              <Input id="t-tree" size="sm" value={editing.treeModel ?? ''} onChange={set('treeModel')} />
            </FormField>
            <FormField label="Rating (1–5)" htmlFor="t-rating" labelClassName={ADMIN_LABEL}>
              <Input id="t-rating" size="sm" type="number" min="1" max="5" value={editing.rating ?? 5} onChange={set('rating')} />
            </FormField>
          </div>

          <FormField label="Quote" htmlFor="t-quote" labelClassName={ADMIN_LABEL}>
            <Textarea id="t-quote" size="sm" rows="4" value={editing.quote ?? ''} onChange={set('quote')} />
          </FormField>

          <FormError>{error}</FormError>

          <Button size="sm" type="submit" disabled={saving} className="self-start">
            <Save size={15} strokeWidth={2} />
            {saving ? 'Saving...' : isNew ? 'Add testimonial' : 'Save changes'}
          </Button>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {testimonials.items.map((t, i) => (
          <div key={t.id} className={`${cardClass('tile')} flex flex-col p-5`}>
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.92rem] font-semibold text-gold-300">{t.author}</p>
                <span className="text-[0.75rem] text-text-muted">
                  {t.location} · {t.rating}★
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <MoveButtons
                  label={`the testimonial from ${t.author}`}
                  disabled={moving}
                  onUp={i > 0 ? () => move(i, -1) : null}
                  onDown={i < testimonials.items.length - 1 ? () => move(i, 1) : null}
                />
                <button
                  type="button"
                  onClick={() => open({ ...BLANK, ...t })}
                  className="cursor-pointer rounded-lg border border-gold-400/20 px-2.5 py-1.5 text-[0.75rem] text-gold-300 transition-all hover:border-gold-400 hover:bg-gold-400/15"
                >
                  Edit
                </button>
                <IconButton variant="delete" label={`Delete the testimonial from ${t.author}`} onClick={() => setPendingDelete(t)}>
                  <Trash2 size={13} strokeWidth={2} />
                </IconButton>
              </div>
            </div>
            <p className="font-quote text-[0.88rem] italic leading-[1.65] text-text-secondary">&ldquo;{t.quote}&rdquo;</p>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete testimonial"
        message={`Delete the testimonial from ${pendingDelete?.author}?`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={remove}
      />
    </div>
  );
};

export default AdminTestimonials;
