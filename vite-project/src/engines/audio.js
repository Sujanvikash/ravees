/**
 * LUMINA - Generative Ambient Web Audio Synth
 * Pure Web Audio API procedural holiday ambient soundscape & crystalline chimes.
 * Zero external audio assets required.
 */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.masterGain = null;
    this.filter = null;
    this.oscillators = [];
    this.lfo = null;
    this.lastChimeTime = 0;
  }

  initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();

      // Master gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

      // Warm lowpass filter
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(480, this.ctx.currentTime);
      this.filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

      // Reverb-like stereo delay
      const delay = this.ctx.createDelay();
      delay.delayTime.value = 0.35;
      const delayFeedback = this.ctx.createGain();
      delayFeedback.gain.value = 0.4;
      const delayFilter = this.ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 1200;

      delay.connect(delayFeedback);
      delayFeedback.connect(delayFilter);
      delayFilter.connect(delay);
      delay.connect(this.masterGain);

      this.filter.connect(this.masterGain);
      this.filter.connect(delay);
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startAmbientPad() {
    this.initContext();
    if (this.isPlaying) return;

    this.isPlaying = true;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(0.2, now, 2.5);

    // Winter Solstice Chord: Cmaj9 / G (C, E, G, B, D)
    const freqs = [130.81, 164.81, 196.00, 246.94, 293.66, 392.00];

    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      // Detune slightly for lush shimmer
      osc.detune.setValueAtTime((idx - 2) * 5, now);

      gain.gain.setValueAtTime(0.08 / freqs.length, now);

      osc.connect(gain);
      gain.connect(this.filter);
      osc.start(now);

      this.oscillators.push({ osc, gain });
    });

    // Slow filter breathing
    this.startFilterBreathing();
  }

  startFilterBreathing() {
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.08; // Very slow wave
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain);
    lfoGain.connect(this.filter.frequency);
    lfo.start();
    this.lfo = lfo;
  }

  playChime(noteIndex = 0) {
    if (!this.isPlaying || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.lastChimeTime < 0.15) return; // Debounce
    this.lastChimeTime = now;

    // Pentatonic scale frequencies for bells
    const scale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51];
    const freq = scale[Math.min(noteIndex, scale.length - 1)] || scale[0];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    // Harmonic partial for bell sparkle
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.76, now); // Inharmonic metallic partial

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 1.9);
    osc2.stop(now + 1.9);
  }

  stopAmbientPad() {
    if (!this.isPlaying || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(0.0001, now, 1.2);
    setTimeout(() => {
      this.oscillators.forEach(o => {
        try { o.osc.stop(); } catch { /* already stopped */ }
      });
      this.oscillators = [];
      if (this.lfo) {
        try { this.lfo.stop(); } catch { /* already stopped */ }
        this.lfo = null;
      }
      this.isPlaying = false;
    }, 1300);
  }

  toggle() {
    if (this.isPlaying) {
      this.stopAmbientPad();
      return false;
    } else {
      this.startAmbientPad();
      return true;
    }
  }
}
