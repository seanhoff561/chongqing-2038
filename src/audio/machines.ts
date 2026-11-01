// The machines heard where they are (M4-33): every sound a machine makes comes from its place round his head (HRTF
// panning, fading with distance). The flyers' rotors are held notes, a voice to each of the nearest six, the pitch
// rising as one comes at him and falling as it goes past (Doppler), so more drones overhead are louder; a strike
// drone's is a scream. The walkers' footfalls land on their strides (a giant's a boom he feels through the ground),
// the quadrupeds' servos whining at each step; the cameras beep where they hang.
import type { Audio } from './audio';
import { beep, footfall } from './moves';
import type { UnitKind } from '../data/units';
import { unitPose, isOff, type Unit } from '../sim/units';
import type { World } from '../world/world';
import type { SimState } from '../sim/types';
import { raycast } from '../world/geom';

type V3 = { x: number; y: number; z: number };
/** The speed of sound, m/s; how many rotors are heard at once; how far each kind is heard, m; how often the nearest are
 *  picked again, s. */
// (Far fewer and quieter since U-077: the machines were a constant din. Two rotors at most, near; three walkers.)
const HEAR = { sound: 343, rotors: 2, rotor: 60, step: 25, giant: 90, walkers: 3, every: 0.4, /** how fast their sounds fall off (U-067) */ rolloff: 2 };
/** A rotor's note by kind: its blade hum (Hz) and how loud it is. */
const ROTOR: Partial<Record<UnitKind, { f: number; gain: number }>> = { drone: { f: 150, gain: 0.08 }, hunter: { f: 190, gain: 0.12 }, fpv: { f: 430, gain: 0.4 }, bomber: { f: 110, gain: 0.25 }, heli: { f: 62, gain: 0.7 } };
/** Metres between a walker's footfalls. */
// (A dog's soft pad only every few strides: their quick steps' sound was a grating repeat, U-075.)
const STEP: Partial<Record<UnitKind, number>> = { humanoid: 3, heavy: 2.4, spider: 2.8, colossus: 2.6, quadruped: 4 };
const GIANT = new Set<UnitKind>(['heavy', 'spider', 'colossus']);

type Voice = { osc: OscillatorNode; osc2: OscillatorNode; gain: GainNode; lp: BiquadFilterNode; pan: PannerNode; u: Unit | null; f: number; d: number; /** how loud it's set to be */ g: number };

export class MachineVoices {
  private voices: Voice[] = [];
  private walkers: { u: Unit; at: V3 | null; run: number }[] = [];
  private pickIn = 0;
  private beepIn = 0;
  /** the camera that last beeped at him, while he's still near it */
  private beeped: object | null = null;
  constructor(private a: Audio) {}

  /** Every frame: his head where the camera is; the nearest machines picked now and then, their sounds placed. */
  update(dt: number, s: SimState, w: World, head: V3, fwd: V3) {
    const a = this.a;
    if (!a.ready) return;
    a.listen(head, fwd);
    if ((this.pickIn -= dt) <= 0) { this.pickIn = HEAR.every; this.pick(s, w, head); }
    // The rotors: each voice on its machine, its pitch shifted by how fast it closes on him.
    const t = a.ctx!.currentTime;
    for (const v of this.voices) {
      if (!v.u) continue;
      const q = unitPose(w, v.u, s.time), d = Math.hypot(q.x - head.x, q.y - head.y, q.z - head.z), closing = dt > 0 ? (v.d - d) / dt : 0;
      v.d = d;
      const f = v.f * HEAR.sound / (HEAR.sound - Math.max(-60, Math.min(60, closing)));
      v.osc.frequency.setTargetAtTime(f, t, 0.05); v.osc2.frequency.setTargetAtTime(f * 2.03, t, 0.05);
      place(v.pan, q, t);
    }
    // The walkers' footfalls as they cover the ground.
    for (const k of this.walkers) {
      const q = unitPose(w, k.u, s.time);
      if (!q.active || k.u.dead) { k.at = null; continue; }
      if (k.at) k.run += Math.hypot(q.x - k.at.x, q.z - k.at.z);
      k.at = { x: q.x, y: q.y, z: q.z };
      const step = STEP[k.u.kind]!;
      if (k.run < step) continue;
      k.run %= step;
      footfall(a, k.u.kind, a.spot(q, 4, HEAR.rolloff, walled(w, head, q, 1)), GIANT.has(k.u.kind) ? 0.8 : 0.3);
    }
    // A camera beeps once as he comes within 12 m of it, from where it hangs (not over and over: U-077).
    if ((this.beepIn -= dt) <= 0) {
      this.beepIn = 0.5;
      const c = w.cameras.filter(c => c.kind === 'camera' || c.kind === 'sweeper' || c.kind === 'lamppost').map(c => ({ c, d: Math.hypot(c.x - head.x, c.y - head.y, c.z - head.z) })).sort((x, y) => x.d - y.d)[0];
      const near = c && c.d < 12 ? c.c : null;
      if (near && near !== this.beeped) beep(a, 0.2, a.spot(near));
      this.beeped = near;
    }
  }

  /** The nearest walker heard, where it is. */
  nearest(head: V3): V3 | null {
    let best: V3 | null = null, bd = Infinity;
    // (Not a dog: no servo grind off them, U-075.)
    for (const k of this.walkers) if (k.at && k.u.kind !== 'quadruped') { const d = Math.hypot(k.at.x - head.x, k.at.y - head.y, k.at.z - head.z); if (d < bd) { bd = d; best = k.at; } }
    return best;
  }

  /** How loud the rotors are just now at his head, all together (more drones, louder). */
  level() {
    return this.voices.reduce((t, v) => t + (v.u ? v.g * falloff(v.pan, v.d) : 0), 0);
  }

  /** The flyers within earshot, nearest first, given the voices (a voice kept on a machine still near); the walkers. */
  private pick(s: SimState, w: World, head: V3) {
    const fly: { u: Unit; d: number }[] = [], walk: { u: Unit; d: number }[] = [];
    for (const u of s.units) {
      const kind = u.kind;
      if (u.dead || (!ROTOR[kind] && !STEP[kind]) || isOff(s, u)) continue;
      const q = unitPose(w, u, s.time);
      if (!q.active || q.docked) continue;
      const d = Math.hypot(q.x - head.x, q.y - head.y, q.z - head.z);
      if (ROTOR[kind] && d < HEAR.rotor) fly.push({ u, d });
      else if (STEP[kind] && d < (GIANT.has(kind) ? HEAR.giant : HEAR.step)) walk.push({ u, d });
    }
    const near = fly.sort((x, y) => x.d - y.d).slice(0, HEAR.rotors).map(f => f.u), t = this.a.ctx!.currentTime;
    // Voices whose machine is gone from the nearest fall silent; the free ones take the newcomers.
    for (const v of this.voices) if (v.u && !near.includes(v.u)) { v.u = null; v.g = 0; v.gain.gain.setTargetAtTime(0, t, 0.3); }
    // Through a wall or a roof a rotor is dull and a third as loud (U-067).
    for (const v of this.voices) if (v.u) {
      const shut = walled(w, head, unitPose(w, v.u, s.time), 0), r = ROTOR[v.u.kind]!;
      v.g = r.gain * (shut ? 0.3 : 1); v.gain.gain.setTargetAtTime(v.g, t, 0.3); v.lp.frequency.setTargetAtTime(shut ? 450 : 20000, t, 0.2);
    }
    for (const u of near) {
      if (this.voices.some(v => v.u === u)) continue;
      const v = this.voices.find(x => !x.u) ?? this.voice(), r = ROTOR[u.kind]!, q = unitPose(w, u, s.time);
      v.u = u; v.f = r.f * (0.94 + ((u.id * 37) % 13) / 100); v.d = Math.hypot(q.x - head.x, q.y - head.y, q.z - head.z);
      place(v.pan, q, t, true);
      const shut = walled(w, head, q, 0);
      v.g = r.gain * (shut ? 0.3 : 1); v.gain.gain.setTargetAtTime(v.g, t, 0.3); v.lp.frequency.setValueAtTime(shut ? 450 : 20000, t);
    }
    const keep = new Map(this.walkers.map(k => [k.u, k]));
    this.walkers = walk.sort((x, y) => x.d - y.d).slice(0, HEAR.walkers).map(k => keep.get(k.u) ?? { u: k.u, at: null, run: 0 });
  }

  /** A held rotor note: a buzzing saw and its beating octave through a band, panned. */
  private voice(): Voice {
    const ctx = this.a.ctx!, osc = ctx.createOscillator(), osc2 = ctx.createOscillator(), band = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), gain = ctx.createGain(), pan = this.a.panner(HEAR.rolloff);
    osc.type = 'sawtooth'; osc2.type = 'square'; band.type = 'bandpass'; band.frequency.value = 900; band.Q.value = 0.6; gain.gain.value = 0;
    const lo = ctx.createGain(); lo.gain.value = 0.35;
    lp.type = 'lowpass'; lp.frequency.value = 20000;
    osc.connect(band); osc2.connect(lo).connect(band); band.connect(lp).connect(gain).connect(pan);
    osc.start(); osc2.start();
    const v: Voice = { osc, osc2, gain, lp, pan, u: null, f: 150, d: 0, g: 0 };
    this.voices.push(v);
    return v;
  }
}

/** Whether something solid stands between his head and a machine (up `up` m from where it stands). */
function walled(w: World, head: V3, q: V3, up: number): boolean {
  const dx = q.x - head.x, dy = q.y + up - head.y, dz = q.z - head.z, d = Math.hypot(dx, dy, dz);
  return d > 1 && !!raycast(w.index, head.x, head.y, head.z, dx / d, dy / d, dz / d, d - 1);
}

/** A panner moved to a place, smoothly (or at once). */
function place(p: PannerNode, q: V3, t: number, now = false) {
  if (p.positionX) {
    for (const [k, v] of [[p.positionX, q.x], [p.positionY, q.y], [p.positionZ, q.z]] as [AudioParam, number][]) now ? k.setValueAtTime(v, t) : k.setTargetAtTime(v, t, 0.03);
  } else p.setPosition(q.x, q.y, q.z);
}

/** How much of a sound a panner lets through at d metres (its inverse distance law). */
function falloff(p: PannerNode, d: number) {
  return p.refDistance / (p.refDistance + p.rolloffFactor * (Math.max(d, p.refDistance) - p.refDistance));
}
