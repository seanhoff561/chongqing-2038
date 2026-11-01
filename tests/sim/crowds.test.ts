// M4-57 (U-051): far more machines. The districts' main streets thick with them (pairs and squads walking them, a
// turret at the junctions, drones over them day and night), all but certain death to cross in the open by day; their
// side streets as busy as the main streets were.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { unitPose, isOff } from '../../src/sim/units';
import { teleport } from '../../src/sim/player';
import { heightAt } from '../../src/world/heightfield';
import { GEO } from '../../src/world/geo';
import { raycast } from '../../src/world/geom';
import { run, secs } from './helpers';
import { B } from '../../src/sim/types';

const DISTRICTS = ['jiefangbei', 'jiaochangkou', 'shibati', 'xiaoshizi', 'hongyadong', 'chaotianmen'];
const MAIN = new Set(['primary', 'secondary', 'tertiary']);
const SIDE = new Set(['residential', 'service', 'footway', 'path', 'pedestrian', 'living_street', 'steps', 'unclassified']);
const w = getWorld('yuzhong');
const inDistrict = (x: number, z: number) => DISTRICTS.some(k => Math.hypot(x - GEO.landmarks[k].x, z - GEO.landmarks[k].z) < 300);
/** The districts' stretches of street of these kinds, as segments. */
const segs = (kinds: Set<string>) => w.streets.filter(s => kinds.has(s.kind)).flatMap(s => s.pts.slice(1).map((b, i) => [s.pts[i], b] as const)).filter(([a, b]) => inDistrict((a[0] + b[0]) / 2, (a[1] + b[1]) / 2));
const dist = (x: number, z: number, [[ax, az], [bx, bz]]: readonly [number[], number[]]) => {
  const vx = bx - ax, vz = bz - az, l = vx * vx + vz * vz, t = l ? Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l)) : 0;
  return Math.hypot(x - ax - vx * t, z - az - vz * t);
};
const km = (ss: ReturnType<typeof segs>) => ss.reduce((a, [p, q]) => a + Math.hypot(q[0] - p[0], q[1] - p[1]), 0) / 1000;

describe('crowded streets (M4-57)', () => {
  it('main streets thick with machines, side streets busy', () => {
    const s = createState(1, w), mains = segs(MAIN), sides = segs(SIDE);
    const walkers = s.units.filter(u => u.patrol >= 0 && !u.extra && u.kind !== 'drone' && !isOff(s, u));
    let onMain = 0, onSide = 0;
    for (const t of [10, 12, 14, 16].map(h => h * 3600)) for (const u of walkers) {
      const q = unitPose(w, u, t);
      if (!q.active || !inDistrict(q.x, q.z)) continue;
      if (mains.some(sg => dist(q.x, q.z, sg) < 8)) onMain++; else if (sides.some(sg => dist(q.x, q.z, sg) < 6)) onSide++;
    }
    const main = onMain / 4 / km(mains), side = onSide / 4 / km(sides);
    // (Before: 1.1 a km on the main streets, 0.1 on the side streets, and 5 turrets, all at the factory's gates.)
    expect(main).toBeGreaterThan(20);
    expect(side).toBeGreaterThan(1.1);
    expect(w.cameras.filter(c => c.kind === 'turret').length).toBeGreaterThan(30);
    // Drones over the districts' main streets by day as well as by night.
    expect(w.patrols.filter(p => p.kind === 'drone' && p.hours[0] === 0 && p.hours[1] === 24).length).toBeGreaterThanOrEqual(DISTRICTS.length - 1);
  });
  it('a run across a main street by day is seen within seconds', () => {
    const g = w.ground!, times: number[] = [], used: number[][] = [];
    const ground = (x: number, z: number) => heightAt(g, x, z) ?? 0;
    for (const k of DISTRICTS) {
      // A crossing near the district's centre: 9 m either side of the street, level and clear all the way over.
      const L = GEO.landmarks[k];
      const pick = segs(MAIN).filter(([a]) => Math.hypot(a[0] - L.x, a[1] - L.z) < 250).map(([[ax, az], [bx, bz]]) => {
        const l = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / l, nz = (bx - ax) / l, mx = (ax + bx) / 2, mz = (az + bz) / 2;
        return { mx, mz, nx, nz, l };
      }).filter(c => c.l > 8 && !used.some(([x, z]) => Math.hypot(x - c.mx, z - c.mz) < 60) && [-9, -4.5, 0, 4.5, 9].every(o => Math.abs(ground(c.mx + c.nx * o, c.mz + c.nz * o) - ground(c.mx, c.mz)) < 0.6)
        && [0.4, 1.2].every(up => { const x0 = c.mx - c.nx * 9, z0 = c.mz - c.nz * 9; return !raycast(w.index, x0, ground(x0, z0) + up, z0, c.nx, 0, c.nz, 18); }))[0];
      if (!pick) continue;
      used.push([pick.mx, pick.mz]);
      const { mx, mz, nx, nz } = pick, s = createState(1, w);
      s.time = 12 * 3600; s.flags.god = true;
      const x0 = mx - nx * 9, z0 = mz - nz * 9;
      teleport(s.player, x0, ground(x0, z0) + 0.05, z0);
      const yaw = Math.atan2(-nx, -nz);
      let seen = -1;
      for (let i = 0; i < secs(8) && seen < 0; i++) {
        run(s, w, 1, { yaw, my: 1, buttons: B.SPRINT });
        if (s.units.some(u => (u.aware ?? 0) >= 0.3)) seen = i / 60;
      }
      times.push(seen);
    }
    expect(times.length).toBeGreaterThanOrEqual(5);
    // (All but certain: one crossing in six can find every machine looking the other way.)
    expect(times.filter(t => t >= 0 && t < 3).length, times.join(' ')).toBeGreaterThanOrEqual(times.length - 1);
  });
});
