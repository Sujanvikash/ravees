import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

/**
 * Progressive load order: first frame, last frame, then a coarse pass
 * (every 32nd frame) that is refined down to every frame. The animation
 * is scrubbable end-to-end within the first ~10 requests and gets smoother
 * as the rest arrive, instead of loading 1 → N in a straight line.
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
 * Decode priority around the playhead, `dir` being the scroll direction (+1 / -1).
 * The next few frames first (crossfade neighbours included), then further ahead coarse-to-fine
 * (every 4th, every 2nd, the rest), so a fast scroll always finds a frame near where it lands,
 * then a short tail behind.
 */
function buildDecodeOrder(center, dir, ahead, behind) {
  const order = [center, center + dir, center - dir, center + 2 * dir, center + 3 * dir];
  for (const [start, step] of [[4, 4], [6, 4], [5, 2]]) {
    for (let k = start; k <= ahead; k += step) order.push(center + dir * k);
  }
  for (let k = 2; k <= behind; k += 1) order.push(center - dir * k);
  return order;
}

// Decodes in flight at once. More than a few just queue inside the browser, finish after
// the playhead has moved on and delay the frames that are needed now.
const MAX_DECODES_IN_FLIGHT = 4;
// The small frames are tiny files (a couple of ms to decode), so a few at once is cheap.
const MAX_SMALL_DECODES_IN_FLIGHT = 3;
const SMALL_DOWNLOADS_IN_FLIGHT = 6;

// Failed downloads (network error, 5xx, 429) are retried this many times, with a growing pause.
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 400;

/**
 * Loads an image sequence. Every frame is downloaded and kept compressed (a Blob,
 * ~23 MB for the desktop set). Two decoded sets are kept, because every frame decoded at 1080p
 * would need ~2 GB:
 *  - sharp frames, only near the playhead (a window that follows the scroll), and
 *  - a small version of every frame (its own tiny file, see `previewSrc`), so that a scroll faster
 *    than the sharp decoder can follow still shows the exact frame, just softer, and the sharp
 *    one replaces it once it is ready.
 *
 * @param {object}   opts
 * @param {number}   opts.count        total number of frames
 * @param {function} opts.getSrc       (index) => url
 * @param {number}   [opts.concurrency=6]
 * @param {function} [opts.onFrameLoad] called after each frame is downloaded or decoded
 * @param {boolean}  [opts.decodeAll=false] decode every sharp frame and keep them all, so any scroll
 *                   speed shows full-resolution frames. ~8 MB per 1080p frame (~1.2 GB for 150):
 *                   only for machines with the memory. Frames still decode nearest-first.
 * @param {number}   [opts.keepDecoded=12] decode budget: 2 × keepDecoded + 1 frames, weighted
 *                   ahead of the playhead in the scroll direction (¾ ahead, ¼ behind)
 * @param {function} [opts.previewSrc] (index) => url of the small version of a frame; omit to turn
 *                   the small frames off. All of them download right after frame 0 (a few KB each,
 *                   before the sharp frames start), and are decoded once frame 0 is on screen.
 *                   They are kept decoded for good: width × height × 4 bytes each.
 *                   Decoding them from the sharp frames instead (resizing) was tried and is far
 *                   too slow: each is a full 1080p decode, which also slowed the sharp decodes ~2.5×.
 * @param {boolean}  [opts.lastFrameOnly=false] download just the final frame (reduced motion shows
 *                   a still of the finished tree, so the other frames would be wasted bandwidth)
 */
export function useFrameSequence({
  count,
  getSrc,
  concurrency = 6,
  onFrameLoad,
  keepDecoded = 12,
  decodeAll = false,
  previewSrc,
  lastFrameOnly = false,
}) {
  const blobsRef = useRef([]);
  const smallBlobsRef = useRef([]);
  const decodedRef = useRef(new Map()); // index → ImageBitmap (or <img> fallback)
  const pendingRef = useRef(new Set());
  const smallRef = useRef(new Map()); // index → small ImageBitmap
  const smallPendingRef = useRef(new Set());
  const smallFailedRef = useRef(new Set());
  const centerRef = useRef(0);
  // Scroll direction, flipped only after the playhead moves 2+ frames the other way,
  // so a small wobble doesn't throw away the frames decoded ahead.
  const dirRef = useRef({ dir: 1, anchor: 0 });
  const onLoadRef = useRef(onFrameLoad);
  // Layout effect so the latest callback is in place before the loader effect below runs.
  useLayoutEffect(() => {
    onLoadRef.current = onFrameLoad;
  });

  const [firstFrameReady, setFirstFrameReady] = useState(false);
  const [progress, setProgress] = useState(0);

  // decodeAll: the "window" is the whole sequence, so nothing is ever evicted.
  const ahead = decodeAll ? count : Math.round(keepDecoded * 1.5);
  const behind = decodeAll ? count : 2 * keepDecoded - ahead;
  // Small frames download and decode in the same coarse-to-fine order as the sharp ones.
  const smallOrder = useMemo(() => buildLoadOrder(count), [count]);
  const hasPreview = Boolean(previewSrc);

  /**
   * Keeps the frames around `center` decoded, most useful first (see buildDecodeOrder);
   * frees the rest. Cheap enough to call on every draw.
   */
  const warm = useCallback(
    (center) => {
      const decoded = decodedRef.current;
      const pending = pendingRef.current;
      const small = smallRef.current;
      const smallPending = smallPendingRef.current;
      const smallFailed = smallFailedRef.current;

      // Read live: a decode that finishes later is judged against the playhead at that moment.
      const inWindow = (i) => {
        const k = (i - centerRef.current) * dirRef.current.dir;
        return k >= -behind && k <= ahead;
      };
      const distance = (i) => (i < 0 ? Infinity : Math.abs(i - centerRef.current));
      /** Index of the decoded frame closest to the playhead, or -1. */
      const nearest = () => {
        let best = -1;
        decoded.forEach((_, i) => {
          if (distance(i) < distance(best)) best = i;
        });
        return best;
      };

      /** Starts sharp decodes in priority order until MAX_DECODES_IN_FLIGHT are running. */
      const scheduleSharp = () => {
        const blobs = blobsRef.current;
        for (const i of buildDecodeOrder(centerRef.current, dirRef.current.dir, ahead, behind)) {
          if (pending.size >= MAX_DECODES_IN_FLIGHT) return;
          if (i < 0 || i >= count || !blobs[i] || decoded.has(i) || pending.has(i)) continue;
          pending.add(i);
          decodeFrame(blobs[i])
            .then((frame) => {
              // A decode from a replaced sequence must not touch the new one's pending set.
              if (blobsRef.current !== blobs || !pending.delete(i)) {
                frame.close?.();
                return;
              }
              // A fast scroll can outrun the window; a late frame is still kept when it is the
              // closest one to the playhead, so the picture keeps moving instead of freezing.
              if (inWindow(i) || distance(i) < distance(nearest())) {
                decoded.set(i, frame);
                // First decoded frame, wherever the playhead is (reduced motion starts at the end).
                if (decoded.size === 1) setFirstFrameReady(true);
                onLoadRef.current?.(i);
              } else {
                frame.close?.();
              }
              schedule();
            })
            .catch(() => {
              if (blobsRef.current !== blobs) return;
              pending.delete(i);
              schedule();
            });
        }
      };

      /**
       * Decodes the downloaded small frames, a few at a time, once the first sharp frame is on
       * screen. They stay decoded for good, so every frame is always drawable.
       */
      const scheduleSmall = () => {
        if (!hasPreview || decoded.size === 0) return;
        const blobs = smallBlobsRef.current;
        for (const i of smallOrder) {
          if (smallPending.size >= MAX_SMALL_DECODES_IN_FLIGHT) return;
          if (!blobs[i] || small.has(i) || smallPending.has(i) || smallFailed.has(i)) continue;
          smallPending.add(i);
          decodeFrame(blobs[i])
            .then((frame) => {
              if (smallBlobsRef.current !== blobs || !smallPending.delete(i)) {
                frame.close?.();
                return;
              }
              small.set(i, frame);
              // Redraws if this frame is the one being shown as a stand-in.
              onLoadRef.current?.(i);
              schedule();
            })
            .catch(() => {
              if (smallBlobsRef.current !== blobs) return;
              smallPending.delete(i);
              smallFailed.add(i); // a frame that can't be decoded is skipped, not retried forever
              schedule();
            });
        }
      };

      const schedule = () => {
        scheduleSharp();
        scheduleSmall();
      };

      centerRef.current = center;
      const d = dirRef.current;
      if (Math.abs(center - d.anchor) >= 2) {
        if (Math.sign(center - d.anchor) !== d.dir) d.dir = -d.dir;
        d.anchor = center;
      } else if (Math.sign(center - d.anchor) === d.dir) {
        d.anchor = center;
      }

      // Free sharp frames outside the window, except the closest one: there is always something to draw.
      const closest = nearest();
      decoded.forEach((frame, i) => {
        if (i !== closest && !inWindow(i)) {
          frame.close?.();
          decoded.delete(i);
        }
      });

      schedule();
    },
    [count, ahead, behind, hasPreview, smallOrder]
  );

  useEffect(() => {
    if (!getSrc) return undefined;

    const abort = new AbortController();
    const blobs = new Array(count).fill(null);
    blobsRef.current = blobs;
    const smallBlobs = new Array(count).fill(null);
    smallBlobsRef.current = smallBlobs;
    const decoded = decodedRef.current;
    const pending = pendingRef.current;
    const small = smallRef.current;
    const smallPending = smallPendingRef.current;
    const smallFailed = smallFailedRef.current;

    const order = lastFrameOnly ? [count - 1] : buildLoadOrder(count);
    let cursor = 0;
    let done = 0;

    /** The file as a Blob, or null. Retries network errors, 5xx and 429; a 404 is final. */
    const fetchBlob = async (url, priority, attempt = 0) => {
      try {
        const res = await fetch(url, { signal: abort.signal, priority });
        if (!res.ok) {
          // A missing frame (404) won't appear on retry; server errors and throttling may clear.
          if (res.status >= 500 || res.status === 429) throw new Error(`HTTP ${res.status}`);
          return null;
        }
        return await res.blob();
      } catch {
        if (abort.signal.aborted || attempt >= MAX_RETRIES) return null;
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
        if (abort.signal.aborted) return null;
        return fetchBlob(url, priority, attempt + 1);
      }
    };

    // A frame that still fails after the retries is skipped; the nearest decoded frame is shown instead.
    const loadOne = async (i) => {
      const blob = await fetchBlob(getSrc(i), i === order[0] ? "high" : "low");
      if (blob) blobs[i] = blob;
    };

    /** Downloads every small frame (a few KB each), coarse-to-fine, a handful at a time. */
    const loadSmall = async () => {
      if (!previewSrc || lastFrameOnly) return;
      let next = 0;
      const run = async () => {
        while (!abort.signal.aborted && next < smallOrder.length) {
          const i = smallOrder[next++];
          const blob = await fetchBlob(previewSrc(i), "low");
          if (abort.signal.aborted) return;
          if (blob) {
            smallBlobs[i] = blob;
            onLoadRef.current?.(i); // lets the hook decode it, and the canvas show it if it is needed
          }
        }
      };
      await Promise.all(Array.from({ length: SMALL_DOWNLOADS_IN_FLIGHT }, run));
    };

    const loaded = (i) => {
      done += 1;
      // Throttle React updates: a re-render per frame would cost more than the load itself.
      if (done % 8 === 0 || done === order.length) setProgress(done / order.length);
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

    // Frame 0 goes alone so it is on screen as early as possible. Then every small frame (about 3 MB
    // in all, so the whole scroll can be scrubbed at once), then the sharp frames fan out.
    loadOne(order[0])
      .then(() => {
        if (abort.signal.aborted) return undefined;
        cursor = 1;
        loaded(order[0]);
        return loadSmall();
      })
      .then(() => {
        if (abort.signal.aborted) return;
        for (let w = 0; w < concurrency; w += 1) worker();
      });

    return () => {
      abort.abort();
      decoded.forEach((frame) => frame.close?.());
      decoded.clear();
      pending.clear();
      small.forEach((frame) => frame.close?.());
      small.clear();
      smallPending.clear();
      smallFailed.clear();
      // Reset here rather than in the effect body, so a new sequence starts from a clean state.
      setFirstFrameReady(false);
      setProgress(0);
    };
  }, [count, getSrc, previewSrc, smallOrder, concurrency, lastFrameOnly]);

  /**
   * Returns the best decoded picture of frame `index`: the sharp one, else its small version.
   * Unless `exact`, falls back to the nearest frame of either kind as a stand-in.
   * Never triggers a decode itself, so drawing can't stall the main thread.
   */
  const getFrame = useCallback(
    (index, exact = false) => {
      const decoded = decodedRef.current;
      const small = smallRef.current;
      const frame = decoded.get(index) ?? small.get(index);
      if (frame || exact) return frame ?? null;
      for (let d = 1; d < count; d += 1) {
        const before = decoded.get(index - d) ?? small.get(index - d);
        if (before) return before;
        const after = decoded.get(index + d) ?? small.get(index + d);
        if (after) return after;
      }
      return null;
    },
    [count]
  );

  return { getFrame, warm, firstFrameReady, progress };
}
