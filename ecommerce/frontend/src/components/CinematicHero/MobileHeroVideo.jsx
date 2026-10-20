import { useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { MOBILE_VIDEO, MOBILE_VIDEO_POSITION } from "./heroConfig";

// Scroll-scrubbing is dropped for plain playback when seeking is too slow to look like motion:
// the median of the first SEEK_SAMPLES seeks above SEEK_SLOW_MS, or one seek that never finishes.
const SEEK_SAMPLES = 8;
const SEEK_SLOW_MS = 350;
const SEEK_STALL_MS = 2500;

const base = import.meta.env.BASE_URL;
const FRAME_TIME = 1 / MOBILE_VIDEO.fps;
// The last frame starts one frame before the end; asking for `duration` itself shows nothing on some browsers.
const LAST_TIME = Math.max(0, MOBILE_VIDEO.duration - FRAME_TIME);

/**
 * Phone visual: the portrait video, its time driven by the scroll (the parent calls
 * `ref.current.render(progress)`). Only one seek is in flight at a time; when it lands, the video
 * jumps to wherever the scroll is by then, so it keeps up without queueing stale seeks.
 */
const MobileHeroVideo = ({ ref, reduced }) => {
  const videoRef = useRef(null);
  const s = useRef({ target: 0, ready: false, mode: "scrub", seekStart: 0, samples: [], stall: 0 });

  const fallBackToPlayback = useCallback(() => {
    const st = s.current;
    if (st.mode !== "scrub") return;
    st.mode = "play";
    clearTimeout(st.stall);
    // Plays once and stays on the finished tree (no loop: a forest-to-tree journey restarting is a hard cut).
    videoRef.current?.play().catch(() => {});
  }, []);

  const seek = useCallback(() => {
    const v = videoRef.current;
    const st = s.current;
    if (!v || !st.ready || st.mode !== "scrub" || v.seeking) return;
    if (Math.abs(v.currentTime - st.target) < FRAME_TIME / 2) return;
    st.seekStart = performance.now();
    v.currentTime = st.target;
    clearTimeout(st.stall);
    if (!reduced) st.stall = setTimeout(fallBackToPlayback, SEEK_STALL_MS);
  }, [reduced, fallBackToPlayback]);

  useImperativeHandle(
    ref,
    () => ({
      render: (p) => {
        s.current.target = p * LAST_TIME;
        seek();
      },
    }),
    [seek]
  );

  useEffect(() => {
    const v = videoRef.current;
    const st = s.current;
    // React does not always reflect `muted` as an attribute, and iOS only allows muted inline video.
    v.muted = true;
    v.defaultMuted = true;

    const onSeeked = () => {
      clearTimeout(st.stall);
      if (st.mode !== "scrub") return;
      if (st.samples.length < SEEK_SAMPLES) {
        st.samples.push(performance.now() - st.seekStart);
        if (st.samples.length === SEEK_SAMPLES) {
          const sorted = [...st.samples].sort((a, b) => a - b);
          if (sorted[SEEK_SAMPLES >> 1] > SEEK_SLOW_MS && !reduced) {
            fallBackToPlayback();
            return;
          }
        }
      }
      seek(); // catch up with the scroll that happened during the seek
    };
    // iOS Safari will not decode a paused video it has never played: a muted play-then-pause primes it,
    // after which setting currentTime paints the frame.
    const onReady = () => {
      if (st.ready) return;
      const begin = () => {
        st.ready = true;
        seek();
      };
      const primed = v.play();
      if (primed) primed.then(() => { v.pause(); begin(); }, begin);
      else begin();
    };
    const onError = () => clearTimeout(st.stall); // the poster stays up

    v.addEventListener("seeked", onSeeked);
    v.addEventListener("loadeddata", onReady);
    v.addEventListener("error", onError);
    if (v.readyState >= 2) onReady();
    return () => {
      clearTimeout(st.stall);
      v.removeEventListener("seeked", onSeeked);
      v.removeEventListener("loadeddata", onReady);
      v.removeEventListener("error", onError);
    };
  }, [seek, reduced, fallBackToPlayback]);

  return (
    <video
      ref={videoRef}
      aria-hidden="true"
      tabIndex={-1}
      src={`${base}${MOBILE_VIDEO.src}`}
      poster={`${base}${MOBILE_VIDEO.poster}`}
      muted
      playsInline
      preload="auto"
      disablePictureInPicture
      disableRemotePlayback
      className="absolute inset-0 h-full w-full object-cover"
      style={{ objectPosition: MOBILE_VIDEO_POSITION }}
    />
  );
};

export default MobileHeroVideo;
