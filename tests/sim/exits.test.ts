// M4-58 (U-051): the factory's columns march to exits round the city's edge (bridges, tunnels, roads running out) and
// leave by them; now and then a street walker changes over with one from a passing column.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { stepChangeover } from '../../src/sim/changeover';
import { streets } from '../../src/world/yuzhong/ground';

const w = getWorld('yuzhong');
const segDist = (x: number, z: number, pts: [number, number][]) => Math.min(...pts.slice(1).map(([bx, bz], k) => {
  const [ax, az] = pts[k], vx = bx - ax, vz = bz - az, l = vx * vx + vz * vz, t = l ? Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l)) : 0;
  return Math.hypot(x - ax - vx * t, z - az - vz * t);
}));

describe('columns go somewhere (M4-58)', () => {
  it("each column's way runs over 300 m to an exit: onto a bridge, into a tunnel, or off the city's edge", () => {
    const ways = streets().filter(s => s.bridge || s.tunnel);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const s of w.streets) for (const [x, z] of s.pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    expect(w.convoys!.length).toBeGreaterThanOrEqual(3);
    for (const c of w.convoys!) {
      const e = c.pts[c.pts.length - 1], len = c.pts.slice(1).reduce((a, q, i) => a + Math.hypot(q.x - c.pts[i].x, q.z - c.pts[i].z), 0);
      expect(len).toBeGreaterThan(300);
      const out = ways.some(s => segDist(e.x, e.z, s.pts) < 6) || Math.min(e.x - x0, x1 - e.x, e.z - z0, z1 - e.z) < 160;
      expect(out, `ends at ${e.x.toFixed(0)},${e.z.toFixed(0)}`).toBe(true);
    }
  });
  it('a street walker changes over with a passing column within a few hours', () => {
    const s = createState(1, w);
    s.time = 8 * 3600;
    let at = -1;
    for (let t = 0; t < 4 * 3600 && at < 0; t += 20) { s.time = 8 * 3600 + t; s.tick = 0; stepChangeover(s, w); if (s.hive.changeovers) at = t; }
    expect(at).toBeGreaterThanOrEqual(0);
    expect(s.units.some(u => u.trip?.kind === 'swap')).toBe(true);
  });
});
