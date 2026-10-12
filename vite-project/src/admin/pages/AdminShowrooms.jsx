import { useState } from 'react';
import { Save, Star, Plus, Trash2, X } from 'lucide-react';
import { useAdminData } from '../context/AdminDataContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import FormField from '../../components/FormField.jsx';
import Button from '../../components/Button.jsx';
import IconButton from '../../components/IconButton.jsx';
import Chip from '../../components/Chip.jsx';
import { Input, Textarea } from '../../components/Input.jsx';
import AdminPageHeader from '../components/AdminPageHeader.jsx';
import { cardClass } from '../../components/cardClass.js';

const LABEL = 'text-[0.75rem] text-gold-300';

const AdminShowrooms = () => {
  const { showrooms } = useAdminData();
  const { showToast } = useToast();
  const [activeCity, setActiveCity] = useState(showrooms.items[0]?.city);
  const [draft, setDraft] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [newCity, setNewCity] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  const showroom = showrooms.items.find((s) => s.city === activeCity) ?? showrooms.items[0];
  const value = (key) => draft[key] ?? showroom?.[key] ?? '';
  const dirty = Object.keys(draft).length > 0;

  const save = () => {
    showrooms.update(showroom.city, draft);
    setDraft({});
    showToast(`Updated ${showroom.city} showroom`);
  };

  const cityTaken = (city) => showrooms.items.some((s) => s.city.toLowerCase() === city.toLowerCase());

  const saveNewLocation = (e) => {
    e.preventDefault();
    const city = newCity.trim();
    if (!city || cityTaken(city)) {
      if (cityTaken(city)) showToast(`A "${city}" location already exists`);
      return;
    }
    showrooms.add({
      city,
      isFlagship: false,
      title: `${city} Showroom`,
      address: '',
      phone: '',
      timing: '',
      features: [],
      mapQuery: city,
    });
    showToast(`Added ${city} location — fill in its details below`);
    setActiveCity(city);
    setDraft({});
    setNewCity('');
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Showrooms"
        subtitle={<>{showrooms.items.length} locations{showrooms.isOverridden && ' · locally edited'}</>}
        onReset={showrooms.isOverridden ? showrooms.reset : undefined}
        resetLabel="Reset to original"
        actions={
          <Button
            size="sm"
            onClick={() => {
              setNewCity('');
              setIsAdding(true);
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            New location
          </Button>
        }
      />

      {isAdding && (
        <form
          onSubmit={saveNewLocation}
          className={`${cardClass('form')} flex max-w-[480px] flex-col gap-4 p-6`}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-[1.1rem] text-white">New location</h2>
            <IconButton label="Close" onClick={() => setIsAdding(false)}>
              <X size={20} />
            </IconButton>
          </div>

          <FormField label="City" labelClassName={LABEL}>
            <Input
              size="sm"
              autoFocus
              required
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder="e.g. Hyderabad"
            />
          </FormField>

          <Button size="sm" type="submit" className="self-start">
            <Plus size={15} strokeWidth={2} />
            Add location
          </Button>
        </form>
      )}

      <div className="flex flex-wrap gap-2.5">
        {showrooms.items.map((room) => (
          <Chip
            key={room.city}
            onClick={() => {
              setActiveCity(room.city);
              setDraft({});
            }}
            active={room.city === activeCity}
            className="inline-flex items-center gap-1.5"
          >
            {room.isFlagship && <Star size={12} strokeWidth={2} fill="currentColor" />}
            {room.city}
          </Chip>
        ))}
      </div>

      <div className={`${cardClass('tile')} grid w-full gap-6 p-6 md:p-8 lg:grid-cols-2`}>
        {/* Left column: contact details */}
        <div className="flex min-w-0 flex-col gap-4">
          <FormField label="Title" labelClassName={LABEL}>
            <Input
              size="sm"
              value={value('title')}
              onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
            />
          </FormField>

          <FormField label="Address" labelClassName={LABEL}>
            <Textarea
              size="sm"
              rows="3"
              value={value('address')}
              onChange={(e) => setDraft((prev) => ({ ...prev, address: e.target.value }))}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Phone" labelClassName={LABEL}>
              <Input
                size="sm"
                value={value('phone')}
                onChange={(e) => setDraft((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </FormField>
            <FormField label="Timing" labelClassName={LABEL}>
              <Input
                size="sm"
                value={value('timing')}
                onChange={(e) => setDraft((prev) => ({ ...prev, timing: e.target.value }))}
              />
            </FormField>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-[0.85rem] text-text-secondary">
            <input
              type="checkbox"
              checked={draft.isFlagship ?? showroom.isFlagship}
              onChange={(e) => setDraft((prev) => ({ ...prev, isFlagship: e.target.checked }))}
              className="h-4 w-4 accent-gold-500"
            />
            Flagship location
          </label>
        </div>

        {/* Right column: highlights + actions */}
        <div className="flex min-w-0 flex-col gap-4">
          <FormField label="Store highlights (one per line)" labelClassName={LABEL} className="flex-1">
            <Textarea
              size="sm"
              rows="8"
              value={(draft.features ?? showroom.features).join('\n')}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, features: e.target.value.split('\n') }))
              }
              className="min-h-[160px] flex-1"
            />
          </FormField>

          <div className="flex gap-3">
            <Button size="sm" onClick={save} disabled={!dirty} className="self-start">
              <Save size={15} strokeWidth={2} />
              {dirty ? 'Save changes' : 'No changes'}
            </Button>
            {showrooms.items.length > 1 && (
              <button
                onClick={() => setPendingDelete(showroom)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-transparent px-5 py-2.5 text-[0.85rem] text-text-muted transition-all hover:border-ruby-500 hover:text-ruby-500"
              >
                <Trash2 size={14} strokeWidth={2} />
                Delete location
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete location"
        message={`Remove the ${pendingDelete?.city} showroom? This cannot be undone.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          showrooms.remove(pendingDelete.city);
          const remaining = showrooms.items.filter((s) => s.city !== pendingDelete.city);
          setActiveCity(remaining[0]?.city);
          setDraft({});
          setPendingDelete(null);
        }}
      />
    </div>
  );
};

export default AdminShowrooms;
