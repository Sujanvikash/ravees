import { useEffect, useEffectEvent } from 'react';

/**
 * A global barcode scan: a scan adds the product wherever the cursor is, not only when the scan box has focus.
 *
 * The scanner is a keyboard wedge — it "types" the code and an Enter very fast. We watch keystrokes on the
 * window and tell a scan from a person by speed: characters a few ms apart are the scanner. A fast burst ending
 * in Enter is a scan: we call `onScan(code)` and keep those keystrokes out of whatever field had focus (the
 * burst's characters are swallowed; the one that slips in before we're sure is put back). A person typing is far
 * slower, so it's never captured — they can still type a code into the scan box and press Enter as before.
 *
 * `enabled` turns it off (e.g. while a dialog is open), so a scan then goes to the focused field as usual.
 */
const FAST_MS = 45; // at most this long between characters to count as the scanner
const RESET_MS = 300; // a longer gap starts a fresh sequence
const MIN_LEN = 3; // ignore a stray one or two fast keys

export const useScanner = (onScan, enabled = true) => {
  const fire = useEffectEvent((code) => onScan(code));

  useEffect(() => {
    if (!enabled) return undefined;
    let buffer = '';
    let prev = 0;
    let fast = true;
    let snap = null;

    const snapshot = () => {
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
        return { el, value: el.value, start: el.selectionStart, end: el.selectionEnd };
      }
      return null;
    };
    // Put a field back the way it was, through React: the native setter + an input event so React's state follows.
    const restore = (s) => {
      if (!s || !s.el.isConnected) return;
      const proto = s.el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(s.el, s.value);
      s.el.dispatchEvent(new Event('input', { bubbles: true }));
      try {
        s.el.setSelectionRange(s.start, s.end);
      } catch {
        // some input types don't allow selection; ignore
      }
    };

    const onKey = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const gap = e.timeStamp - prev;
      prev = e.timeStamp;
      if (gap > RESET_MS) {
        buffer = '';
        fast = true;
        snap = snapshot();
      }
      if (e.key === 'Enter') {
        const code = buffer;
        buffer = '';
        if (fast && code.length >= MIN_LEN) {
          e.preventDefault();
          e.stopImmediatePropagation();
          restore(snap);
          fire(code);
        }
        fast = true;
        return;
      }
      if (e.key.length === 1) {
        if (buffer.length >= 1 && gap > FAST_MS) fast = false; // a human-speed gap: not a scan
        if (fast && buffer.length >= 1) e.preventDefault(); // keep the burst's characters out of the focused field
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [enabled]);
};
