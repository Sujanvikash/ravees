import { useState } from 'react';
import { CircleAlert, Pencil, Tag } from 'lucide-react';
import { DEPARTMENTS, editProduct, GST_RATES, PRODUCTS } from '../lib/catalogue.js';
import { inr } from '../lib/money.js';
import Dialog from './Dialog.jsx';

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

// '' stays empty (left out); "1,200" reads as 1200
const money = (v) => (v.trim() === '' ? null : Number(v.replace(/[,\s₹]/g, '')));

const formOf = (p) => ({
  name: p.name,
  type: p.type || 'Product',
  dept: p.dept ?? '',
  mrp: String(p.mrp),
  // no offer price (0) or one equal to the MRP shows empty: it sells at MRP
  offer: p.offer > 0 && p.offer !== p.mrp ? String(p.offer) : '',
  cost: String(p.cost ?? 0),
  gst: String(p.gst),
  hsn: p.hsn ?? '',
  barcode: p.barcode ?? '',
});

/**
 * Admin: every detail of a product, from Inventory. The code can't change (stock, bills, orders and invoices all
 * point at it). Bills, quotations and invoices already made keep what they were made with; the new name and
 * prices apply from the next one. Showroom counters pick the change up when they next load the products.
 */
const EditProductDialog = ({ product, onClose, onDone }) => {
  const [form, setForm] = useState(() => formOf(product));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const start = formOf(product);
  const dirty = Object.keys(form).some((k) => form[k] !== start[k]);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setError('');
  };

  // categories and types already in use, so a new one is typed only on purpose; the GST list keeps an odd rate
  // the Excel brought in
  const types = [...new Set(PRODUCTS.map((p) => p.type).filter(Boolean))].sort();
  const gstRates = GST_RATES.includes(product.gst) ? GST_RATES : [...GST_RATES, product.gst].sort((a, b) => a - b);

  const mrp = money(form.mrp);
  const offer = money(form.offer);
  const price = offer ?? mrp;
  const disc = mrp > 0 && price > 0 && price < mrp ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const barcode = form.barcode.replace(/\s/g, '');
  const sameBarcode = barcode && barcode !== product.barcode && PRODUCTS.find((p) => p.code !== product.code && p.barcode === barcode);

  const save = async (e) => {
    e.preventDefault();
    const cost = money(form.cost);
    const name = form.name.trim().replace(/\s+/g, ' ');
    if (name.length < 2) return setError('Give the product a name.');
    if (!(mrp > 0)) return setError('Enter the MRP (more than ₹0).');
    if (offer !== null && !(offer > 0 && offer <= mrp)) return setError('The offer price must be more than ₹0 and not above the MRP.');
    if (cost !== null && !(cost >= 0)) return setError('The cost price must be a number.');
    if (sameBarcode) return setError(`That barcode is already on ${sameBarcode.code} · ${sameBarcode.name}.`);

    setBusy(true);
    try {
      const saved = await editProduct(product.code, {
        name,
        type: form.type.trim().replace(/\s+/g, ' ') || 'Product',
        dept: form.dept.trim().replace(/\s+/g, ' '),
        mrp,
        offer,
        cost: cost ?? 0,
        gst: Number(form.gst),
        hsn: form.hsn.trim(),
        barcode,
      });
      onDone(saved);
    } catch (err) {
      setBusy(false);
      setError(err.message);
    }
  };

  return (
    <Dialog
      id="edit-product"
      title="Edit product"
      subtitle="Bills, quotations and invoices already made keep their old details. New ones use these."
      onClose={onClose}
      size="max-w-xl"
    >
      <form onSubmit={save} noValidate>
        <div className="flex flex-col gap-4 px-6 pb-5">
          <div className="flex items-center gap-3 rounded-xl bg-evergreen-50 px-4 py-3">
            <Tag size={18} className="shrink-0 text-evergreen-800" aria-hidden="true" />
            <div className="leading-tight">
              <div className="font-mono text-base font-semibold text-evergreen-900">{product.code}</div>
              <div className="text-xs text-ink-3">
                The product code stays the same: stock, bills and orders are kept under it.
                {product.shop && ` Added by ${product.shop.by}.`}
              </div>
            </div>
          </div>

          <Field id="ep-name" label="Product name">
            <input id="ep-name" autoFocus value={form.name} onChange={set('name')} className={field} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="ep-dept" label="Category">
              <input id="ep-dept" list="ep-depts" value={form.dept} onChange={set('dept')} placeholder="Choose or type" className={field} />
              <datalist id="ep-depts">
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </Field>
            <Field id="ep-type" label="Type">
              <input id="ep-type" list="ep-types" value={form.type} onChange={set('type')} className={field} />
              <datalist id="ep-types">
                {types.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </Field>
            <Field id="ep-gst" label="GST">
              <select id="ep-gst" value={form.gst} onChange={set('gst')} className={field}>
                {gstRates.map((r) => (
                  <option key={r} value={String(r)}>
                    {r}%
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="ep-mrp" label="MRP ₹">
              <input id="ep-mrp" inputMode="decimal" value={form.mrp} onChange={set('mrp')} className={`${field} tabular-nums`} />
            </Field>
            <Field id="ep-offer" label="Offer price ₹" hint="optional">
              <input id="ep-offer" inputMode="decimal" value={form.offer} onChange={set('offer')} placeholder="same as MRP" className={`${field} tabular-nums`} />
            </Field>
            <Field id="ep-cost" label="Cost price ₹" hint="D.Rate">
              <input id="ep-cost" inputMode="decimal" value={form.cost} onChange={set('cost')} className={`${field} tabular-nums`} />
            </Field>
          </div>
          {mrp > 0 && price > 0 && price <= mrp && (
            <p className="-mt-2 text-xs text-ink-3 tabular-nums">
              Sells at <span className="font-semibold text-ink-2">{inr(price)}</span>
              {disc > 0 ? ` · ${disc}% off the MRP of ${inr(mrp)}` : ' · at MRP'}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="ep-barcode" label="Barcode" hint="if it has one">
              <input id="ep-barcode" value={form.barcode} onChange={set('barcode')} className={`${field} font-mono`} aria-invalid={Boolean(sameBarcode)} />
            </Field>
            <Field id="ep-hsn" label="HSN code" hint="optional">
              <input id="ep-hsn" value={form.hsn} onChange={set('hsn')} className={field} />
            </Field>
          </div>
          {sameBarcode && (
            <p className="-mt-2 flex items-center gap-1.5 text-xs text-warn-ink">
              <CircleAlert size={13} aria-hidden="true" /> {sameBarcode.code} · {sameBarcode.name} already has this barcode.
            </p>
          )}

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
            disabled={busy || !dirty}
            type="submit"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(9,9,11,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-evergreen-900 disabled:opacity-50"
          >
            <Pencil size={15} aria-hidden="true" /> {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Dialog>
  );
};

export default EditProductDialog;
