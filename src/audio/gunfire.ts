// Gunfire that sounds real (M4-54, U-051). A round that misses him cracks past at once, a sharp supersonic snap; the
// report comes after, as late as the shooter is far (sound's 343 m/s), duller the further it carries and muffled
// through walls; then its echoes off the buildings round him: a street's slap-back, an alley's close flutter, the far
// towers answering a roof, the long roll of a tunnel, a room's short ring.
import type { Audio } from './audio';
import type { Where } from './ambience';

type V3 = { x: number; y: number; z: number };
/** Each place's echoes: seconds after the report, and how loud. */
const ECHO: Record<Where, [number, number][]> = {
  street: [[0.12, 0.35], [0.29, 0.2], [0.55, 0.1]],
  alley: [[0.04, 0.4], [0.09, 0.3], [0.16, 0.15]],
  roof: [[0.7, 0.15], [1.3, 0.08]],
  under: [[0.06, 0.5], [0.14, 0.4], [0.28, 0.3], [0.5, 0.2], [0.85, 0.12]],
  indoors: [[0.025, 0.3], [0.06, 0.2]],
};

/** How a report reaches him from d m off: its delay (s), the highest it still carries (Hz), how loud (before distance)
 *  and its echoes. */
export function reportOf(d: number, walls: boolean, where: Where) {
  const cutoff = Math.max(600, 18000 * Math.exp(-d / 120)) * (walls ? 0.12 : 1);
  return { delay: d / 343, cutoff: Math.max(250, cutoff), gain: walls ? 0.45 : 1, echoes: ECHO[where] };
}

/** A machine's round fired at him from `at`, d m away. */
export function machineShot(a: Audio, at: V3, d: number, crack: boolean, walls: boolean, where: Where) {
  if (!a.ready) return;
  const r = reportOf(d, walls, where), t = a.ctx!.currentTime + 0.005;
  // The crack of the round past his head, at once.
  if (crack) { a.noise(t, 0.012, 0.55, 'highpass', 2500, 0.7); a.tone(t, 0.025, 0.12, 3200, 1400, 'square'); }
  const lp = a.ctx!.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = r.cutoff; lp.connect(a.spot(at, r.delay + 3));
  const T = t + r.delay;
  a.noise(T, 0.08, 0.9 * r.gain, 'highpass', 900, 0.7, undefined, lp);
  a.tone(T, 0.2, 0.7 * r.gain, 120, 45, 'sine', lp);
  echo(a, where, (0.6 * r.gain * 5) / Math.max(5, d), T, Math.min(r.cutoff, 2000));
}

/** A blast d m off (M10-65): a sharp crack, a deep thump felt as much as heard, the roar rolling out and a crackle of
 *  debris after; late and dull with distance as a report is, muffled through walls, rolling back off what's round him;
 *  close, a thump through his chest and a ringing in his ears. */
export function explosion(a: Audio, at: V3, d: number, walls: boolean, where: Where) {
  if (!a.ready) return;
  const r = reportOf(d, walls, where), t = a.ctx!.currentTime + 0.005, g = r.gain;
  const lp = a.ctx!.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = r.cutoff; lp.connect(a.spot(at, r.delay + 5, 0.6));
  const T = t + r.delay;
  a.noise(T, 0.07, 1.2 * g, 'highpass', 1200, 0.7, undefined, lp);
  a.tone(T, 1.1, 1.3 * g, 95, 26, 'sine', lp);
  a.tone(T, 0.6, 0.7 * g, 60, 22, 'triangle', lp);
  a.noise(T, 1.8, 1.0 * g, 'lowpass', 1100, 0.8, 110, lp);
  a.noise(T + 0.2, 1.3, 0.25 * g, 'bandpass', 3200, 1, 1400, lp);
  for (let i = 0; i < 7; i++) a.noise(T + 0.45 + i * 0.13 + Math.random() * 0.08, 0.05, 0.12 * g, 'bandpass', 1500 + Math.random() * 2500, 2, undefined, lp);
  echo(a, where, (1.5 * g * 5) / Math.max(5, d), T, Math.min(r.cutoff, 1200));
  if (d < 15) a.tone(T, 1.4, 0.9 * (1 - d / 15), 48, 18, 'sine');
  if (d < 5) a.tone(T + 0.05, 3, 0.05, 3700, 3500, 'sine');
}

/** A report's echoes off what's round him, from a time on (his own shots' too). */
export function echo(a: Audio, where: Where, gain: number, t: number, cutoff = 2000) {
  if (!a.ready) return;
  for (const [dt, g] of ECHO[where]) a.noise(t + dt, 0.22, gain * g, 'lowpass', cutoff, 0.7, cutoff * 0.5);
}
