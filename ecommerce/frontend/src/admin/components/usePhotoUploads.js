import { useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { photoProblem } from './adminForm.js';

let nextKey = 0;

/**
 * Photos being edited: those already saved (`initial`, [{ id, url }]) and new files, each uploaded to
 * `POST /admin/images` as soon as it is chosen. A photo is
 *   { key, id, url, status: 'done' | 'uploading' | 'error', progress (0–1), error }
 * `ids` are the uploaded ones in order (the first is the main photo); `busy` while any is still going up.
 * `single`: choosing a file replaces the photo (a category has one).
 */
export const usePhotoUploads = (initial = [], { single = false } = {}) => {
  const { uploadImage } = useAdminAuth();
  const [photos, setPhotos] = useState(() =>
    initial.map((photo) => ({ ...photo, key: `saved-${photo.id}`, status: 'done', progress: 1, error: '' }))
  );

  const patch = (key, changes) => setPhotos((prev) => prev.map((p) => (p.key === key ? { ...p, ...changes } : p)));

  const addFiles = (fileList) => {
    const files = [...(fileList ?? [])].slice(0, single ? 1 : undefined);
    for (const file of files) {
      nextKey += 1;
      const key = `new-${nextKey}`;
      const problem = photoProblem(file);
      // Shown straight away from the file itself, then from the server once it is uploaded.
      const preview = problem ? null : URL.createObjectURL(file);
      const photo = { key, id: null, url: preview, status: problem ? 'error' : 'uploading', progress: 0, error: problem };
      setPhotos((prev) => (single ? [photo] : [...prev, photo]));
      if (problem) continue;
      uploadImage(file, (progress) => patch(key, { progress })).then(
        (image) => {
          patch(key, { id: image.id, url: image.cardUrl ?? image.url, status: 'done', progress: 1 });
          URL.revokeObjectURL(preview);
        },
        (err) => patch(key, { status: 'error', error: `${file.name}: ${err.message}` })
      );
    }
  };

  const remove = (key) => setPhotos((prev) => prev.filter((p) => p.key !== key));

  /** Moves a photo one place earlier (-1) or later (+1); moving one to the front makes it the main photo. */
  const move = (key, dir) =>
    setPhotos((prev) => {
      const from = prev.findIndex((p) => p.key === key);
      const to = from + dir;
      if (from < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });

  return {
    photos,
    addFiles,
    remove,
    move,
    ids: photos.filter((p) => p.status === 'done' && p.id).map((p) => p.id),
    busy: photos.some((p) => p.status === 'uploading'),
  };
};
