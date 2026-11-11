import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Plus, Save, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { useAdminData } from '../context/AdminDataContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import FormField from '../../components/FormField.jsx';
import FormError from '../../components/FormError.jsx';
import IconButton from '../../components/IconButton.jsx';
import { errorProps } from '../../components/fieldError.js';
import Button from '../../components/Button.jsx';
import { Input, Select, Textarea } from '../../components/Input.jsx';
import AdminPageHeader from '../components/AdminPageHeader.jsx';
import PhotoGallery from '../components/PhotoGallery.jsx';
import { usePhotoUploads } from '../components/usePhotoUploads.js';
import { ADMIN_CHECK, rupeesOrNull } from '../components/adminForm.js';
import { cardClass } from '../../components/cardClass.js';
import { focusFirstError, validate } from '../../lib/validation.js';

// Rupees from a number field: empty means "no price" (the shop then leaves the product out: not for sale yet).
const rupees = z
  .string()
  .transform(rupeesOrNull)
  .refine((value) => value === null || (Number.isFinite(value) && value > 0), 'Enter an amount in rupees, e.g. 12500');

const productSchema = z
  .object({
    name: z.string().trim().min(1, 'Please enter a product name').max(120, 'Keep the name under 120 characters'),
    category: z.string().min(1, 'Choose a collection'),
    description: z.string().trim().max(4000, 'Keep the description under 4000 characters'),
    sizes: z.string(),
    price: rupees,
    mrp: rupees,
    inStock: z.boolean(),
    visible: z.boolean(),
    featured: z.boolean(),
  })
  .refine((d) => d.mrp === null || d.price !== null, { path: ['mrp'], message: 'An MRP is only shown beside a price: add the price too' })
  .refine((d) => d.mrp === null || d.price === null || d.mrp >= d.price, { path: ['mrp'], message: 'The MRP should be at least the price' });

const INLINE_BTN =
  'inline-flex cursor-pointer items-center gap-1.5 self-start rounded-lg border border-gold-400/25 bg-transparent px-3 py-2 text-[0.8rem] text-gold-300 transition-all hover:border-gold-400 hover:bg-gold-400/10';

/** The editor itself, for a product (`existing`) or a new one. */
const ProductEditor = ({ existing }) => {
  const { products, categories } = useAdminData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState(() => ({
    name: existing?.name ?? '',
    category: existing?.category ?? categories.items[0]?.id ?? '',
    description: existing?.description ?? '',
    sizes: (existing?.sizes ?? []).join(', '),
    price: existing?.price != null ? String(existing.price) : '',
    mrp: existing?.mrp != null ? String(existing.mrp) : '',
    inStock: existing?.inStock ?? true,
    visible: existing?.visible ?? true,
    featured: existing?.featured ?? false,
  }));
  const [specs, setSpecs] = useState(() => (existing?.specs ?? []).map((spec) => ({ ...spec })));
  const uploads = usePhotoUploads((existing?.imageIds ?? []).map((id, i) => ({ id, url: existing.images?.[i] })));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const setSpec = (i, key, value) => setSpecs((prev) => prev.map((spec, k) => (k === i ? { ...spec, [key]: value } : spec)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const { data, errors: found } = validate(productSchema, form);
    if (found) {
      setErrors(found);
      focusFirstError(found, 'p');
      return;
    }
    setErrors({});

    const body = {
      name: data.name,
      category: data.category,
      description: data.description,
      specs: specs
        .map((spec) => ({ label: spec.label.trim(), value: spec.value.trim() }))
        .filter((spec) => spec.label && spec.value),
      sizes: data.sizes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      price: data.price,
      mrp: data.mrp,
      inStock: data.inStock,
      visible: data.visible,
      featured: data.featured,
      imageIds: uploads.ids,
    };

    setSaving(true);
    try {
      if (existing) {
        await products.update(existing.id, body);
        showToast(`Saved "${body.name}"`);
      } else {
        await products.create(body);
        showToast(`Created "${body.name}"`);
      }
      navigate('/admin/products');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={`${cardClass('tile')} grid w-full gap-6 p-6 md:p-8 lg:grid-cols-[1fr_400px]`}
    >
      {/* Left column: the details */}
      <div className="flex min-w-0 flex-col gap-4">
        <FormField label="Product name" htmlFor="p-name" error={errors.name}>
          <Input id="p-name" {...errorProps('p-name', errors.name)} required value={form.name} onChange={update('name')} />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Collection" htmlFor="p-category" error={errors.category}>
            <Select id="p-category" value={form.category} onChange={update('category')}>
              {categories.items.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-bg-dark-emerald">
                  {cat.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Sizes (comma separated)" htmlFor="p-sizes">
            <Input id="p-sizes" value={form.sizes} onChange={update('sizes')} placeholder="6 ft, 7 ft, 8 ft" />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Price (₹, GST included)" htmlFor="p-price" error={errors.price}>
            <Input
              id="p-price"
              {...errorProps('p-price', errors.price)}
              type="number"
              min="1"
              step="any"
              inputMode="decimal"
              value={form.price}
              onChange={update('price')}
              placeholder="Empty: hidden from the shop"
            />
          </FormField>
          <FormField label="MRP (₹, shown struck through)" htmlFor="p-mrp" error={errors.mrp}>
            <Input
              id="p-mrp"
              {...errorProps('p-mrp', errors.mrp)}
              type="number"
              min="1"
              step="any"
              inputMode="decimal"
              value={form.mrp}
              onChange={update('mrp')}
              placeholder="Optional"
            />
          </FormField>
        </div>
        <p className="-mt-2 text-[0.75rem] text-text-muted">
          Customers add products to their cart and pay online. A product without a price isn&apos;t for sale yet: it
          stays hidden from the shop until it has one.
        </p>

        <FormField label="Description" htmlFor="p-description" error={errors.description}>
          <Textarea
            id="p-description"
            {...errorProps('p-description', errors.description)}
            rows="6"
            value={form.description}
            onChange={update('description')}
            className="min-h-[140px]"
          />
        </FormField>

        <FormField label="Specifications" htmlFor="p-spec-0-label">
          <div className="flex flex-col gap-2">
            {specs.map((spec, i) => (
              <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] items-center gap-2">
                <Input
                  id={`p-spec-${i}-label`}
                  size="sm"
                  aria-label={`Specification ${i + 1}: name`}
                  value={spec.label}
                  onChange={(e) => setSpec(i, 'label', e.target.value)}
                  placeholder="Height"
                  className="w-full min-w-0"
                />
                <Input
                  size="sm"
                  aria-label={`Specification ${i + 1}: value`}
                  value={spec.value}
                  onChange={(e) => setSpec(i, 'value', e.target.value)}
                  placeholder="7 ft"
                  className="w-full min-w-0"
                />
                <IconButton
                  variant="delete"
                  label={`Remove specification ${i + 1}`}
                  onClick={() => setSpecs((prev) => prev.filter((_, k) => k !== i))}
                >
                  <Trash2 size={13} strokeWidth={2} />
                </IconButton>
              </div>
            ))}
            <button type="button" onClick={() => setSpecs((prev) => [...prev, { label: '', value: '' }])} className={INLINE_BTN}>
              <Plus size={14} strokeWidth={2} />
              Add a specification
            </button>
          </div>
        </FormField>

        <FormField label="On the shop" htmlFor="p-instock">
          <div className="flex flex-wrap gap-x-6 gap-y-2.5">
            <label className={ADMIN_CHECK}>
              <input id="p-instock" type="checkbox" checked={form.inStock} onChange={update('inStock')} className="h-4 w-4 accent-forest" />
              In stock
            </label>
            <label className={ADMIN_CHECK}>
              <input type="checkbox" checked={form.visible} onChange={update('visible')} className="h-4 w-4 accent-forest" />
              Visible on the website
            </label>
            <label className={ADMIN_CHECK}>
              <input type="checkbox" checked={form.featured} onChange={update('featured')} className="h-4 w-4 accent-forest" />
              Featured
            </label>
          </div>
        </FormField>

        <FormError>{error}</FormError>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button size="sm" type="submit" disabled={saving || uploads.busy}>
            <Save size={16} strokeWidth={2} />
            {saving ? 'Saving...' : existing ? 'Save changes' : 'Create product'}
          </Button>
          <Link
            to="/admin/products"
            className="inline-flex items-center rounded-lg border border-gold-400/25 px-5 py-2.5 text-[0.88rem] text-text-secondary no-underline transition-all hover:border-gold-400 hover:text-text-primary"
          >
            Cancel
          </Link>
          {uploads.busy && <span className="text-[0.78rem] text-text-muted">Waiting for the photos to finish uploading…</span>}
        </div>
      </div>

      {/* Right column: the photos */}
      <PhotoGallery uploads={uploads} />
    </form>
  );
};

/** New product (`/admin/products/new`) or edit one (`/admin/products/:id/edit`). */
const AdminProductForm = () => {
  const { id } = useParams();
  const { products } = useAdminData();
  const existing = id ? products.items.find((p) => p.id === id) : null;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={existing ? `Edit ${existing.name}` : 'New product'}
        before={
          <Link
            to="/admin/products"
            className="mb-3 inline-flex items-center gap-1.5 text-[0.82rem] text-text-secondary no-underline hover:text-gold-300"
          >
            <ChevronLeft size={15} strokeWidth={2} />
            Back to products
          </Link>
        }
      />

      {id && !existing ? (
        <p className={`${cardClass('tile')} px-6 py-12 text-center text-text-muted`}>
          There is no product &ldquo;{id}&rdquo;. It may have been deleted.
        </p>
      ) : (
        <ProductEditor key={existing?.id ?? 'new'} existing={existing} />
      )}
    </div>
  );
};

export default AdminProductForm;
