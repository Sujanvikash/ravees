import { useRef } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, LoaderCircle, TriangleAlert, X } from 'lucide-react';
import { FIELD_LABEL_CLASS } from '../../components/fieldError.js';

const ROUND =
  'flex size-7 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/60 text-white transition-all hover:border-gold-400 hover:text-gold-300 disabled:cursor-default disabled:opacity-30';

/**
 * A product's photos (from usePhotoUploads): a grid of tiles, each with ‹ › to change its place and × to
 * remove it, the first marked "Main"; an upload tile that takes several files at once (or a drop); progress
 * while a photo goes up, and the reason when one can't be used.
 */
const PhotoGallery = ({ uploads, id = 'p-photos' }) => {
  const inputRef = useRef(null);
  const { photos, addFiles, remove, move } = uploads;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={FIELD_LABEL_CLASS}>
        Photos
      </label>

      <ul
        className="grid list-none grid-cols-2 gap-3 sm:grid-cols-3"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
      >
        {photos.map((photo, i) => (
          <li
            key={photo.key}
            className={`relative aspect-square overflow-hidden rounded-lg border bg-bg-deepest ${
              photo.status === 'error' ? 'border-ruby-500/60' : i === 0 ? 'border-gold-400' : 'border-gold-400/20'
            }`}
          >
            {photo.url && <img src={photo.url} alt="" className={`size-full object-cover ${photo.status === 'done' ? '' : 'opacity-40'}`} />}

            {photo.status === 'uploading' && (
              <div className="absolute inset-x-2 bottom-2 flex flex-col items-center gap-1.5">
                <LoaderCircle size={18} strokeWidth={2} className="animate-spin text-gold-300" />
                <progress
                  value={photo.progress}
                  max={1}
                  aria-label="Upload progress"
                  className="h-1.5 w-full appearance-none overflow-hidden rounded-full border-0 bg-white/10 [&::-moz-progress-bar]:bg-gold-400 [&::-webkit-progress-bar]:bg-white/10 [&::-webkit-progress-value]:bg-gold-400"
                />
              </div>
            )}

            {photo.status === 'error' && (
              <p className="absolute inset-x-1.5 bottom-1.5 flex items-start gap-1 rounded bg-black/75 p-1.5 text-[0.68rem] leading-snug text-ruby-500">
                <TriangleAlert size={12} strokeWidth={2} className="mt-0.5 shrink-0" />
                {photo.error}
              </p>
            )}

            {i === 0 && photo.status === 'done' && (
              <span className="absolute top-1.5 left-1.5 rounded bg-gold-500 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-on-gold">Main</span>
            )}

            <div className="absolute top-1.5 right-1.5 flex gap-1">
              {photo.status !== 'error' && (
                <>
                  <button type="button" onClick={() => move(photo.key, -1)} disabled={i === 0} aria-label="Move photo earlier" className={ROUND}>
                    <ChevronLeft size={14} strokeWidth={2} />
                  </button>
                  <button type="button" onClick={() => move(photo.key, 1)} disabled={i === photos.length - 1} aria-label="Move photo later" className={ROUND}>
                    <ChevronRight size={14} strokeWidth={2} />
                  </button>
                </>
              )}
              <button type="button" onClick={() => remove(photo.key)} aria-label="Remove photo" className={`${ROUND} hover:border-ruby-500! hover:text-ruby-500!`}>
                <X size={14} strokeWidth={2} />
              </button>
            </div>
          </li>
        ))}

        <li>
          <button
            id={id}
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gold-400/30 bg-white/3 px-3 text-center text-[0.78rem] text-gold-300 transition-all hover:border-gold-400 hover:bg-gold-400/10"
          >
            <ImagePlus size={24} strokeWidth={1.5} />
            Add photos
          </button>
        </li>
      </ul>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = ''; // choosing the same file again still counts
        }}
      />
      <p className="text-[0.72rem] text-text-muted">
        JPEG, PNG or WebP, up to 15 MB each; drop them here or choose several at once. The first photo is the main one.
      </p>
    </div>
  );
};

export default PhotoGallery;
