// M6-06: the riverfronts all round the peninsula: the occupier's wall along the river side of the riverside roads
// on the Yangtze (south) and the Jialing (north), the docks (the OSM piers as pontoons), the rivers' water; and he
// walks the Yangtze riverfront from below Shibati to Chaotianmen on his own legs, near the water all the way.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { navPath } from '../../src/sim/nav';
import { heightAt } from '../../src/world/heightfield';
import { WATER_Y } from '../../src/world/yuzhong/ground';
import { GEO } from '../../src/world/geo';
import { walkPath } from './walker';
import { run } from './helpers';

const w = getWorld('yuzhong'), g = w.ground!, L = GEO.landmarks;
/** Metres to the water's edge from (x, z), looked for 16 ways out to 300 m. */
const toWater = (x: number, z: number) => { for (let d = 0; d <= 300; d += 6) for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, h = heightAt(g, x + Math.cos(a) * d, z + Math.sin(a) * d); if (h !== null && h < WATER_Y) return d; } return Infinity; };

describe('riverfronts (M6-06)', () => {
  it('are walled along both rivers, with docks, and the rivers all round', () => {
    const wall = w.features.filter(f => f.kind === 'river:wall'), near = (k: string) => wall.filter(f => Math.hypot(f.x - L[k].x, f.z - L[k].z) < 450).length;
    // The Yangtze side (below Shibati, Xiaoshizi, the Dongshuimen Bridge) and the Jialing (Hongyadong, Qiansimen).
    const rf = w.features.find(f => f.kind === 'key:riverfront')!, below = wall.filter(f => Math.hypot(f.x - rf.x, f.z - rf.z) < 450).length;
    console.log('WALLS', below, ['xiaoshizi', 'dongshuimenBridge', 'cablewayNorth', 'chaotianmen', 'hongyadong', 'qiansimenBridge'].map(k => `${k} ${near(k)}`).join(', '), 'docks', w.features.filter(f => f.kind === 'river:dock').length);
    expect(below, 'below Shibati').toBeGreaterThan(40);
    for (const k of ['xiaoshizi', 'dongshuimenBridge', 'hongyadong']) expect(near(k), k).toBeGreaterThan(40);
    expect(w.features.filter(f => f.kind === 'river:dock').length, 'docks').toBeGreaterThanOrEqual(5);
    expect(w.water.some(q => q.x1 - q.x0 > 2000 && q.z1 - q.z0 > 2000), 'the rivers').toBe(true);
  });

  it('is walked along the Yangtze from below Shibati to Chaotianmen', () => {
    const s = createState(5, w), from = w.features.find(f => f.kind === 'key:riverfront')!, to = w.teleports.find(t => t.name === 'chaotianmen')!;
    s.flags.god = true; s.flags.clear = true; s.time = 12 * 3600;
    // (No machines: a machine standing there, on or off, is a body he can't walk through, M10-45.)
    s.units.length = 0;
    teleport(s.player, from.x, from.y + 0.1, from.z);
    run(s, w, 3);
    const way = navPath(w.nav!, s.player.pos, to, 'street')!;
    expect(way).toBeTruthy();
    // Along the riverfront: most of the way within 150 m of the water.
    const by = way.pts.filter(q => toWater(q.x, q.z) < 150).length / way.pts.length;
    expect(by, 'near the water').toBeGreaterThan(0.7);
    const pts = way.pts.slice(0, -1), r = walkPath(s, w, pts);
    expect(r.reached, `stopped at ${r.at.x.toFixed(0)},${r.at.y.toFixed(0)},${r.at.z.toFixed(0)}, point ${r.reached} of ${pts.length}`).toBe(pts.length);
    expect(Math.hypot(s.player.pos.x - L.chaotianmen.x, s.player.pos.z - L.chaotianmen.z)).toBeLessThan(80);
  }, 600000);
});
