// Fighting (M4-45, U-050). A drone in a fight keeps moving: round him at a stand-off, rising and falling, never over
// him, jinking aside when it's hit. Humanoids fight like soldiers: in turns one bounds to cover nearer him while the
// others hold theirs and fire on him; caught in the open with no cover to make for, one strafes. Close to him, each
// kind attacks in its own telegraphed cycle (M10-46, below).
import type { SimState } from './types';
import type { Unit } from './units';
import type { UnitKind } from '../data/units';
import { BODY } from './damage';
import { SCALE } from './clock';

type V3 = { x: number; y: number; z: number };
/** The stand-off round him (m), how high over him, how far it rises and falls, a jink's reach and length (s); a bound's
 *  turn (s); a strafe's reach either side and how long each way (s); between a volley's bursts (s, M10-46). */
export const FIGHT = { orbit: 14, up: 7, bob: 2, jink: 5, jinkFor: 1.5, bound: 4, strafe: 3, strafeFor: 2, gap: 0.25 };

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

// Attacks (M10-46, U-104). A machine Engaged that has seen him this last second, within its reach, fights him in a
// cycle it shows: it winds up, strikes, recovers, repositions, and round again, holding its distance; he can read each
// wind-up and act on it. A strike's volley is its weapon's bursts back to back (FIGHT.gap apart), as many as its
// cadence gave over the cycle, so its damage over time is what it was.
export type Phase = 'windup' | 'strike' | 'recover' | 'move';
type How = 'lunge' | 'pounce' | 'shoot' | 'plant' | 'run' | 'dive' | 'drop';
/** Each kind's attack: seconds it winds up, strikes (at most: its volley fired ends it), recovers and repositions;
 *  bursts in its volley; the range it holds (m, near to far); within what distance of him it fights; its speed in its
 *  strike (times its chase); how it moves. */
export const ATTACK: Partial<Record<UnitKind, { windup: number; strike: number; recover: number; move: number; volley: number; near: number; far: number; reach: number; pace: number; how: How }>> = {
  quadruped: { windup: 0.5, strike: 0.7, recover: 0.5, move: 0.5, volley: 1, near: 3, far: 5, reach: 15, pace: 1.8, how: 'lunge' },
  crawler: { windup: 0.4, strike: 0.6, recover: 0.6, move: 0.7, volley: 1, near: 2.5, far: 4, reach: 10, pace: 2, how: 'pounce' },
  humanoid: { windup: 0.5, strike: 1, recover: 0.4, move: 1.05, volley: 2, near: 8, far: 80, reach: 80, pace: 1, how: 'shoot' },
  heavy: { windup: 0.8, strike: 0.9, recover: 0.6, move: 0.7, volley: 1, near: 15, far: 45, reach: 100, pace: 1, how: 'plant' },
  spider: { windup: 1.2, strike: 1.6, recover: 0.8, move: 1.9, volley: 2, near: 25, far: 60, reach: 100, pace: 1, how: 'plant' },
  colossus: { windup: 1.6, strike: 1.6, recover: 1.2, move: 1.2, volley: 2, near: 20, far: 60, reach: 100, pace: 1, how: 'plant' },
  drone: { windup: 0.6, strike: 1.2, recover: 1.2, move: 1, volley: 0, near: 9, far: 18, reach: 40, pace: 1.4, how: 'run' },
  hunter: { windup: 0.5, strike: 1.2, recover: 0.9, move: 0.95, volley: 3, near: 8, far: 18, reach: 35, pace: 1.5, how: 'run' },
  fpv: { windup: 0.4, strike: 2, recover: 0, move: 0, volley: 0, near: 0, far: 0, reach: 0, pace: 1.3, how: 'dive' },
  bomber: { windup: 0.6, strike: 0, recover: 1.3, move: 1, volley: 1, near: 0, far: 7, reach: 0, pace: 1, how: 'drop' },
};

/** Him further up or down than a dog or crawler lunges (m). */
const high = (p: V3, him: V3) => Math.abs(him.y - p.y) > 1.5;

/** A phase begun now, from where it is: what it makes for in it (none: it stands, or goes its own way). */
export function begin(s: SimState, u: Unit, ph: Phase, p: V3, him: V3) {
  u.atk = { ph, at: s.time, n: ph === 'strike' ? ATTACK[u.kind]!.volley : 0, to: target(s, u, ph, p, him) };
}

function target(s: SimState, u: Unit, ph: Phase, p: V3, him: V3): V3 | undefined {
  const A = ATTACK[u.kind]!, d = Math.hypot(p.x - him.x, p.z - him.z), a = Math.atan2(p.z - him.z, p.x - him.x);
  const side = (u.id + Math.floor(s.time / SCALE / 2)) % 2 ? 1 : -1, way = u.id % 2 ? 1 : -1;
  const at = (r: number, turn: number, y: number) => ({ x: him.x + Math.cos(a + turn) * r, y, z: him.z + Math.sin(a + turn) * r });
  if (ph === 'windup') return undefined;
  switch (A.how) {
    case 'lunge': case 'pounce':
      // In to arm's length (just clear of his body), straight back out, and round him (a crawler off to one side).
      if (ph === 'strike') return at(BODY[u.kind][2] + 0.55, 0, p.y);
      if (ph === 'recover') return at(A.far, 0, p.y);
      // (Further off, or up or down a stair, or out of its reach: it goes its own way after him, or stands where it can
      // see him.)
      if (high(p, him) || d > A.far + 0.5) return undefined;
      return A.how === 'lunge' ? at((A.near + A.far) / 2, side * 0.6, p.y) : at(A.near, side * 1.1, p.y);
    case 'run':
      // In past his side, lower; out and up beyond; round him to a new angle.
      if (ph === 'strike') return at(A.near, way * 0.8, him.y + FIGHT.up - 2);
      if (ph === 'recover') return at(A.far, way * 0.5, him.y + FIGHT.up + 3);
      return orbitPoint(s, u, p, him);
    case 'shoot': case 'plant':
      // Too near: back. Else a humanoid goes its own way (to cover, or aside); a big one steps along, or closes.
      if (ph !== 'move') return undefined;
      if (d < A.near) return at(A.near + 3, 0, p.y);
      return A.how === 'plant' && d <= A.far ? at(d, (side * 4) / d, p.y) : undefined;
  }
  return undefined;
}

/** A tick of its fight, for a machine on a trip after him: in it or not (u.atk), its phase on, and the point it makes
 *  for now (none: it stands, or goes its own way). Not the strike drones (sim/strike.ts). */
export function fight(s: SimState, u: Unit): V3 | null {
  const A = ATTACK[u.kind], t = u.trip!, him = u.seen;
  if (A?.how === 'dive' || A?.how === 'drop') return null;
  const d = him ? Math.hypot(him.x - t.pos.x, him.z - t.pos.z) : Infinity;
  if (!A || !him || u.state !== 'engaged' || t.back || t.kind === 'check' || t.kind === 'swap' || u.saw === undefined || s.time - u.saw > SCALE || d > A.reach) { u.atk = undefined; return null; }
  if (!u.atk) begin(s, u, 'move', t.pos, him);
  // (A dog or crawler too far off to lunge goes on closing, and gives its wind-up up if he gets away; with him up or
  // down a stair or out of its reach, it doesn't lunge.)
  const leap = A.how === 'lunge' || A.how === 'pounce', a = u.atk!, el = (s.time - a.at) / SCALE, close = !leap || (d <= A.far + 0.5 && !high(t.pos, him));
  if (a.ph === 'move' && el >= A.move) begin(s, u, close ? 'windup' : 'move', t.pos, him);
  else if (a.ph === 'windup' && leap && !close && d > A.far + 2) begin(s, u, 'move', t.pos, him);
  else if (a.ph === 'windup' && el >= A.windup) begin(s, u, 'strike', t.pos, him);
  else if (a.ph === 'strike' && (el >= A.strike || (A.volley > 0 && a.n <= 0))) begin(s, u, 'recover', t.pos, him);
  else if (a.ph === 'recover' && el >= A.recover) begin(s, u, 'move', t.pos, him);
  // (A lunge homes in on him.)
  else if (a.ph === 'strike' && leap) a.to = target(s, u, 'strike', t.pos, him);
  return u.atk!.to ?? null;
}

/** Whether it stands where it is this phase: winding up; a gunner firing and steadying. */
export function holds(u: Unit) {
  const a = u.atk, how = ATTACK[u.kind]?.how;
  return !!a && (a.ph === 'windup' || ((how === 'shoot' || how === 'plant') && a.ph !== 'move'));
}

/** Its speed this phase, times its chase: a lunge, a run, a dive. */
export const pace = (u: Unit) => (u.atk?.ph === 'strike' ? ATTACK[u.kind]?.pace ?? 1 : 1);
