// Binoculars and patrol logs (M5-07, DESIGN section 12): held up (aim), the view's ten times closer. A machine he
// keeps in the middle of them, in sight, for three seconds Anna logs: what it is, where, when, and which way it's
// heading; kept on it, another line every five seconds. A machine seen more than once has its route drawn on her map
// through where it was seen (ui/laptop.ts).
import type { SimState, InputFrame } from './types';
import type { World } from '../world/world';
import { B, DT } from './types';
import { STATIC, type UnitKind } from '../data/units';
import { unitPose, type Unit } from './units';
import { BODY } from './damage';
import { eyeOf } from './player';
import { heldStack } from './use';
import { raycast } from '../world/geom';

/** How much closer, how far a machine can be watched (m), how near the middle it must be (degrees off), the real
 *  seconds to log one and between lines while he keeps on it, and how many lines she keeps. */
export const BINOS = { zoom: 10, reach: 300, cone: 3, watch: 3, again: 5, keep: 400 };

/** A logged sighting: which machine (its id and kind), where, when (game time) and its heading (degrees from north). */
export interface Sighting { u: number; kind: UnitKind; x: number; y: number; z: number; t: number; head: number }

/** A machine's heading as a bearing from north (-z), clockwise. */
export const bearing = (yaw: number) => ((Math.atan2(Math.sin(yaw), -Math.cos(yaw)) * 180) / Math.PI + 360) % 360;
/** A bearing as one of eight points. */
export const compass = (deg: number): [string, string] => ([['北', 'N'], ['东北', 'NE'], ['东', 'E'], ['东南', 'SE'], ['南', 'S'], ['西南', 'SW'], ['西', 'W'], ['西北', 'NW']] as [string, string][])[Math.round(deg / 45) % 8];

export const binosUp = (s: SimState, input: InputFrame) => heldStack(s)?.id === 'binoculars' && (input.buttons & B.AIM) !== 0;

/** The moving machine nearest the middle of his view, within the cone, in range and in sight; or null. */
export function watched(s: SimState, w: World): Unit | null {
  const p = s.player, e = eyeOf(p), cp = Math.cos(p.pitch), d = { x: -Math.sin(p.yaw) * cp, y: Math.sin(p.pitch), z: -Math.cos(p.yaw) * cp };
  let best: Unit | null = null, bc = Math.cos((BINOS.cone * Math.PI) / 180);
  for (const u of s.units) {
    if (u.dead || STATIC.has(u.kind) || (u.reserve && !u.trip)) continue;
    const q = unitPose(w, u, s.time);
    if (!q.active && !u.stop) continue;
    const [y0, y1] = BODY[u.kind], dx = q.x - e.x, dy = q.y + (y0 + y1) / 2 - e.y, dz = q.z - e.z, L = Math.hypot(dx, dy, dz);
    if (L > BINOS.reach || L < 1) continue;
    const c = (dx * d.x + dy * d.y + dz * d.z) / L;
    if (c < bc || raycast(w.index, e.x, e.y, e.z, dx / L, dy / L, dz / L, L - 1)) continue;
    best = u; bc = c;
  }
  return best;
}

export function stepBinos(s: SimState, w: World, input: InputFrame) {
  const u = binosUp(s, input) ? watched(s, w) : null;
  if (!u) { s.watch = undefined; return; }
  if (s.watch?.u !== u.id) { s.watch = { u: u.id, t: 0, next: BINOS.watch }; return; }
  s.watch.t += DT;
  if (s.watch.t < s.watch.next) return;
  s.watch.next += BINOS.again;
  const q = unitPose(w, u, s.time), log = (s.sightings ??= []), head = bearing(q.yaw);
  log.push({ u: u.id, kind: u.kind, x: q.x, y: q.y, z: q.z, t: s.time, head });
  if (log.length > BINOS.keep) log.shift();
  s.events.push({ t: 'logged', kind: u.kind, head });
}
