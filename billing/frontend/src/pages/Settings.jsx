import { useEffect, useEffectEvent, useState } from 'react';
import { FlaskConical, Languages, Palette, Percent, Phone, Printer, Store, Undo2, User } from 'lucide-react';
import { LocationPicker, Segmented } from '../components/Filters.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { LOCATIONS } from '../config.js';
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

/** A text (or multi-line) detail printed on the bill. Edited locally and saved when the field loses focus, so
 *  the server isn't hit on every keystroke. */
const StoreField = ({ label, hint, value, onSave, textarea, placeholder }) => {
  const [v, setV] = useState(value ?? '');
  const commit = () => {
    const next = v.trim();
    if (next !== (value ?? '')) onSave(next);
  };
  const cls =
    'rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-evergreen-800/50 focus:shadow-[0_0_0_3px_rgba(23,92,38,0.10)] focus:outline-none';
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-2">
      <span>
        {label} {hint && <span className="font-normal text-ink-3">{hint}</span>}
      </span>
      {textarea ? (
        <textarea rows={2} value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} placeholder={placeholder} className={`${cls} resize-none font-normal`} />
      ) : (
        <input value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} placeholder={placeholder} className={`${cls} h-10 font-normal`} />
      )}
    </label>
  );
};

/** One appearance choice: a label, a hint, and its options. */
const Choice = ({ label, hint, options, value, onChange }) => (
  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3">
    <div className="min-w-0">
      <div className="text-[13px] font-medium">{label}</div>
      {hint && <div className="text-xs text-ink-3">{hint}</div>}
    </div>
    <Segmented label={label} options={options} value={value} onChange={onChange} />
  </div>
);

/** The shop-on-the-bill fields and the composition toggle, bound to `values` and saved through onSave(key, value). */
const ShopFields = ({ values, onSave }) => (
  <>
    <div className="flex flex-col gap-4 p-5">
      <StoreField label="Shop name" value={values.storeName} onSave={(v) => onSave('storeName', v)} placeholder="e.g. SPARKLE CHRISTMAS" />
      <StoreField
        label="Address"
        hint="one line per line"
        value={values.storeAddress}
        onSave={(v) => onSave('storeAddress', v)}
        textarea
        placeholder={'Ground Floor, 79, M.G.R Road,\nPune - 411001'}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <StoreField label="Phone" value={values.storePhone} onSave={(v) => onSave('storePhone', v)} placeholder="8220263913" />
        <StoreField label="GSTIN" value={values.gstin} onSave={(v) => onSave('gstin', v)} placeholder="27DDFPR0896L1ZT" />
      </div>
      <StoreField
        label="Footer notes"
        hint="printed at the foot of the bill"
        value={values.billFooter}
        onSave={(v) => onSave('billFooter', v)}
        textarea
        placeholder="*NO EXCHANGE *NO RETURN *NO GUARANTEE ON COLORS"
      />
    </div>
    <Toggle
      id="setting-composition"
      Icon={Store}
      title="Composition dealer"
      description="When on, bills print as a “Bill of Supply” with no GST shown on the customer bill (the price already includes it). Only purchase orders and purchase returns carry GST."
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
      <ShopFields values={data} onSave={save} />
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

/** Admin only: the app's look, and switches that change what the showrooms can do. They are kept on the server,
 * so they apply on every computer; a change that the server refuses is put back. In the demo, the demo admin can
 * also start the demo's sample data again from scratch. */
const Settings = ({ onMenu }) => {
  const { settings, setSetting: save, resetDemo } = useStore();
  const session = useSession();
  const admin = session?.role === 'admin';
  const demo = Boolean(session?.demo);
  const [error, setError] = useState('');
  const [resetting, setResetting] = useState('');
  const setSetting = (key, value) => {
    setError('');
    save(key, value).catch((e) => setError(`Not saved: ${e.message}`));
  };
  const reset = async () => {
    setResetting('Building a fresh month of sample data…');
    try {
      setResetting(await resetDemo());
    } catch (e) {
      setResetting(`Couldn’t reset the demo: ${e.message}`);
    }
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader crumbs={admin ? ['Admin', 'Settings'] : ['Appearance']} onMenu={onMenu} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 p-3 lg:px-5 lg:py-4">
          <p className="text-[13px] text-ink-3">
            {admin
              ? 'Saved on the billing server. The appearance below is your own screen only. The language, each showroom’s bill details and the business switches are set here and apply to the showrooms.'
              : 'The look of your own screen — theme and text size. Saved on the server for you.'}
          </p>
          {error && (
            <p role="alert" className="text-xs font-medium text-ruby-ink">
              {error}
            </p>
          )}
          <section className="overflow-hidden rounded-2xl border glass">
            <div className="flex items-start gap-4 border-b border-line-soft px-5 py-4">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-evergreen-50 text-evergreen-800">
                <Palette size={17} aria-hidden="true" />
              </span>
              <div>
                <div className="text-[14px] font-semibold">Appearance</div>
                <p className="mt-0.5 text-[13px] text-ink-3">Theme and text size for your own screen. Changes show straight away.</p>
              </div>
            </div>
            <div className="divide-y divide-line-soft">
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
                label="Current page in the menu"
                options={[
                  { id: 'solid', label: 'Solid green' },
                  { id: 'soft', label: 'Soft green' },
                ]}
                value={settings.nav}
                onChange={(v) => setSetting('nav', v)}
              />
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
              {settings.effect !== 'none' && (
                <Choice
                  label="Show the effect"
                  hint="On sign-in the snow falls in front of the cards; inside the app it stays behind"
                  options={[
                    { id: 'everywhere', label: 'Everywhere' },
                    { id: 'signin', label: 'Sign-in only' },
                  ]}
                  value={settings.effectWhere}
                  onChange={(v) => setSetting('effectWhere', v)}
                />
              )}
            </div>
          </section>

          {admin && (
            <section className="overflow-hidden rounded-2xl border glass">
              <div className="flex items-start gap-4 border-b border-line-soft px-5 py-4">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-evergreen-50 text-evergreen-800">
                  <Languages size={17} aria-hidden="true" />
                </span>
                <div>
                  <div className="text-[14px] font-semibold">Language</div>
                  <p className="mt-0.5 text-[13px] text-ink-3">
                    For every showroom’s screens and printed bills. Tamil shows the same words in Tamil script (not
                    translated); numbers, ₹ amounts and codes stay as they are.
                  </p>
                </div>
              </div>
              <Choice
                label="Language"
                options={[
                  { id: 'en', label: 'English' },
                  { id: 'ta', label: 'தமிழ் · Tamil' },
                ]}
                value={settings.lang}
                onChange={(v) => setSetting('lang', v)}
              />
            </section>
          )}

          {admin && (
            <section className="overflow-hidden rounded-2xl border glass">
              <div className="flex items-start gap-4 border-b border-line-soft px-5 py-4">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-evergreen-50 text-evergreen-800">
                  <Store size={17} aria-hidden="true" />
                </span>
                <div>
                  <div className="text-[14px] font-semibold">Shop on the bill</div>
                  <p className="mt-0.5 text-[13px] text-ink-3">
                    Each showroom’s own details, printed at the top of its bills. Pick a showroom to set its name,
                    address, GSTIN, footer and whether it bills as a composition dealer (a “Bill of Supply” with no GST
                    shown). A blank field falls back to the built-in details.
                  </p>
                </div>
              </div>
              <AdminStoreDetails />
            </section>
          )}

          {admin && (
            <>
          <section className="overflow-hidden rounded-2xl border glass">
            <Toggle
              id="setting-quote-print"
              Icon={Printer}
              title="Allow printing quotations"
              description="When on, showrooms can print a quotation for the customer (an A4 page with a large QUOTATION watermark that says it is not a bill). When off, quotations can still be written and saved, but not printed."
              on={settings.quotePrint}
              onChange={(v) => setSetting('quotePrint', v)}
            />
          </section>

          <section className="overflow-hidden rounded-2xl border glass">
            <div className="flex items-start gap-4 border-b border-line-soft px-5 py-4">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-evergreen-50 text-evergreen-800">
                <User size={17} aria-hidden="true" />
              </span>
              <div>
                <div className="text-[14px] font-semibold">Customer details on a bill</div>
                <p className="mt-0.5 text-[13px] text-ink-3">
                  What the counter must have before a bill can be collected. Turn one off for quick walk-in billing; it
                  can still be typed, and if it is, it’s checked. Quotations always ask for both.
                </p>
              </div>
            </div>
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
          </section>

          <section className="overflow-hidden rounded-2xl border glass">
            <Toggle
              id="setting-show-gst"
              Icon={Percent}
              title="Show GST"
              description="When off, GST isn’t shown anywhere: not on bills, credit notes or quotations, not at the counter, not in the sales figures, dashboard or Excel report, and the new-product form doesn’t ask for it. Prices are simply the selling price (what the customer pays doesn’t change), and profit is worked out on it. Use this when GST is handled outside this app."
              on={settings.showGst}
              onChange={(v) => setSetting('showGst', v)}
            />
          </section>

          <section className="overflow-hidden rounded-2xl border glass">
            <div className="flex items-start gap-4 px-5 pt-4">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-evergreen-50 text-evergreen-800">
                <Undo2 size={17} aria-hidden="true" />
              </span>
              <div>
                <div className="text-[14px] font-semibold">Returns and exchanges</div>
                <p className="mt-0.5 text-[13px] text-ink-3">
                  How long after a sale the showroom can take items back against the bill. A return is refunded in cash, also
                  for bills paid by UPI or card. An exchange takes the returned value off the new bill; if the new bill is
                  smaller, the rest is refunded in cash. Each one gets a credit note.
                </p>
              </div>
            </div>
            <Choice
              label="Return window"
              options={[
                { id: 0, label: 'Off' },
                { id: 7, label: '7 days' },
                { id: 15, label: '15 days' },
                { id: 30, label: '30 days' },
              ]}
              value={settings.returnDays}
              onChange={(v) => setSetting('returnDays', v)}
            />
          </section>
            </>
          )}

          {admin && demo && (
            <section className="flex items-start gap-4 overflow-hidden rounded-2xl border glass px-5 py-4">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-warn-50 text-warn-ink">
                <FlaskConical size={17} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold">Demo data</div>
                <p className="mt-0.5 text-[13px] text-ink-3">
                  Throws away everything done in the demo and builds a fresh month of sample sales, returns, stock, orders,
                  quotations and cash closes for all five showrooms. The real data is never touched.
                </p>
                {resetting && <p className="mt-2 text-[13px] font-medium text-ink-2">{resetting}</p>}
              </div>
              <button type="button" onClick={reset} disabled={resetting.endsWith('…')} className="h-9 shrink-0 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white hover:bg-evergreen-900 disabled:opacity-60">
                Reset demo
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
