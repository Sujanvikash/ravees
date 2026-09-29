import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save, Upload, X, ImageOff } from 'lucide-react';
import { useAdminData } from '../context/AdminDataContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const FIELD =
  'rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 font-sans text-[0.88rem] text-white outline-none transition-all focus:border-gold-400 placeholder:text-text-muted';
const LABEL = 'text-[0.78rem] text-gold-300';

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export default function AdminProductForm() {
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

  const update = (key) => (e) =>
    setForm((prev) => ({
      ...prev,
      [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));

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
    reader.onload = () => setForm((prev) => ({ ...prev, image: reader.result }));
    reader.onerror = () => setImageError('Could not read that file.');
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const categoryLabel = categoryOptions.find((c) => c.id === form.category)?.name ?? 'Home Decors';
    const sizes = form.sizes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name: form.name.trim(),
      category: form.category,
      categoryLabel,
      description: form.description.trim(),
      sizes,
      image: form.image.trim(),
      images: form.image.trim() ? [form.image.trim()] : [],
      inStock: form.inStock,
      specs: form.specs,
      priceOnRequest: true,
    };

    if (existing) {
      products.update(existing.id, payload);
      showToast(`Updated "${payload.name}"`);
    } else {
      const newId = slugify(payload.name) || `product-${Date.now()}`;
      products.add({ ...payload, id: newId, sourceUrl: '' });
      showToast(`Created "${payload.name}"`);
    }
    navigate('/admin/products');
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/admin/products"
          className="mb-3 inline-flex items-center gap-1.5 text-[0.82rem] text-text-secondary no-underline hover:text-gold-300"
        >
          <ChevronLeft size={15} strokeWidth={2} />
          Back to products
        </Link>
        <h1 className="font-serif text-[1.6rem] font-bold tracking-[0.03em] text-white">
          {existing ? 'Edit product' : 'New product'}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid w-full gap-6 rounded-xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] p-6 md:p-8 lg:grid-cols-[1fr_360px]"
      >
        {/* Left column: fields */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL} htmlFor="p-name">
              Product name
            </label>
            <input id="p-name" required value={form.name} onChange={update('name')} className={FIELD} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL} htmlFor="p-category">
                Collection
              </label>
              <select
                id="p-category"
                value={form.category}
                onChange={update('category')}
                className={`${FIELD} cursor-pointer`}
              >
                {categoryOptions.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-bg-dark-emerald">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL} htmlFor="p-sizes">
                Sizes (comma separated)
              </label>
              <input
                id="p-sizes"
                value={form.sizes}
                onChange={update('sizes')}
                placeholder="6 Feet, 7 Feet, 8 Feet"
                className={FIELD}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={LABEL} htmlFor="p-desc">
              Description
            </label>
            <textarea
              id="p-desc"
              rows="8"
              value={form.description}
              onChange={update('description')}
              className={`${FIELD} min-h-[160px] flex-1 resize-y`}
            />
          </div>

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
            <button
              type="submit"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gold-200 bg-[linear-gradient(135deg,var(--color-gold-400),var(--color-gold-600))] px-5 py-2.5 text-[0.88rem] font-semibold text-[#04140b] transition-all hover:bg-[linear-gradient(135deg,#fff0c4,var(--color-gold-400))]"
            >
              <Save size={16} strokeWidth={2} />
              {existing ? 'Save changes' : 'Create product'}
            </button>
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
          <span className={LABEL}>Product image</span>

          <div
            className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-gold-400/25 bg-[#020805]"
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
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-gold-400/25 bg-white/5 px-4 py-2.5 text-[0.85rem] text-gold-300 transition-all hover:border-gold-400 hover:bg-gold-400/10"
          >
            <Upload size={15} strokeWidth={2} />
            {form.image ? 'Replace image' : 'Upload image'}
          </button>

          {imageError && <p className="text-[0.78rem] text-ruby-500">{imageError}</p>}
          <p className="text-[0.72rem] text-text-muted">JPG, PNG or WebP, up to 1.5 MB.</p>
        </div>
      </form>
    </div>
  );
}
