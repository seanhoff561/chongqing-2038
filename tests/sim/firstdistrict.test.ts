// M4-29 (U-038): the first district's machines. Shibati, Jiaochangkou and the tunnels under them: cameras and smart
// lampposts, drones from two docks or more, quadrupeds, humanoids and delivery robots on their beats. Through a whole
// day (sampled every minute, as the sim places them) every one on the move covers ground, none walks on air, and none
// is inside anything for more than a sliver of its day (the streets as drawn clip a building's corner here and there).
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { unitPose } from '../../src/sim/units';
import { overlaps, raycast } from '../../src/world/geom';
import { heightAt } from '../../src/world/heightfield';
import { GEO } from '../../src/world/geo';

const w = getWorld('yuzhong');
/** The solids without the ground (its own marks, so its lookups don't trip over the world's). */
const solidsOnly = { ...w.index, ground: undefined, stamp: new Uint32Array(w.index.stamp.length), stampN: 0 };
const near = (q: { x: number; z: number }) => ['shibati', 'jiaochangkou'].some(k => Math.hypot(q.x - GEO.landmarks[k].x, q.z - GEO.landmarks[k].z) < 350);
const FLY = new Set(['drone', 'hunter', 'fpv', 'bomber']);
/** The middle of a walker's body, off its feet (m): a dog's and a spider robot's lower than a humanoid's. */
const BODY: Record<string, [number, number]> = { quadruped: [0.35, 0.8], crawler: [0.1, 0.3], delivery: [0.2, 0.6] };

describe('the first district (M4-29)', () => {
  it('is watched and walked by every kind of machine, and none of them is stuck through a day', () => {
    const s = createState(1, w), mine = s.units.filter(u => u.patrol >= 0 && near(w.patrols[u.patrol].pts[0]));
    const count = (k: string) => mine.filter(u => u.kind === k).length;
    expect(count('quadruped')).toBeGreaterThanOrEqual(10);
    expect(count('humanoid')).toBeGreaterThanOrEqual(10);
    expect(count('drone')).toBeGreaterThanOrEqual(4);
    expect(count('delivery')).toBeGreaterThanOrEqual(1);
    expect(w.cameras.filter(c => c.kind === 'lamppost' && near(c)).length).toBeGreaterThan(30);
    expect(w.cameras.filter(c => (c.kind === 'camera' || c.kind === 'sweeper') && near(c)).length).toBeGreaterThan(10);
    expect(w.docks.filter(near).length).toBeGreaterThanOrEqual(2);
    expect(s.units.filter(u => u.patrol >= 0 && w.patrols[u.patrol].kind === 'under').length).toBeGreaterThan(2);

    let samples = 0, inside = 0;
    for (const u of mine) {
      let n = 0, stuckIn = 0, air = 0, moved = 0, last: { x: number; z: number } | null = null;
      for (let t = 0; t < 86400; t += 60) {
        const q = unitPose(w, u, t);
        if (!q.active || q.docked) { last = null; continue; }
        n++;
        if (last) moved += Math.hypot(q.x - last.x, q.z - last.z);
        last = q;
        const fly = FLY.has(u.kind), big = u.kind === 'spider' || u.kind === 'colossus' || u.kind === 'heavy';
        if (big) continue;
        // Inside: in a solid, or sunk more than 0.6 m into the ground (a foot grazing a steep bank beside the street
        // isn't; nor is the underground, far under it).
        const [lo, hi] = fly ? [-0.1, 0.1] : (BODY[u.kind] ?? [0.5, 1.3]), ground = heightAt(w.ground!, q.x, q.z) ?? -Infinity;
        if ((ground - q.y > 0.6 && ground - q.y < 3) || overlaps(solidsOnly, { x0: q.x - 0.12, y0: q.y + lo, z0: q.z - 0.12, x1: q.x + 0.12, y1: q.y + hi, z1: q.z + 0.12 })) stuckIn++;
        // (The sewers' spider robots cling to walls and roofs: U-069.)
        else if (!fly && u.kind !== 'crawler') {
          if (!raycast(w.index, q.x, q.y + 0.5, q.z, 0, -1, 0, 2.5) && q.y - ground > 1) air++;
        }
      }
      if (!n) continue;
      samples += n; inside += stuckIn;
      expect(air / n, `unit ${u.id} (${u.kind}) on air`).toBeLessThan(0.05);
      expect(stuckIn / n, `unit ${u.id} (${u.kind}) inside something`).toBeLessThan(0.1);
      if (w.patrols[u.patrol].kind !== 'lurk' && u.cam === undefined) expect(moved, `unit ${u.id} (${u.kind}) never moves`).toBeGreaterThan(50);
    }
    expect(inside / samples).toBeLessThan(0.01);
  });
});
