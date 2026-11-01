// Patrols change over (M4-58, U-051): now and then, as a column passes, a walker on a street beat beside its way goes
// over to it and one of the column's comes back to the beat in its place: the walker that returns is the column's and
// knows nothing of him. At most once an hour of game time on each column's way.
import type { SimState } from './types';
import type { World } from '../world/world';
import { unitPose, isOff } from './units';
import { leave } from './alert';

export const CHANGE = { near: 30, every: 3600 };

/** Twice a second: a column member near enough to a street walker for a changeover, if its column's due one. */
export function stepChangeover(s: SimState, w: World) {
  if (s.tick % 30 || !w.convoys?.length) return;
  const changes = (s.hive.changes ??= {});
  for (let c = 0; c < w.convoys.length; c++) {
    if (s.time - (changes[c] ?? -Infinity) < CHANGE.every) continue;
    const member = s.units.find(u => u.convoy?.path === c && u.kind === 'humanoid' && unitPose(w, u, s.time).active);
    if (!member) continue;
    const q = unitPose(w, member, s.time);
    const walker = s.units.find(u => u.patrol >= 0 && !u.extra && !u.trip && u.state === 'unaware' && (u.kind === 'humanoid' || u.kind === 'quadruped') && w.patrols[u.patrol].kind === 'street'
      && !isOff(s, u) && (() => { const p = unitPose(w, u, s.time); return p.active && Math.hypot(p.x - q.x, p.z - q.z) < CHANGE.near; })());
    if (!walker) continue;
    leave(s, w, walker, 'swap', { x: q.x, y: q.y, z: q.z });
    changes[c] = s.time;
    s.hive.changeovers = (s.hive.changeovers ?? 0) + 1;
  }
}
