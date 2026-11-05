// Machines coming apart (M4-62, U-052): a drone brought down by a hit in a rotor crashes where it lands and blows up,
// heard 60 m round, hurting him by how near he is (within 4 m).
import type { SimState } from './types';
import type { World } from '../world/world';
import { unitPose } from './units';
import { blast } from './strike';
import { CRASH } from '../data/units';

export function stepBreaks(s: SimState, w: World) {
  for (const u of s.units) {
    if (!u.crash || u.dead) continue;
    const p = unitPose(w, u, s.time);
    if (p.y > u.crash.gy + 0.05) continue;
    u.dead = true;
    u.stop = { x: p.x, y: u.crash.gy, z: p.z, yaw: p.yaw, t: s.time };
    // A light patrol drone just clatters down, heard close by (M4-87: shot down quietly, the network needn't know);
    // the hunters and bombers blow up.
    if (u.kind === 'drone') { s.events.push({ t: 'noise', x: p.x, y: p.y, z: p.z, r: CRASH.clatter, kind: 'crash' }, { t: 'sfx', id: 'land-hard' }); continue; }
    blast(s, w, { x: p.x, y: p.y + 0.3, z: p.z }, CRASH, CRASH.noise);
  }
}
