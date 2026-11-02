// M6-01: Jiefangbei as it stands (Q-010): CBD towers, walking streets on the ridge, malls with floors to go in, and
// the Liberation Monument on its plaza (built as itself, not a block); a way across the district along the streets
// and one over the roofs, each checked leg by leg against what he can do.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { raycast } from '../../src/world/geom';
import { heightAt } from '../../src/world/heightfield';
import { navPath } from '../../src/sim/nav';
import { GEO } from '../../src/world/geo';
import { MONUMENT } from '../../src/world/yuzhong/monument';
import { REACH } from '../../src/data/reach';
import type { Route } from '../../src/world/world';

const w = getWorld('yuzhong'), L = GEO.landmarks.jiefangbei;
const mid = (c: [number, number][]) => [c.reduce((a, q) => a + q[0], 0) / c.length, c.reduce((a, q) => a + q[1], 0) / c.length];
const inDistrict = (x: number, z: number) => Math.hypot(x - L.x, z - L.z) < 380;

/** Every leg of a route within his reach (as tests/sim/routes3.test.ts). */
function legsOk(r: Route) {
  return r.ways.every((k, i) => {
    const a = r.pts[1 + 2 * i], b = r.pts[2 + 2 * i], across = Math.hypot(b.x - a.x, b.z - a.z), dy = b.y - a.y, R = REACH;
    return k === 'jump' ? across <= R.jump.across + 0.6 && Math.abs(dy) <= R.jump.rise + 0.05
      : k === 'drop' ? -dy <= R.drop.down + 0.05 && dy <= 0.05
        : k === 'climb' ? dy <= R.climb.up + 0.05
          : k === 'window' ? across <= Math.max(R.window.across, R.drop.across) + 0.1 && Math.abs(dy) <= Math.max(R.window.rise, R.jump.rise) + 0.05
            : k === 'line' ? across <= R.line.across
              : ['crossPlank', 'crossBeam', 'gapBar', 'walkway', 'skybridge', 'winPlank'].includes(k) ? across <= R.span.across : true;
  });
}

describe('Jiefangbei (M6-01)', () => {
  it('has its monument on an open plaza, towers, walking streets and malls to go into', () => {
    const mon = w.plots.find(p => p.kind === 'monument')!;
    expect(mon, 'the monument').toBeTruthy();
    const [mx, mz] = mid(mon.corners);
    expect(Math.hypot(mx - L.x, mz - L.z)).toBeLessThan(10);
    // Its spire's top at 27.5 m over the plaza, the column round it below.
    const down = raycast(w.index, mx, mon.base + 60, mz, 0, -1, 0, 80)!;
    expect(mon.base + 60 - down.t - mon.base).toBeCloseTo(MONUMENT.height, 0);
    // The plaza: the teleport out on it under the open sky, clear round about.
    const t = w.teleports.find(q => q.name === 'jiefangbei')!;
    expect(raycast(w.index, t.x, t.y, t.z, 0, 1, 0, 200), 'open sky').toBeNull();
    const clear = [0, 1, 2, 3, 4, 5, 6, 7].filter(k => !raycast(w.index, t.x, t.y, t.z, Math.sin((k * Math.PI) / 4), 0, Math.cos((k * Math.PI) / 4), 5)).length;
    expect(clear).toBeGreaterThanOrEqual(6);
    const near = w.plots.filter(p => { const [x, z] = mid(p.corners); return inDistrict(x, z) && !p.far; });
    expect(near.filter(p => p.wall - p.base > 60).length, 'towers').toBeGreaterThanOrEqual(10);
    expect(w.streets.filter(s => s.kind === 'pedestrian' && s.pts.some(([x, z]) => Math.hypot(x - L.x, z - L.z) < 200)).length, 'walking streets').toBeGreaterThanOrEqual(3);
    // Malls: in at the street door and up their stairs, two floors or more.
    const malls = near.filter(p => p.type === 'mall' && p.route && p.route.length > 3);
    expect(malls.length, 'malls').toBeGreaterThanOrEqual(2);
  });

  it('is crossed along the streets and over the roofs', () => {
    // Along the streets: from its western edge to its eastern, through the middle.
    const at = (x: number, z: number) => ({ x, y: heightAt(w.ground!, x, z) ?? 0, z }), west = at(L.x - 260, L.z), east = at(L.x + 260, L.z);
    const st = navPath(w.nav!, west, east, 'street');
    expect(st, 'a way along the streets').toBeTruthy();
    const xs = st!.pts.map(q => q.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(350);
    // Over the roofs: a route through the district mostly on roofs and across gaps, every leg within his reach.
    const roofy = w.routes.filter(r => {
      let on = 0, all = 0, x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      r.pts.slice(1).forEach((q, k) => { if (!inDistrict(q.x, q.z)) return; const d = Math.hypot(q.x - r.pts[k].x, q.z - r.pts[k].z); all += d; if (r.on[k] === 'roof' || r.on[k] === 'gap') on += d; x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); z0 = Math.min(z0, q.z); z1 = Math.max(z1, q.z); });
      return all > 0 && on / all > 0.3 && Math.hypot(x1 - x0, z1 - z0) > 200 && legsOk(r);
    });
    expect(roofy.map(r => r.id), 'a way over the roofs').not.toEqual([]);
  });
});
