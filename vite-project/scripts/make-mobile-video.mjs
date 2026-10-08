/**
 * Prepares the phone video for the cinematic hero (CinematicHero/MobileHeroVideo.jsx):
 *
 *   1. black bars are cropped off (a tall picture exported inside a 16:9 frame is common),
 *   2. the audio track is dropped (the hero is silent, and it is wasted bandwidth),
 *   3. it is re-encoded for scrubbing: a keyframe every few frames, so setting `currentTime` from the
 *      scroll position lands quickly on any frame (a normal export has one keyframe every few seconds,
 *      and every seek then decodes everything since the last one), and `faststart`, so playback can
 *      begin before the whole file is down,
 *   4. a poster (the first frame) is written next to it, shown until the video can draw.
 *
 *   public/hero-mobile-<id>.mp4, public/hero-mobile-<id>.webp
 *
 * Each run writes NEW file names (so browsers never serve a stale video), deletes the older
 * public/hero-mobile-* files and rewrites src/data/heroMobileVideo.json, which the hero imports.
 *
 * Needs ffmpeg and ffprobe on the PATH.
 *
 * Run:
 *   node scripts/make-mobile-video.mjs <video> [--crop auto|off|W:H:X:Y] [--width 720] [--crf 23] [--gop 6]
 *
 *   --crop   auto (default) finds the black bars; W:H:X:Y crops a rectangle given in video pixels.
 *   --width  the largest width to encode at (never upscaled). Default 720.
 *   --crf    x264 quality, lower is sharper and bigger. Default 23.
 *   --gop    frames between keyframes. Lower seeks faster and makes a bigger file. Default 6.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');
const MANIFEST = path.join(__dirname, '..', 'src', 'data', 'heroMobileVideo.json');

const args = process.argv.slice(2);
const OPTIONS_WITH_VALUE = ['crop', 'width', 'crf', 'gop'];
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const input = args.find((a, i) => !a.startsWith('--') && !OPTIONS_WITH_VALUE.includes(args[i - 1]?.slice(2)));
if (!input || !fs.existsSync(input)) {
  console.error('Usage: node scripts/make-mobile-video.mjs <video> [--crop auto|off|W:H:X:Y] [--width 720] [--crf 23] [--gop 6]');
  if (input) console.error(`Video not found: ${input}`);
  process.exit(1);
}
const MAX_WIDTH = Number(flag('width', 720));
const CRF = Number(flag('crf', 23));
const GOP = Number(flag('gop', 6));
for (const [name, n] of [['width', MAX_WIDTH], ['crf', CRF], ['gop', GOP]]) {
  if (!(Number.isInteger(n) && n > 0)) {
    console.error(`--${name} must be a positive whole number.`);
    process.exit(1);
  }
}

const run = (cmd, argv) => {
  const r = spawnSync(cmd, argv, { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.error) throw new Error(`${cmd} not found. Install ffmpeg and make sure it is on the PATH.`);
  if (r.status !== 0) throw new Error(`${cmd} failed:\n${r.stderr}`);
  return r;
};

const probe = () => {
  const out = run('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-count_frames',
    '-show_entries', 'stream=width,height,nb_read_frames,r_frame_rate', '-of', 'csv=p=0', input,
  ]).stdout.trim();
  const [width, height, rate, total] = out.split(',');
  const [num, den] = rate.split('/').map(Number);
  return { width: Number(width), height: Number(height), fps: num / (den || 1), total: Number(total) };
};

/** The picture inside any black bars, as { w, h, x, y }, or null for the whole frame. */
const findCrop = (info) => {
  const spec = flag('crop', 'auto');
  if (spec === 'off') return null;
  if (spec !== 'auto') {
    const [w, h, x, y] = spec.split(':').map(Number);
    if (![w, h, x, y].every((n) => Number.isInteger(n) && n >= 0) || x + w > info.width || y + h > info.height) {
      throw new Error(`--crop must be auto, off or W:H:X:Y inside the ${info.width}x${info.height} frame; got "${spec}".`);
    }
    return { w, h, x, y };
  }
  const every = Math.max(1, Math.floor(info.total / 20));
  // Unlike make-frames.mjs there is no "too much cropped" guard: a portrait picture inside a 16:9 frame
  // loses about two thirds of the width to bars, and that is exactly the case this script is for.
  const r = run('ffmpeg', [
    '-hide_banner', '-v', 'info', '-i', input,
    '-vf', `select='not(mod(n,${every}))',cropdetect=limit=20:round=2:reset=0`, '-f', 'null', '-',
  ]);
  const found = [...r.stderr.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)].at(-1);
  if (!found) return null;
  const [w, h, x, y] = found.slice(1).map(Number);
  return info.width - w < 4 && info.height - h < 4 ? null : { w, h, x, y };
};

const even = (n) => Math.max(2, Math.round(n / 2) * 2);

const info = probe();
console.log(`${path.basename(input)}: ${info.width}x${info.height}, ${info.total} frames at ${info.fps.toFixed(2)} fps`);
const crop = findCrop(info);
const view = crop ? { width: crop.w, height: crop.h } : info;
console.log(crop ? `  cropping black bars: keeping ${crop.w}x${crop.h} at (${crop.x}, ${crop.y})` : '  no black bars to crop');
const width = even(Math.min(MAX_WIDTH, view.width));
const height = even((width * view.height) / view.width);

const id = Date.now().toString(36);
const name = `hero-mobile-${id}`;
const videoOut = path.join(PUBLIC, `${name}.mp4`);
const posterOut = path.join(PUBLIC, `${name}.webp`);
const filters = [crop ? `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}` : null, `scale=${width}:${height}:flags=lanczos`]
  .filter(Boolean)
  .join(',');

run('ffmpeg', [
  '-v', 'error', '-y', '-i', input, '-vf', filters, '-an',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF), '-profile:v', 'high', '-pix_fmt', 'yuv420p',
  // Fixed short keyframe interval and no B-frames: any frame decodes from a keyframe at most GOP-1 frames back.
  '-g', String(GOP), '-keyint_min', String(GOP), '-sc_threshold', '0', '-bf', '0',
  '-movflags', '+faststart', videoOut,
]);
run('ffmpeg', ['-v', 'error', '-y', '-i', input, '-vf', filters, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '78', posterOut]);

const duration = Number(
  run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', videoOut]).stdout.trim()
);
const manifest = {
  src: `${name}.mp4`,
  poster: `${name}.webp`,
  width,
  height,
  duration: Number(duration.toFixed(3)),
  fps: Number(info.fps.toFixed(3)),
};
fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
for (const entry of fs.readdirSync(PUBLIC)) {
  if (entry.startsWith('hero-mobile-') && !entry.startsWith(name)) {
    fs.rmSync(path.join(PUBLIC, entry), { force: true });
    console.log(`Deleted old: ${entry}`);
  }
}
const mb = (f) => (fs.statSync(f).size / 1048576).toFixed(1);
console.log(`\nDone: public/${name}.mp4 (${width}x${height}, ${duration.toFixed(2)} s, ${mb(videoOut)} MB, no audio) + poster.`);
console.log('Hero updated via src/data/heroMobileVideo.json.');
