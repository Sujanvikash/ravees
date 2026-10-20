import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save, Upload, X, ImageOff } from 'lucide-react';
import { z } from 'zod';
import { useAdminData } from '../context/AdminDataContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import FormField from '../../components/FormField.jsx';
import { FIELD_LABEL_CLASS, errorProps } from '../../components/fieldError.js';
import Button from '../../components/Button.jsx';
import { Input, Select, Textarea } from '../../components/Input.jsx';
import AdminPageHeader from '../components/AdminPageHeader.jsx';
import { cardClass } from '../../components/cardClass.js';
import { focusFirstError, validate } from '../../lib/validation.js';
import { slugify } from '../components/adminForm.js';

const productSchema = z.object({
  name: z.string().trim().min(1, 'Please enter a product name').max(120, 'Keep the name under 120 characters'),
  category: z.string().min(1, 'Choose a collection'),
  description: z.string().trim().max(2000, 'Keep the description under 2000 characters'),
  sizes: z.string(),
  image: z.string().trim().min(1, 'Please add a product image'),
  inStock: z.boolean(),
  specs: z.array(z.unknown()),
});

const AdminProductForm = () => {
  const { id } = useParams();
  const { products, categories } = useAdminData();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const existing = id ? products.items.find((p) => p.id === id) : null;
  const categoryOptions = categories.items.filter((c) => c.id !== 'all');

  const [form, setForm] = useState(() => ({
    name: existing?.name ?? '',
    category: existing?.category ?? categoryOptions[0]?.id ?? '',
    description: existing?.description ?? '',
    sizes: (existing?.sizes ?? []).join(', '),
    image: existing?.image ?? '',
    inStock: existing?.inStock ?? true,
    specs: existing?.specs ?? [],
  }));
  const [imageError, setImageError] = useState('');
  const [errors, setErrors] = useState({});

  const clearError = (key) => setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const update = (key) => (e) => {
    setForm((prev) => ({
      ...prev,
      [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));
    clearError(key);
  };

  // No backend to upload to, so the file is read into a base64 data URL and stored
  // directly on the product — same localStorage-override approach as the rest of
  // the admin data (see AdminDataContext), just embedding the image bytes instead
  // of a path.
  const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('Image is too large — please use one under 1.5 MB.');
      return;
    }
    setImageError('');
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, image: reader.result }));
      clearError('image');
    };
    reader.onerror = () => setImageError('Could not read that file.');
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { data, errors: found } = validate(productSchema, form);
    // A new product's id comes from its name, so two products can't share a name.
    const newId = existing ? null : slugify(form.name) || `product-${Date.now()}`;
    const issues = found ?? {};
    if (newId && !issues.name && products.items.some((p) => p.id === newId)) {
      issues.name = 'A product with this name already exists';
    }
    if (Object.keys(issues).length) {
      setErrors(issues);
      focusFirstError(issues, 'p');
      return;
    }

    const categoryLabel = categoryOptions.find((c) => c.id === data.category)?.name ?? 'Home Decors';
    const sizes = data.sizes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name: data.name,
      category: data.category,
      categoryLabel,
      description: data.description,
      sizes,
      image: data.image,
      images: [data.image],
      inStock: data.inStock,
      specs: data.specs,
      priceOnRequest: true,
    };

    if (existing) {
      products.update(existing.id, payload);
      showToast(`Updated "${payload.name}"`);
    } else {
      products.add({ ...payload, id: newId, sourceUrl: '' });
      showToast(`Created "${payload.name}"`);
    }
    navigate('/admin/products');
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={existing ? 'Edit product' : 'New product'}
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

      <form
        onSubmit={handleSubmit}
        noValidate
        className={`${cardClass('tile')} grid w-full gap-6 p-6 md:p-8 lg:grid-cols-[1fr_360px]`}
      >
        {/* Left column: fields */}
        <div className="flex min-w-0 flex-col gap-4">
          <FormField label="Product name" htmlFor="p-name" error={errors.name}>
            <Input id="p-name" {...errorProps('p-name', errors.name)} required value={form.name} onChange={update('name')} />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Collection" htmlFor="p-category" error={errors.category}>
              <Select
                id="p-category"
                value={form.category}
                onChange={update('category')}
              >
                {categoryOptions.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-bg-dark-emerald">
                    {cat.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Sizes (comma separated)" htmlFor="p-sizes">
              <Input
                id="p-sizes"
                value={form.sizes}
                onChange={update('sizes')}
                placeholder="6 Feet, 7 Feet, 8 Feet"
              />
            </FormField>
          </div>

          <FormField label="Description" htmlFor="p-description" error={errors.description}>
            <Textarea
              id="p-description"
              {...errorProps('p-description', errors.description)}
              rows="8"
              value={form.description}
              onChange={update('description')}
              className="min-h-[160px] flex-1"
            />
          </FormField>

          <label className="flex cursor-pointer items-center gap-2.5 text-[0.88rem] text-text-secondary">
            <input
              type="checkbox"
              checked={form.inStock}
              onChange={update('inStock')}
              className="h-4 w-4 accent-gold-500"
            />
            In stock
          </label>

          <div className="mt-2 flex gap-3">
            <Button size="sm" type="submit">
              <Save size={16} strokeWidth={2} />
              {existing ? 'Save changes' : 'Create product'}
            </Button>
            <Link
              to="/admin/products"
              className="inline-flex items-center rounded-lg border border-gold-400/25 px-5 py-2.5 text-[0.88rem] text-text-secondary no-underline transition-all hover:border-gold-400 hover:text-white"
            >
              Cancel
            </Link>
          </div>
        </div>

        {/* Right column: image upload */}
        <div className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL_CLASS}>Product image</span>

          <div
            className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-gold-400/25 bg-bg-deepest"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFileSelect(e.dataTransfer.files?.[0]);
            }}
          >
            {form.image ? (
              <>
                <img src={form.image} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, image: '' }))}
                  className="absolute top-2 right-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/60 text-white transition-all hover:border-ruby-500 hover:text-ruby-500"
                  title="Remove image"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 px-6 text-center text-text-muted">
                <ImageOff size={28} strokeWidth={1.5} />
                <span className="text-[0.78rem]">No image selected</span>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />
          <button
            id="p-image"
            type="button"
            {...errorProps('p-image', errors.image)}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-gold-400/25 bg-white/5 px-4 py-2.5 text-[0.85rem] text-gold-300 transition-all hover:border-gold-400 hover:bg-gold-400/10"
          >
            <Upload size={15} strokeWidth={2} />
            {form.image ? 'Replace image' : 'Upload image'}
          </button>

          {(imageError || errors.image) && (
            <p id="p-image-error" className="text-[0.78rem] text-ruby-500">
              {imageError || errors.image}
            </p>
          )}
          <p className="text-[0.72rem] text-text-muted">JPG, PNG or WebP, up to 1.5 MB.</p>
        </div>
      </form>
    </div>
  );
};

export default AdminProductForm;
