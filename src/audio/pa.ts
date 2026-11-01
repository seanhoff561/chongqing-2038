// The street speakers' voice (M4-28, U-053, U-092, U-094): a chime, then the announcement in a calm Chinese woman's
// voice (recorded once with a neural text-to-speech model: credits), from the real loudspeakers on the lampposts round
// him, each where it stands. Close to one it's clear and dry, its horn's thin band; the farther a speaker, the later
// it reaches him (sound's own speed), the duller and quieter, and the more of it is the street's reverb. Indoors
// it's all muffled through the walls. No subtitles.
import type { Audio } from './audio';

/** How near a speaker is heard (m), how long after the chime the words start (s), the horn's band and its gentle lift
 *  (U-095: softer, less metallic), how loud
 *  the horn is, and how the street's reverb grows with distance (its share of a speaker heard d m off: d / wet, at
 *  most `most`). */
const PA = { hear: 90, words: 1.9, band: [260, 4800], lift: 2000, liftDb: 1.5, level: 0.9, wet: 120, most: 0.5, sound: 343 };

const lines = new Map<string, Promise<AudioBuffer | null>>();
function line(a: Audio, id: string) {
  let p = lines.get(id);
  if (!p) lines.set(id, (p = fetch(`./audio/pa/${id}.ogg`).then(r => (r.ok ? r.arrayBuffer() : null)).then(b => (b ? a.ctx!.decodeAudioData(b) : null)).catch(() => null)));
  return p;
}

/** The street between the blocks: a short, dense reverb (early slaps off the facades, a 1.2 s tail), made once. */
let street: ConvolverNode | null = null;
function reverb(a: Audio) {
  if (street) return street;
  const ctx = a.ctx!, n = Math.round(ctx.sampleRate * 1.3), ir = ctx.createBuffer(2, n, ctx.sampleRate);
  let s = 7;
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < n; i++) { s = (s * 1103515245 + 12345) >>> 0; d[i] = ((s / 2147483648) - 1) * Math.exp(-i / (ctx.sampleRate * 0.28)) * 0.5; }
    // A few slaps off the facades across the street.
    for (const [t, g] of [[0.045, 0.22], [0.09, 0.13], [0.16, 0.08]]) d[Math.round(t * ctx.sampleRate) + c * 37] += g;
  }
  street = ctx.createConvolver(); street.buffer = ir; street.connect(a.bus.voice);
  return street;
}

/** An announcement (its line's id) from the speakers at `from` (nearest first), heard at `head`. */
export function announce(a: Audio, id: string, from: { x: number; y: number; z: number }[], head: { x: number; y: number; z: number }, indoors: boolean) {
  if (!a.ready || !from.length) return;
  const ctx = a.ctx!, t0 = ctx.currentTime + 0.05, wet = reverb(a);
  line(a, id).then(buf => {
    if (a.master.gain.value === 0) return;
    for (const sp of from) {
      const d = Math.hypot(sp.x - head.x, sp.y - head.y, sp.z - head.z);
      if (d > PA.hear) continue;
      const at = t0 + d / PA.sound;
      // The horn: its band, a lift where speech carries, the air (and the walls, indoors) taking the top off far ones.
      const lo = ctx.createBiquadFilter(), hi = ctx.createBiquadFilter(), lift = ctx.createBiquadFilter(), level = ctx.createGain(), dry = ctx.createGain(), send = ctx.createGain();
      lo.type = 'highpass'; lo.frequency.value = PA.band[0];
      hi.type = 'lowpass'; hi.frequency.value = indoors ? 700 : Math.max(1600, PA.band[1] - d * 30);
      lift.type = 'peaking'; lift.frequency.value = PA.lift; lift.Q.value = 0.8; lift.gain.value = PA.liftDb;
      level.gain.value = PA.level * (indoors ? 0.4 : 1);
      const w = Math.min(PA.most, d / PA.wet);
      dry.gain.value = 1 - w; send.gain.value = w * 0.6;
      // Where it stands: an HRTF source falling off with distance as a real one does.
      const pan = a.panner(1, true);
      pan.disconnect(); pan.connect(a.bus.voice);
      if (pan.positionX) { pan.positionX.value = sp.x; pan.positionY.value = sp.y; pan.positionZ.value = sp.z; } else pan.setPosition(sp.x, sp.y, sp.z);
      lo.connect(lift).connect(hi).connect(level);
      level.connect(dry).connect(pan);
      level.connect(send).connect(wet);
      // The chime first, then the words.
      for (const [dt, f] of [[0, 784], [0.55, 587]]) a.tone(at + dt, 1.3, 0.12, f, f - 2, 'sine', lo);
      if (buf) { const src = ctx.createBufferSource(); src.buffer = buf; src.connect(lo); src.start(at + PA.words); }
      setTimeout(() => { for (const n of [lo, hi, lift, level, dry, send, pan]) n.disconnect(); }, ((at - ctx.currentTime) + PA.words + (buf?.duration ?? 0) + 2) * 1000);
    }
  });
}
