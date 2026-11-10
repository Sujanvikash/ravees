import { useEffect, useEffectEvent, useState } from 'react';
import { FileText, FlaskConical, Palette, Phone, Printer, Store, User } from 'lucide-react';
import logo from '../assets/logo.svg';
import { LocationPicker, Segmented } from '../components/Filters.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { BILL_FOOTER, BRAND, LOCATIONS, locationById } from '../config.js';
import { useSession } from '../context/SessionContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { api } from '../lib/api.js';
import { amount, inr } from '../lib/money.js';

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
          <textarea rows={2} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className={`${cls} min-w-0 flex-1 resize-none font-normal`} />
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

// A short sample sale, so the preview shows the MRP / discount / price columns and a real total.
const SAMPLE = {
  lines: [
    { code: 'SR156', name: 'HO HO WOOD 30CM', mrp: 500, price: 420, qty: 2 },
    { code: 'D0016', name: 'DEER SINGLE 19IN', mrp: 2500, price: 2120, qty: 1 },
    { code: 'W0045', name: 'CHRIS.LETTER B A2-6', mrp: 180, price: 180, qty: 3 },
  ],
  mrpTotal: 4040,
  payable: 3500,
};

const Row = ({ label, value, className = '' }) => (
  <div className={`flex justify-between gap-2 ${className}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

/** A live, on-screen sample of the printed bill (components/Receipt.jsx), so a store sees exactly how its own
 *  details land on the receipt as it edits them. Black-and-white, like the print. */
const BillPreview = ({ values, shop }) => {
  const composition = Boolean(values.composition);
  const name = values.storeName?.trim();
  const address = values.storeAddress?.trim() ? values.storeAddress.split('\n').filter(Boolean) : (shop?.address ?? []);
  const phone = values.storePhone?.trim() || shop?.phone;
  const gstin = values.gstin?.trim();
  const title = composition ? 'BILL OF SUPPLY' : 'TAX INVOICE';
  return (
    <div className="mx-auto w-[264px] rounded-md bg-white p-4 font-mono text-[10px] leading-snug text-black shadow-[0_8px_24px_-12px_rgba(0,0,0,0.4)] ring-1 ring-black/10">
      <div className="flex flex-col items-center gap-0.5 text-center">
        <img src={logo} alt="" className="print-ink mb-1 w-[56px]" />
        {name && <div className="text-[16px] leading-tight font-bold tracking-wide uppercase">{name}</div>}
        {address.map((a) => (
          <div key={a}>{a}</div>
        ))}
        {phone && <div>Ph: {phone}</div>}
        {gstin && <div>GSTIN: {gstin}</div>}
        {composition && <div className="font-bold">Composition Dealer</div>}
      </div>
      <div className="my-1.5 border-y border-dashed border-black py-0.5 text-center font-bold tracking-[0.18em]">{title}</div>
      <div className="mb-1 text-center text-[11px] font-bold">Bill No. PUN262700412</div>
      <Row label="Date" value="03-11-26 11:43" />
      <div className="mt-1.5 grid grid-cols-4 gap-x-1.5 border-t border-dashed border-black pt-1 text-[8px] font-bold">
        <span className="text-right">MRP</span>
        <span className="text-right">DISC</span>
        <span className="text-right">PRICE</span>
        <span className="text-right">AMOUNT</span>
      </div>
      <div className="mt-1 flex flex-col gap-1">
        {SAMPLE.lines.map((l, i) => {
          const disc = l.mrp > l.price ? Math.round(((l.mrp - l.price) / l.mrp) * 100) : 0;
          return (
            <div key={l.code}>
              <div className="flex items-baseline justify-between gap-1">
                <span className="font-semibold">
                  {i + 1}. {l.name}
                </span>
                <span className="shrink-0 text-[8px]">
                  {l.code} ×{l.qty}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-x-1.5 tabular-nums">
                <span className="text-right">{amount(l.mrp)}</span>
                <span className="text-right">{disc ? `${disc}%` : '—'}</span>
                <span className="text-right">{amount(l.price)}</span>
                <span className="text-right font-semibold">{amount(l.price * l.qty)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 border-t border-dashed border-black pt-1">
        <Row label="MRP total" value={amount(SAMPLE.mrpTotal)} />
        <Row label="You saved" value={amount(SAMPLE.mrpTotal - SAMPLE.payable)} />
      </div>
      <Row label="TOTAL" value={inr(SAMPLE.payable)} className="my-1.5 border-y border-black py-1 text-[13px] font-bold" />
      <div className="mt-1.5 flex flex-col items-center gap-0.5 border-t border-dashed border-black pt-1.5 text-center">
        {BILL_FOOTER.map((f) => (
          <div key={f} className="font-bold">
            {f}
          </div>
        ))}
        {BRAND.email && <div>{BRAND.email}</div>}
      </div>
      <div className="mt-1.5 border-y border-black py-1 text-center">
        <div className="tracking-[0.3em]" aria-hidden="true">
          * * * * *
        </div>
        <div className="mt-0.5 font-display text-[11px] italic">May your tree shine bright and your home be full of joy this Christmas.</div>
      </div>
    </div>
  );
};

/** The shop-on-the-bill fields and the composition toggle, bound to `values` and saved through onSave(key, value).
 *  The live sample bill on the right mirrors every field (`shop` gives the built-in fall-backs). */
const ShopFields = ({ values, onSave, shop }) => (
  <>
    <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-4">
        <StoreField label="Shop name" value={values.storeName} onSave={(v) => onSave('storeName', v)} placeholder="Shop name as printed on the bill" />
        <StoreField
          label="Address"
          hint="one line per line"
          value={values.storeAddress}
          onSave={(v) => onSave('storeAddress', v)}
          textarea
          placeholder="Shop address"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <StoreField label="Phone" value={values.storePhone} onSave={(v) => onSave('storePhone', v)} placeholder="Phone number" />
          <StoreField label="GSTIN" value={values.gstin} onSave={(v) => onSave('gstin', v)} placeholder="GSTIN" />
        </div>
        <p className="rounded-xl bg-mist-2 px-3 py-2 text-xs text-ink-3">
          Every bill ends with the fixed note <span className="font-medium text-ink-2">*NO EXCHANGE *NO RETURN · *NO GUARANTEE ON COLOURS</span> and a Christmas wish.
        </p>
      </div>
      <div className="lg:border-l lg:border-line-soft lg:pl-5">
        <div className="mb-2 text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase">Sample bill</div>
        <BillPreview values={values} shop={shop} />
      </div>
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

/** Admin only: the app's look, and switches that change what the showrooms can do. They are kept on the server,
 * so they apply on every computer; a change that the server refuses is put back. In the demo, the demo admin can
 * also start the demo again from scratch. */
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
    setResetting('Starting the demo again…');
    try {
      setResetting(await resetDemo());
    } catch (e) {
      setResetting(`Couldn’t reset the demo: ${e.message}`);
    }
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader crumbs={admin ? ['Admin', 'Settings'] : ['Settings']} onMenu={onMenu} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 p-3 lg:px-5 lg:py-4">
          <p className="text-[13px] text-ink-3">
            {admin
              ? 'Saved on the billing server. The business switches apply everywhere; the appearance below is the default each showroom starts from and can change for its own screens.'
              : 'The look of your showroom’s screens — theme and text size. Saved on the server for your showroom; the admin sets the defaults.'}
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
                <p className="mt-0.5 text-[13px] text-ink-3">
                  {admin
                    ? 'The default look for every screen, including sign-in. Each showroom can change it for its own screens. Changes show straight away.'
                    : 'Theme and text size for your showroom’s screens. Changes show straight away.'}
                </p>
              </div>
            </div>
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
          </section>

          <section className="overflow-hidden rounded-2xl border glass">
            <div className="flex items-start gap-4 border-b border-line-soft px-5 py-4">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-evergreen-50 text-evergreen-800">
                <Store size={17} aria-hidden="true" />
              </span>
              <div>
                <div className="text-[14px] font-semibold">Shop on the bill</div>
                <p className="mt-0.5 text-[13px] text-ink-3">
                  {admin
                    ? 'Each showroom’s own details, printed at the top of its bills. Pick a showroom to set its name, address, GSTIN and footer. A blank field falls back to the built-in details.'
                    : 'Your shop’s own details, printed at the top of every bill. A blank field falls back to the built-in showroom details. A composition dealer bills a “Bill of Supply” with no GST shown — only purchase orders and returns carry GST.'}
                </p>
              </div>
            </div>
            {admin ? <AdminStoreDetails /> : <ShopFields values={settings} onSave={setSetting} shop={locationById(session.location)} />}
          </section>

          {admin && (
            <>
          <section className="overflow-hidden rounded-2xl border glass">
            <div className="flex items-start gap-4 border-b border-line-soft px-5 py-4">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-evergreen-50 text-evergreen-800">
                <FileText size={17} aria-hidden="true" />
              </span>
              <div>
                <div className="text-[14px] font-semibold">Business details for invoices</div>
                <p className="mt-0.5 text-[13px] text-ink-3">
                  Your own business, printed as the seller on every invoice (the showroom is the buyer, with the details from its Shop on the bill).
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-4 p-5">
              <StoreField label="Business name" value={settings.bizName} onSave={(v) => setSetting('bizName', v)} placeholder="Legal name as on your GST registration" />
              <StoreField label="Address" hint="one line per line" value={settings.bizAddress} onSave={(v) => setSetting('bizAddress', v)} textarea placeholder="Street, area, city, PIN" />
              <div className="grid gap-4 sm:grid-cols-2">
                <StoreField label="State" value={settings.bizState} onSave={(v) => setSetting('bizState', v)} placeholder="e.g. Tamil Nadu" />
                <StoreField label="GSTIN" value={settings.bizGstin} onSave={(v) => setSetting('bizGstin', v.toUpperCase())} placeholder="15-character GSTIN" />
                <StoreField label="PAN" value={settings.bizPan} onSave={(v) => setSetting('bizPan', v.toUpperCase())} placeholder="PAN" />
                <StoreField label="Phone" value={settings.bizPhone} onSave={(v) => setSetting('bizPhone', v)} placeholder="Phone number" />
                <StoreField label="Email" value={settings.bizEmail} onSave={(v) => setSetting('bizEmail', v)} placeholder="Email" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <StoreField label="Bank" value={settings.bankName} onSave={(v) => setSetting('bankName', v)} placeholder="Bank and branch" />
                <StoreField label="Account number" value={settings.bankAccount} onSave={(v) => setSetting('bankAccount', v)} placeholder="Account number" />
                <StoreField label="IFSC" value={settings.bankIfsc} onSave={(v) => setSetting('bankIfsc', v.toUpperCase())} placeholder="IFSC" />
              </div>
              <StoreField label="Terms" hint="printed at the foot of the invoice" value={settings.invoiceTerms} onSave={(v) => setSetting('invoiceTerms', v)} textarea placeholder="Payment terms, jurisdiction…" />
              <p className="text-xs text-ink-3">
                An invoice to a showroom is a tax invoice: each product at its cost price (D.Rate) with its GST (18%) on top, split into CGST + SGST inside a
                state and IGST across states.
              </p>
            </div>
          </section>

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
                  Throws away everything done in the demo and starts it again clean: the five showrooms, the product list and the
                  season’s stock in the admin stock, with no sales, customers or orders. The real data is never touched.
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
