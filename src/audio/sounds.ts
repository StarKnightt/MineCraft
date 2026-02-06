// ============================================================
// Sound system — procedural audio via Web Audio API.
//
// OPTIMIZATIONS:
//   - AudioContext created lazily on first user interaction.
//   - Noise buffers are pre-created at fixed durations (0.06s,
//     0.08s, 0.12s, 0.15s) and reused for every hit/burst,
//     eliminating per-call AudioBuffer allocation + random fill.
//   - Oscillator/gain nodes are lightweight (no buffer alloc)
//     so they're still created per-call.
// ============================================================

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// ---- pre-built noise buffers --------------------------------
// Keyed by duration in ms.  Created lazily on first use so
// the AudioContext exists.

const _noiseBuffers = new Map<number, AudioBuffer>();

function getNoiseBuffer(durationSec: number): AudioBuffer {
  const key = Math.round(durationSec * 1000);
  let buf = _noiseBuffers.get(key);
  if (buf) return buf;

  const c = getCtx();
  const size = Math.floor(c.sampleRate * durationSec);
  buf = c.createBuffer(1, size, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < size; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  _noiseBuffers.set(key, buf);
  return buf;
}

// ---- helper: play a short oscillator burst ------------------

function noiseBurst(
  duration: number,
  freq: number,
  gain: number,
  type: OscillatorType = 'square',
) {
  const c = getCtx();
  const now = c.currentTime;

  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + duration);

  const g = c.createGain();
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(g).connect(c.destination);
  osc.start(now);
  osc.stop(now + duration);
}

// ---- helper: play filtered noise (reuses pre-built buffer) --

function noiseHit(duration: number, freq: number, gain: number) {
  const c = getCtx();
  const now = c.currentTime;

  const src = c.createBufferSource();
  src.buffer = getNoiseBuffer(duration);

  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(freq, now);
  filter.Q.setValueAtTime(1.5, now);

  const g = c.createGain();
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);

  src.connect(filter).connect(g).connect(c.destination);
  src.start(now);
  src.stop(now + duration);
}

// ---- public sound functions ---------------------------------

/** Block placed — satisfying thud */
export function playPlace() {
  noiseBurst(0.12, 220, 0.15, 'square');
  noiseHit(0.08, 800, 0.1);
}

/** Block broken — crumbly crack */
export function playBreak() {
  noiseHit(0.15, 1200, 0.18);
  noiseBurst(0.1, 400, 0.1, 'sawtooth');
  setTimeout(() => noiseHit(0.08, 900, 0.08), 40);
}

/** Footstep — soft crunch (throttled to ~5/sec) */
let lastFootstep = 0;
export function playFootstep() {
  const now = performance.now();
  if (now - lastFootstep < 200) return;
  lastFootstep = now;

  const pitchVar = 600 + Math.random() * 400;
  noiseHit(0.06, pitchVar, 0.06);
}

/** Fall / respawn splash */
export function playRespawn() {
  const c = getCtx();
  const now = c.currentTime;

  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.3);

  const g = c.createGain();
  g.gain.setValueAtTime(0.15, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  osc.connect(g).connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.4);

  setTimeout(() => noiseBurst(0.08, 500, 0.12, 'sine'), 250);
}

/** Jump — short upward blip */
export function playJump() {
  const c = getCtx();
  const now = c.currentTime;

  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(250, now);
  osc.frequency.exponentialRampToValueAtTime(450, now + 0.1);

  const g = c.createGain();
  g.gain.setValueAtTime(0.08, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc.connect(g).connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}
