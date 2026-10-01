/**
 * Makes the small stand-in frames for the scroll hero:
 *   public/frames-v2/desktop-small/  480x270  (from desktop/)
 *   public/frames-v2/mobile-small/   320x180  (from mobile/)
 * Re-run it whenever the sharp frames change (see ScrollTreeHero/ARCHITECTURE.md).
 * The sharp frames are only read, never written.
 *
 * Chrome does the resize and the WebP encode, so there is no image library to install.
 *
 * Run (two terminals):
 *   npm run build && npm run preview          # serves the current frames, default port 4173
 *   npm i --no-save playwright-core           # one-off; not added to package.json
 *   node scripts/make-small-frames.mjs        # needs Google Chrome installed
 *
 * Options (env): BASE=http://localhost:4173/  QUALITY=0.72
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'frames-v2');
const BASE = process.env.BASE || 'http://localhost:4173/';
const QUALITY = Number(process.env.QUALITY || 0.72);
const COUNT = 242;
const SETS = { desktop: [480, 270], mobile: [320, 180] };

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.goto(`${BASE}logo.svg`); // any same-origin page, so fetch() of the frames is allowed

for (const [set, [w, h]] of Object.entries(SETS)) {
  const dir = path.join(OUT, `${set}-small`);
  fs.mkdirSync(dir, { recursive: true });

  for (let start = 1; start <= COUNT; start += 22) {
    const batch = await page.evaluate(
      async ({ BASE, set, w, h, start, COUNT, QUALITY }) => {
        const out = [];
        for (let i = start; i < start + 22 && i <= COUNT; i += 1) {
          const name = `frame_${String(i).padStart(4, '0')}.webp`;
          const src = await createImageBitmap(await (await fetch(`${BASE}frames-v2/${set}/${name}`)).blob());

          // Halve until close to the target size, then the last step: one big jump would alias.
          let cur = src;
          let cw = src.width;
          let ch = src.height;
          while (cw / 2 >= w) {
            const c = new OffscreenCanvas(Math.round(cw / 2), Math.round(ch / 2));
            const g = c.getContext('2d');
            g.imageSmoothingQuality = 'high';
            g.drawImage(cur, 0, 0, c.width, c.height);
            cur = c;
            cw = c.width;
            ch = c.height;
          }
          const fin = new OffscreenCanvas(w, h);
          const g = fin.getContext('2d');
          g.imageSmoothingQuality = 'high';
          g.drawImage(cur, 0, 0, w, h);

          const blob = await fin.convertToBlob({ type: 'image/webp', quality: QUALITY });
          const bytes = new Uint8Array(await blob.arrayBuffer());
          let bin = '';
          for (let k = 0; k < bytes.length; k += 0x8000) bin += String.fromCharCode(...bytes.subarray(k, k + 0x8000));
          out.push([name, btoa(bin)]);
        }
        return out;
      },
      { BASE, set, w, h, start, COUNT, QUALITY },
    );
    for (const [name, b64] of batch) fs.writeFileSync(path.join(dir, name), Buffer.from(b64, 'base64'));
  }

  const files = fs.readdirSync(dir);
  const bytes = files.reduce((sum, f) => sum + fs.statSync(path.join(dir, f)).size, 0);
  console.log(`${set}-small: ${files.length} files, ${w}x${h}, ${(bytes / 1048576).toFixed(2)} MB`);
}

await browser.close();
