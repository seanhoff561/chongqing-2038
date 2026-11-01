// The empty city's ambience (M4-51, U-051, U-052): a vast vertical city with not a soul in it. Mostly quiet (no held hum
// or wind since U-077: they wore on him; no rain since U-079): machinery far off, a drone somewhere now and then,
// muffled indoors and underground. Calm enough to fall into a trance, never over
// the top. What he hears changes with where he is (street, roof, alley, underground, indoors) and the hour.
import type { Audio } from './audio';
import type { World } from '../world/world';
import { raycast } from '../world/geom';
import { heightAt } from '../world/heightfield';

export type Where = 'street' | 'roof' | 'alley' | 'under' | 'indoors';
export interface Env { where: Where; hour: number }
/** How loud each layer is, 0 to 1, and how far the whole is muffled (Hz). */
export interface Mix { far: number; drone: number; muffle: number }

/** The mix for where he is and the hour. */
export function mix(e: Env): Mix {
  const night = e.hour < 5.5 || e.hour > 20.5 ? 1 : e.hour < 7 ? (7 - e.hour) / 1.5 : e.hour > 19 ? (e.hour - 19) / 1.5 : 0;
  const W: Record<Where, Mix> = {
    street: { far: 0.5, drone: 0.4, muffle: 20000 },
    roof: { far: 0.7, drone: 0.7, muffle: 20000 },
    alley: { far: 0.3, drone: 0.25, muffle: 9000 },
    under: { far: 0.15, drone: 0, muffle: 1400 },
    indoors: { far: 0.25, drone: 0.15, muffle: 900 },
  };
  const m = W[e.where];
  // By night the far machinery thins.
  return { ...m, far: m.far * (1 - 0.5 * night) };
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
  private muffle!: BiquadFilterNode;
  private m: Mix = mix({ where: 'street', hour: 12 });
  private farIn = 4;
  private droneIn = 30;
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
    this.muffle.frequency.setTargetAtTime(m.muffle, t, 0.4);
  }

  /** The far sounds now and then. */
  private events(dt: number, t: number, m: Mix) {
    const a = this.a;
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
