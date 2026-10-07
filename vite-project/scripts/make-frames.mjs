/**
 * Builds every frame the scroll hero needs from one or two videos:
 *
 *   --landscape <video>   laptops, desktops, tablets held sideways (a wide video, e.g. 16:9 or 21:9)
 *   --portrait  <video>   phones and tablets held upright          (a tall video, e.g. 9:16 or 4:5)
 *
 *   public/<out>/landscape/        1920 px wide  (sharp)
 *   public/<out>/landscape-lite/   1280 px wide  (small laptops, data saver)
 *   public/<out>/landscape-small/   480 px wide  (stand-ins for fast scrolling)
 *   public/<out>/portrait/          900 px wide  (sharp)             only with --portrait
 *   public/<out>/portrait-small/    240 px wide  (stand-ins)         only with --portrait
 *
 * Heights follow each video's own shape, so any ratio works (no stretching). Per video, in this order:
 *   1. the sparkle watermark is removed (see --watermark),
 *   2. black bars above/below (or left/right of) the picture are cropped off (see --crop),
 *   3. the result is scaled to the sizes above.
 * With only a landscape video (or a single bare path, the old usage) phones get the landscape frames.
 *
 * Frames are picked evenly across each video (first and last included) and written as
 * frame_0001.webp, frame_0002.webp, ... Both videos get the same frame count, so the scroll lines up.
 *
 * Needs ffmpeg and ffprobe on the PATH (winget install Gyan.FFmpeg). Nothing else.
 *
 * Run:
 *   node scripts/make-frames.mjs --landscape land.mp4 --portrait port.mp4 [--frames 150]
 *   node scripts/make-frames.mjs video.mp4                      (same as --landscape video.mp4)
 *
 * Other options:
 *   --watermark auto|off|SPOTS          Remove the sparkle watermark by filling from the pixels around it.
 *                                       auto (default): the script FINDS the Gemini sparkle pair itself,
 *                                       in the bottom-right corner, by looking at about 32 frames. It marks
 *                                       every place a sparkle appears, so a star that moves during the
 *                                       video is covered along its whole path. A video without a sparkle
 *                                       is left alone. SPOTS is "x,y[,radius];x,y[,radius]" in video
 *                                       pixels, e.g. "1740,900;1790,944" (quote it: ; ends a command in
 *                                       PowerShell), for a watermark somewhere else. off never touches
 *                                       the picture.
 *   --crop auto|off|W:H:X:Y             Crop black bars off the picture. auto (default): found by looking
 *                                       at about 20 frames AFTER the watermark is removed (a sparkle
 *                                       sitting in a bar would otherwise count as picture). W:H:X:Y is an
 *                                       explicit crop rectangle in video pixels. off keeps the whole frame.
 *   --landscape-watermark / --portrait-watermark / --landscape-crop / --portrait-crop
 *                                       The same, for just one of the two videos.
 *   --out <name>                        Folder name under public/ (default frames-<timestamp>).
 *
 * Each run writes a NEW folder (so browsers never serve stale frames), then deletes every older
 * public/frames-* folder and rewrites src/data/heroFrames.json, which ScrollTreeHero.jsx imports.
 * Nothing to edit by hand: the hero always shows the latest frames.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findSparkleMask } from './sparkle-mask.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- Command line -----------------------------------------------------------------------------
const args = process.argv.slice(2);
const OPTIONS_WITH_VALUE = [
  'landscape', 'portrait', 'frames', 'out',
  'watermark', 'landscape-watermark', 'portrait-watermark',
  'crop', 'landscape-crop', 'portrait-crop',
];
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
// A bare path (the old usage) counts as the landscape video.
const bare = args.find((a, i) => !a.startsWith('--') && !OPTIONS_WITH_VALUE.includes(args[i - 1]?.slice(2)));
const landscapeVideo = flag('landscape', bare);
const portraitVideo = flag('portrait');
const FRAMES = Number(flag('frames', 150));
const PUBLIC = path.join(__dirname, '..', 'public');
const OUT_NAME = flag('out', `frames-${Date.now().toString(36)}`);
const OUT = path.join(PUBLIC, OUT_NAME);

const usage = () => {
  console.error('Usage: node scripts/make-frames.mjs --landscape <video> [--portrait <video>] [--frames 150]');
  console.error('       node scripts/make-frames.mjs <video>            (one landscape video, as before)');
  process.exit(1);
};
if (!landscapeVideo) usage();
for (const [label, file] of [['landscape', landscapeVideo], ['portrait', portraitVideo]]) {
  if (file && !fs.existsSync(file)) {
    console.error(`The ${label} video was not found: ${file}`);
    process.exit(1);
  }
}
if (!Number.isInteger(FRAMES) || FRAMES < 2) {
  console.error('--frames must be a whole number of at least 2.');
  process.exit(1);
}

const run = (cmd, argv, cwd) => {
  const r = spawnSync(cmd, argv, { cwd, encoding: 'utf8' });
  if (r.error) throw new Error(`${cmd} not found. Install ffmpeg and make sure it is on the PATH.`);
  if (r.status !== 0) throw new Error(`${cmd} failed:\n${r.stderr}`);
  return r.stdout;
};

// ---- Per-video facts ----------------------------------------------------------------------------
/** Width, height and real frame count of a video, so the picks are spread over all of its frames. */
const probe = (video) => {
  const out = run('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-count_frames',
    '-show_entries', 'stream=width,height,nb_read_frames', '-of', 'csv=p=0', video,
  ]).trim();
  const [width, height, total] = out.split(',').map(Number);
  if (!(width > 0 && height > 0)) throw new Error(`Could not read the size of ${video}.`);
  if (!(total >= FRAMES)) throw new Error(`${video} has ${total} frames, fewer than the ${FRAMES} asked for.`);
  return { video: path.resolve(video), width, height, total };
};

/** Frame size for a set `w` px wide, keeping the video's shape. Both sides even (webp/ffmpeg like that). */
const even = (n) => Math.max(2, Math.round(n / 2) * 2);
const sizeFor = (info, w) => {
  const width = even(Math.min(w, info.width)); // never upscale
  return [width, even((width * info.height) / info.width)];
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'make-frames-'));

// ---- Watermark ------------------------------------------------------------------------------------
/**
 * The Gemini sparkle: a pair of 4-point stars, each about 70 px across, in the bottom-right corner. They are
 * found by looking (see sparkle-mask.mjs), because one of them can move during the video. The filter then
 * fills the marked area from the background around it (a rectangle smeared branches and snow that touched
 * its edge).
 */
const CORNER = [260, 260]; // the part of the frame, from the bottom-right, that is searched (the stars sit within ~200 px of the corner)
const DEFAULT_RADIUS = 50;

/** Looks for the sparkle in a video; writes its mask (full frame size) to tmp/<maskFile>. null if none found. */
const detectSparkles = (info, maskFile) => {
  const every = Math.max(1, Math.floor(info.total / 32));
  const rw = Math.min(CORNER[0], info.width);
  const rh = Math.min(CORNER[1], info.height);
  const x0 = info.width - rw;
  const y0 = info.height - rh;
  const r = spawnSync('ffmpeg', [
    '-v', 'error', '-i', info.video,
    '-vf', `select='not(mod(n,${every}))',crop=${rw}:${rh}:${x0}:${y0}`,
    '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-',
  ], { cwd: tmp, maxBuffer: 1 << 29 });
  if (r.error) throw new Error('ffmpeg not found. Install ffmpeg and make sure it is on the PATH.');
  if (r.status !== 0) throw new Error(`ffmpeg failed while looking for the watermark:\n${r.stderr}`);

  const bytes = rw * rh * 3;
  const frames = [];
  for (let at = 0; at + bytes <= r.stdout.length; at += bytes) frames.push(r.stdout.subarray(at, at + bytes));
  const { mask, stars, box } = findSparkleMask(frames, rw, rh);
  if (!stars) return null;

  // A full-frame greyscale image (PGM): white where the sparkle was seen, black elsewhere.
  const full = Buffer.alloc(info.width * info.height);
  for (let y = 0; y < rh; y += 1) {
    for (let x = 0; x < rw; x += 1) if (mask[y * rw + x]) full[(y0 + y) * info.width + x0 + x] = 255;
  }
  fs.writeFileSync(path.join(tmp, maskFile), Buffer.concat([Buffer.from(`P5\n${info.width} ${info.height}\n255\n`), full]));
  return { stars, samples: frames.length, box: { x0: x0 + box.x0, y0: y0 + box.y0, x1: x0 + box.x1, y1: y0 + box.y1 } };
};

/** The spots from --<label>-watermark / --watermark when given as positions ([] for off, null for auto). */
const manualSpots = (label) => {
  const spec = flag(`${label}-watermark`, flag('watermark', 'auto'));
  if (spec === 'off') return [];
  if (spec === 'auto') return null;
  return spec.split(';').map((part) => {
    const [x, y, radius = DEFAULT_RADIUS] = part.split(',').map(Number);
    if (![x, y, radius].every(Number.isFinite)) {
      throw new Error(`--watermark must be auto, off or "x,y[,radius];x,y[,radius]"; got "${spec}".`);
    }
    return { x, y, radius };
  });
};

const SHAPE = 0.7;
/** One mask image (white where a sparkle is) for spots given by hand. */
const writeMask = (info, marks, file) => {
  const inside = (m) => `lte(pow(abs(X-${m.x}),${SHAPE})+pow(abs(Y-${m.y}),${SHAPE}),pow(${m.radius},${SHAPE}))`;
  const any = marks.map(inside).join('+');
  run('ffmpeg', [
    '-v', 'error', '-y', '-f', 'lavfi', '-i', `color=black:s=${info.width}x${info.height},format=gray`,
    '-vf', `geq=lum='if(gt(${any},0),255,0)',dilation,format=gray`,
    '-frames:v', '1', '-update', '1', file,
  ], tmp);
};

// ---- Black bars -------------------------------------------------------------------------------------
/**
 * The picture's rectangle inside any black bars, as { w, h, x, y }, or null for "keep the whole frame".
 * auto looks at about 20 frames spread over the video, after the sparkle is removed, and keeps the
 * smallest rectangle that holds the picture in all of them (ffmpeg's cropdetect with reset=0).
 */
const cropFor = (info, label, maskFile, masked) => {
  const spec = flag(`${label}-crop`, flag('crop', 'auto'));
  if (spec === 'off') return null;
  if (spec !== 'auto') {
    const [w, h, x, y] = spec.split(':').map(Number);
    if (![w, h, x, y].every((n) => Number.isInteger(n) && n >= 0) || w < 2 || h < 2 || x + w > info.width || y + h > info.height) {
      throw new Error(`--crop must be auto, off or W:H:X:Y inside the ${info.width}x${info.height} frame; got "${spec}".`);
    }
    return w === info.width && h === info.height ? null : { w, h, x, y };
  }

  const every = Math.max(1, Math.floor(info.total / 20));
  const vf = [
    `select='not(mod(n,${every}))'`,
    masked ? `removelogo=${maskFile}` : null,
    // limit 20: black in video is Y=16 (limited range), plus a little compression noise.
    'cropdetect=limit=20:round=2:reset=0',
  ].filter(Boolean).join(',');
  const r = spawnSync('ffmpeg', ['-hide_banner', '-v', 'info', '-i', info.video, '-vf', vf, '-f', 'null', '-'], { cwd: tmp, encoding: 'utf8' });
  if (r.error) throw new Error('ffmpeg not found. Install ffmpeg and make sure it is on the PATH.');
  const found = [...r.stderr.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)].at(-1);
  if (!found) return null;
  const [w, h, x, y] = found.slice(1).map(Number);
  const removedW = info.width - w;
  const removedH = info.height - h;
  if (removedW < 4 && removedH < 4) return null; // no real bars
  if (removedW > info.width * 0.45 || removedH > info.height * 0.45) {
    console.log(`  crop detection found ${w}x${h}, more than 45% of the frame: ignored (pass --${label}-crop W:H:X:Y to force one)`);
    return null;
  }
  return { w, h, x, y };
};

// ---- Build ---------------------------------------------------------------------------------------
// [folder, width in px, webp quality]. "-small" are the soft stand-ins used while a sharp frame decodes.
const LANDSCAPE_SETS = [
  ['landscape', 1920, 80],
  ['landscape-lite', 1280, 80],
  ['landscape-small', 480, 72],
];
const PORTRAIT_SETS = [
  ['portrait', 900, 80],
  ['portrait-small', 240, 72],
];

const buildFrom = (info, sets, label) => {
  console.log(`\n${label}: ${path.basename(info.video)} (${info.width}x${info.height}, ${info.total} frames)`);
  const maskFile = `mask-${label}.pgm`;
  const spots = manualSpots(label);
  let masked = false;
  if (spots === null) {
    const found = detectSparkles(info, maskFile);
    masked = Boolean(found);
    console.log(
      found
        ? `  watermark: found ${found.stars} sparkle position(s) in ${found.samples} sampled frames, cleaning x ${found.box.x0}-${found.box.x1}, y ${found.box.y0}-${found.box.y1}`
        : '  watermark: none found, nothing removed',
    );
  } else if (spots.length) {
    writeMask(info, spots, maskFile);
    masked = true;
    console.log(`  watermark: removing ${spots.length} spot(s) given on the command line: ${spots.map((m) => `(${m.x}, ${m.y})`).join(' ')}`);
  } else {
    console.log('  watermark removal is off');
  }

  const crop = cropFor(info, label, maskFile, masked);
  if (crop) {
    console.log(`  cropping black bars: keeping ${crop.w}x${crop.h} at (${crop.x}, ${crop.y}) of ${info.width}x${info.height}`);
  } else {
    console.log('  no black bars to crop');
  }
  // Everything below sizes the frames from the picture that is left.
  const view = crop ? { width: crop.w, height: crop.h } : info;

  // Picks frame n when floor(n * (FRAMES-1) / (total-1)) steps up: exactly FRAMES frames, first and last included.
  // (The filter option takes a relative file name; "C:" in a Windows path breaks ffmpeg's filter syntax.)
  const pick = `select='not(eq(floor(n*${FRAMES - 1}/${info.total - 1}),floor((n-1)*${FRAMES - 1}/${info.total - 1})))'`;

  const sizes = {};
  for (const [name, width, quality] of sets) {
    const [w, h] = sizeFor(view, width);
    const dir = path.join(OUT, name);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    // Order matters: the mask is the size of the full frame, so the sparkle goes before the crop.
    const filters = [
      pick,
      masked ? `removelogo=${maskFile}` : null,
      crop ? `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}` : null,
      `scale=${w}:${h}:flags=lanczos`,
    ].filter(Boolean);
    run('ffmpeg', [
      '-v', 'error', '-y', '-i', info.video,
      '-vf', filters.join(','),
      '-fps_mode', 'passthrough', '-c:v', 'libwebp', '-quality', String(quality), '-compression_level', '6',
      path.join(dir, 'frame_%04d.webp'),
    ], tmp);
    const files = fs.readdirSync(dir);
    if (files.length !== FRAMES) throw new Error(`${name}: expected ${FRAMES} frames but wrote ${files.length}.`);
    const bytes = files.reduce((sum, f) => sum + fs.statSync(path.join(dir, f)).size, 0);
    console.log(`  ${name}: ${files.length} frames, ${w}x${h}, ${(bytes / 1048576).toFixed(1)} MB`);
    sizes[name] = [w, h];
  }
  return sizes;
};

const landscapeInfo = probe(landscapeVideo);
const portraitInfo = portraitVideo ? probe(portraitVideo) : null;

const landscapeSizes = buildFrom(landscapeInfo, LANDSCAPE_SETS, 'landscape');
const portraitSizes = portraitInfo ? buildFrom(portraitInfo, PORTRAIT_SETS, 'portrait') : null;

fs.rmSync(tmp, { recursive: true, force: true });

// Only now that the new set is complete: point the hero at it and delete the old frames.
// Sizes are recorded so the hero never has to guess them.
const manifest = {
  dir: OUT_NAME,
  count: FRAMES,
  landscape: {
    full: landscapeSizes.landscape,
    lite: landscapeSizes['landscape-lite'],
    small: landscapeSizes['landscape-small'],
  },
  ...(portraitSizes ? { portrait: { full: portraitSizes.portrait, small: portraitSizes['portrait-small'] } } : {}),
};
fs.writeFileSync(path.join(__dirname, '..', 'src', 'data', 'heroFrames.json'), `${JSON.stringify(manifest, null, 2)}\n`);
for (const entry of fs.readdirSync(PUBLIC)) {
  if (entry.startsWith('frames-') && entry !== OUT_NAME) {
    fs.rmSync(path.join(PUBLIC, entry), { recursive: true, force: true });
    console.log(`Deleted old frames: ${entry}`);
  }
}
console.log(
  `\nDone: ${path.relative(process.cwd(), OUT)} (${FRAMES} frames, ${portraitInfo ? 'landscape + portrait' : 'landscape only'}). Hero updated via src/data/heroFrames.json.`,
);
