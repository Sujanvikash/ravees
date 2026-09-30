import { useCallback, useEffect, useRef, useState } from "react";

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
 * Loads an image sequence into memory as decoded HTMLImageElements.
 *
 * @param {object}   opts
 * @param {number}   opts.count        total number of frames
 * @param {function} opts.getSrc       (index) => url
 * @param {number}   [opts.concurrency=6]
 * @param {function} [opts.onFrameLoad] called after each frame decodes
 */
export function useFrameSequence({ count, getSrc, concurrency = 6, onFrameLoad }) {
  const imagesRef = useRef([]);
  const onLoadRef = useRef(onFrameLoad);
  onLoadRef.current = onFrameLoad;

  const [firstFrameReady, setFirstFrameReady] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!getSrc) return undefined;

    let cancelled = false;
    const images = new Array(count).fill(null);
    imagesRef.current = images;
    setFirstFrameReady(false);
    setProgress(0);

    const order = buildLoadOrder(count);
    let cursor = 0;
    let done = 0;

    const loadOne = (i) =>
      new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        if ("fetchPriority" in img) img.fetchPriority = i === 0 ? "high" : "low";
        img.src = getSrc(i);
        img
          .decode()
          .then(() => {
            if (!cancelled) images[i] = img;
          })
          .catch(() => {
            /* a missing frame is skipped; the nearest loaded frame is shown instead */
          })
          .finally(resolve);
      });

    const worker = async () => {
      while (!cancelled && cursor < order.length) {
        const i = order[cursor++];
        await loadOne(i);
        if (cancelled) return;
        done += 1;
        if (i === 0) setFirstFrameReady(true);
        // Throttle React updates: a re-render per frame would cost more than the load itself.
        if (done % 8 === 0 || done === count) setProgress(done / count);
        onLoadRef.current?.(i);
      }
    };

    // Frame 0 goes alone so it is on screen as early as possible, then fan out.
    loadOne(order[0]).then(() => {
      if (cancelled) return;
      cursor = 1;
      done = 1;
      setFirstFrameReady(Boolean(images[0]));
      onLoadRef.current?.(0);
      for (let w = 0; w < concurrency; w += 1) worker();
    });

    return () => {
      cancelled = true;
    };
  }, [count, getSrc, concurrency]);

  /** Returns the requested frame, or the nearest one that has loaded. */
  const getFrame = useCallback(
    (index) => {
      const imgs = imagesRef.current;
      if (imgs[index]) return imgs[index];
      for (let d = 1; d < count; d += 1) {
        if (imgs[index - d]) return imgs[index - d];
        if (imgs[index + d]) return imgs[index + d];
      }
      return null;
    },
    [count]
  );

  return { getFrame, firstFrameReady, progress };
}
