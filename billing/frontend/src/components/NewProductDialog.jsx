import { useState } from 'react';
import { CircleAlert, Tag } from 'lucide-react';
import { LOCATIONS, locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { addShopProduct, DEPARTMENTS, GST_RATES, nextShopCode, PRODUCTS } from '../lib/catalogue.js';
import Dialog from './Dialog.jsx';
import { LocationPicker } from './Filters.jsx';

const field =
  'h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink placeholder:text-ink-3 focus:border-evergreen-800/50 focus:shadow-[0_0_0_3px_rgba(23,92,38,0.10)] aria-invalid:border-ruby';

const Field = ({ id, label, hint, children }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
      {label} {hint && <span className="font-normal text-ink-3">{hint}</span>}
    </label>
    {children}
  </div>
);

const money = (v) => (v === '' ? null : Number(v));

/**
 * A showroom's own product, for items without a barcode. Its code is made from the showroom's bill prefix
 * (CHN-0001…), so codes from different showrooms never clash. Units already in the shop can be entered too;
 * they are added to stock and show in the inventory history as "New product".
 */
const NewProductDialog = ({ session, defaultLocation, onClose, onDone }) => {
  const admin = session.role === 'admin';
  const { importStock } = useStore();
  const [location, setLocation] = useState(admin ? (defaultLocation ?? LOCATIONS[0].id) : session.location);
  const [form, setForm] = useState({ name: '', dept: '', mrp: '', offer: '', cost: '', gst: '18', hsn: '', qty: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const shop = locationById(location);
  const code = nextShopCode(shop.billPrefix);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setError('');
  };

  const sameName = form.name.trim().length > 2 && PRODUCTS.find((p) => p.name.toLowerCase() === form.name.trim().toLowerCase());

  const save = async (e) => {
    e.preventDefault();
    const mrp = money(form.mrp);
    const offer = money(form.offer);
    const cost = money(form.cost);
    const qty = form.qty === '' ? 0 : Number(form.qty);
    if (!form.name.trim()) return setError('Give the product a name.');
    if (!form.dept) return setError('Choose a category.');
    if (!(mrp > 0)) return setError('Enter the MRP (more than ₹0).');
    if (offer !== null && !(offer > 0 && offer <= mrp)) return setError('The offer price must be more than ₹0 and not above the MRP.');
    if (cost !== null && !(cost >= 0)) return setError('The cost price must be a number.');
    if (!Number.isInteger(qty) || qty < 0) return setError('Units in the shop must be a whole number.');

    const at = new Date().toISOString();
    const by = admin ? 'Admin' : shop.city; // same as purchase order history
    let product;
    setBusy(true);
    try {
      // the server gives it its code (the next free one for this showroom)
      product = await addShopProduct({
        location,
        name: form.name.trim().replace(/\s+/g, ' '),
        dept: form.dept,
        hsn: form.hsn.trim(),
        mrp,
        offer: offer ?? mrp,
        cost: cost ?? 0,
        gst: Number(form.gst),
      });
    } catch (err) {
      setBusy(false);
      return setError(err.message);
    }
    if (qty > 0) {
      importStock({
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        at,
        by,
        username: session.username,
        location,
        file: 'New product',
        source: 'new-product',
        lines: [{ code: product.code, name: product.name, qty, rate: product.cost }],
      });
    }
    onDone(product, qty);
  };

  return (
    <Dialog id="new-product" title="New product" subtitle="For items without a barcode. It can be billed by its code straight away." onClose={onClose} size="max-w-xl">
      <form onSubmit={save} noValidate>
        <div className="flex flex-col gap-4 px-6 pb-5">
          {admin && <LocationPicker value={location} onChange={setLocation} all={false} />}

          <div className="flex items-center gap-3 rounded-xl bg-evergreen-50 px-4 py-3">
            <Tag size={18} className="shrink-0 text-evergreen-800" aria-hidden="true" />
            <div className="leading-tight">
              <div className="font-mono text-base font-semibold text-evergreen-900">{code}</div>
              <div className="text-xs text-ink-3">
                Next product code for {shop.city}; confirmed when you add it. Write it on the item or its tag, and type it at the billing counter.
              </div>
            </div>
          </div>

          <Field id="np-name" label="Product name">
            <input id="np-name" autoFocus value={form.name} onChange={set('name')} placeholder="e.g. Handmade wreath 12 inch" className={field} />
          </Field>
          {sameName && (
            <p className="-mt-2 flex items-center gap-1.5 text-xs text-warn-ink">
              <CircleAlert size={13} aria-hidden="true" /> {sameName.code} already has this name. Check it isn’t the same item.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="np-dept" label="Category">
              <select id="np-dept" value={form.dept} onChange={set('dept')} className={field}>
                <option value="">Choose…</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field id="np-gst" label="GST">
              <select id="np-gst" value={form.gst} onChange={set('gst')} className={field}>
                {GST_RATES.map((r) => (
                  <option key={r} value={r}>
                    {r}%
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="np-mrp" label="MRP ₹">
              <input id="np-mrp" inputMode="decimal" value={form.mrp} onChange={set('mrp')} className={`${field} tabular-nums`} />
            </Field>
            <Field id="np-offer" label="Offer price ₹" hint="optional">
              <input id="np-offer" inputMode="decimal" value={form.offer} onChange={set('offer')} placeholder="same as MRP" className={`${field} tabular-nums`} />
            </Field>
            <Field id="np-cost" label="Cost price ₹" hint="optional">
              <input id="np-cost" inputMode="decimal" value={form.cost} onChange={set('cost')} className={`${field} tabular-nums`} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="np-hsn" label="HSN code" hint="optional">
              <input id="np-hsn" value={form.hsn} onChange={set('hsn')} className={field} />
            </Field>
            <Field id="np-qty" label="Units in the shop now" hint="optional">
              <input id="np-qty" inputMode="numeric" value={form.qty} onChange={set('qty')} placeholder="0" className={`${field} tabular-nums`} />
            </Field>
          </div>

          {error && (
            <p role="alert" className="flex animate-pop items-center gap-1.5 text-[13px] font-medium text-ruby-ink">
              <CircleAlert size={14} aria-hidden="true" /> {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line-soft bg-mist-2 px-6 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-3.5 text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink">
            Cancel
          </button>
          <button
            disabled={busy}
            type="submit"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(9,9,11,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-evergreen-900"
          >
            <Tag size={15} aria-hidden="true" /> {busy ? 'Adding…' : 'Add product'}
          </button>
        </div>
      </form>
    </Dialog>
  );
};

export default NewProductDialog;
