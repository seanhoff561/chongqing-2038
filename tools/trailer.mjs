// The trailer's music (M10-35, U-104): about 90 s in A minor, made sample by sample here, no samples from anyone.
// Run `node tools/trailer.mjs`: it writes scratch/trailer.wav (44.1 kHz, 16-bit, stereo) and, with ffmpeg, encodes
// media/trailer.ogg (Vorbis q5); without ffmpeg it writes media/trailer.wav (mono, 22.05 kHz) instead.
// 120 bpm (a beat is 0.5 s). Its sections, timed to the trailer:
//    0-12 s  cold open: near silence, the city's hum, a low A drone, two distant piano notes, a drone far off.
//   12-35 s  introduction: the menu's motif (E C D E A) on electric piano over a cold pad, a slow low pulse.
//   35-65 s  escalation: a clock ticking in eighths then sixteenths, strings rising (Am F Dm E), a pulsing bass,
//            low hits closer and closer together, a riser and a snare roll into the climax.
//   65-85 s  climax: big low drums, a driving sixteenth bass, wide pads, the motif loud on piano and a saw lead.
//   85-90 s  button: a hard cut to near silence, one last A on the piano, a servo's whine, a clang, a rotor's buzz
//            leaving.
import { writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const SR = 44100, LEN = 90, N = SR * LEN, TAU = Math.PI * 2, CUT = 85;
const hz = (n) => 440 * 2 ** ((n - 69) / 12);
const clamp = (x, a = -1, b = 1) => Math.max(a, Math.min(b, x));
let seed = 2038;
const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const noise = () => rnd() * 2 - 1;

// Two buses: the music, cut dead at 85 s, and the button after it. Each has a dry pair and reverb and delay sends.
const bus = () => ({ L: new Float32Array(N), R: new Float32Array(N), rv: new Float32Array(N), dl: new Float32Array(N) });
const music = bus(), button = bus();
let B = music;
function put(i, s, p = 0, rv = 0, dl = 0) {
  if (i < 0 || i >= N) return;
  const a = (clamp(p) + 1) * Math.PI / 4;
  B.L[i] += s * Math.cos(a); B.R[i] += s * Math.sin(a); B.rv[i] += s * rv; B.dl[i] += s * dl;
}
function put2(i, l, r, rv = 0, dl = 0) {
  if (i < 0 || i >= N) return;
  B.L[i] += l; B.R[i] += r; B.rv[i] += (l + r) * 0.5 * rv; B.dl[i] += (l + r) * 0.5 * dl;
}

/** A state-variable filter (topology-preserving): run() returns the low-pass; .bp and .hp are left behind. */
class SVF {
  constructor(fc = 1000, q = 0.707) { this.c1 = 0; this.c2 = 0; this.set(fc, q); }
  set(fc, q = 0.707) { const g = Math.tan(Math.PI * Math.min(fc, SR * 0.45) / SR); this.k = 1 / q; this.a1 = 1 / (1 + g * (g + this.k)); this.a2 = g * this.a1; this.a3 = g * this.a2; }
  run(x) {
    const v3 = x - this.c2, v1 = this.a1 * this.c1 + this.a2 * v3, v2 = this.c2 + this.a2 * this.c1 + this.a3 * v3;
    this.c1 = 2 * v1 - this.c1; this.c2 = 2 * v2 - this.c2; this.bp = v1; this.hp = x - this.k * v1 - v2; return v2;
  }
}
/** A band-limited saw (polyBLEP) from a phase in [0,1) and its step. */
function saw(ph, dt) {
  let b = 0;
  if (ph < dt) { const t = ph / dt; b = t + t - t * t - 1; } else if (ph > 1 - dt) { const t = (ph - 1) / dt; b = t * t + t + t + 1; }
  return 2 * ph - 1 - b;
}
const wrap = (p) => p - Math.floor(p);

// ---- Instruments: each renders one event into the current bus. ----

/** Electric piano: two-operator FM with a bell-like tine at the strike, a stereo tremolo, decaying by register. */
function epiano(t0, n, dur, vel, pan = 0, rv = 0.4, dl = 0.25) {
  const f = hz(n), i0 = Math.round(t0 * SR), len = Math.round((dur + 3) * SR), decay = 2.4 * 0.5 ** ((n - 60) / 24);
  let pc = 0, pt = 0;
  for (let j = 0; j < len; j++) {
    const t = j / SR, amp = vel * Math.min(1, t / 0.003) * Math.exp(-t / decay) * (t < dur ? 1 : Math.exp(-(t - dur) / 0.4));
    if (t > 0.1 && amp < 2e-5) break;
    const idx = (0.3 + 1.8 * vel) * Math.exp(-t / 0.3) + 0.2;
    pc = wrap(pc + f / SR); pt = wrap(pt + f * 7.03 / SR);
    const s = Math.sin(TAU * pc + idx * Math.sin(TAU * pc)) + 0.15 * vel * Math.exp(-t / 0.025) * Math.sin(TAU * pt);
    put(i0 + j, s * amp * 0.3, pan + 0.3 * Math.sin(TAU * 4.2 * t), rv, dl);
  }
}

/** Pad or strings: detuned saws a note, spread left and right, through a low-pass sweeping c0 to c1 (Hz). */
function pad(t0, notes, dur, gain, c0, c1, att, rel, rv = 0.5, vib = 0) {
  const i0 = Math.round(t0 * SR), len = Math.round((dur + rel * 7) * SR), fl = new SVF(c0, 0.8), fr = new SVF(c0, 0.8);
  const osc = [];
  for (const n of notes) for (const d of [-11, -4, 4, 11]) osc.push({ f: hz(n) * 2 ** (d / 1200), ph: rnd(), side: d < 0 ? 0 : 1, vp: rnd() * TAU });
  for (let j = 0; j < len; j++) {
    const t = j / SR;
    if (j % 64 === 0) { const c = c0 * (c1 / c0) ** Math.min(1, t / (dur + rel)); fl.set(c, 0.8); fr.set(c, 0.8); }
    const env = gain * (t < att ? Math.sin(t / att * Math.PI / 2) ** 2 : 1) * (t < dur ? 1 : Math.exp(-(t - dur) / rel));
    let l = 0, r = 0;
    for (const o of osc) {
      const f = o.f * (1 + vib * Math.sin(TAU * 5.1 * t + o.vp)), dt = f / SR;
      o.ph = wrap(o.ph + dt); const s = saw(o.ph, dt);
      if (o.side) r += s; else l += s;
    }
    put2(i0 + j, fl.run(l) * env, fr.run(r) * env, rv);
  }
}

/** A plucked bass: saw and sine through a low-pass whose cutoff snaps open and closes, lightly driven. */
function bass(t0, n, dur, gain, cut = 300, snap = 1400) {
  const f = hz(n), i0 = Math.round(t0 * SR), len = Math.round((dur + 0.05) * SR), fl = new SVF(cut, 1.2);
  let ph = 0;
  for (let j = 0; j < len; j++) {
    const t = j / SR;
    if (j % 32 === 0) fl.set(cut + snap * Math.exp(-t / 0.07), 1.2);
    ph = wrap(ph + f / SR);
    const env = Math.min(1, t / 0.002) * Math.exp(-t / (dur * 1.5)) * (t < dur ? 1 : Math.exp(-(t - dur) / 0.01));
    put(i0 + j, Math.tanh(1.6 * (fl.run(saw(ph, f / SR)) + 0.6 * Math.sin(TAU * ph))) * env * gain, 0, 0.05);
  }
}

/** A sub-bass sine: the slow pulse, or the floor under the climax. */
function sub(t0, n, dur, gain, att = 0.01) {
  const f = hz(n), i0 = Math.round(t0 * SR), len = Math.round((dur + 0.3) * SR);
  for (let j = 0; j < len; j++) {
    const t = j / SR, env = Math.min(1, t / att) * (t < dur ? Math.exp(-t / (dur * 0.8)) : Math.exp(-dur / (dur * 0.8) - (t - dur) / 0.08));
    put(i0 + j, Math.sin(TAU * f * t) * env * gain);
  }
}

/** A low hit, taiko-like: a sine falling f0 to f1 Hz, a skin of low-passed noise, driven. */
function boom(t0, gain, dec = 0.8, f0 = 120, f1 = 42, rv = 0.3, pan = 0) {
  const i0 = Math.round(t0 * SR), len = Math.round(dec * 7 * SR), skin = new SVF(900, 0.7);
  let ph = 0;
  for (let j = 0; j < len; j++) {
    const t = j / SR;
    ph = wrap(ph + (f1 + (f0 - f1) * Math.exp(-t / 0.045)) / SR);
    const s = Math.sin(TAU * ph) * Math.exp(-t / dec) + 0.5 * skin.run(noise()) * Math.exp(-t / 0.05);
    put(i0 + j, Math.tanh(1.8 * s) * gain * Math.min(1, t / 0.001), pan, rv);
  }
}

/** A snare or clap: band-passed noise and a short body tone, in a big room. */
function snare(t0, gain, pan = 0, rv = 0.5) {
  const i0 = Math.round(t0 * SR), len = Math.round(0.9 * SR), bp = new SVF(1900, 0.9);
  for (let j = 0; j < len; j++) {
    const t = j / SR;
    bp.run(noise());
    const s = 1.6 * bp.bp * Math.exp(-t / 0.13) + 0.5 * Math.sin(TAU * 185 * t) * Math.exp(-t / 0.05);
    put(i0 + j, s * gain, pan, rv);
  }
}

/** A clock's tick: a click of high noise and a short metal ping. */
function tick(t0, gain, pan = 0) {
  const i0 = Math.round(t0 * SR), len = Math.round(0.08 * SR), hp = new SVF(6000, 0.7);
  for (let j = 0; j < len; j++) {
    const t = j / SR;
    hp.run(noise());
    put(i0 + j, (hp.hp * Math.exp(-t / 0.006) + 0.4 * Math.sin(TAU * 3150 * t) * Math.exp(-t / 0.018)) * gain, pan, 0.15, 0.1);
  }
}

/** Noise through a band-pass rising f0 to f1 Hz, swelling in as `shape` (u => amplitude). */
function sweep(t0, t1, gain, f0, f1, shape, rv = 0.3) {
  const i0 = Math.round(t0 * SR), len = Math.round((t1 - t0) * SR), fl = new SVF(f0, 2), fr = new SVF(f0, 2);
  for (let j = 0; j < len; j++) {
    const u = j / len;
    if (j % 32 === 0) { const c = f0 * (f1 / f0) ** u; fl.set(c, 2); fr.set(c, 2); }
    fl.run(noise()); fr.run(noise());
    const a = shape(u) * gain;
    put2(i0 + j, fl.bp * a, fr.bp * a, rv);
  }
}

/** The low A drone: detuned sines and a dark saw, slowly in and out. */
function drone(t0, t1, notes, gain, fade) {
  const i0 = Math.round(t0 * SR), len = Math.round((t1 - t0) * SR), lp = new SVF(220, 0.9);
  const ph = notes.flatMap((n) => [[hz(n), 0], [hz(n) * 1.004, 0]]);
  let sp = 0;
  for (let j = 0; j < len; j++) {
    const t = j / SR, u = j / len, env = gain * Math.min(1, t / fade, (t1 - t0 - t) / fade);
    if (j % 64 === 0) lp.set(160 + 120 * Math.sin(TAU * t / 7), 0.9);
    let s = 0;
    for (const p of ph) { p[1] = wrap(p[1] + p[0] / SR); s += Math.sin(TAU * p[1]); }
    sp = wrap(sp + hz(notes[0]) / SR);
    s = s / ph.length + 0.8 * lp.run(saw(sp, hz(notes[0]) / SR));
    put2(i0 + j, s * env * (1 + 0.1 * Math.sin(TAU * u * 3)), s * env * (1 - 0.1 * Math.sin(TAU * u * 3)), 0.3);
  }
}

/** The city's hum: brown noise in each ear, a faint 100 Hz mains hum, traffic swelling far off. */
function hum(t0, t1, gain, fade) {
  const i0 = Math.round(t0 * SR), len = Math.round((t1 - t0) * SR), fl = new SVF(240, 0.6), fr = new SVF(240, 0.6);
  let bl = 0, br = 0;
  for (let j = 0; j < len; j++) {
    const t = j / SR, env = gain * Math.min(1, t / fade, (t1 - t0 - t) / fade);
    bl = 0.995 * bl + 0.05 * noise(); br = 0.995 * br + 0.05 * noise();
    const tr = 1 + 0.4 * Math.sin(TAU * t / 5.3) * Math.sin(TAU * t / 3.1), h = 0.04 * (Math.sin(TAU * 100 * t) + 0.5 * Math.sin(TAU * 200 * t));
    put2(i0 + j, (fl.run(bl) * tr + h) * env, (fr.run(br) * tr + h) * env, 0.2);
  }
}

/** A quad drone's rotors: four buzzing props, Doppler d0 to d1, panning p0 to p1, low-passed c0 to c1 with distance. */
function rotor(t0, t1, gain, p0, p1, d0, d1, c0, c1, shape) {
  const i0 = Math.round(t0 * SR), len = Math.round((t1 - t0) * SR), lp = new SVF(c0, 0.9), wind = new SVF(900, 0.8);
  const props = [186, 193, 201, 209].map((f) => ({ f, ph: rnd(), w: rnd() * TAU }));
  for (let j = 0; j < len; j++) {
    const u = j / len, t = j / SR, d = d0 + (d1 - d0) * u;
    if (j % 64 === 0) lp.set(c0 * (c1 / c0) ** u, 0.9);
    let s = 0;
    for (const p of props) { const f = p.f * d * (1 + 0.006 * Math.sin(TAU * 1.3 * t + p.w)), dt = f / SR; p.ph = wrap(p.ph + dt); s += saw(p.ph, dt) * (0.7 + 0.3 * Math.sin(TAU * p.ph * 0.5)); }
    wind.run(noise());
    put(i0 + j, (lp.run(s * 0.25) + 0.3 * wind.bp) * shape(u) * gain, p0 + (p1 - p0) * u, 0.25);
  }
}

/** The sting: a servo whining up, then a metal clang (inharmonic partials). */
function sting(t0, gain) {
  const i0 = Math.round(t0 * SR), len = Math.round(0.5 * SR);
  let ph = 0;
  for (let j = 0; j < len; j++) {
    const t = j / SR, f = 480 + 1100 * (1 - Math.exp(-t / 0.12)), env = Math.min(1, t / 0.02) * (t < 0.36 ? 1 : Math.exp(-(t - 0.36) / 0.03));
    ph = wrap(ph + f / SR);
    put(i0 + j, (Math.sin(TAU * ph) + 0.35 * Math.sin(2 * TAU * ph) + 0.15 * Math.sin(3 * TAU * ph)) * env * gain * 0.5, 0.3, 0.3);
  }
  const c0 = t0 + 0.36, k0 = Math.round(c0 * SR), parts = [[1, 1, 2.2], [2.76, 0.6, 1.4], [5.4, 0.4, 0.9], [8.93, 0.25, 0.5]];
  for (let j = 0; j < 3 * SR; j++) {
    const t = j / SR;
    let s = 0;
    for (const [r, a, d] of parts) s += a * Math.sin(TAU * 196 * r * t) * Math.exp(-t / d);
    put(k0 + j, s * gain * 0.45 * Math.min(1, t / 0.001, (3 - t) / 0.5), -0.2, 0.6, 0.3);
  }
}

// ---- The score. ----
const M = { A4: 69, B4: 71, C5: 72, D5: 74, E5: 76, F5: 77, G5: 79, A5: 81, G4: 67, Gs4: 68 };
const CH = { Am: [[57, 60, 64, 71], 45], F: [[53, 57, 60, 64], 41], C: [[55, 60, 64, 67], 36], Em: [[52, 55, 59, 62], 40], G: [[55, 59, 62, 67], 43], Dm: [[53, 57, 62, 65], 38], E: [[52, 56, 59, 64], 40] };

// Cold open (0-12 s).
hum(0, 13, 0.2, 3);
drone(0, 14, [33, 40], 0.04, 4);
epiano(3.0, M.E5, 1.5, 0.35, 0.5, 0.75, 0.45);
epiano(7.6, M.A4, 2, 0.3, -0.4, 0.75, 0.45); epiano(7.6, 45, 2, 0.2, -0.2, 0.7, 0);
rotor(4.5, 10.5, 0.05, -0.8, 0.2, 1.03, 0.97, 500, 500, (u) => Math.sin(Math.PI * u) ** 2);
sweep(9.5, 12, 0.5, 300, 2400, (u) => u ** 3);
boom(12, 0.25, 1.2, 80, 38, 0.5);

// Introduction (12-35 s): Am F C Em Am F, the motif twice, a slow pulse.
['Am', 'F', 'C', 'Em', 'Am', 'F'].forEach((c, k) => {
  const t = 12 + 4 * k, [notes, root] = CH[c];
  pad(t, notes, k === 5 ? 3 : 4, 0.032, 450, 1300, k ? 0.6 : 2.5, 1.2);
  epiano(t, root + 12, 3.5, 0.22, -0.3, 0.5, 0);
});
for (let t = 14; t < 35; t += 1) sub(t, (CH[['Am', 'F', 'C', 'Em', 'Am', 'F'][Math.floor((t - 12) / 4)]][1]) - 12, 0.35, t % 2 ? 0.16 : 0.26);
const intro = [[14, 'E5', 1], [15, 'C5', 0.5], [15.5, 'D5', 0.5], [16, 'E5', 1.5], [17.5, 'A4', 1.5], [19, 'G4', 0.5], [19.5, 'A4', 0.5],
  [20, 'C5', 1.5], [21.5, 'B4', 0.5], [22, 'G4', 2], [24, 'E5', 1], [25, 'C5', 0.5], [25.5, 'D5', 0.5], [26, 'E5', 1], [27, 'G5', 1],
  [28, 'A5', 2], [30, 'E5', 1], [31, 'D5', 0.5], [31.5, 'C5', 0.5], [32, 'A4', 3]];
for (const [t, n, d] of intro) epiano(t, M[n], d, 0.62, 0.1, 0.45, 0.35);

// Escalation (35-65 s): Am F Dm E twice, strings rising, the clock, the bass, the hits closer together.
const esc = ['Am', 'F', 'Dm', 'E', 'Am', 'F', 'Dm', 'E'], top = [64, 65, 69, 68, 69, 72, 74, 76];
esc.forEach((c, k) => {
  const t = 35 + 4 * k, [notes, root] = CH[c], d = k === 7 ? 2 : 4;
  pad(t, notes, d, 0.04 + 0.006 * k, 600 + 350 * k, 900 + 450 * k, 1.2, 0.5, 0.5, 0.003);
  pad(t, [top[k]], d, 0.05 + 0.006 * k, 1200, 2500 + 300 * k, 0.8, 0.4, 0.55, 0.004);
  if (k < 4) boom(t, 0.22, 1.1, 100, 40, 0.45); else { boom(t, 0.6, 0.9); boom(t + 2, 0.5, 0.9); }
  if (k >= 6) { boom(t + 1, 0.45, 0.7); boom(t + 3, 0.45, 0.7); }
  if (k >= 1) for (let s = 0; s < d; s += 0.25) bass(t + s, root + (k >= 4 && (s * 4) % 2 ? 12 : 0), 0.2, 0.2 + 0.012 * k);
});
for (let t = 35; t < 65; ) {
  const step = t < 51 ? 0.25 : t < 63 ? 0.125 : 0.0625, beat = Math.abs(t * 2 - Math.round(t * 2)) < 1e-6;
  tick(t, (0.12 + 0.1 * (t - 35) / 30) * (beat ? 1 : 0.55), (Math.round(t / step) % 2 ? 0.3 : -0.3));
  t = Math.round((t + step) * 16) / 16;
}
for (const [t, n, d] of [[37, 'E5', 0.5], [37.5, 'C5', 0.5], [38, 'D5', 0.5], [38.5, 'E5', 1.5], [47, 'Gs4', 2], [53, 'E5', 0.5], [53.5, 'C5', 0.5],
  [54, 'D5', 0.5], [54.5, 'E5', 0.5], [55, 'A5', 2], [61, 'E5', 0.5], [61.5, 'C5', 0.5], [62, 'D5', 0.5], [62.5, 'E5', 1.5]]) epiano(t, M[n], d, 0.5, -0.1, 0.4, 0.4);
for (const [t, n, d] of [[45, 'E5', 0.5], [45.5, 'C5', 0.5], [46, 'D5', 0.5], [46.5, 'E5', 1.5]]) epiano(t, M[n] - 12, d, 0.45, 0.2, 0.4, 0.4);
for (let i = 0; i < 24; i++) { const t = 61 + 4 * (1 - (1 - i / 24) ** 1.6); snare(t, 0.05 + 0.25 * (i / 24) ** 2, (i % 2 ? 0.2 : -0.2), 0.35); }
sweep(57, 65, 0.9, 200, 7000, (u) => u ** 2.5, 0.4);
boom(64.5, 0.6, 0.6); boom(64.75, 0.7, 0.6);

// Climax (65-85 s): Am F C G twice, then Dm E; the drums, the driving bass, the motif loud and wide.
const clx = ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G', 'Dm', 'E'];
clx.forEach((c, k) => {
  const t = 65 + 2 * k, [notes, root] = CH[c];
  pad(t, notes, 2, 0.03, 1800, 3200, 0.05, 0.4, 0.45);
  pad(t, notes.map((n) => n + 12), 2, 0.016, 2200, 4000, 0.15, 0.4, 0.6, 0.003);
  sub(t, root - 12, 2, 0.2, 0.02);
  for (let s = 0; s < 2; s += 0.125) bass(t + s, root - 12 + ([0, 0, 12, 0][Math.round(s * 8) % 4]), 0.1, 0.13, 350, 2000);
  boom(t, 1, 0.9, 130, 40); boom(t + 0.75, 0.6, 0.6); boom(t + 1, 0.85, 0.8, 125, 41);
  snare(t + 0.5, 0.35); snare(t + 1.5, 0.35);
  for (let s = 0; s < 2; s += 0.125) tick(t + s, Math.round(s * 8) % 2 ? 0.07 : 0.13, Math.round(s * 8) % 2 ? 0.4 : -0.4);
});
for (let i = 0; i < 8; i++) boom(84 + i * 0.125, 0.4 + 0.07 * i, 0.4, 160 - 8 * i, 60, 0.3, (i % 2 ? 0.3 : -0.3));
const climax = [[0, 'E5', 1], [1, 'C5', 0.5], [1.5, 'D5', 0.5], [2, 'E5', 1.5], [3.5, 'A4', 0.5], [4, 'C5', 1], [5, 'D5', 0.5], [5.5, 'E5', 0.5],
  [6, 'D5', 1], [7, 'B4', 1], [8, 'E5', 1], [9, 'C5', 0.5], [9.5, 'D5', 0.5], [10, 'E5', 1], [11, 'G5', 1], [12, 'A5', 1.5], [13.5, 'G5', 0.5],
  [14, 'G5', 1], [15, 'D5', 1], [16, 'F5', 1], [17, 'E5', 0.5], [17.5, 'D5', 0.5], [18, 'E5', 2]];
for (const [s, n, d] of climax) {
  const t = 65 + s, len = Math.min(d, CUT - t);
  epiano(t, M[n], len, 0.95, -0.35, 0.4, 0.3); epiano(t, M[n] - 12, len, 0.7, 0.35, 0.4, 0.3);
  pad(t, [M[n]], len, 0.03, 2600, 3600, 0.03, 0.15, 0.4, 0.004);
}

// Button (85-90 s): cut; one last A; the servo, the clang, a rotor leaving.
B = button;
hum(85.3, 90, 0.35, 1.2);
epiano(85.7, 57, 3, 0.4, 0, 0.7, 0.3); epiano(85.7, 69, 3, 0.35, 0.1, 0.7, 0.3); sub(85.7, 33, 2.5, 0.12, 0.05);
sting(86.6, 0.12);
rotor(86.7, 90, 0.18, 0.5, -0.9, 1.0, 0.93, 3000, 500, (u) => Math.min(1, u * 12) * (1 - u) ** 2);

// ---- Effects and mix. ----
/** A ping-pong delay (dotted eighth), its repeats darkened; the repeats also go to the reverb. */
function delay(b) {
  const d = Math.round(0.375 * SR), L = new Float32Array(N), R = new Float32Array(N), lp = new SVF(2500, 0.7);
  for (let i = d; i < N; i++) { L[i] = lp.run(b.dl[i - d] + 0.42 * R[i - d]); R[i] = 0.42 * L[i - d]; b.rv[i] += 0.2 * (L[i] + R[i]); }
  return [L, R];
}
/** Freeverb: eight damped combs and four all-passes per ear, the right ear's a little longer. */
function reverb(inp, room = 0.9, damp = 0.35) {
  const out = [new Float32Array(N), new Float32Array(N)], pre = Math.round(0.025 * SR);
  [0, 23].forEach((spread, ch) => {
    const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((n) => ({ b: new Float32Array(n + spread), i: 0, f: 0 }));
    const aps = [556, 441, 341, 225].map((n) => ({ b: new Float32Array(n + spread), i: 0 }));
    const o = out[ch];
    for (let i = 0; i < N; i++) {
      const x = (i >= pre ? inp[i - pre] : 0) * 0.015;
      let y = 0;
      for (const c of combs) { const v = c.b[c.i]; y += v; c.f = v * (1 - damp) + c.f * damp; c.b[c.i] = x + c.f * room; if (++c.i >= c.b.length) c.i = 0; }
      for (const a of aps) { const v = a.b[a.i]; a.b[a.i] = y + v * 0.5; y = v - y; if (++a.i >= a.b.length) a.i = 0; }
      o[i] = y;
    }
  });
  return out;
}
const L = new Float32Array(N), R = new Float32Array(N), cut = Math.round(CUT * SR);
for (const b of [music, button]) {
  const [dL, dR] = delay(b), [rL, rR] = reverb(b.rv);
  for (let i = 0; i < N; i++) {
    const t = i / SR, g = b === music ? (i < cut ? 1 : Math.max(0, 1 - (i - cut) / (0.03 * SR))) : clamp((90 - t) / 1.5, 0, 1);
    L[i] += (b.L[i] + 0.6 * dL[i] + 2.2 * rL[i]) * g; R[i] += (b.R[i] + 0.6 * dR[i] + 2.2 * rR[i]) * g;
  }
}
// Master: a DC block, a gentle compressor to glue the climax, a fade-in, then normalised to -1 dBFS peak.
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
let env = 0, hl = 0, hr = 0, xl = 0, xr = 0;
const atk = Math.exp(-1 / (0.01 * SR)), relc = Math.exp(-1 / (0.25 * SR)), thr = 0.35;
for (let i = 0; i < N; i++) {
  const l = L[i] / peak, r = R[i] / peak;
  hl = 0.9995 * (hl + l - xl); hr = 0.9995 * (hr + r - xr); xl = l; xr = r;
  const lvl = Math.max(Math.abs(hl), Math.abs(hr));
  env = lvl > env ? atk * env + (1 - atk) * lvl : relc * env + (1 - relc) * lvl;
  const g = (env > thr ? (thr * (env / thr) ** (1 / 2.5)) / env : 1) * Math.min(1, i / (0.5 * SR));
  L[i] = hl * g; R[i] = hr * g;
}
peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const norm = 10 ** (-1 / 20) / peak;

/** A 16-bit PCM WAV of the given channels, resampled by simple averaging when `step` > 1. */
function wav(chs, rate, step) {
  const n = Math.floor(N / step), buf = Buffer.alloc(44 + n * chs.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * chs.length * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(chs.length, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * chs.length * 2, 28);
  buf.writeUInt16LE(chs.length * 2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * chs.length * 2, 40);
  let max = 0;
  for (let i = 0; i < n; i++) chs.forEach((c, ch) => {
    let s = 0;
    for (let k = 0; k < step; k++) s += c[i * step + k];
    const v = Math.round(clamp(s / step * norm) * 32767);
    max = Math.max(max, Math.abs(v));
    buf.writeInt16LE(v, 44 + (i * chs.length + ch) * 2);
  });
  return [buf, max];
}
mkdirSync('scratch', { recursive: true }); mkdirSync('media', { recursive: true });
const [stereo, max] = wav([L, R], SR, 1);
writeFileSync('scratch/trailer.wav', stereo);
const db = (x) => (20 * Math.log10(x)).toFixed(2);
console.log(`trailer: ${LEN} s, peak ${db(max / 32768)} dBFS -> scratch/trailer.wav`);
for (const [a, b, name] of [[0, 12, 'cold open'], [12, 35, 'introduction'], [35, 65, 'escalation'], [65, 85, 'climax'], [85, 90, 'button']]) {
  let s = 0;
  for (let i = a * SR; i < b * SR; i++) s += (L[i] * norm) ** 2 + (R[i] * norm) ** 2;
  console.log(`  ${name.padEnd(13)} ${a}-${b} s  rms ${db(Math.sqrt(s / ((b - a) * SR * 2)))} dBFS`);
}
if (spawnSync('which', ['ffmpeg']).status === 0) {
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', 'scratch/trailer.wav', '-c:a', 'libvorbis', '-q:a', '5', 'media/trailer.ogg']);
  if (r.status !== 0) throw new Error(String(r.stderr));
  console.log('  -> media/trailer.ogg');
} else {
  const M2 = new Float32Array(N);
  for (let i = 0; i < N; i++) M2[i] = (L[i] + R[i]) / 2;
  writeFileSync('media/trailer.wav', wav([M2], SR / 2, 2)[0]);
  console.log('  -> media/trailer.wav (mono, 22.05 kHz)');
}
