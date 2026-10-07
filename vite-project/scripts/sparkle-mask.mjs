/**
 * Finds the "sparkle" watermark (Gemini's pair of 4-point stars) in the corner of a video, from a sample
 * of its frames, and returns a mask of every place a sparkle appears, so the whole path is covered even
 * when one of the stars moves during the video.
 *
 * No positions are assumed. A sparkle is recognised by what it is:
 *   - a light grey, nearly colourless mark (low saturation) that is clearly brighter than black bars or
 *     a dark floor,
 *   - 50-84 px across and roughly square,
 *   - a 4-point star, so it fills only about 22-62% of its bounding box (a round bokeh light fills 78%
 *     and is skipped; so is any big patch of light),
 *   - present in neighbouring sample frames, at about the same place and size (so one-off bright
 *     specks are skipped).
 * Pure functions on plain pixel arrays; make-frames.mjs does the ffmpeg work around them.
 */

const THRESHOLDS = [32, 48, 64, 80, 96, 112]; // brightness cut-offs tried, dimmest first
const MAX_LUM = 215;
const MAX_SAT = 24;
const MIN_SIZE = 50;
const MAX_SIZE = 84;
const FILL = [0.22, 0.62];
const SAME_PLACE = 24; // px a star may move between two neighbouring samples and still count as the same
const SAME_SIZE = 14;

/** Box dilation of a 0/1 image by radius r: a pixel becomes 1 if any pixel within r (square window) is 1. */
const dilate = (src, w, h, r) => {
  const pass = (input, vertical) => {
    const out = new Uint8Array(w * h);
    const len = vertical ? h : w;
    const lines = vertical ? w : h;
    const at = (line, i) => (vertical ? i * w + line : line * w + i);
    for (let line = 0; line < lines; line += 1) {
      let count = 0; // ones inside the window [i-r, i+r]
      for (let i = 0; i < Math.min(len, r); i += 1) count += input[at(line, i)];
      for (let i = 0; i < len; i += 1) {
        if (i + r < len) count += input[at(line, i + r)];
        if (i - r - 1 >= 0) count -= input[at(line, i - r - 1)];
        out[at(line, i)] = count > 0 ? 1 : 0;
      }
    }
    return out;
  };
  return pass(pass(src, false), true);
};

/** Box erosion: the dilation of the background (the image edge is not treated as background). */
const erode = (src, w, h, r) => {
  const inverted = new Uint8Array(w * h);
  for (let i = 0; i < inverted.length; i += 1) inverted[i] = src[i] ? 0 : 1;
  const grown = dilate(inverted, w, h, r);
  for (let i = 0; i < grown.length; i += 1) grown[i] = grown[i] ? 0 : 1;
  return grown;
};

/** Connected pieces (4-neighbour) of a 0/1 image: [{ area, x0, y0, x1, y1, pixels }]. */
const pieces = (m, w, h) => {
  const seen = new Uint8Array(w * h);
  const out = [];
  const stack = [];
  for (let start = 0; start < w * h; start += 1) {
    if (!m[start] || seen[start]) continue;
    const pixels = [];
    let x0 = w; let y0 = h; let x1 = 0; let y1 = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop();
      pixels.push(p);
      const x = p % w;
      const y = (p - x) / w;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (x > 0 && m[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack.push(p - 1); }
      if (x < w - 1 && m[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack.push(p + 1); }
      if (y > 0 && m[p - w] && !seen[p - w]) { seen[p - w] = 1; stack.push(p - w); }
      if (y < h - 1 && m[p + w] && !seen[p + w]) { seen[p + w] = 1; stack.push(p + w); }
    }
    out.push({ area: pixels.length, x0, y0, x1, y1, pixels });
  }
  return out;
};

/** Star-shaped light-grey pieces in one RGB frame (w x h, 3 bytes per pixel). */
const starsIn = (rgb, w, h) => {
  const found = [];
  for (const cutoff of THRESHOLDS) {
    let m = new Uint8Array(w * h);
    for (let i = 0, p = 0; i < w * h; i += 1, p += 3) {
      const r = rgb[p]; const g = rgb[p + 1]; const b = rgb[p + 2];
      const lum = (r + g + b) / 3;
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      m[i] = lum >= cutoff && lum <= MAX_LUM && sat < MAX_SAT ? 1 : 0;
    }
    // close small gaps in the star, then drop specks
    m = erode(dilate(m, w, h, 2), w, h, 2);
    m = dilate(erode(m, w, h, 2), w, h, 2);
    for (const piece of pieces(m, w, h)) {
      const bw = piece.x1 - piece.x0 + 1;
      const bh = piece.y1 - piece.y0 + 1;
      if (bw < MIN_SIZE || bh < MIN_SIZE || bw > MAX_SIZE || bh > MAX_SIZE) continue;
      if (Math.abs(bw - bh) > 0.25 * Math.max(bw, bh)) continue;
      const fill = piece.area / (bw * bh);
      if (fill < FILL[0] || fill > FILL[1]) continue;
      found.push({ cx: (piece.x0 + piece.x1) / 2, cy: (piece.y0 + piece.y1) / 2, size: Math.max(bw, bh), pixels: piece.pixels });
    }
  }
  return found;
};

/**
 * @param {Buffer[]} frames  RGB frames of the corner region, all rw x rh
 * @returns {{ mask: Uint8Array, stars: number, box: object|null }}  mask: 1 where a sparkle was seen
 *          (grown a few px so the soft edge goes too); stars: how many separate star positions were kept
 */
export const findSparkleMask = (frames, rw, rh) => {
  const perFrame = frames.map((rgb) => starsIn(rgb, rw, rh));
  const near = (a, b) => Math.abs(a.cx - b.cx) <= SAME_PLACE && Math.abs(a.cy - b.cy) <= SAME_PLACE && Math.abs(a.size - b.size) <= SAME_SIZE;

  let mask = new Uint8Array(rw * rh);
  const kept = [];
  perFrame.forEach((stars, f) => {
    for (const star of stars) {
      // A real watermark shows up in the next or previous sample too (a lone video, with one sample, is taken as it is).
      const neighbours = [perFrame[f - 1], perFrame[f + 1]].filter(Boolean);
      const persistent = neighbours.length === 0 || neighbours.some((others) => others.some((o) => near(star, o)));
      if (!persistent) continue;
      for (const p of star.pixels) mask[p] = 1;
      if (!kept.some((k) => near(star, k))) kept.push(star);
    }
  });
  if (!kept.length) return { mask, stars: 0, box: null };

  mask = dilate(mask, rw, rh, 5); // the star's anti-aliased edge and a little margin
  let x0 = rw; let y0 = rh; let x1 = 0; let y1 = 0;
  for (let p = 0; p < rw * rh; p += 1) {
    if (!mask[p]) continue;
    const x = p % rw;
    const y = (p - x) / rw;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return { mask, stars: kept.length, box: { x0, y0, x1, y1 } };
};
