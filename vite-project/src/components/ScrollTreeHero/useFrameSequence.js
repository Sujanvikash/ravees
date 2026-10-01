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

// Failed downloads (network error, 5xx, 429) are retried this many times, with a growing pause.
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 400;

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
 * @param {number}   [opts.keepDecoded=12] decode budget: 2 × keepDecoded + 1 frames, weighted
 *                   ahead of the playhead in the scroll direction (¾ ahead, ¼ behind)
 * @param {number}   [opts.keepTail=0] last frames kept decoded for good, decoded after the window
 *                   around the playhead, so a fast scroll that lands at the end shows exact frames.
 *                   Starts once the playhead has left frame 0, so a visitor who never scrolls pays nothing.
 * @param {boolean}  [opts.lastFrameOnly=false] download just the final frame (reduced motion shows
 *                   a still of the finished tree, so the other frames would be wasted bandwidth)
 */
export function useFrameSequence({
  count,
  getSrc,
  concurrency = 6,
  onFrameLoad,
  keepDecoded = 12,
  keepTail = 0,
  lastFrameOnly = false,
}) {
  const blobsRef = useRef([]);
  const decodedRef = useRef(new Map()); // index → ImageBitmap (or <img> fallback)
  const pendingRef = useRef(new Set());
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

  const ahead = Math.round(keepDecoded * 1.5);
  const behind = 2 * keepDecoded - ahead;
  const tailStart = count - keepTail;

  /**
   * Keeps the frames around `center` decoded, most useful first (see buildDecodeOrder);
   * frees the rest. Cheap enough to call on every draw.
   */
  const warm = useCallback(
    (center) => {
      const decoded = decodedRef.current;
      const pending = pendingRef.current;

      // Read live: a decode that finishes later is judged against the playhead at that moment.
      const inWindow = (i) => {
        const k = (i - centerRef.current) * dirRef.current.dir;
        return k >= -behind && k <= ahead;
      };
      const keep = (i) => inWindow(i) || i >= tailStart;
      const distance = (i) => (i < 0 ? Infinity : Math.abs(i - centerRef.current));
      /** Index of the decoded frame closest to the playhead, or -1. */
      const nearest = () => {
        let best = -1;
        decoded.forEach((_, i) => {
          if (distance(i) < distance(best)) best = i;
        });
        return best;
      };

      /**
       * Starts decodes in priority order until MAX_DECODES_IN_FLIGHT are running:
       * the window around the playhead, then (once scrolling has started) the tail, last frame
       * first, with any spare slots.
       */
      const schedule = () => {
        const blobs = blobsRef.current;
        const order = buildDecodeOrder(centerRef.current, dirRef.current.dir, ahead, behind);
        if (centerRef.current > 0) {
          for (let i = count - 1; i >= tailStart; i -= 1) order.push(i);
        }
        for (const i of order) {
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
              if (keep(i) || distance(i) < distance(nearest())) {
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

      centerRef.current = center;
      const d = dirRef.current;
      if (Math.abs(center - d.anchor) >= 2) {
        if (Math.sign(center - d.anchor) !== d.dir) d.dir = -d.dir;
        d.anchor = center;
      } else if (Math.sign(center - d.anchor) === d.dir) {
        d.anchor = center;
      }

      // Free frames outside the window and the tail, except the closest one: there is always something to draw.
      const closest = nearest();
      decoded.forEach((frame, i) => {
        if (i !== closest && !keep(i)) {
          frame.close?.();
          decoded.delete(i);
        }
      });

      schedule();
    },
    [count, ahead, behind, tailStart]
  );

  useEffect(() => {
    if (!getSrc) return undefined;

    const abort = new AbortController();
    const blobs = new Array(count).fill(null);
    blobsRef.current = blobs;
    const decoded = decodedRef.current;
    const pending = pendingRef.current;

    const order = lastFrameOnly ? [count - 1] : buildLoadOrder(count);
    let cursor = 0;
    let done = 0;

    // A frame that still fails after the retries is skipped; the nearest decoded frame is shown instead.
    const loadOne = async (i, attempt = 0) => {
      try {
        const res = await fetch(getSrc(i), { signal: abort.signal, priority: i === order[0] ? "high" : "low" });
        if (!res.ok) {
          // A missing frame (404) won't appear on retry; server errors and throttling may clear.
          if (res.status >= 500 || res.status === 429) throw new Error(`HTTP ${res.status}`);
          return;
        }
        blobs[i] = await res.blob();
      } catch {
        if (abort.signal.aborted || attempt >= MAX_RETRIES) return;
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
        if (abort.signal.aborted) return;
        await loadOne(i, attempt + 1);
      }
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
  }, [count, getSrc, concurrency, lastFrameOnly]);

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
