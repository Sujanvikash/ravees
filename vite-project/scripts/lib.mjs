// Helpers shared by the video scripts (make-frames.mjs, make-mobile-video.mjs).
import { spawnSync } from 'node:child_process';

/** Runs a command and returns its result ({ stdout, stderr, … }); throws if it is missing or fails. */
export const run = (cmd, argv, cwd) => {
  const r = spawnSync(cmd, argv, { cwd, encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.error) throw new Error(`${cmd} not found. Install ffmpeg and make sure it is on the PATH.`);
  if (r.status !== 0) throw new Error(`${cmd} failed:\n${r.stderr}`);
  return r;
};

/**
 * Width, height, real frame count and frame rate of a video's first stream.
 * The frame count is counted (not read from the header), so frame picks spread over every real frame.
 */
export const probeVideo = (file) => {
  const out = run('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-count_frames',
    '-show_entries', 'stream=width,height,nb_read_frames,r_frame_rate', '-of', 'json', file,
  ]).stdout;
  const s = JSON.parse(out).streams?.[0] ?? {};
  const [num, den] = String(s.r_frame_rate ?? '0/1').split('/').map(Number);
  return { width: Number(s.width), height: Number(s.height), total: Number(s.nb_read_frames), fps: num / (den || 1) };
};

/** Rounds to an even number of at least 2 (video encoders and webp want even sides). */
export const even = (n) => Math.max(2, Math.round(n / 2) * 2);

/**
 * Reads the command line. `flag(name, fallback)` is the value after --name; `bare` holds the arguments
 * that are neither an option nor the value of one (`optionsWithValue` names the options that take a value).
 */
export const parseArgs = (args, optionsWithValue) => ({
  flag: (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : fallback;
  },
  bare: args.filter((a, i) => !a.startsWith('--') && !optionsWithValue.includes(args[i - 1]?.slice(2))),
});

/** A --crop W:H:X:Y value as { w, h, x, y }, checked against the frame; null when it keeps the whole frame. */
export const parseCrop = (spec, info) => {
  const [w, h, x, y] = spec.split(':').map(Number);
  if (![w, h, x, y].every((n) => Number.isInteger(n) && n >= 0) || w < 2 || h < 2 || x + w > info.width || y + h > info.height) {
    throw new Error(`--crop must be auto, off or W:H:X:Y inside the ${info.width}x${info.height} frame; got "${spec}".`);
  }
  return w === info.width && h === info.height ? null : { w, h, x, y };
};

/**
 * The picture's rectangle inside any black bars, as { w, h, x, y }, or null when there are no real bars.
 * Looks at about 20 frames spread over the video and keeps the smallest rectangle that holds the picture
 * in all of them (ffmpeg's cropdetect with reset=0). `before` is an optional filter to run first.
 */
export const detectCrop = (video, info, { before, cwd } = {}) => {
  const every = Math.max(1, Math.floor(info.total / 20));
  const vf = [
    `select='not(mod(n,${every}))'`,
    before,
    // limit 20: black in video is Y=16 (limited range), plus a little compression noise.
    'cropdetect=limit=20:round=2:reset=0',
  ].filter(Boolean).join(',');
  const r = run('ffmpeg', ['-hide_banner', '-v', 'info', '-i', video, '-vf', vf, '-f', 'null', '-'], cwd);
  const found = [...r.stderr.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)].at(-1);
  if (!found) return null;
  const [w, h, x, y] = found.slice(1).map(Number);
  return info.width - w < 4 && info.height - h < 4 ? null : { w, h, x, y };
};
