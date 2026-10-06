// Tiny bell sounds synthesised with Web Audio (no audio files). Only ever played after the visitor
// turns sound on, and always from a click, so browsers allow the AudioContext to start.
let ctx = null;

function audio() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// One bell strike: a fundamental plus two inharmonic partials, each fading out quickly.
function bell(ac, freq, at, volume) {
  [
    [1, 1],
    [2.76, 0.35],
    [5.4, 0.12],
  ].forEach(([mult, amp]) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * mult;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume * amp, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.9 / Math.sqrt(mult));
    osc.connect(gain).connect(ac.destination);
    osc.start(at);
    osc.stop(at + 1);
  });
}

const NOTE = { C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98, B6: 1975.53, E7: 2637.02 };

/** Short rising sleigh-bell arpeggio (item added). */
export function playJingle() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.02;
  ["E6", "G6", "B6", "E7"].forEach((n, i) => bell(ac, NOTE[n], t + i * 0.07, 0.06));
}

/** Opening of "Jingle Bells" (request sent). */
export function playJingleBells() {
  const ac = audio();
  if (!ac) return;
  const beat = 0.17;
  const t = ac.currentTime + 0.02;
  [
    ["E6", 0], ["E6", 1], ["E6", 2],
    ["E6", 4], ["E6", 5], ["E6", 6],
    ["E6", 8], ["G6", 9], ["C6", 10], ["D6", 11], ["E6", 12],
  ].forEach(([n, b]) => bell(ac, NOTE[n], t + b * beat, 0.05));
}
