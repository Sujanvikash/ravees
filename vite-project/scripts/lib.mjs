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
