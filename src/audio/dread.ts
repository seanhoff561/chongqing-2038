// The machines frightening by design (M4-52, U-051): the unseen, the sudden, the inhuman. A machine's eye on him he
// hears before he sees it: a low throb and a thin high whine from where it is, rising as it makes him out. The moment
// one notices him, its head's ratchet and a rising ping from there; the moment one has him, a shriek of metal and a
// blow he feels. Close up a walker's servos grind, loud. And at high alert the city goes mad: sirens wailing, the
// broadcasts' clipped voices, a swarm of rotors and a march of footfalls far off all round; calm comes back slowly, so
// he stays on edge long after.
import type { Audio } from './audio';
import { siren } from './moves';
import type { World } from '../world/world';
import type { SimState } from '../sim/types';
import type { Alert } from '../sim/district';
import { districtOf } from '../sim/district';
import { unitPose, type Unit } from '../sim/units';

type V3 = { x: number; y: number; z: number };
/** The city's alert by the district's: how high it sits, how fast it climbs and falls (a second), the walkers that
 *  grind how near. */
export const DREAD = { level: { unaware: 0, suspicious: 0.3, engaged: 1, searching: 0.75, heightened: 0.45 } as Record<Alert, number>, rise: 0.6, fall: 1 / 120, close: 10 };

/** The alert eased toward the district's: up fast, down slowly. */
export function easeAlert(prev: number, st: Alert | undefined, dt: number): number {
  const to = DREAD.level[st ?? 'unaware'];
  return to > prev ? Math.min(to, prev + DREAD.rise * dt) : Math.max(to, prev - DREAD.fall * dt);
}

/** How hard he's watched (0 to 1 when one's about to notice him) and by which machine: the one that knows most of
 *  those still making him out. */
export function watcher(units: Unit[]): { u: Unit | null; level: number } {
  let u: Unit | null = null, best = 0.02;
  for (const k of units) if (!k.dead && k.state === 'unaware' && (k.aware ?? 0) > best) { u = k; best = k.aware!; }
  return { u, level: u ? Math.min(1, best / 0.3) : 0 };
}

/** The machines that have just noticed him, and just got him, since last time (each one's alert remembered). */
export function changes(seen: Map<number, string>, units: Unit[]): { noticed: Unit[]; hunted: Unit[] } {
  const noticed: Unit[] = [], hunted: Unit[] = [];
  for (const u of units) {
    const was = seen.get(u.id) ?? 'unaware';
    if (u.state === was) continue;
    seen.set(u.id, u.state);
    if (u.dead) continue;
    if (u.state === 'suspicious' && was === 'unaware') noticed.push(u);
    else if (u.state === 'engaged' && was !== 'engaged') hunted.push(u);
  }
  return { noticed, hunted };
}

export class Dread {
  alert = 0;
  private seen = new Map<number, string>();
  private on = false;
  private eye!: { gain: GainNode; pan: PannerNode };
  private grind!: { gain: GainNode; pan: PannerNode };
  private swarm!: GainNode;
  private sirenIn = 0;
  private sayIn = 8;
  private marchIn = 0;
  private lookIn = 0;
  constructor(private a: Audio) {}

  /** Every frame, with the nearest walker heard (MachineVoices). */
  update(dt: number, s: SimState, w: World, head: V3, near: V3 | null) {
    const a = this.a;
    this.alert = easeAlert(this.alert, s.hive.districts[districtOf(head.x, head.z)]?.state, dt);
    if (!a.ready) return;
    if (!this.on) this.build();
    const t = a.ctx!.currentTime, A = this.alert;
    // Noticed, got: sudden, from where the machine is.
    const { noticed, hunted } = changes(this.seen, s.units);
    for (const u of noticed.slice(0, 2)) this.notice(unitPose(w, u, s.time));
    for (const u of hunted.slice(0, 1)) this.lock(unitPose(w, u, s.time));
    if ((this.lookIn -= dt) <= 0) {
      this.lookIn = 0.1;
      // Its eye on him: the throb and whine from the watcher, louder as it makes him out.
      const e = watcher(s.units);
      this.eye.gain.gain.setTargetAtTime(0.25 * e.level * e.level, t, 0.3);
      if (e.u) place(this.eye.pan, unitPose(w, e.u, s.time), t);
      // Close up: the nearest walker's servos grinding.
      const nd = near ? Math.hypot(near.x - head.x, near.y - head.y, near.z - head.z) : DREAD.close;
      this.grind.gain.gain.setTargetAtTime(nd < DREAD.close ? 0.35 * (1 - nd / DREAD.close) : 0, t, 0.15);
      if (near) place(this.grind.pan, near, t);
      // High alert: the swarm far off all round.
      this.swarm.gain.setTargetAtTime(0.06 * Math.max(0, A - 0.3) / 0.7, t, 1);
    }
    // The sirens while it's high, sounding on as it falls.
    if ((this.sirenIn -= dt) <= 0) { this.sirenIn = 2.7; if (A > 0.55) siren(a, 0.12 * A); }
    // The broadcasts: a clipped, inhuman voice, now and then.
    if ((this.sayIn -= dt) <= 0) { this.sayIn = 10 + Math.random() * 14; if (A > 0.5) this.say(t, A); }
    // Footfalls marching somewhere near, closing in.
    if ((this.marchIn -= dt) <= 0) { this.marchIn = 0.55; if (A > 0.7) a.tone(t, 0.25, 0.05 * A, 70, 40, 'sine', this.swarm); }
  }

  private build() {
    const a = this.a, ctx = a.ctx!;
    this.on = true;
    // The eye: a throb at 38 Hz beating on 41, and a thin whine at 2.9 kHz trembling.
    const eye = ctx.createGain(), ep = a.panner(); eye.gain.value = 0;
    for (const [f, type, g] of [[38, 'sine', 1], [41, 'sine', 1], [2900, 'sine', 0.06], [2913, 'sine', 0.05]] as [number, OscillatorType, number][]) {
      const o = ctx.createOscillator(), og = ctx.createGain(); o.type = type; o.frequency.value = f; og.gain.value = g; o.connect(og).connect(eye); o.start();
    }
    eye.connect(ep); this.eye = { gain: eye, pan: ep };
    // The grind: a saw at 95 Hz chopped by a 23 Hz square, through a band.
    const gr = ctx.createGain(), gp = a.panner(), o = ctx.createOscillator(), chop = ctx.createOscillator(), depth = ctx.createGain(), vca = ctx.createGain(), band = ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = 95; chop.type = 'square'; chop.frequency.value = 23; depth.gain.value = 0.5; vca.gain.value = 0.5;
    band.type = 'bandpass'; band.frequency.value = 900; band.Q.value = 1.5; gr.gain.value = 0;
    chop.connect(depth).connect(vca.gain); o.connect(vca).connect(band).connect(gr).connect(gp); o.start(); chop.start();
    this.grind = { gain: gr, pan: gp };
    // The swarm: noise in a low band, its loudness fluttering like rotors.
    const n = a.loop(), sb = ctx.createBiquadFilter(), flut = ctx.createOscillator(), fd = ctx.createGain(), sv = ctx.createGain();
    sb.type = 'bandpass'; sb.frequency.value = 260; sb.Q.value = 2; flut.frequency.value = 13; fd.gain.value = 0.4; sv.gain.value = 0.6;
    this.swarm = ctx.createGain(); this.swarm.gain.value = 0;
    flut.connect(fd).connect(sv.gain); n.connect(sb).connect(sv).connect(this.swarm).connect(a.bus.ambience); flut.start();
  }

  /** It has noticed him: its head's ratchet and a rising ping, from there. */
  private notice(q: V3) {
    const a = this.a, t = a.ctx!.currentTime + 0.005, out = a.spot(q);
    for (let i = 0; i < 4; i++) a.noise(t + i * 0.035, 0.025, 0.4, 'bandpass', 2800, 4, undefined, out);
    a.tone(t + 0.18, 0.12, 0.25, 900, 1400, 'square', out);
    a.tone(t + 0.32, 0.25, 0.25, 1400, 2200, 'square', out);
  }

  /** It has him: a shriek of metal from it and a blow he feels. */
  private lock(q: V3) {
    const a = this.a, t = a.ctx!.currentTime + 0.005, out = a.spot(q);
    a.tone(t, 0.9, 0.35, 1900, 900, 'sawtooth', out); a.tone(t, 0.9, 0.3, 1270, 610, 'sawtooth', out);
    a.noise(t, 0.6, 0.3, 'bandpass', 3000, 3, 1200, out);
    a.tone(t, 1.2, 0.6, 55, 28, 'sine');
  }

  /** A broadcast: a clipped, formant-shaped voice, four syllables, with a chime before. */
  private say(t: number, A: number) {
    const a = this.a, g = 0.07 * A;
    a.tone(t, 0.3, g, 660, 660, 'sine'); a.tone(t + 0.3, 0.4, g, 880, 880, 'sine');
    for (let i = 0; i < 6; i++) { const at = t + 0.9 + i * 0.22, f = [140, 165, 130, 150, 120, 110][i]; a.tone(at, 0.16, g * 1.4, f, f * 0.9, 'sawtooth'); a.noise(at, 0.16, g, 'bandpass', [700, 1100, 500, 900, 600, 400][i], 6, undefined); }
  }
}

function place(p: PannerNode, q: V3, t: number) {
  if (p.positionX) { p.positionX.setTargetAtTime(q.x, t, 0.05); p.positionY.setTargetAtTime(q.y, t, 0.05); p.positionZ.setTargetAtTime(q.z, t, 0.05); } else p.setPosition(q.x, q.y, q.z);
}
