import { useRef, useState } from 'react';
import { Save, Plus, Trash2, X, ImagePlus, LoaderCircle } from 'lucide-react';
import { useAdminData } from '../context/AdminDataContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import FormError from '../../components/FormError.jsx';
import FormField from '../../components/FormField.jsx';
import Button from '../../components/Button.jsx';
import IconButton from '../../components/IconButton.jsx';
import { Input } from '../../components/Input.jsx';
import AdminPageHeader from '../components/AdminPageHeader.jsx';
import MoveButtons from '../components/MoveButtons.jsx';
import { usePhotoUploads } from '../components/usePhotoUploads.js';
import { cardClass } from '../../components/cardClass.js';
import { ADMIN_CHECK, ADMIN_LABEL } from '../components/adminForm.js';

/** One collection's card: its photo, icon, name and visibility, saved together; its place and delete. */
const CategoryCard = ({ cat, productCount, shownCount, onUp, onDown, moving, onDelete }) => {
  const { categories } = useAdminData();
  const { showToast } = useToast();
  const fileRef = useRef(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const photo = usePhotoUploads(cat.imageId ? [{ id: cat.imageId, url: cat.image }] : [], { single: true });

  const current = photo.photos[0];
  const imageId = current?.status === 'done' ? current.id : null;
  const photoChanged = !photo.busy && imageId !== (cat.imageId ?? null);
  const dirty = Object.keys(draft).length > 0 || photoChanged;
  const value = (key) => draft[key] ?? cat[key];

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      await categories.update(cat.id, { ...draft, ...(photoChanged ? { imageId } : {}) });
      setDraft({});
      showToast(`Saved "${draft.name ?? cat.name}"`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${cardClass('tile')} flex flex-col gap-4 p-5`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-[1.4rem]">{value('icon')}</span>
          <span className="font-mono text-[0.72rem] text-text-muted">{cat.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <MoveButtons label={cat.name} onUp={onUp} onDown={onDown} disabled={moving} />
          <IconButton variant="delete" label={`Delete ${cat.name}`} onClick={onDelete}>
            <Trash2 size={13} strokeWidth={2} />
          </IconButton>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[112px_1fr]">
        {/* The photo on the shop's category circles; without one, the first product's photo is used. */}
        <FormField label="Photo" htmlFor={`cat-${cat.id}-photo`} labelClassName={ADMIN_LABEL}>
          <div className="relative aspect-square w-28 overflow-hidden rounded-full border border-gold-400/25 bg-bg-deepest">
            {current?.url ? (
              <img src={current.url} alt="" className={`size-full object-cover ${current.status === 'done' ? '' : 'opacity-40'}`} />
            ) : (
              <span className="flex size-full items-center justify-center px-3 text-center text-[0.66rem] leading-snug text-text-muted">
                Shows its first product&apos;s photo
              </span>
            )}
            {current?.status === 'uploading' && (
              <LoaderCircle size={22} strokeWidth={2} className="absolute inset-0 m-auto animate-spin text-gold-300" />
            )}
          </div>
          <div className="flex gap-1.5">
            <button
              id={`cat-${cat.id}-photo`}
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-gold-400/25 bg-transparent px-2 py-1 text-[0.72rem] text-gold-300 hover:border-gold-400"
            >
              <ImagePlus size={12} strokeWidth={2} />
              {current ? 'Replace' : 'Upload'}
            </button>
            {current && (
              <IconButton variant="delete" label="Remove photo" onClick={() => photo.remove(current.key)} className="p-1!">
                <X size={12} strokeWidth={2} />
              </IconButton>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              photo.addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </FormField>

        <div className="flex flex-col gap-3">
          <FormField label="Display name" htmlFor={`cat-${cat.id}-name`} labelClassName={ADMIN_LABEL}>
            <Input
              id={`cat-${cat.id}-name`}
              size="sm"
              value={value('name')}
              onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
            />
          </FormField>
          <div className="grid grid-cols-[64px_96px_1fr] items-end gap-3">
            <FormField label="Icon" htmlFor={`cat-${cat.id}-icon`} labelClassName={ADMIN_LABEL}>
              <Input
                id={`cat-${cat.id}-icon`}
                size="sm"
                value={value('icon')}
                onChange={(e) => setDraft((prev) => ({ ...prev, icon: e.target.value }))}
              />
            </FormField>
            {/* The HSN code its products' invoice lines print (lights 9405; empty prints 9505, festive articles). */}
            <FormField label="HSN" htmlFor={`cat-${cat.id}-hsn`} labelClassName={ADMIN_LABEL}>
              <Input
                id={`cat-${cat.id}-hsn`}
                size="sm"
                inputMode="numeric"
                placeholder="9505"
                value={value('hsn') ?? ''}
                onChange={(e) => setDraft((prev) => ({ ...prev, hsn: e.target.value.trim() }))}
              />
            </FormField>
            <FormField label="On the website" htmlFor={`cat-${cat.id}-visible`} labelClassName={ADMIN_LABEL}>
              <label className={`${ADMIN_CHECK} py-2`}>
                <input
                  id={`cat-${cat.id}-visible`}
                  type="checkbox"
                  checked={value('visible')}
                  onChange={(e) => setDraft((prev) => ({ ...prev, visible: e.target.checked }))}
                  className="h-4 w-4 accent-forest"
                />
                Visible
              </label>
            </FormField>
          </div>
        </div>
      </div>

      {current?.status === 'error' && <FormError>{current.error}</FormError>}
      <FormError>{error}</FormError>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.78rem] text-text-muted">
          {productCount} product{productCount === 1 ? '' : 's'} in this collection ({shownCount} of at most 10 shown)
        </p>
        <Button size="sm" onClick={save} disabled={!dirty || saving || photo.busy}>
          <Save size={14} strokeWidth={2} />
          {saving ? 'Saving...' : dirty ? 'Save changes' : 'No changes'}
        </Button>
      </div>
    </div>
  );
};

const AdminCategories = () => {
  const { categories, products } = useAdminData();
  const { showToast } = useToast();
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', icon: '✦' });
  const [addError, setAddError] = useState('');
  const [moving, setMoving] = useState(false);

  const saveNewCategory = async (e) => {
    e.preventDefault();
    const name = newCat.name.trim();
    if (!name) {
      setAddError('Please give the collection a name.');
      return;
    }
    setAddError('');
    try {
      await categories.create({ name, icon: newCat.icon.trim() || '✦', imageId: null, visible: true });
      showToast(`Added "${name}"`);
      setIsAdding(false);
    } catch (err) {
      setAddError(err.message);
    }
  };

  const move = async (i, dir) => {
    const ids = categories.items.map((c) => c.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    setMoving(true);
    try {
      await categories.reorder(ids);
    } catch (err) {
      showToast(err.message);
    } finally {
      setMoving(false);
    }
  };

  // The server refuses (409) while the collection still has products; its message says so.
  const remove = async () => {
    const cat = pendingDelete;
    setPendingDelete(null);
    try {
      await categories.remove(cat.id);
      showToast(`Deleted "${cat.name}"`);
    } catch (err) {
      showToast(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Categories"
        subtitle={`${categories.items.length} collections, in the order the website shows them`}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setNewCat({ name: '', icon: '✦' });
              setAddError('');
              setIsAdding(true);
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            New collection
          </Button>
        }
      />

      {isAdding && (
        <form onSubmit={saveNewCategory} noValidate className={`${cardClass('form')} flex max-w-[720px] flex-col gap-4 p-6`}>
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-[1.1rem] text-text-primary">New collection</h2>
            <IconButton label="Close" onClick={() => setIsAdding(false)}>
              <X size={20} />
            </IconButton>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_80px]">
            <FormField label="Display name" htmlFor="new-cat-name" labelClassName={ADMIN_LABEL}>
              <Input
                id="new-cat-name"
                size="sm"
                autoFocus
                required
                value={newCat.name}
                onChange={(e) => setNewCat((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Gift Hampers"
              />
            </FormField>
            <FormField label="Icon" htmlFor="new-cat-icon" labelClassName={ADMIN_LABEL}>
              <Input
                id="new-cat-icon"
                size="sm"
                value={newCat.icon}
                onChange={(e) => setNewCat((prev) => ({ ...prev, icon: e.target.value }))}
              />
            </FormField>
          </div>
          <p className="text-[0.75rem] text-text-muted">Add its photo on the collection&apos;s card once it is created.</p>

          <FormError>{addError}</FormError>

          <Button size="sm" type="submit" className="self-start">
            <Plus size={15} strokeWidth={2} />
            Add collection
          </Button>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {categories.items.map((cat, i) => (
          <CategoryCard
            key={cat.id}
            cat={cat}
            productCount={products.items.filter((p) => p.category === cat.id).length}
            shownCount={products.items.filter((p) => p.category === cat.id && p.visible).length}
            moving={moving}
            onUp={i > 0 ? () => move(i, -1) : null}
            onDown={i < categories.items.length - 1 ? () => move(i, 1) : null}
            onDelete={() => setPendingDelete(cat)}
          />
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete collection"
        message={`Delete "${pendingDelete?.name}"? A collection can only go once it has no products: move or delete them first.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={remove}
      />
    </div>
  );
};

export default AdminCategories;
