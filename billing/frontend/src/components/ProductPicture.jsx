import { useEffect, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { productImages, setProductImage } from '../lib/catalogue.js';

/** A product's picture as a small square; clicking it picks a new one. With no picture yet it is an "Add picture"
 *  box. The picture is the product's own, so a new one is what every later quotation prints. */
const ProductPicture = ({ product }) => {
  const [src, setSrc] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { code, hasImage } = product;

  useEffect(() => {
    let current = true;
    if (!hasImage) return undefined;
    productImages([code])
      .then((m) => current && setSrc(m[code] ?? null))
      .catch(() => current && setSrc(null));
    return () => {
      current = false;
    };
  }, [code, hasImage]);

  const pick = async (file) => {
    setBusy(true);
    setError('');
    try {
      await setProductImage(code, file);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <label
      title={error || (hasImage ? 'Change the picture' : 'Add a picture for the quotation')}
      className={`relative flex size-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border bg-white text-center text-[9px] leading-tight font-medium text-ink-3 hover:border-evergreen-800/50 ${error ? 'border-ruby' : 'border-line'} ${busy ? 'opacity-50' : ''}`}
    >
      {hasImage && src ? (
        <img src={src} alt={`${product.name}, click to change`} className="size-full object-cover" />
      ) : (
        <span className="flex flex-col items-center gap-0.5">
          <ImagePlus size={15} aria-hidden="true" />
          {hasImage ? '…' : 'Picture'}
        </span>
      )}
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={`${hasImage ? 'Change' : 'Add'} picture of ${product.name}`}
        onChange={(e) => {
          const file = e.target.files[0];
          e.target.value = '';
          if (file) pick(file);
        }}
      />
    </label>
  );
};

export default ProductPicture;
