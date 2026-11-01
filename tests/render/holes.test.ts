// M4-82 (U-060): no floor drawn over a hole. Before, some 16,000 thin finishes in Yuzhong (floor tiles and boards in
// rooms with broken floors, roof patches, moss, puddles) were drawn with nothing under them, and he fell through what
// looked like floor; now a finish over nothing isn't drawn.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { raycast } from '../../src/world/geom';
import { rayGround } from '../../src/world/heightfield';

describe('no floor over holes (M4-82)', () => {
  it('draws no thin finish with nothing under it to stand on', () => {
    const w = getWorld('yuzhong'), bad: string[] = [];
    let finishes = 0;
    for (const s of w.decor) {
      const e = s.rot ?? s, dx = e.x1 - e.x0, dz = e.z1 - e.z0;
      if (s.y1 - s.y0 > 0.06 || dx * dz < 0.3) continue;
      finishes++;
      const open = [[0.5, 0.5], [0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]].filter(([u, v]) => {
        // (A turned finish's corners are in its own frame: M4-89 found this sampled the wrong place.)
        let x = e.x0 + dx * u, z = e.z0 + dz * v;
        if (s.rot) { const R = s.rot, lx = x - R.px, lz = z - R.pz; x = R.px + lx * R.c - lz * R.s; z = R.pz + lx * R.s + lz * R.c; }
        return !raycast(w.index, x, s.y1 + 0.05, z, 0, -1, 0, 0.4) && !rayGround(w.ground!, x, s.y1 + 0.05, z, 0, -1, 0, 0.4);
      }).length;
      if (open >= 3) bad.push(`${((e.x0 + e.x1) / 2).toFixed(0)},${s.y1.toFixed(1)},${((e.z0 + e.z1) / 2).toFixed(0)}`);
    }
    expect(finishes).toBeGreaterThan(10000);
    expect(bad.slice(0, 5)).toEqual([]);
  });
});
