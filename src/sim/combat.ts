// Fighting (M4-45, U-050). A drone in a fight keeps moving: round him at a stand-off, rising and falling, never over
// him, jinking aside when it's hit. Humanoids fight like soldiers: in turns one bounds to cover nearer him while the
// others hold theirs and fire on him; caught in the open with no cover to make for, one strafes as it shoots.
import type { SimState } from './types';
import type { Unit } from './units';
import { SCALE } from './clock';

type V3 = { x: number; y: number; z: number };
/** The stand-off round him (m), how high over him, how far it rises and falls, a jink's reach and length (s); a bound's
 *  turn (s); a strafe's reach either side and how long each way (s). */
export const FIGHT = { orbit: 14, up: 7, bob: 2, jink: 5, jinkFor: 1.5, bound: 4, strafe: 3, strafeFor: 2 };

/** Where an engaged drone makes for now: a little on round him from where it is, at the stand-off and its height of
 *  the moment, thrown aside for a moment when it's just been hit. */
export function orbitPoint(s: SimState, u: Unit, from: V3, him: V3): V3 {
  const a = Math.atan2(from.z - him.z, from.x - him.x) + (u.id % 2 ? 0.5 : -0.5), t = s.time / SCALE;
  const p = { x: him.x + Math.cos(a) * FIGHT.orbit, y: him.y + FIGHT.up + Math.sin(t * 0.9 + u.id) * FIGHT.bob, z: him.z + Math.sin(a) * FIGHT.orbit };
  if (u.hurtAt !== undefined && (s.time - u.hurtAt) / SCALE < FIGHT.jinkFor) {
    const j = (u.id + Math.floor(u.hurtAt)) % 2 ? 1 : -1;
    p.x += -Math.sin(a) * FIGHT.jink * j; p.z += Math.cos(a) * FIGHT.jink * j; p.y += FIGHT.jink * 0.5 * j;
  }
  return p;
}

/** Whether it's this humanoid's turn to bound forward (about a third of them at a time, by turns). */
export const bounding = (s: SimState, u: Unit) => (Math.floor(s.time / SCALE / FIGHT.bound) + u.id) % 3 === 0;

/** A point to strafe to, out in the open: off to one side of the line to him, the side changing every few seconds. */
export function strafePoint(s: SimState, u: Unit, from: V3, him: V3): V3 {
  const dx = him.x - from.x, dz = him.z - from.z, d = Math.hypot(dx, dz) || 1, side = Math.floor(s.time / SCALE / FIGHT.strafeFor + u.id) % 2 ? 1 : -1;
  return { x: from.x - (dz / d) * FIGHT.strafe * side, y: from.y, z: from.z + (dx / d) * FIGHT.strafe * side };
}
