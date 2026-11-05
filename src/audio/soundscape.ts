// Everything he hears of the world round him, put together each frame: the empty city's ambience for where he is
// (M4-51; no music of its own: U-104, his own songs play from the laptop), the machines where they are (M4-33), their dread (M4-52), gunfire as it carries (M4-54), his
// heartbeat when badly hurt (M4-55).
import * as THREE from 'three';
import type { Audio } from './audio';
import { MachineVoices } from './machines';
import { Ambience, whereIs, SHORE, type Where } from './ambience';
import { heightAt } from '../world/heightfield';
import { Dread } from './dread';
import { Heart } from './heart';
import { machineShot, echo, explosion } from './gunfire';
import { gunshot } from './moves';
import { raycast } from '../world/geom';
import type { World } from '../world/world';
import type { SimEvent, SimState } from '../sim/types';

export class Soundscape {
  readonly voices: MachineVoices;
  readonly ambience: Ambience;
  readonly dread: Dread;
  readonly heart: Heart;
  /** where he is, looked at twice a second, and whether there's cover over him */
  env: { where: Where; covered: boolean; height: number } = { where: 'street', covered: false, height: 0 };
  /** metres to the river's water, if it's within earshot (M8-09) */
  river?: number;
  private envIn = 0;
  private shotsAt = 0;
  private shots = 0;
  private fwd = new THREE.Vector3();

  constructor(private a: Audio) {
    this.voices = new MachineVoices(a);
    this.ambience = new Ambience(a);
    this.dread = new Dread(a);
    this.heart = new Heart(a);
  }

  /** Every frame, his head the camera; under the ground or the water. */
  update(dt: number, s: SimState, w: World, cam: THREE.Camera, under: boolean) {
    const head = cam.position;
    if ((this.envIn -= dt) <= 0) { this.envIn = 0.5; this.env = whereIs(w, head, under); }
    if (this.envIn === 0.5) this.river = riverOff(w, head.x, head.y, head.z);
    this.ambience.update(dt, { where: this.env.where, hour: (s.time / 3600) % 24, river: this.river });
    this.voices.update(dt, s, w, head, cam.getWorldDirection(this.fwd));
    this.dread.update(dt, s, w, head, this.voices.nearest(head));
    // His heart when he's badly hurt (M4-55, U-077).
    this.heart.update(s.body.hp);
  }

  /** His pistol fired: its report, and unsuppressed, its echoes off what's round him. */
  fired(quiet: boolean) {
    gunshot(this.a, 0.9, quiet);
    if (!quiet && this.a.ready) echo(this.a, this.env.where, 0.25, this.a.ctx!.currentTime);
  }

  /** A machine's round: its crack if it missed him, its report late and dull with distance, muffled through walls. */
  shot(e: Extract<SimEvent, { t: 'shot' }>, w: World, head: THREE.Vector3) {
    const d = Math.hypot(e.x - head.x, e.y - head.y, e.z - head.z);
    if (d > 400 || !this.a.ready) return;
    // (No more than a few shots voiced in any tenth of a second, the nearest first come: a firefight's every round
    // each its own sounds was too much for the audio, U-076. A near miss's crack always.)
    const t = this.a.ctx!.currentTime;
    if (t - this.shotsAt > 0.1) { this.shotsAt = t; this.shots = 0; }
    if (++this.shots > 3 && !e.crack) return;
    const walls = d > 0.5 && !!raycast(w.index, e.x, e.y + 1, e.z, (head.x - e.x) / d, (head.y - e.y - 1) / d, (head.z - e.z) / d, d - 0.5);
    machineShot(this.a, e, d, !!e.crack, walls, this.env.where);
  }

  /** A blast (M10-65): heard as far off as 1.5 km, late and dull with distance, muffled through walls. */
  blast(e: Extract<SimEvent, { t: 'blast' }>, w: World, head: THREE.Vector3) {
    const d = Math.hypot(e.x - head.x, e.y - head.y, e.z - head.z);
    if (d > 1500 || !this.a.ready) return;
    const walls = d > 1 && !!raycast(w.index, e.x, e.y + 0.3, e.z, (head.x - e.x) / d, (head.y - e.y - 0.3) / d, (head.z - e.z) / d, d - 0.5);
    explosion(this.a, e, d, walls, this.env.where);
  }
}

/** Metres from his head to the river's edge (where the ground runs down under the rivers' surface), if within
 *  earshot: looked for round him every 6 m out, 16 ways. */
function riverOff(w: World, x: number, y: number, z: number): number | undefined {
  const g = w.ground, sea = w.water.find(q => q.x1 - q.x0 > 1000);
  if (!g || !sea) return undefined;
  let best = Infinity;
  for (let d = 0; d <= SHORE.heard; d += 6) {
    for (let k = 0; k < (d ? 16 : 1); k++) {
      const a = (k / 16) * Math.PI * 2, h = heightAt(g, x + Math.cos(a) * d, z + Math.sin(a) * d);
      if (h !== null && h <= sea.y1) best = Math.min(best, Math.hypot(d, y - sea.y1));
    }
    if (best <= d) break;
  }
  return best < SHORE.heard ? best : undefined;
}
