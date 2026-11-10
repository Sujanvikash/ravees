import { useEffect, useState } from 'react';
import { ImagePlus, LoaderCircle } from 'lucide-react';
import { productImages, setProductImage } from '../lib/catalogue.js';

/** A product's picture as a square; clicking it, or dropping a photo on it, picks a new one. With no picture yet it
 *  is a clear green "Add photo" box. The picture is the product's own, so a new one is what every later quotation
 *  prints. */
const ProductPicture = ({ product }) => {
  const [src, setSrc] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [over, setOver] = useState(false); // a photo is being dragged over it
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
    if (!file.type.startsWith('image/')) return setError('That isn’t a photo: pick a JPG or PNG.');
    setBusy(true);
    setError('');
    try {
      await setProductImage(code, file);
    } catch (err) {
      setError(`Not saved: ${err.message}`);
    }
    setBusy(false);
  };

  const shown = hasImage && src;
  return (
    <label
      title={error || (hasImage ? 'Change the photo' : 'Add a photo: it prints on the quotation')}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files[0];
        if (file) pick(file);
      }}
      className={`group/pic relative flex size-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl text-center transition-colors ${
        shown ? 'border border-line bg-white hover:border-evergreen-800' : 'border-[1.5px] border-dashed border-evergreen-800/60 bg-evergreen-50 text-evergreen-800 hover:border-solid hover:border-evergreen-800 hover:bg-evergreen-100'
      } ${over ? 'ring-3 ring-evergreen-800/30' : ''} ${error ? 'border-ruby! bg-ruby-50! text-ruby-ink!' : ''}`}
    >
      {shown ? (
        <>
          <img src={src} alt={`${product.name}, click to change`} className="size-full object-cover" />
          <span className="absolute inset-x-0 bottom-0 bg-zinc-950/55 py-0.5 text-[9.5px] font-semibold text-white opacity-0 transition-opacity group-hover/pic:opacity-100">
            Change
          </span>
        </>
      ) : (
        <span className="flex flex-col items-center gap-0.5 text-[10px] leading-tight font-semibold">
          <ImagePlus size={19} strokeWidth={2.2} aria-hidden="true" />
          {hasImage ? '…' : 'Add photo'}
        </span>
      )}
      {busy && (
        <span className="absolute inset-0 flex items-center justify-center bg-white/75">
          <LoaderCircle size={18} className="animate-spin text-evergreen-800" aria-hidden="true" />
        </span>
      )}
      <span className="sr-only" role="status">
        {error}
      </span>
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={`${hasImage ? 'Change' : 'Add'} photo of ${product.name}`}
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
