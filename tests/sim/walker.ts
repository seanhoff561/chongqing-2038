// Walking him along a way with his own legs (M6-05, M6-06): each point in turn, facing it, forward at a jog or a
// sprint, hopping when he's stopped against something low, until he's within a metre and a half of it. Fails at the
// first point he can't reach in time.
import type { SimState } from '../../src/sim/types';
import type { World } from '../../src/world/world';
import { B } from '../../src/sim/types';
import { run } from './helpers';

type V3 = { x: number; y: number; z: number };

export function walkPath(s: SimState, w: World, pts: V3[], sprint = true): { reached: number; at: V3 } {
  for (let i = 0; i < pts.length; i++) {
    const q = pts[i], far = Math.hypot(q.x - s.player.pos.x, q.z - s.player.pos.z);
    let last = { ...s.player.pos }, still = 0;
    for (let t = 0; t < 60 * (6 + far / 2); t++) {
      const p = s.player.pos, dx = q.x - p.x, dz = q.z - p.z;
      if (Math.hypot(dx, dz) < 1.5 && Math.abs(q.y - p.y) < 2.5) break;
      const yaw = Math.atan2(-dx, -dz), hop = still > 30 && still % 40 < 2;
      s.player.yaw = yaw;
      run(s, w, 1, { yaw, my: 1, buttons: (sprint ? B.SPRINT : 0) | (hop ? B.JUMP : 0), pressed: hop ? B.JUMP : 0 });
      if (Math.hypot(p.x - last.x, p.z - last.z) < 0.02) still++; else { still = 0; last = { ...p }; }
    }
    const p = s.player.pos;
    if (Math.hypot(q.x - p.x, q.z - p.z) >= 1.5 || Math.abs(q.y - p.y) >= 2.5) return { reached: i, at: { ...p } };
  }
  return { reached: pts.length, at: { ...s.player.pos } };
}
