/**
 * Builds every frame the scroll hero needs from one video:
 *   public/<out>/desktop/        1920x1080  (sharp)
 *   public/<out>/mobile/         1280x720   (sharp)
 *   public/<out>/desktop-small/  480x270    (stand-ins for fast scrolling)
 *   public/<out>/mobile-small/   320x180
 * Frames are picked evenly across the video (first and last included), the Gemini sparkle in the
 * bottom-right corner is removed, and each set is written as frame_0001.webp, frame_0002.webp, ...
 *
 * Needs ffmpeg on the PATH (winget install Gyan.FFmpeg). Nothing else.
 *
 * Run: node scripts/make-frames.mjs <video.mp4> [--frames 150]
 *
 * Each run writes a NEW folder (public/frames-<timestamp>, so browsers never serve stale frames),
 * then deletes every older public/frames-* folder and rewrites src/data/heroFrames.json, which
 * ScrollTreeHero.jsx imports. Nothing to edit by hand: the hero always shows the latest frames.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const video = args.find((a) => !a.startsWith('--') && a !== flag('frames') && a !== flag('out'));
const FRAMES = Number(flag('frames', 150));
const PUBLIC = path.join(__dirname, '..', 'public');
const OUT_NAME = flag('out', `frames-${Date.now().toString(36)}`);
const OUT = path.join(PUBLIC, OUT_NAME);

if (!video || !fs.existsSync(video)) {
  console.error('Usage: node scripts/make-frames.mjs <video.mp4> [--frames 150]');
  process.exit(1);
}

const run = (cmd, argv, cwd) => {
  const r = spawnSync(cmd, argv, { cwd, encoding: 'utf8' });
  if (r.error) throw new Error(`${cmd} not found. Install ffmpeg and make sure it is on the PATH.`);
  if (r.status !== 0) throw new Error(`${cmd} failed:\n${r.stderr}`);
  return r.stdout;
};

// How many frames the video really has, so the picks are spread over all of them.
const total = Number(
  run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', video]).trim(),
);
if (!(total >= FRAMES)) throw new Error(`The video has ${total} frames, fewer than the ${FRAMES} asked for.`);

// The sparkle: a 4-point star centred at (1740, 900), about 72 px across, at the same spot in every
// frame of 1920x1080 Gemini videos. Drawn as a mask slightly larger than the sparkle, so the filter
// fills it from the background around it (a rectangle smeared branches and snow that touched its edge).
const WATERMARK = { x: 1740, y: 900, radius: 46, shape: 0.7 };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'make-frames-'));
run('ffmpeg', [
  '-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=black:s=1920x1080,format=gray',
  '-vf', `geq=lum='if(lte(pow(abs(X-${WATERMARK.x}),${WATERMARK.shape})+pow(abs(Y-${WATERMARK.y}),${WATERMARK.shape}),pow(${WATERMARK.radius},${WATERMARK.shape})),255,0)',dilation,format=gray`,
  '-frames:v', '1', '-update', '1', 'mask.pgm',
], tmp);

// Picks frame n when floor(n * (FRAMES-1) / (total-1)) steps up: exactly FRAMES frames, first and last included.
// (The filter option takes a relative file name; "C:" in a Windows path breaks ffmpeg's filter syntax.)
const pick = `select='not(eq(floor(n*${FRAMES - 1}/${total - 1}),floor((n-1)*${FRAMES - 1}/${total - 1})))'`;

const SETS = [
  ['desktop', 1920, 1080, 80],
  ['mobile', 1280, 720, 80],
  ['desktop-small', 480, 270, 72],
  ['mobile-small', 320, 180, 72],
];

for (const [name, w, h, quality] of SETS) {
  const dir = path.join(OUT, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const scale = w === 1920 ? '' : `,scale=${w}:${h}:flags=lanczos`;
  run('ffmpeg', [
    '-v', 'error', '-y', '-i', path.resolve(video),
    '-vf', `${pick},removelogo=mask.pgm${scale}`,
    '-fps_mode', 'passthrough', '-c:v', 'libwebp', '-quality', String(quality), '-compression_level', '6',
    path.join(dir, 'frame_%04d.webp'),
  ], tmp);
  const files = fs.readdirSync(dir);
  const bytes = files.reduce((sum, f) => sum + fs.statSync(path.join(dir, f)).size, 0);
  console.log(`${name}: ${files.length} frames, ${w}x${h}, ${(bytes / 1048576).toFixed(1)} MB`);
}

fs.rmSync(tmp, { recursive: true, force: true });

// Only now that the new set is complete: point the hero at it and delete the old frames.
fs.writeFileSync(
  path.join(__dirname, '..', 'src', 'data', 'heroFrames.json'),
  `${JSON.stringify({ dir: OUT_NAME, count: FRAMES }, null, 2)}
`,
);
for (const entry of fs.readdirSync(PUBLIC)) {
  if (entry.startsWith('frames-') && entry !== OUT_NAME) {
    fs.rmSync(path.join(PUBLIC, entry), { recursive: true, force: true });
    console.log(`Deleted old frames: ${entry}`);
  }
}
console.log(`Done: ${path.relative(process.cwd(), OUT)} (${FRAMES} frames from ${total}). Hero updated via src/data/heroFrames.json.`);
