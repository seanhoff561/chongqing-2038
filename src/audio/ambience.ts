// The empty city's ambience (M4-51, U-051, U-052): a vast vertical city with not a soul in it. Mostly quiet (no held hum
// or wind since U-077: they wore on him): machinery far off, a drone somewhere now and then; rain on the
// street, on metal and awnings, dripping under cover, muffled indoors. Calm enough to fall into a trance, never over
// the top. What he hears changes with where he is (street, roof, alley, underground, indoors) and the hour.
import type { Audio } from './audio';
import type { World } from '../world/world';
import { raycast } from '../world/geom';
import { heightAt } from '../world/heightfield';

export type Where = 'street' | 'roof' | 'alley' | 'under' | 'indoors';
export interface Env { where: Where; hour: number; rain: number; covered: boolean }
/** How loud each layer is, 0 to 1, and how far the whole is muffled (Hz). */
export interface Mix { far: number; drone: number; rain: number; ticks: number; drips: number; muffle: number }

/** The mix for where he is, the hour and the rain. */
export function mix(e: Env): Mix {
  const night = e.hour < 5.5 || e.hour > 20.5 ? 1 : e.hour < 7 ? (7 - e.hour) / 1.5 : e.hour > 19 ? (e.hour - 19) / 1.5 : 0;
  const W: Record<Where, Omit<Mix, 'rain' | 'ticks' | 'drips'>> = {
    street: { far: 0.5, drone: 0.4, muffle: 20000 },
    roof: { far: 0.7, drone: 0.7, muffle: 20000 },
    alley: { far: 0.3, drone: 0.25, muffle: 9000 },
    under: { far: 0.15, drone: 0, muffle: 1400 },
    indoors: { far: 0.25, drone: 0.15, muffle: 900 },
  };
  const m = W[e.where], r = e.rain;
  // By night the far machinery thins.
  const out: Mix = { ...m, far: m.far * (1 - 0.5 * night), rain: 0, ticks: 0, drips: 0 };
  if (e.where === 'under') return out;
  // Rain: out in it, its sound (ticks: how bright it rings on metal, most on a roof); under cover, dripping and the rain
  // beyond; indoors, a dull drumming through the roof.
  if (e.where === 'indoors') { out.rain = r * 0.5; out.drips = r * 0.3; }
  else if (e.covered) { out.rain = r * 0.6; out.ticks = r * 0.5; out.drips = r * 0.9; }
  else { out.rain = r; out.ticks = r * (e.where === 'roof' ? 1 : 0.7); }
  return out;
}

/** Where his head is: under the ground; indoors (a roof over him and walls most ways round); on a roof (6 m or more
 *  over the ground under the open sky); in an alley (walls close on both sides); else in the street. And whether
 *  there's cover over him from the rain, and how high he is over the ground. */
export function whereIs(w: World, head: { x: number; y: number; z: number }, under: boolean): { where: Where; covered: boolean; height: number } {
  if (under) return { where: 'under', covered: true, height: 0 };
  const up = raycast(w.index, head.x, head.y, head.z, 0, 1, 0, 40), covered = !!up;
  const walls = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => raycast(w.index, head.x, head.y, head.z, dx, 0, dz, 8)?.t ?? 99);
  const height = head.y - 1.6 - (w.ground ? heightAt(w.ground, head.x, head.z) ?? 0 : 0);
  if (up && up.t < 6 && walls.filter(d => d < 8).length >= 3) return { where: 'indoors', covered, height };
  if (!covered && height > 6) return { where: 'roof', covered, height };
  if ((walls[0] < 4 && walls[1] < 4) || (walls[2] < 4 && walls[3] < 4)) return { where: 'alley', covered, height };
  return { where: 'street', covered, height };
}

export class Ambience {
  private on = false;
  private rain!: GainNode;
  private muffle!: BiquadFilterNode;
  private m: Mix = mix({ where: 'street', hour: 12, rain: 0, covered: false });
  private farIn = 4;
  private droneIn = 30;
  private dripIn = 0;
  private setIn = 0;
  constructor(private a: Audio) {}

  /** Every frame: the layers eased toward the mix for where he is; the far sounds placed now and then. */
  update(dt: number, e: Env) {
    const a = this.a;
    if (!a.ready) return;
    if (!this.on) this.build();
    const t = a.ctx!.currentTime, m = (this.m = mix(e));
    if ((this.setIn -= dt) <= 0) { this.setIn = 0.25; this.set(t, m); }
    this.events(dt, t, m);
  }

  /** The held layers eased toward the mix. */
  private set(t: number, m: Mix) {
    // The rain's soft hiss (synthesised again: U-074), brighter out in it and on roofs.
    this.rain.gain.setTargetAtTime(m.rain * 0.03 * (1 + 0.5 * m.ticks), t, 0.8);
    this.muffle.frequency.setTargetAtTime(m.muffle, t, 0.4);
  }

  /** The far sounds now and then. */
  private events(dt: number, t: number, m: Mix) {
    const a = this.a;
    // Water dripping under cover in the rain, soft and sparse.
    if ((this.dripIn -= dt) <= 0) {
      this.dripIn = 0.4 + Math.random() * 1.4;
      if (m.drips > 0.05) { const f = 700 + Math.random() * 900; a.tone(t, 0.06, 0.015 * m.drips, f * 1.4, f, 'sine', this.muffle); }
    }
    // Machinery far off: a clank, a boom, a long groan of metal, low and blurred by distance.
    if ((this.farIn -= dt) <= 0) {
      this.farIn = 6 + Math.random() * 14;
      if (m.far > 0.05) this.far(t, m.far);
    }
    // A drone somewhere, its note swelling and fading as it passes far off.
    if ((this.droneIn -= dt) <= 0) {
      this.droneIn = 25 + Math.random() * 50;
      if (m.drone > 0.05) { const f = 160 + Math.random() * 60; a.tone(t, 9, 0.006 * m.drone, f, f * 0.93, 'sawtooth', this.muffle); }
    }
  }

  /** The mix just now (for the dev overlay and the checks). */
  get level() { return this.m; }

  private build() {
    const a = this.a, ctx = a.ctx!;
    this.on = true;
    this.muffle = ctx.createBiquadFilter(); this.muffle.type = 'lowpass'; this.muffle.frequency.value = 20000;
    this.muffle.connect(a.bus.ambience);
    // The rain's hiss: noise high and soft.
    const r = a.loop(), hp = ctx.createBiquadFilter(), pk = ctx.createBiquadFilter();
    // (Soft, not a hiss in the ears: U-065.)
    hp.type = 'highpass'; hp.frequency.value = 500; pk.type = 'lowpass'; pk.frequency.value = 4500; pk.Q.value = 0.5;
    this.rain = ctx.createGain(); this.rain.gain.value = 0;
    r.connect(hp).connect(pk).connect(this.rain).connect(this.muffle);
  }

  /** One far sound: machinery dull with distance, or a ring of metal. */
  private far(t: number, g: number) {
    const a = this.a, k = Math.floor(Math.random() * 3);
    if (k === 0) { a.tone(t, 1.4, 0.025 * g, 95, 70, 'sine', this.muffle); a.noise(t, 1, 0.015 * g, 'lowpass', 400, 1, 200, this.muffle); }
    else if (k === 1) { for (let i = 0; i < 3; i++) a.noise(t + i * 0.35, 0.25, 0.015 * g, 'bandpass', 700 + i * 80, 4, 500, this.muffle); }
    // (A far ring of metal, a haunting note held and dying.)
    else a.tone(t, 3.5, 0.012 * g, 523, 519, 'triangle', this.muffle);
  }
}
