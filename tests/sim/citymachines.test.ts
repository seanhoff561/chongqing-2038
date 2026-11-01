// M6-22: the machines across the city. Every district is watched and walked: cameras and smart lampposts, drone
// docks and drones, quadrupeds, humanoids, delivery robots, turrets, a garage for its squad. A whole game day for every
// machine in the city (sampled every five minutes, as the sim places them) in under 30 s of wall time: every one on
// the move covers ground, none walks on air, and none is inside anything for more than a sliver of its day.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { unitPose } from '../../src/sim/units';
import { raycast, query, frameIn } from '../../src/world/geom';
import { heightAt } from '../../src/world/heightfield';
import { districtOf } from '../../src/sim/district';

const w = getWorld('yuzhong');
const solidsOnly = { ...w.index, ground: undefined, stamp: new Uint32Array(w.index.stamp.length), stampN: 0 };
/** Inside a solid itself (a turned one by its own footprint, not the box round it). */
const inSolid = (x: number, y0: number, y1: number, z: number) => query(solidsOnly, x - 0.12, z - 0.12, x + 0.12, z + 0.12).some(i => {
  const s = w.index.solids[i], b = s.rot ?? s, [lx, lz] = frameIn(s, x, z);
  return s.y0 < y1 && s.y1 > y0 && lx > b.x0 - 0.12 && lx < b.x1 + 0.12 && lz > b.z0 - 0.12 && lz < b.z1 + 0.12;
});
const FLY = new Set(['drone', 'hunter', 'fpv', 'bomber', 'heli']);
const BODY: Record<string, [number, number]> = { quadruped: [0.35, 0.8], crawler: [0.1, 0.3], delivery: [0.2, 0.6] };
const DISTRICTS = ['jiefangbei', 'jiaochangkou', 'shibati', 'xiaoshizi', 'hongyadong', 'chaotianmen'];

describe('the machines across the city (M6-22)', () => {
  it('watch and walk every district, and none is stuck through a day', () => {
    const s = createState(1, w), at = (u: (typeof s.units)[number]) => (u.patrol >= 0 ? districtOf(w.patrols[u.patrol].pts[0].x, w.patrols[u.patrol].pts[0].z) : '');
    for (const d of DISTRICTS) {
      const mine = s.units.filter(u => at(u) === d), n = (k: string) => mine.filter(u => u.kind === k).length, cams = w.cameras.filter(c => districtOf(c.x, c.z) === d);
      expect(n('quadruped'), `${d} quadrupeds`).toBeGreaterThanOrEqual(2);
      expect(n('humanoid'), `${d} humanoids`).toBeGreaterThanOrEqual(2);
      expect(n('drone'), `${d} drones`).toBeGreaterThanOrEqual(2);
      expect(cams.filter(c => c.kind === 'lamppost').length, `${d} lampposts`).toBeGreaterThan(5);
      expect(cams.filter(c => c.kind === 'camera' || c.kind === 'sweeper').length, `${d} cameras`).toBeGreaterThan(2);
      expect(w.docks.filter(k => districtOf(k.x, k.z) === d).length, `${d} docks`).toBeGreaterThanOrEqual(1);
      expect(w.garages.filter(k => districtOf(k.x, k.z) === d).length, `${d} garage`).toBeGreaterThanOrEqual(1);
    }
    expect(s.units.filter(u => u.kind === 'delivery').length).toBeGreaterThanOrEqual(DISTRICTS.length);
    expect(w.cameras.filter(c => c.kind === 'turret').length).toBeGreaterThan(5);
    const t0 = performance.now();
    let samples = 0, inside = 0;
    const bad: string[] = [];
    for (const u of s.units) {
      if (u.patrol < 0 || u.cam !== undefined) continue;
      let n = 0, stuckIn = 0, air = 0, moved = 0, last: { x: number; z: number } | null = null;
      for (let t = 0; t < 86400; t += 300) {
        const q = unitPose(w, u, t);
        if (!q.active || q.docked) { last = null; continue; }
        n++;
        if (last) moved += Math.hypot(q.x - last.x, q.z - last.z);
        last = q;
        if (u.kind === 'spider' || u.kind === 'colossus' || u.kind === 'heavy') continue;
        const fly = FLY.has(u.kind), [lo, hi] = fly ? [-0.1, 0.1] : (BODY[u.kind] ?? [0.5, 1.3]), ground = heightAt(w.ground!, q.x, q.z) ?? -Infinity;
        if ((ground - q.y > 0.6 && ground - q.y < 3) || inSolid(q.x, q.y + lo, q.y + hi, q.z)) stuckIn++;
        else if (!fly && u.kind !== 'crawler' && !raycast(w.index, q.x, q.y + 0.5, q.z, 0, -1, 0, 2.5) && q.y - ground > 1) air++;
      }
      if (!n) continue;
      samples += n; inside += stuckIn;
      if (air / n >= 0.05) bad.push(`${u.kind}${u.id} on air ${(air / n).toFixed(2)}`);
      if (stuckIn / n >= 0.1) bad.push(`${u.kind}${u.id} inside ${(stuckIn / n).toFixed(2)}`);
      if (w.patrols[u.patrol].kind !== 'lurk' && moved <= 50) bad.push(`${u.kind}${u.id} never moves`);
    }
    const secs = (performance.now() - t0) / 1000;
    expect(bad, bad.slice(0, 12).join('; ')).toEqual([]);
    expect(inside / samples).toBeLessThan(0.01);
    expect(secs).toBeLessThan(30);
  });
});
