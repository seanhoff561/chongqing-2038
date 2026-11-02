// Pursuits (M4-32): a machine of a kind brought onto him where he stands, already sure of him, for the escapes to be
// tried from: a drone tailing him, a quadruped coming for him, a camera that has him in its sights. The nearest that's
// out (within reach of him; a drone in the air, not charging on its dock), its awareness full and his place known to it.
import type { SimState } from './types';
import type { World } from '../world/world';
import { unitPose, type Unit } from './units';

export type Pursuer = 'drone' | 'quadruped' | 'camera';

/** Sets the nearest of the kind on him; the unit, or null if none's within 250 m. */
export function startPursuit(s: SimState, w: World, kind: Pursuer): Unit | null {
  const p = s.player.pos, of = (u: Unit) => (kind === 'camera' ? u.cam !== undefined && ['camera', 'lamppost', 'sweeper'].includes(w.cameras[u.cam].kind) : u.kind === kind && u.patrol >= 0 && !u.extra);
  // (Nearest as the crow flies: not a drone high over the towers when a lower one's closer.)
  const far = (q: { x: number; y: number; z: number }) => Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
  const near = s.units.filter(u => of(u) && !u.reserve).map(u => ({ u, q: unitPose(w, u, s.time) })).filter(({ q }) => q.active && !q.docked && far(q) < 250)
    .sort((a, b) => far(a.q) - far(b.q))[0];
  if (!near) return null;
  const u = near.u;
  u.quiet = undefined; u.aware = 1.2; u.seen = { ...p }; u.saw = s.time;
  return u;
}
