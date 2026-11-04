import { useEffect, useEffectEvent, useState } from 'react';
import { Eye, EyeOff, KeyRound, LockKeyhole, Plus, RotateCcw, ShieldCheck, Store, Trash2, Undo2 } from 'lucide-react';
import Dialog from '../components/Dialog.jsx';
import { Landmark } from '../components/Landmarks.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { loadLocations } from '../config.js';
import { api } from '../lib/api.js';
import { MIN_PASSWORD } from '../lib/auth.js';

const when = (iso) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const field =
  'h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink placeholder:text-ink-3 focus:border-evergreen-800/50 focus:shadow-[0_0_0_3px_rgba(23,92,38,0.10)] focus:outline-none';

const PasswordField = ({ id, label, value, onChange, show, onToggle, invalid, autoFocus }) => (
  <>
    <label htmlFor={id} className="mt-4 mb-2 block text-[13px] font-medium text-ink-2 first:mt-0">
      {label}
    </label>
    <div className={`flex h-11 items-center gap-2 rounded-xl border px-3 transition-shadow ${invalid ? 'border-ruby' : 'border-line focus-within:border-evergreen-800/50 focus-within:shadow-[0_0_0_3px_rgba(23,92,38,0.10)]'}`}>
      <LockKeyhole size={15} className="text-ink-3" aria-hidden="true" />
      <input id={id} type={show ? 'text' : 'password'} autoComplete="new-password" autoFocus={autoFocus} required value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid ? true : undefined} className="min-w-0 flex-1 bg-transparent text-sm" />
      {onToggle && (
        <button type="button" onClick={onToggle} aria-label={show ? 'Hide password' : 'Show password'} className="inline-flex size-7 items-center justify-center rounded-md text-ink-3 hover:bg-mist hover:text-ink">
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      )}
    </div>
  </>
);

/** New password for one login, typed twice. */
const SetPasswordDialog = ({ account, onClose, onSave }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
    if (password !== confirm) return setError('The two passwords do not match.');
    try {
      await onSave(password);
    } catch (err) {
      setError(err.message);
    }
  };
  const edit = (set) => (v) => {
    set(v);
    setError('');
  };
  return (
    <Dialog id="set-password" title={`New password for ${account.label}`} subtitle={`Login: ${account.username}`} onClose={onClose} size="max-w-sm">
      <form onSubmit={submit} className="px-6 pb-6">
        <PasswordField id="new-password" label="New password" value={password} onChange={edit(setPassword)} show={show} onToggle={() => setShow((v) => !v)} invalid={!!error} autoFocus />
        <PasswordField id="confirm-password" label="Type it again" value={confirm} onChange={edit(setConfirm)} show={show} invalid={!!error} />
        {error && <p role="alert" className="mt-1.5 animate-pop text-xs font-medium text-ruby-ink">{error}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="inline-flex h-10 items-center justify-center rounded-xl border border-line text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink">
            Cancel
          </button>
          <button type="submit" className="inline-flex h-10 items-center justify-center rounded-xl bg-evergreen-800 text-[13px] font-semibold text-white hover:bg-evergreen-900">
            Save password
          </button>
        </div>
      </form>
    </Dialog>
  );
};

/** Add a store: city, area and a unique prefix. The prefix becomes the store's login and bill code, so two
 *  stores in one city (Egmore, ECR) each get their own, e.g. EGM and ECR. */
const AddStoreDialog = ({ onClose, onCreate }) => {
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [prefix, setPrefix] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const p = prefix.trim().toUpperCase();
  const submit = async (e) => {
    e.preventDefault();
    if (!city.trim() || !area.trim()) return setError('Enter the city and the area.');
    if (!/^[A-Z]{2,8}$/.test(p)) return setError('The prefix must be 2–8 letters, e.g. EGM or ECR.');
    setBusy(true);
    try {
      await onCreate({ city: city.trim(), area: area.trim(), prefix: p });
    } catch (err) {
      setBusy(false);
      setError(err.message);
    }
  };
  return (
    <Dialog id="add-store" title="Add a store" subtitle="A new showroom, with its own login and bill numbers" onClose={onClose} size="max-w-md">
      <form onSubmit={submit} className="flex flex-col gap-3 px-6 pb-6">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-2">
          City
          <input value={city} onChange={(e) => { setCity(e.target.value); setError(''); }} placeholder="e.g. Chennai" autoFocus className={field} />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-2">
          Area
          <input value={area} onChange={(e) => { setArea(e.target.value); setError(''); }} placeholder="e.g. ECR" className={field} />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-2">
          Bill prefix <span className="font-normal text-ink-3">— 2–8 letters, unique</span>
          <input value={prefix} onChange={(e) => { setPrefix(e.target.value.toUpperCase().replace(/[^A-Za-z]/g, '').slice(0, 8)); setError(''); }} placeholder="e.g. ECR" className={`${field} font-mono tracking-wider uppercase`} />
        </label>
        <p className="rounded-xl bg-mist-2 px-3 py-2 text-xs text-ink-3">
          Bills will read <span className="font-mono font-medium text-ink-2">{p || 'ECR'}262700001</span>. The login is{' '}
          <span className="font-mono font-medium text-ink-2">{(p || 'ECR').toLowerCase()}</span> with the password{' '}
          <span className="font-mono font-medium text-ink-2">{(p || 'ECR').toLowerCase()}@2026</span> — change it after.
        </p>
        {error && <p role="alert" className="animate-pop text-xs font-medium text-ruby-ink">{error}</p>}
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="inline-flex h-10 items-center justify-center rounded-xl border border-line text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-evergreen-800 text-[13px] font-semibold text-white hover:bg-evergreen-900 disabled:opacity-60">
            <Plus size={15} aria-hidden="true" /> Add store
          </button>
        </div>
      </form>
    </Dialog>
  );
};

/** One store card: its landmark, name, login and password state, with reset-password and remove. */
const StoreCard = ({ store, changedAt, confirming, onConfirm, onCancelConfirm, onReset, onRemove }) => (
  <div className="flex flex-col gap-3 rounded-2xl border glass p-4">
    <div className="flex items-start gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-evergreen-50 text-evergreen-800">
        <Landmark id={store.id} className="h-7 w-auto" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">{store.city}</div>
        <div className="truncate text-[12px] text-ink-3">{store.area}</div>
      </div>
      <span className="rounded-md bg-mist px-1.5 py-0.5 font-mono text-[11px] font-semibold text-ink-2">{store.billPrefix}</span>
    </div>
    <div className="flex items-center justify-between gap-2 text-[12px]">
      <span className="font-mono text-ink-3">{store.id}</span>
      {changedAt ? (
        <span className="text-ink-2" title={`Changed ${when(changedAt)}`}>Password set</span>
      ) : (
        <span className="rounded-full bg-warn-50 px-2 py-0.5 text-[11px] font-medium text-warn-ink">Default password</span>
      )}
    </div>
    <div className="mt-auto flex items-center gap-1.5 border-t border-line-soft pt-3">
      <button type="button" onClick={onReset} className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink">
        <KeyRound size={14} aria-hidden="true" /> Password
      </button>
      {confirming ? (
        <>
          <button type="button" onClick={onCancelConfirm} className="inline-flex h-8 items-center rounded-lg px-2.5 text-[13px] font-medium text-ink-2 hover:bg-mist">
            Keep
          </button>
          <button type="button" onClick={onRemove} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ruby-ink px-2.5 text-[13px] font-semibold text-white hover:opacity-90">
            <Trash2 size={14} aria-hidden="true" /> Remove?
          </button>
        </>
      ) : (
        <button type="button" onClick={onConfirm} aria-label={`Remove ${store.city} ${store.area}`} title="Remove this store" className="inline-flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-ruby-50 hover:text-ruby-ink">
          <Trash2 size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  </div>
);

/**
 * Admin only: the stores. Add a store (it gets its own login and bill prefix) and remove one — a store with
 * sales or stock is kept (deactivated, its history intact) and can be brought back; an empty one is deleted
 * outright. Each login's password can be reset here; showroom logins can't change their own.
 */
const Stores = ({ onMenu }) => {
  const [stores, setStores] = useState([]); // from /locations, active and removed
  const [changed, setChanged] = useState({}); // { username: passwordChangedAt }
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null); // the login whose password is being set
  const [confirming, setConfirming] = useState(null); // store id whose Remove was pressed once
  const [adding, setAdding] = useState(false);

  const applyData = (locations, users) => {
    setStores(locations);
    setChanged(Object.fromEntries(users.filter((u) => u.passwordChangedAt).map((u) => [u.username, u.passwordChangedAt])));
    loadLocations(locations); // keep the app-wide store list in step, so the pickers update
  };
  const reload = () => Promise.all([api('/locations'), api('/users')]).then(([locations, users]) => applyData(locations, users));
  const bootstrap = () => reload().then(undefined, (err) => setLoadError(err.message));

  const firstLoad = useEffectEvent(bootstrap);
  useEffect(() => {
    firstLoad();
  }, []);

  const create = async (body) => {
    await api('/locations', { method: 'POST', body });
    await reload();
    setAdding(false);
    setNotice(`${body.city} · ${body.area} added. Sign it in with ${body.prefix.toLowerCase()} / ${body.prefix.toLowerCase()}@2026.`);
  };
  const remove = async (store) => {
    setConfirming(null);
    try {
      const { deleted } = await api(`/locations/${store.id}`, { method: 'DELETE' });
      await reload();
      setNotice(deleted ? `${store.city} · ${store.area} removed.` : `${store.city} · ${store.area} removed and kept for its history. Bring it back any time.`);
    } catch (err) {
      setNotice(err.message);
    }
  };
  const reactivate = async (store) => {
    try {
      await api(`/locations/${store.id}/reactivate`, { method: 'POST' });
      await reload();
      setNotice(`${store.city} · ${store.area} is back.`);
    } catch (err) {
      setNotice(err.message);
    }
  };
  const savePassword = async (password) => {
    const u = await api(`/users/${editing.username}/password`, { method: 'PUT', body: { password } });
    setChanged((prev) => ({ ...prev, [u.username]: u.passwordChangedAt }));
    setNotice(`Password changed for ${editing.label}. Anyone signed in as it has to sign in again.`);
    setEditing(null);
  };
  const resetToDefault = async (account) => {
    try {
      const u = await api(`/users/${account.username}/password/reset`, { method: 'POST' });
      setChanged((prev) => {
        const next = { ...prev };
        delete next[u.username];
        return next;
      });
      setNotice(`${account.label} is back to its default password.`);
    } catch (err) {
      setNotice(err.message);
    }
  };

  const active = stores.filter((s) => s.active !== false);
  const removed = stores.filter((s) => s.active === false);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader crumbs={['Admin', 'Stores']} onMenu={onMenu} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 p-3 lg:px-5 lg:py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="max-w-2xl text-[13px] text-ink-3">
              Every store has its own login, bill prefix and numbering. Add a store or remove one; a store with history is kept and can be brought back. Only the admin can change a login’s password.
            </p>
            <button
              type="button"
              onClick={() => { setAdding(true); setNotice(''); }}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(9,9,11,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-evergreen-900"
            >
              <Plus size={15} aria-hidden="true" /> Add store
            </button>
          </div>

          {loadError && <p role="alert" className="rounded-xl bg-ruby-50 px-3.5 py-2.5 text-[13px] font-medium text-ruby-ink">{loadError}</p>}
          {notice && <p role="status" className="animate-pop rounded-xl bg-ok-50 px-3.5 py-2.5 text-[13px] font-medium text-ok-ink">{notice}</p>}

          {/* a responsive grid: as many stores per row as fit (about five on a wide screen), wrapping as the
              count grows */}
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(13.5rem,1fr))]">
            {active.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                changedAt={changed[store.id]}
                confirming={confirming === store.id}
                onConfirm={() => setConfirming(store.id)}
                onCancelConfirm={() => setConfirming(null)}
                onReset={() => { setEditing({ username: store.id, label: `${store.city} · ${store.area}` }); setNotice(''); }}
                onRemove={() => remove(store)}
              />
            ))}

            {/* the admin login: password reset only, never removed */}
            <div className="flex flex-col gap-3 rounded-2xl border glass p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-evergreen-800 text-white">
                  <ShieldCheck size={20} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold">Admin</div>
                  <div className="truncate text-[12px] text-ink-3">All showrooms</div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <span className="font-mono text-ink-3">admin</span>
                {changed.admin ? <span className="text-ink-2">Password set</span> : <span className="rounded-full bg-warn-50 px-2 py-0.5 text-[11px] font-medium text-warn-ink">Default password</span>}
              </div>
              <div className="mt-auto flex items-center gap-1.5 border-t border-line-soft pt-3">
                <button type="button" onClick={() => { setEditing({ username: 'admin', label: 'Admin' }); setNotice(''); }} className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink">
                  <KeyRound size={14} aria-hidden="true" /> Password
                </button>
                {changed.admin && (
                  <button type="button" onClick={() => resetToDefault({ username: 'admin', label: 'Admin' })} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-3 hover:bg-mist hover:text-ink">
                    <RotateCcw size={14} aria-hidden="true" /> Default
                  </button>
                )}
              </div>
            </div>
          </div>

          {removed.length > 0 && (
            <section className="mt-2 flex flex-col gap-2">
              <h2 className="text-[13px] font-semibold text-ink-2">Removed stores <span className="font-normal text-ink-3">· kept for their history</span></h2>
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(13.5rem,1fr))]">
                {removed.map((store) => (
                  <div key={store.id} className="flex items-center gap-3 rounded-2xl border border-line-soft bg-mist-2/40 p-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mist text-ink-3">
                      <Store size={18} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-ink-2">{store.city}</div>
                      <div className="truncate text-[12px] text-ink-3">{store.area} · {store.billPrefix}</div>
                    </div>
                    <button type="button" onClick={() => reactivate(store)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-evergreen-800/25 bg-white px-2.5 text-[13px] font-semibold text-evergreen-900 hover:bg-evergreen-50">
                      <Undo2 size={14} aria-hidden="true" /> Bring back
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {adding && <AddStoreDialog onClose={() => setAdding(false)} onCreate={create} />}
      {editing && <SetPasswordDialog account={editing} onClose={() => setEditing(null)} onSave={savePassword} />}
    </div>
  );
};

export default Stores;
