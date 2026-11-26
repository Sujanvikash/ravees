import { useEffect, useEffectEvent, useState } from 'react';
import { Building2, Eye, EyeOff, FileText, FlaskConical, KeyRound, Landmark, LayoutTemplate, MapPin, Palette, Percent, Phone, Printer, Store, User, X } from 'lucide-react';
import DocSample from '../components/DocSamples.jsx';
import DocumentLooks from '../components/DocumentLooks.jsx';
import { LocationPicker, Segmented } from '../components/Filters.jsx';
import NewPasswordDialog from '../components/NewPasswordDialog.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { LOCATIONS, SELLER, locationById } from '../config.js';
import { useSession } from '../context/SessionContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { api } from '../lib/api.js';

/** An on/off switch with its label and explanation. */
const Toggle = ({ id, Icon, title, description, on, onChange }) => (
  <div className="flex items-start gap-4 px-5 py-4">
    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-evergreen-50 text-evergreen-800">
      <Icon size={17} aria-hidden="true" />
    </span>
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="text-[14px] font-semibold">
        {title}
      </label>
      <p className="mt-0.5 text-[13px] text-ink-3">{description}</p>
    </div>
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${on ? 'brand-gradient' : 'bg-line-strong'}`}
    >
      <span className={`inline-block size-5 rounded-full bg-[#fff] shadow transition-transform ${on ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
      <span className="sr-only">{on ? 'On' : 'Off'}</span>
    </button>
  </div>
);

/** A text (or multi-line) detail printed on the bill. Edited locally; its own Save button writes it to the
 *  server and updates the sample bill alongside. The button is live only while there is an unsaved change. */
const StoreField = ({ label, hint, value, onSave, textarea, placeholder }) => {
  const [v, setV] = useState(value ?? '');
  const dirty = v.trim() !== (value ?? '');
  const commit = () => {
    if (dirty) onSave(v.trim());
  };
  const cls =
    'rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-evergreen-800/50 focus:shadow-[0_0_0_3px_rgba(23,92,38,0.10)] focus:outline-none';
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-2">
      <span>
        {label} {hint && <span className="font-normal text-ink-3">{hint}</span>}
      </span>
      <div className="flex items-start gap-2">
        {textarea ? (
          <textarea rows={Math.min(5, Math.max(2, (v || placeholder || '').split('\n').length))} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className={`${cls} min-w-0 flex-1 resize-none font-normal`} />
        ) : (
          <input
            value={v}
            onChange={(e) => setV(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              }
            }}
            placeholder={placeholder}
            className={`${cls} h-10 min-w-0 flex-1 font-normal`}
          />
        )}
        <button
          type="button"
          onClick={commit}
          disabled={!dirty}
          className="h-10 shrink-0 rounded-xl bg-evergreen-800 px-3.5 text-[13px] font-semibold text-white hover:bg-evergreen-900 disabled:bg-line disabled:text-ink-3"
        >
          Save
        </button>
      </div>
    </label>
  );
};

/** One appearance choice: a label, a hint, and its options. `sub` nests it under the choice above (e.g. Snow
 *  amount under Festive effect) — indented, lightly tinted, with a branch rule — so dependent options read as
 *  children, not peers. */
const Choice = ({ label, hint, options, value, onChange, sub = false }) => (
  <div
    className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3 pr-5 ${
      sub ? 'bg-mist-2/40 pl-5 before:mr-3 before:h-4 before:w-4 before:shrink-0 before:self-center before:rounded-bl-md before:border-b-2 before:border-l-2 before:border-line before:content-[\'\']' : 'pl-5'
    }`}
  >
    <div className="min-w-0">
      <div className="text-[13px] font-medium">{label}</div>
      {hint && <div className="mt-0.5 text-xs text-ink-3">{hint}</div>}
    </div>
    <Segmented label={label} options={options} value={value} onChange={onChange} />
  </div>
);

/** The largest manual discount a bill may take, as a percentage (an amount off is held to the same share of the bill). */
const DiscountLimit = ({ value, onSave }) => {
  const [v, setV] = useState(String(value));
  const n = Number(v);
  const valid = v.trim() !== '' && n >= 0 && n <= 100;
  const dirty = valid && n !== value;
  const commit = () => dirty && onSave(Math.round(n * 100) / 100);
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4">
      <div className="min-w-0">
        <div className="text-[13px] font-medium">Largest manual discount</div>
        <div className="mt-0.5 text-xs text-ink-3">
          The counter shows it by the discount box. A percentage can go up to it; an amount off up to the same share of the bill. Set 0 to turn manual
          discounts off.
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex h-10 items-center gap-1 rounded-xl border border-line bg-white px-3 focus-within:border-evergreen-800/50">
          <span className="sr-only">Largest manual discount, percent</span>
          <input
            inputMode="decimal"
            value={v}
            onChange={(e) => setV(e.target.value.replace(/[^\d.]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
            className="w-14 bg-transparent text-right text-sm font-semibold tabular-nums"
          />
          <span className="text-sm text-ink-3">%</span>
        </label>
        <button
          type="button"
          onClick={commit}
          disabled={!dirty}
          className="h-10 shrink-0 rounded-xl bg-evergreen-800 px-3.5 text-[13px] font-semibold text-white hover:bg-evergreen-900 disabled:bg-line disabled:text-ink-3"
        >
          Save
        </button>
      </div>
      {!valid && <p className="w-full text-xs font-medium text-ruby-ink">Between 0 and 100.</p>}
    </div>
  );
};

/** The admin's other addresses an invoice can be from (besides the two built in): added here or on an invoice
 *  ("Another address"), taken off here. */
const MoreAddresses = ({ list, onSave }) => {
  const [adding, setAdding] = useState(null); // { label, text }
  const add = () => {
    const text = adding.text.trim();
    if (!text) return;
    onSave([...list, { label: adding.label.trim() || 'Other address', text }]);
    setAdding(null);
  };
  const cls =
    'rounded-xl border border-line bg-white px-3 py-2 text-sm font-normal text-ink placeholder:text-ink-3 focus:border-evergreen-800/50 focus:outline-none';
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      {list.length === 0 && !adding && <p className="text-ink-3">None added yet.</p>}
      {list.map((a, i) => (
        <div key={a.text} className="flex items-start gap-3 rounded-xl border border-line-soft bg-white px-3 py-2.5">
          <MapPin size={15} className="mt-0.5 shrink-0 text-ink-3" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="font-medium">{a.label}</div>
            <div className="text-xs whitespace-pre-line text-ink-3">{a.text}</div>
          </div>
          <button
            type="button"
            onClick={() => onSave(list.filter((_, j) => j !== i))}
            aria-label={`Take ${a.label} off the list`}
            className="inline-flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-ruby-50 hover:text-ruby"
          >
            <X size={15} />
          </button>
        </div>
      ))}
      {adding ? (
        <div className="flex flex-col gap-2 rounded-xl border border-line-soft bg-white p-3">
          <input value={adding.label} onChange={(e) => setAdding({ ...adding, label: e.target.value })} placeholder="Name it, e.g. Godown, Puzhal" maxLength={60} className={`${cls} h-10`} />
          <textarea
            rows={3}
            value={adding.text}
            onChange={(e) => setAdding({ ...adding, text: e.target.value })}
            placeholder="The address, as it should print"
            maxLength={300}
            className={`${cls} resize-none`}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(null)} className="h-9 rounded-xl px-3 text-[13px] font-medium text-ink-2 hover:bg-mist">
              Cancel
            </button>
            <button
              type="button"
              onClick={add}
              disabled={!adding.text.trim()}
              className="h-9 rounded-xl bg-evergreen-800 px-3.5 text-[13px] font-semibold text-white hover:bg-evergreen-900 disabled:bg-line disabled:text-ink-3"
            >
              Add address
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding({ label: '', text: '' })}
          disabled={list.length >= 12}
          className="self-start text-[13px] font-semibold text-evergreen-900 hover:underline disabled:text-ink-3"
        >
          + Add another address
        </button>
      )}
    </div>
  );
};

/** The shop-on-the-bill fields and the composition toggle, bound to `values` and saved through onSave(key, value).
 *  The sample bill on the right is the real 80mm bill in the look picked for it (Settings → Documents), showing every
 *  field as it is now (`shop` gives the built-in fall-backs, shown greyed in each box, which print while it is blank). */
const ShopFields = ({ values, onSave, shop }) => (
  <>
    <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-4">
        <StoreField label="Shop name" value={values.storeName} onSave={(v) => onSave('storeName', v)} placeholder={shop?.name || 'Shop name as printed on the bill'} />
        <StoreField
          label="Address"
          hint="one line per line"
          value={values.storeAddress}
          onSave={(v) => onSave('storeAddress', v)}
          textarea
          placeholder={shop?.address?.join('\n') || 'Shop address'}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <StoreField label="Phone" value={values.storePhone} onSave={(v) => onSave('storePhone', v)} placeholder={shop?.phone || 'Phone number'} />
          <StoreField label="GSTIN" value={values.gstin} onSave={(v) => onSave('gstin', v)} placeholder={shop?.gstin || 'GSTIN'} />
        </div>
        <p className="rounded-xl bg-mist-2 px-3 py-2 text-xs text-ink-3">
          Every bill ends with the fixed note <span className="font-medium text-ink-2">*NO EXCHANGE *NO RETURN · *NO GUARANTEE ON COLOURS</span> and a Christmas wish.
        </p>
      </div>
      <div className="lg:border-l lg:border-line-soft lg:pl-5">
        <div className="mb-2 text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase">Sample bill</div>
        <div className="mx-auto w-fit origin-top scale-[0.97] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.4)] ring-1 ring-black/10">
          <DocSample kind="thermalBill" location={shop?.id} shop={values} />
        </div>
      </div>
    </div>
    <Toggle
      id="setting-composition"
      Icon={Store}
      title="Composition dealer"
      description="When on, bills print as a “Bill of Supply” with no GST shown on the customer bill (the price already includes it). Only purchase orders carry GST; purchase returns go back at D.Rate with none."
      on={values.composition}
      onChange={(v) => onSave('composition', v)}
    />
  </>
);

/** Admin: edit one showroom's own bill details. Keyed by location so it reloads when the showroom changes. */
const StoreDetailsEditor = ({ location }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = useEffectEvent(() => {
    api(`/settings?location=${encodeURIComponent(location)}`).then(setData, (e) => setError(e.message));
  });
  useEffect(() => {
    load();
  }, []);
  const save = async (key, value) => {
    setError('');
    try {
      setData(await api(`/settings?location=${encodeURIComponent(location)}`, { method: 'PATCH', body: { [key]: value } }));
    } catch (e) {
      setError(`Not saved: ${e.message}`);
    }
  };
  if (!data) return <p className="px-5 py-4 text-[13px] text-ink-3">{error || 'Loading…'}</p>;
  return (
    <>
      {error && (
        <p role="alert" className="px-5 pt-3 text-xs font-medium text-ruby-ink">
          {error}
        </p>
      )}
      <ShopFields values={data} onSave={save} shop={locationById(location)} />
    </>
  );
};

/** Admin: a showroom picker over its bill details. */
const AdminStoreDetails = () => {
  const [location, setLocation] = useState(LOCATIONS[0].id);
  return (
    <>
      <div className="px-5 pt-4">
        <LocationPicker value={location} onChange={setLocation} all={false} />
      </div>
      <StoreDetailsEditor key={location} location={location} />
    </>
  );
};

// The passwords the app asks for besides a login's own (GET /settings/passwords), in its order.
const PASSWORDS = {
  edit_bill: { title: 'Editing a bill', hint: 'Asked for by Edit bill in Sales, before the bill opens on the counter to change.' },
  delete_bill: { title: 'Deleting a bill', hint: 'Asked for by Delete bill in Sales, before a bill is deleted.' },
  discount: { title: 'Giving a discount', hint: 'Asked for on the counter once a bill, before a manual discount on the bill or on an item.' },
  demo: { title: 'Demo switch', hint: 'Asked for on the sign-in screen, before the demo’s logins show.' },
};

/** Admin: the passwords the app asks for besides a login's own, each one hidden until shown, and changed here. One
 *  still on its built-in password can't be shown (the server keeps it unreadable) until it is set here once. The
 *  demo's admin gets only the demo's own, for editing and deleting a bill. */
const Passwords = () => {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [shown, setShown] = useState({}); // { kind: true } while that one is shown
  const [changing, setChanging] = useState(null); // the kind whose new password is being typed
  const load = useEffectEvent(() => {
    api('/settings/passwords').then(setList, (e) => setError(e.message));
  });
  useEffect(() => {
    load();
  }, []);
  const save = async (password) => {
    const saved = await api(`/settings/passwords/${changing}`, { method: 'PUT', body: { password } });
    setList((all) => all.map((p) => (p.kind === saved.kind ? saved : p)));
    setNotice(`New password for ${PASSWORDS[saved.kind].title.toLowerCase()} saved. It is asked for from now on, on every computer.`);
    setChanging(null);
  };
  if (!list) return <p className="px-5 py-4 text-[13px] text-ink-3">{error || 'Loading…'}</p>;
  return (
    <>
      {notice && (
        <p role="status" className="mx-5 mt-4 rounded-xl bg-evergreen-50 px-3.5 py-2 text-[13px] font-medium text-evergreen-900">
          {notice}
        </p>
      )}
      <ul className="divide-y divide-line-soft">
        {list.map(({ kind, password }) => {
          const { title, hint } = PASSWORDS[kind];
          const show = shown[kind];
          return (
            <li key={kind} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
              <div className="min-w-0 flex-1 basis-60">
                <div className="text-[13px] font-semibold text-ink">{title}</div>
                <div className="text-xs text-ink-3">{hint}</div>
              </div>
              {password === null ? (
                <span className="text-xs text-ink-3" title="It was set before passwords could be shown here. Set it once here (the same or a new one) to see it.">
                  Built-in password, not shown
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <span className="min-w-28 rounded-lg bg-mist px-2.5 py-1 font-mono text-[13px] text-ink">{show ? password : '•'.repeat(Math.min(password.length, 12))}</span>
                  <button
                    type="button"
                    onClick={() => setShown((s) => ({ ...s, [kind]: !show }))}
                    aria-label={`${show ? 'Hide' : 'Show'} the password for ${title.toLowerCase()}`}
                    className="inline-flex size-8 items-center justify-center rounded-md text-ink-3 hover:bg-mist hover:text-ink"
                  >
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setNotice('');
                  setChanging(kind);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-evergreen-800/25 bg-white px-3 text-[13px] font-semibold text-evergreen-900 hover:border-evergreen-800/50 hover:bg-evergreen-50"
              >
                <KeyRound size={14} aria-hidden="true" /> {password === null ? 'Set' : 'Change'}
              </button>
            </li>
          );
        })}
      </ul>
      {changing && (
        <NewPasswordDialog
          title={`Password for ${PASSWORDS[changing].title.toLowerCase()}`}
          subtitle="Asked for from the moment it is saved"
          onClose={() => setChanging(null)}
          onSave={save}
        />
      )}
    </>
  );
};

/** A card on the Settings page: an icon, a title and what it is for, over its settings. */
const Panel = ({ Icon, title, description, children }) => (
  <section className="overflow-hidden rounded-2xl border glass">
    <div className="flex items-start gap-4 border-b border-line-soft px-5 py-4">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-evergreen-50 text-evergreen-800">
        <Icon size={17} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h2 className="text-[14px] font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-ink-3">{description}</p>}
      </div>
    </div>
    {children}
  </section>
);

// The parts of the page, one shown at a time: the admin's, and a showroom's own.
const SECTIONS = {
  admin: [
    { id: 'business', label: 'Business', hint: 'Your details on invoices, addresses, bank', Icon: Building2 },
    { id: 'showrooms', label: 'Showrooms', hint: 'Each shop’s details on its bills', Icon: Store },
    { id: 'documents', label: 'Documents', hint: 'How every bill and document looks', Icon: LayoutTemplate },
    { id: 'counter', label: 'Counter', hint: 'Discounts, customer details, quotations', Icon: Percent },
    { id: 'passwords', label: 'Passwords', hint: 'Editing and deleting bills, discounts, demo', Icon: KeyRound },
    { id: 'appearance', label: 'Appearance', hint: 'Theme, text size, language', Icon: Palette },
    { id: 'demo', label: 'Demo', hint: 'Start the demo again', Icon: FlaskConical, demo: true },
  ],
  location: [
    { id: 'shop', label: 'Shop on the bill', hint: 'Your details on every bill', Icon: Store },
    { id: 'appearance', label: 'Appearance', hint: 'Theme, text size, language', Icon: Palette },
  ],
};
const SECTION_KEY = 'billing-settings-section'; // the part last open, per browser

/** The app's settings, kept on the server so they apply on every computer; a change the server refuses is put back.
 *  The admin's are in parts: the business on its invoices, each showroom's details on its bills, how every printed
 *  document looks, what the counter may do, the passwords it asks for, the screens' appearance (and, in the demo,
 *  starting it again). A showroom
 *  sets its own details on the bill and its screens' appearance. A menu picks the part shown, remembered per browser. */
const Settings = ({ onMenu }) => {
  const { settings, setSetting: save, resetDemo } = useStore();
  const session = useSession();
  const admin = session?.role === 'admin';
  const demo = Boolean(session?.demo);
  const sections = SECTIONS[admin ? 'admin' : 'location'].filter((s) => !s.demo || demo);
  const [section, setSection] = useState(() => {
    try {
      return window.localStorage.getItem(SECTION_KEY);
    } catch {
      return null;
    }
  });
  const current = sections.find((s) => s.id === section) ?? sections[0];
  const pick = (id) => {
    setSection(id);
    try {
      window.localStorage.setItem(SECTION_KEY, id);
    } catch {
      // ignore write failures (private browsing, quota, etc.)
    }
  };
  const [error, setError] = useState('');
  const [resetting, setResetting] = useState('');
  const setSetting = (key, value) => {
    setError('');
    save(key, value).catch((e) => setError(`Not saved: ${e.message}`));
  };
  const reset = async () => {
    setResetting('Starting the demo again…');
    try {
      setResetting(await resetDemo());
    } catch (e) {
      setResetting(`Couldn’t reset the demo: ${e.message}`);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader crumbs={admin ? ['Admin', 'Settings', current.label] : ['Settings', current.label]} onMenu={onMenu} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 p-3 lg:flex-row lg:items-start lg:gap-6 lg:px-5 lg:py-4">
          <nav aria-label="Settings" className="shrink-0 lg:sticky lg:top-4 lg:w-60">
            <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
              {sections.map((s) => {
                const on = s.id === current.id;
                return (
                  <li key={s.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => pick(s.id)}
                      aria-current={on ? 'page' : undefined}
                      className={`flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors ${on ? 'bg-evergreen-50 text-evergreen-900 ring-1 ring-evergreen-800/15' : 'text-ink-2 hover:bg-mist hover:text-ink'}`}
                    >
                      <s.Icon size={17} className={`mt-px shrink-0 ${on ? 'text-evergreen-800' : 'text-ink-3'}`} aria-hidden="true" />
                      <span className="min-w-0">
                        <span className={`block text-[13px] whitespace-nowrap ${on ? 'font-semibold' : 'font-medium'}`}>{s.label}</span>
                        <span className="hidden text-xs text-ink-3 lg:block">{s.hint}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 hidden px-3 text-xs text-ink-3 lg:block">
              {admin
                ? 'Saved on the billing server and used on every computer. Each showroom can still change the appearance of its own screens.'
                : 'Saved on the billing server for your showroom. The admin sets everything else.'}
            </p>
          </nav>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {error && (
              <p role="alert" className="rounded-xl bg-ruby-50 px-4 py-2.5 text-[13px] font-medium text-ruby-ink">
                {error}
              </p>
            )}

            {current.id === 'business' && (
              <>
                <Panel
                  Icon={FileText}
                  title="Your business on invoices"
                  description="Printed as the seller on every tax invoice to a showroom. A blank name, address, phone or GSTIN prints Tree Classics Trader’s, shown greyed in each box; email and PAN print only when filled in."
                >
                  <div className="flex flex-col gap-4 p-5">
                    <StoreField label="Business name" value={settings.bizName} onSave={(v) => setSetting('bizName', v)} placeholder={SELLER.name} />
                    <StoreField label="Address" hint="one line per line" value={settings.bizAddress} onSave={(v) => setSetting('bizAddress', v)} textarea placeholder={SELLER.address} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <StoreField label="State" value={settings.bizState} onSave={(v) => setSetting('bizState', v)} placeholder="Tamil Nadu" />
                      <StoreField label="GSTIN" value={settings.bizGstin} onSave={(v) => setSetting('bizGstin', v.toUpperCase())} placeholder={SELLER.gstin} />
                      <StoreField label="PAN" value={settings.bizPan} onSave={(v) => setSetting('bizPan', v.toUpperCase())} placeholder="PAN" />
                      <StoreField label="Phone" value={settings.bizPhone} onSave={(v) => setSetting('bizPhone', v)} placeholder={SELLER.phone} />
                      <StoreField label="Email" value={settings.bizEmail} onSave={(v) => setSetting('bizEmail', v)} placeholder="Email" />
                    </div>
                  </div>
                </Panel>
                <Panel
                  Icon={MapPin}
                  title="Addresses an invoice can be from"
                  description={`${SELLER.addresses.map((a) => a.label).join(' and ')} are built in. Add your others here, or with “Another address” while raising an invoice.`}
                >
                  <div className="p-5">
                    <MoreAddresses list={settings.bizAddresses ?? []} onSave={(v) => setSetting('bizAddresses', v)} />
                  </div>
                </Panel>
                <Panel
                  Icon={Landmark}
                  title="Bank and terms"
                  description="Printed at the foot of every invoice, when filled in. An invoice is a tax invoice: each product at its D.Rate with its GST (18%) on top, CGST + SGST inside a state and IGST across states."
                >
                  <div className="flex flex-col gap-4 p-5">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <StoreField label="Bank" value={settings.bankName} onSave={(v) => setSetting('bankName', v)} placeholder="Bank and branch" />
                      <StoreField label="Account number" value={settings.bankAccount} onSave={(v) => setSetting('bankAccount', v)} placeholder="Account number" />
                      <StoreField label="IFSC" value={settings.bankIfsc} onSave={(v) => setSetting('bankIfsc', v.toUpperCase())} placeholder="IFSC" />
                    </div>
                    <StoreField label="Terms" value={settings.invoiceTerms} onSave={(v) => setSetting('invoiceTerms', v)} textarea placeholder="Payment terms, jurisdiction…" />
                  </div>
                </Panel>
              </>
            )}

            {current.id === 'showrooms' && (
              <Panel
                Icon={Store}
                title="Shop on the bill"
                description="Each showroom’s own details, printed at the top of its bills. Pick a showroom to set its name, address, phone and GSTIN; a blank field prints the built-in details."
              >
                <AdminStoreDetails />
              </Panel>
            )}

            {current.id === 'shop' && (
              <Panel
                Icon={Store}
                title="Shop on the bill"
                description="Your shop’s own details, printed at the top of every bill. A blank field prints the built-in showroom details. A composition dealer bills a “Bill of Supply” with no GST shown."
              >
                <ShopFields values={settings} onSave={setSetting} shop={locationById(session.location)} />
              </Panel>
            )}

            {current.id === 'documents' && (
              <Panel
                Icon={LayoutTemplate}
                title="Documents"
                description="Pick how each document looks, for every showroom. Every A4 document puts its title (TAX INVOICE, QUOTATION…) at the very top; its colours are still picked on its preview. An invoice already raised keeps its PDF until it is next previewed."
              >
                <DocumentLooks looks={settings.docLooks ?? {}} onChange={(next) => setSetting('docLooks', next)} />
              </Panel>
            )}

            {current.id === 'counter' && (
              <>
                <Panel Icon={Percent} title="Discounts" description="The most the counter can take off a bill by hand, in every showroom. Offer prices aren’t affected.">
                  <DiscountLimit key={settings.maxDiscountPct} value={settings.maxDiscountPct} onSave={(v) => setSetting('maxDiscountPct', v)} />
                </Panel>
                <Panel
                  Icon={User}
                  title="Customer details on a bill"
                  description="What the counter must have before a bill can be collected. Turn one off for quick walk-in billing; it can still be typed, and if it is, it’s checked. Quotations always ask for both."
                >
                  <div className="divide-y divide-line-soft">
                    <Toggle
                      id="setting-require-name"
                      Icon={User}
                      title="Require customer name"
                      description="When on, a bill needs the customer’s name before it can be collected. When off, the name is optional."
                      on={settings.requireName}
                      onChange={(v) => setSetting('requireName', v)}
                    />
                    <Toggle
                      id="setting-require-mobile"
                      Icon={Phone}
                      title="Require mobile number"
                      description="When on, a bill needs a valid 10-digit mobile number before it can be collected. When off, the number is optional."
                      on={settings.requireMobile}
                      onChange={(v) => setSetting('requireMobile', v)}
                    />
                  </div>
                </Panel>
                <section className="overflow-hidden rounded-2xl border glass">
                  <Toggle
                    id="setting-quote-print"
                    Icon={Printer}
                    title="Allow printing and sharing quotations"
                    description="When on, showrooms can print a quotation for the customer, or download it as a PDF and share it (an A4 page with a large QUOTATION watermark that says it is not a bill). When off, quotations can still be written, saved and previewed, but not printed, downloaded or shared."
                    on={settings.quotePrint}
                    onChange={(v) => setSetting('quotePrint', v)}
                  />
                </section>
              </>
            )}

            {current.id === 'passwords' && (
              <Panel
                Icon={KeyRound}
                title="Passwords"
                description={
                  demo
                    ? 'The demo’s own passwords for editing and deleting a bill. Starting the demo again puts them back. The real ones are set in the real app.'
                    : 'The passwords the app asks for besides a login’s own. A login’s own password is changed in Stores.'
                }
              >
                <Passwords />
              </Panel>
            )}

            {current.id === 'appearance' && (
              <Panel
                Icon={Palette}
                title="Appearance"
                description={
                  admin
                    ? 'The default look for every screen, including sign-in. Each showroom can change it for its own screens. Changes show straight away.'
                    : 'Theme and text size for your showroom’s screens. Changes show straight away.'
                }
              >
                <div className="divide-y divide-line-soft">
                  <Choice
                    label="Language"
                    hint="Tamil shows the same words in Tamil script (not translated); numbers and codes stay as they are"
                    options={[
                      { id: 'en', label: 'English' },
                      { id: 'ta', label: 'தமிழ் · Tamil' },
                    ]}
                    value={settings.lang}
                    onChange={(v) => setSetting('lang', v)}
                  />
                  <Choice
                    label="Text size"
                    hint="Make everything on screen bigger — for the counter monitor"
                    options={[
                      { id: 'normal', label: 'Normal' },
                      { id: 'large', label: 'Large' },
                      { id: 'larger', label: 'Larger' },
                    ]}
                    value={settings.font}
                    onChange={(v) => setSetting('font', v)}
                  />
                  <Choice
                    label="Theme"
                    hint="Classic is the original look"
                    options={[
                      { id: 'classic', label: 'Classic' },
                      { id: 'light', label: 'Light' },
                      { id: 'dark', label: 'Dark' },
                    ]}
                    value={settings.theme}
                    onChange={(v) => setSetting('theme', v)}
                  />
                  {settings.theme === 'light' && (
                    <Choice
                      sub
                      label="Whiteness"
                      hint="How much of the photo shows through"
                      options={[
                        { id: 'light', label: 'Light' },
                        { id: 'lighter', label: 'Lighter' },
                        { id: 'lightest', label: 'Lightest' },
                      ]}
                      value={settings.wash}
                      onChange={(v) => setSetting('wash', v)}
                    />
                  )}
                  {settings.theme === 'light' && (
                    <Choice
                      sub
                      label="Figures strip"
                      hint="Above Inventory, Sales and the Dashboard"
                      options={[
                        { id: 'green', label: 'Logo green' },
                        { id: 'white', label: 'White' },
                      ]}
                      value={settings.strip}
                      onChange={(v) => setSetting('strip', v)}
                    />
                  )}
                  <Choice
                    label="Festive effect"
                    hint="Behind the screens, never over them; still if reduced motion is on"
                    options={[
                      { id: 'none', label: 'None' },
                      { id: 'snow', label: 'Snowfall' },
                      { id: 'glow', label: 'Twinkle glow' },
                      { id: 'both', label: 'Both' },
                    ]}
                    value={settings.effect}
                    onChange={(v) => setSetting('effect', v)}
                  />
                  {(settings.effect === 'snow' || settings.effect === 'both') && (
                    <Choice
                      sub
                      label="Snow amount"
                      options={[
                        { id: 'light', label: 'Light' },
                        { id: 'medium', label: 'Medium' },
                        { id: 'heavy', label: 'Heavy' },
                        { id: 'blizzard', label: 'Blizzard' },
                      ]}
                      value={settings.snow}
                      onChange={(v) => setSetting('snow', v)}
                    />
                  )}
                </div>
              </Panel>
            )}

            {current.id === 'demo' && (
              <Panel
                Icon={FlaskConical}
                title="Demo data"
                description="Throws away everything done in the demo and starts it again clean: the five showrooms, the product list and the season’s stock in the admin stock, with no sales, customers or orders. The real data is never touched."
              >
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <p className="text-[13px] font-medium text-ink-2">{resetting || 'Only the demo is reset.'}</p>
                  <button
                    type="button"
                    onClick={reset}
                    disabled={resetting.endsWith('…')}
                    className="h-9 shrink-0 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white hover:bg-evergreen-900 disabled:opacity-60"
                  >
                    Reset demo
                  </button>
                </div>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
