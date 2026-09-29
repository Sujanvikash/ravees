import { useState } from 'react';
import { Save, RotateCcw, Star, Plus, Trash2, X } from 'lucide-react';
import { useAdminData } from '../context/AdminDataContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

const FIELD =
  'rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[0.85rem] text-white outline-none transition-all focus:border-gold-400';
const LABEL = 'text-[0.75rem] text-gold-300';

export default function AdminShowrooms() {
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[1.6rem] font-bold tracking-[0.03em] text-white">Showrooms</h1>
          <p className="mt-1 text-[0.85rem] text-text-secondary">
            {showrooms.items.length} locations{showrooms.isOverridden && ' · locally edited'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {showrooms.isOverridden && (
            <button
              onClick={showrooms.reset}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gold-400/25 px-4 py-2.5 text-[0.82rem] text-text-secondary transition-all hover:border-gold-400 hover:text-white"
            >
              <RotateCcw size={14} strokeWidth={2} />
              Reset to original
            </button>
          )}
          <button
            onClick={() => {
              setNewCity('');
              setIsAdding(true);
            }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gold-200 bg-[linear-gradient(135deg,var(--color-gold-400),var(--color-gold-600))] px-4 py-2.5 text-[0.85rem] font-semibold text-[#04140b] transition-all hover:bg-[linear-gradient(135deg,#fff0c4,var(--color-gold-400))]"
          >
            <Plus size={15} strokeWidth={2.5} />
            New location
          </button>
        </div>
      </div>

      {isAdding && (
        <form
          onSubmit={saveNewLocation}
          className="flex max-w-[480px] flex-col gap-4 rounded-xl border border-gold-400/30 bg-[rgba(8,28,20,0.9)] p-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-[1.1rem] text-white">New location</h2>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="cursor-pointer border-none bg-transparent text-text-muted hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>City</label>
            <input
              autoFocus
              required
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder="e.g. Hyderabad"
              className={FIELD}
            />
          </div>

          <button
            type="submit"
            className="inline-flex cursor-pointer items-center justify-center gap-2 self-start rounded-lg border border-gold-200 bg-[linear-gradient(135deg,var(--color-gold-400),var(--color-gold-600))] px-5 py-2.5 text-[0.85rem] font-semibold text-[#04140b]"
          >
            <Plus size={15} strokeWidth={2} />
            Add location
          </button>
        </form>
      )}

      <div className="flex flex-wrap gap-2.5">
        {showrooms.items.map((room) => (
          <button
            key={room.city}
            onClick={() => {
              setActiveCity(room.city);
              setDraft({});
            }}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-[0.85rem] transition-all ${
              room.city === activeCity
                ? 'border-gold-300 bg-gold-500 font-semibold text-[#04120a]'
                : 'border-gold-400/15 bg-[rgba(8,28,20,0.85)] text-text-secondary hover:border-gold-400 hover:text-white'
            }`}
          >
            {room.isFlagship && <Star size={12} strokeWidth={2} fill="currentColor" />}
            {room.city}
          </button>
        ))}
      </div>

      <div className="grid w-full gap-6 rounded-xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] p-6 md:p-8 lg:grid-cols-2">
        {/* Left column: contact details */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Title</label>
            <input
              value={value('title')}
              onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
              className={FIELD}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Address</label>
            <textarea
              rows="3"
              value={value('address')}
              onChange={(e) => setDraft((prev) => ({ ...prev, address: e.target.value }))}
              className={`${FIELD} resize-y`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Phone</label>
              <input
                value={value('phone')}
                onChange={(e) => setDraft((prev) => ({ ...prev, phone: e.target.value }))}
                className={FIELD}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Timing</label>
              <input
                value={value('timing')}
                onChange={(e) => setDraft((prev) => ({ ...prev, timing: e.target.value }))}
                className={FIELD}
              />
            </div>
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
          <div className="flex flex-1 flex-col gap-1.5">
            <label className={LABEL}>Store highlights (one per line)</label>
            <textarea
              rows="8"
              value={(draft.features ?? showroom.features).join('\n')}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, features: e.target.value.split('\n') }))
              }
              className={`${FIELD} min-h-[160px] flex-1 resize-y`}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={!dirty}
              className={`inline-flex items-center justify-center gap-2 self-start rounded-lg px-5 py-2.5 text-[0.85rem] font-semibold transition-all ${
                dirty
                  ? 'cursor-pointer border border-gold-200 bg-[linear-gradient(135deg,var(--color-gold-400),var(--color-gold-600))] text-[#04140b]'
                  : 'cursor-not-allowed border border-white/10 bg-white/5 text-text-muted'
              }`}
            >
              <Save size={15} strokeWidth={2} />
              {dirty ? 'Save changes' : 'No changes'}
            </button>
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
}
