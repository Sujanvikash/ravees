import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Progressive load order: first frame, last frame, then a coarse pass
 * (every 32nd frame) that is refined down to every frame. The animation
 * is scrubbable end-to-end within the first ~10 requests and gets smoother
 * as the rest arrive, instead of loading 1 → 242 in a straight line.
 */
function buildLoadOrder(count) {
  const seen = new Uint8Array(count);
  const order = [];
  const push = (i) => {
    if (i >= 0 && i < count && !seen[i]) {
      seen[i] = 1;
      order.push(i);
    }
  };
  push(0);
  push(count - 1);
  for (const stride of [32, 16, 8, 4, 2, 1]) {
    for (let i = 0; i < count; i += stride) push(i);
  }
  return order;
}

/**
 * Decodes a frame. createImageBitmap(Blob) decodes on a background thread, which is the
 * whole point: decoding a <img> (or createImageBitmap(<img>)) happens on the main thread
 * and cost ~55 ms per 1080p WebP, stalling the scroll. Old browsers fall back to <img>.
 */
function decodeFrame(blob) {
  if (typeof createImageBitmap === "function") return createImageBitmap(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.src = url;
    img
      .decode()
      .then(() => resolve(img), reject)
      .finally(() => URL.revokeObjectURL(url));
  });
}

/**
 * Loads an image sequence. Every frame is downloaded and kept compressed (a Blob,
 * ~23 MB for the desktop set); only frames near the playhead are kept decoded,
 * because 242 decoded 1080p frames would need ~2 GB.
 *
 * @param {object}   opts
 * @param {number}   opts.count        total number of frames
 * @param {function} opts.getSrc       (index) => url
 * @param {number}   [opts.concurrency=6]
 * @param {function} [opts.onFrameLoad] called after each frame is downloaded or decoded
 * @param {number}   [opts.keepDecoded=12] frames either side of the playhead kept decoded
 */
export function useFrameSequence({ count, getSrc, concurrency = 6, onFrameLoad, keepDecoded = 12 }) {
  const blobsRef = useRef([]);
  const decodedRef = useRef(new Map()); // index → ImageBitmap (or <img> fallback)
  const pendingRef = useRef(new Set());
  const centerRef = useRef(0);
  const onLoadRef = useRef(onFrameLoad);
  // Layout effect so the latest callback is in place before the loader effect below runs.
  useLayoutEffect(() => {
    onLoadRef.current = onFrameLoad;
  });

  const [firstFrameReady, setFirstFrameReady] = useState(false);
  const [progress, setProgress] = useState(0);

  /** Keeps frames within `keepDecoded` of `center` decoded, nearest first; frees the rest. */
  const warm = useCallback(
    (center) => {
      centerRef.current = center;
      const blobs = blobsRef.current;
      const decoded = decodedRef.current;
      const pending = pendingRef.current;

      decoded.forEach((frame, i) => {
        if (Math.abs(i - center) > keepDecoded) {
          frame.close?.();
          decoded.delete(i);
        }
      });

      for (let d = 0; d <= keepDecoded; d += 1) {
        for (const i of d === 0 ? [center] : [center + d, center - d]) {
          if (i < 0 || i >= count || !blobs[i] || decoded.has(i) || pending.has(i)) continue;
          pending.add(i);
          decodeFrame(blobs[i])
            .then((frame) => {
              // Dropped if the sequence was replaced or the playhead moved away meanwhile.
              if (!pending.delete(i) || blobsRef.current !== blobs || Math.abs(i - centerRef.current) > keepDecoded) {
                frame.close?.();
                return;
              }
              decoded.set(i, frame);
              // First decoded frame, wherever the playhead is (reduced motion starts at the end).
              if (decoded.size === 1) setFirstFrameReady(true);
              onLoadRef.current?.(i);
            })
            .catch(() => pending.delete(i));
        }
      }
    },
    [count, keepDecoded]
  );

  useEffect(() => {
    if (!getSrc) return undefined;

    const abort = new AbortController();
    const blobs = new Array(count).fill(null);
    blobsRef.current = blobs;
    const decoded = decodedRef.current;
    const pending = pendingRef.current;

    const order = buildLoadOrder(count);
    let cursor = 0;
    let done = 0;

    const loadOne = (i) =>
      fetch(getSrc(i), { signal: abort.signal, priority: i === 0 ? "high" : "low" })
        .then((res) => (res.ok ? res.blob() : null))
        .then((blob) => {
          if (blob) blobs[i] = blob;
        })
        .catch(() => {
          /* a missing frame is skipped; the nearest decoded frame is shown instead */
        });

    const loaded = (i) => {
      done += 1;
      // Throttle React updates: a re-render per frame would cost more than the load itself.
      if (done % 8 === 0 || done === count) setProgress(done / count);
      // Lets the canvas decode this frame if it falls inside the window around the playhead.
      onLoadRef.current?.(i);
    };

    const worker = async () => {
      while (!abort.signal.aborted && cursor < order.length) {
        const i = order[cursor++];
        await loadOne(i);
        if (abort.signal.aborted) return;
        loaded(i);
      }
    };

    // Frame 0 goes alone so it is on screen as early as possible, then fan out.
    loadOne(order[0]).then(() => {
      if (abort.signal.aborted) return;
      cursor = 1;
      loaded(order[0]);
      for (let w = 0; w < concurrency; w += 1) worker();
    });

    return () => {
      abort.abort();
      decoded.forEach((frame) => frame.close?.());
      decoded.clear();
      pending.clear();
      // Reset here rather than in the effect body, so a new sequence starts from a clean state.
      setFirstFrameReady(false);
      setProgress(0);
    };
  }, [count, getSrc, concurrency]);

  /**
   * Returns the decoded frame, or (unless `exact`) the nearest decoded frame as a stand-in.
   * Never triggers a decode itself, so drawing can't stall the main thread.
   */
  const getFrame = useCallback((index, exact = false) => {
    const decoded = decodedRef.current;
    const frame = decoded.get(index);
    if (frame || exact) return frame ?? null;
    let best = null;
    let bestDist = Infinity;
    decoded.forEach((f, i) => {
      const dist = Math.abs(i - index);
      if (dist < bestDist) {
        bestDist = dist;
        best = f;
      }
    });
    return best;
  }, []);

  return { getFrame, warm, firstFrameReady, progress };
}
