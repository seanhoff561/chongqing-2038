// Machines coming apart (M4-62, U-052): a drone brought down by a hit in a rotor crashes where it lands and blows up,
// heard 60 m round, hurting him by how near he is (within 4 m).
import type { SimState } from './types';
import type { World } from '../world/world';
import { unitPose } from './units';
import { damage } from './body';
import { CRASH } from '../data/units';

export function stepBreaks(s: SimState, w: World) {
  for (const u of s.units) {
    if (!u.crash || u.dead) continue;
    const p = unitPose(w, u, s.time);
    if (p.y > u.crash.gy + 0.05) continue;
    u.dead = true;
    u.stop = { x: p.x, y: u.crash.gy, z: p.z, yaw: p.yaw, t: s.time };
    s.events.push({ t: 'noise', x: p.x, y: p.y, z: p.z, r: CRASH.noise, kind: 'explosion' }, { t: 'sfx', id: 'boom' },
      { t: 'mark', x: p.x, y: p.y + 0.3, z: p.z, nx: 0, ny: 1, nz: 0, kind: 'bullet', on: 'machine' });
    const d = Math.hypot(s.player.pos.x - p.x, s.player.pos.y + 1 - p.y, s.player.pos.z - p.z);
    if (d < CRASH.reach) { const dmg = CRASH.damage * (1 - d / CRASH.reach); damage(s, dmg, 'blast'); s.events.push({ t: 'hurt', dmg, cause: 'blast' }); }
  }
}
