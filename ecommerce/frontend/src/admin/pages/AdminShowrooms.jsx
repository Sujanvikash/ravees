import { useState } from 'react';
import { Save, Star, Plus, Trash2, X } from 'lucide-react';
import { useAdminData } from '../context/AdminDataContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import FormError from '../../components/FormError.jsx';
import FormField from '../../components/FormField.jsx';
import Button from '../../components/Button.jsx';
import IconButton from '../../components/IconButton.jsx';
import Chip from '../../components/Chip.jsx';
import { Input, Textarea } from '../../components/Input.jsx';
import AdminPageHeader from '../components/AdminPageHeader.jsx';
import MoveButtons from '../components/MoveButtons.jsx';
import { cardClass } from '../../components/cardClass.js';
import { ADMIN_CHECK, ADMIN_LABEL } from '../components/adminForm.js';

const INLINE_BTN =
  'inline-flex cursor-pointer items-center gap-1.5 self-start rounded-lg border border-gold-400/25 bg-transparent px-3 py-2 text-[0.8rem] text-gold-300 transition-all hover:border-gold-400 hover:bg-gold-400/10';

/** The editor for one showroom (a city): its details, highlights and the stores in it. */
const ShowroomEditor = ({ showroom, onDelete }) => {
  const { showrooms } = useAdminData();
  const { showToast } = useToast();
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const value = (key) => draft[key] ?? showroom[key] ?? '';
  const set = (key) => (e) => setDraft((prev) => ({ ...prev, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const stores = draft.stores ?? showroom.stores ?? [];
  const setStore = (i, key, text) =>
    setDraft((prev) => ({ ...prev, stores: stores.map((store, k) => (k === i ? { ...store, [key]: text } : store)) }));
  const dirty = Object.keys(draft).length > 0;
  const field = (key) => `sr-${key}`;

  const save = async () => {
    setError('');
    const patch = { ...draft };
    if (patch.features) patch.features = patch.features.map((f) => f.trim()).filter(Boolean);
    if (patch.stores) {
      patch.stores = patch.stores
        .map((store) => ({ name: (store.name ?? '').trim(), address: (store.address ?? '').trim(), phone: (store.phone ?? '').trim() }))
        .filter((store) => store.name || store.address || store.phone);
    }
    if (patch.city !== undefined && !patch.city.trim()) {
      setError('Please keep a city name.');
      return;
    }
    setSaving(true);
    try {
      await showrooms.update(showroom.id, patch);
      setDraft({});
      showToast(`Saved the ${patch.city ?? showroom.city} showroom`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${cardClass('tile')} grid w-full gap-6 p-6 md:p-8 lg:grid-cols-2`}>
      {/* Left column: contact details */}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="City" htmlFor={field('city')} labelClassName={ADMIN_LABEL}>
            <Input id={field('city')} size="sm" value={value('city')} onChange={set('city')} />
          </FormField>
          <FormField label="Title" htmlFor={field('title')} labelClassName={ADMIN_LABEL}>
            <Input id={field('title')} size="sm" value={value('title')} onChange={set('title')} />
          </FormField>
        </div>

        <FormField label="Main store address" htmlFor={field('address')} labelClassName={ADMIN_LABEL}>
          <Textarea id={field('address')} size="sm" rows="3" value={value('address')} onChange={set('address')} />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Phone" htmlFor={field('phone')} labelClassName={ADMIN_LABEL}>
            <Input id={field('phone')} size="sm" value={value('phone')} onChange={set('phone')} />
          </FormField>
          <FormField label="Timing" htmlFor={field('timing')} labelClassName={ADMIN_LABEL}>
            <Input id={field('timing')} size="sm" value={value('timing')} onChange={set('timing')} />
          </FormField>
        </div>

        <FormField label="Google Maps search (for “Get Directions”)" htmlFor={field('mapQuery')} labelClassName={ADMIN_LABEL}>
          <Input id={field('mapQuery')} size="sm" value={value('mapQuery')} onChange={set('mapQuery')} />
        </FormField>

        <FormField label="Showroom" htmlFor={field('isFlagship')} labelClassName={ADMIN_LABEL}>
          <label className={ADMIN_CHECK}>
            <input
              id={field('isFlagship')}
              type="checkbox"
              checked={Boolean(draft.isFlagship ?? showroom.isFlagship)}
              onChange={set('isFlagship')}
              className="h-4 w-4 accent-forest"
            />
            Flagship location
          </label>
        </FormField>
      </div>

      {/* Right column: highlights, stores, actions */}
      <div className="flex min-w-0 flex-col gap-4">
        <FormField label="Store highlights (one per line)" htmlFor={field('features')} labelClassName={ADMIN_LABEL}>
          <Textarea
            id={field('features')}
            size="sm"
            rows="5"
            value={(draft.features ?? showroom.features ?? []).join('\n')}
            onChange={(e) => setDraft((prev) => ({ ...prev, features: e.target.value.split('\n') }))}
          />
        </FormField>

        <FormField label="Stores in this city" htmlFor={field('store-0-name')} labelClassName={ADMIN_LABEL}>
          <div className="flex flex-col gap-3">
            {stores.map((store, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-lg border border-contrast/8 p-3">
                <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                  <Input id={field(`store-${i}-name`)} size="sm" aria-label={`Store ${i + 1}: name`} placeholder="Name (e.g. Egmore)" value={store.name ?? ''} onChange={(e) => setStore(i, 'name', e.target.value)} className="w-full min-w-0" />
                  <Input size="sm" aria-label={`Store ${i + 1}: phone`} placeholder="Phone" value={store.phone ?? ''} onChange={(e) => setStore(i, 'phone', e.target.value)} className="w-full min-w-0" />
                  <IconButton
                    variant="delete"
                    label={`Remove store ${i + 1}`}
                    onClick={() => setDraft((prev) => ({ ...prev, stores: stores.filter((_, k) => k !== i) }))}
                  >
                    <Trash2 size={13} strokeWidth={2} />
                  </IconButton>
                </div>
                <Input size="sm" aria-label={`Store ${i + 1}: address`} placeholder="Address" value={store.address ?? ''} onChange={(e) => setStore(i, 'address', e.target.value)} />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setDraft((prev) => ({ ...prev, stores: [...stores, { name: '', address: '', phone: '' }] }))}
              className={INLINE_BTN}
            >
              <Plus size={14} strokeWidth={2} />
              Add a store
            </button>
          </div>
        </FormField>

        <FormError>{error}</FormError>

        <div className="mt-auto flex flex-wrap gap-3">
          <Button size="sm" onClick={save} disabled={!dirty || saving} className="self-start">
            <Save size={15} strokeWidth={2} />
            {saving ? 'Saving...' : dirty ? 'Save changes' : 'No changes'}
          </Button>
          {dirty && (
            <button
              type="button"
              onClick={() => setDraft({})}
              className="cursor-pointer rounded-lg border border-gold-400/25 bg-transparent px-5 py-2.5 text-[0.85rem] text-text-secondary transition-all hover:border-gold-400 hover:text-text-primary"
            >
              Undo changes
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-contrast/10 bg-transparent px-5 py-2.5 text-[0.85rem] text-text-muted transition-all hover:border-ruby-500 hover:text-ruby-500"
          >
            <Trash2 size={14} strokeWidth={2} />
            Delete location
          </button>
        </div>
      </div>
    </div>
  );
};

/** The showrooms (one per city), in the website's order: pick one to edit it; add, move or delete. */
const AdminShowrooms = () => {
  const { showrooms } = useAdminData();
  const { showToast } = useToast();
  const [activeId, setActiveId] = useState(showrooms.items[0]?.id);
  const [isAdding, setIsAdding] = useState(false);
  const [newCity, setNewCity] = useState('');
  const [addError, setAddError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [moving, setMoving] = useState(false);

  const index = Math.max(0, showrooms.items.findIndex((s) => s.id === activeId));
  const showroom = showrooms.items[index];

  const saveNewLocation = async (e) => {
    e.preventDefault();
    const city = newCity.trim();
    if (!city) {
      setAddError('Please enter the city.');
      return;
    }
    if (showrooms.items.some((s) => s.city.toLowerCase() === city.toLowerCase())) {
      setAddError(`There is already a ${city} location.`);
      return;
    }
    setAddError('');
    try {
      const made = await showrooms.create({
        city,
        isFlagship: false,
        title: `${city} Showroom`,
        address: '',
        phone: '',
        timing: '',
        features: [],
        mapQuery: city,
        stores: [],
      });
      showToast(`Added ${city}: fill in its details below`);
      setActiveId(made?.id);
      setNewCity('');
      setIsAdding(false);
    } catch (err) {
      setAddError(err.message);
    }
  };

  const move = async (dir) => {
    const ids = showrooms.items.map((s) => s.id);
    [ids[index], ids[index + dir]] = [ids[index + dir], ids[index]];
    setMoving(true);
    try {
      await showrooms.reorder(ids);
    } catch (err) {
      showToast(err.message);
    } finally {
      setMoving(false);
    }
  };

  const remove = async () => {
    const room = pendingDelete;
    setPendingDelete(null);
    try {
      await showrooms.remove(room.id);
      showToast(`Deleted the ${room.city} location`);
      setActiveId(showrooms.items.find((s) => s.id !== room.id)?.id);
    } catch (err) {
      showToast(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Showrooms"
        subtitle={`${showrooms.items.length} locations, in the order the website shows them`}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setNewCity('');
              setAddError('');
              setIsAdding(true);
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            New location
          </Button>
        }
      />

      {isAdding && (
        <form onSubmit={saveNewLocation} noValidate className={`${cardClass('form')} flex max-w-[480px] flex-col gap-4 p-6`}>
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-[1.1rem] text-text-primary">New location</h2>
            <IconButton label="Close" onClick={() => setIsAdding(false)}>
              <X size={20} />
            </IconButton>
          </div>

          <FormField label="City" htmlFor="new-city" labelClassName={ADMIN_LABEL}>
            <Input id="new-city" size="sm" autoFocus required value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="e.g. Hyderabad" />
          </FormField>

          <FormError>{addError}</FormError>

          <Button size="sm" type="submit" className="self-start">
            <Plus size={15} strokeWidth={2} />
            Add location
          </Button>
        </form>
      )}

      {showrooms.items.length === 0 ? (
        <p className={`${cardClass('tile')} px-6 py-12 text-center text-text-muted`}>No locations yet.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2.5">
            {showrooms.items.map((room) => (
              <Chip key={room.id} onClick={() => setActiveId(room.id)} active={room.id === showroom.id} className="inline-flex items-center gap-1.5">
                {room.isFlagship && <Star size={12} strokeWidth={2} fill="currentColor" />}
                {room.city}
              </Chip>
            ))}
            <span className="ml-2 flex items-center gap-2 text-[0.75rem] text-text-muted">
              Move {showroom.city}
              <MoveButtons
                label={showroom.city}
                disabled={moving}
                onUp={index > 0 ? () => move(-1) : null}
                onDown={index < showrooms.items.length - 1 ? () => move(1) : null}
              />
            </span>
          </div>

          {/* Keyed by showroom, so switching starts a fresh draft. */}
          <ShowroomEditor key={showroom.id} showroom={showroom} onDelete={() => setPendingDelete(showroom)} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete location"
        message={`Delete the ${pendingDelete?.city} showroom and its stores from the website? This cannot be undone.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={remove}
      />
    </div>
  );
};

export default AdminShowrooms;
