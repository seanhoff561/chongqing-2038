// M6-05: Xinhua Road and Xiaoshizi as they stand (Q-010): the lower streets on the Yangtze side, the Line 1/6
// station's entrances at Xiaoshizi, the road up onto the Dongshuimen Bridge; and he walks there from Shibati, along
// the streets on his own legs (tests/sim/walker.ts).
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { navPath } from '../../src/sim/nav';
import { GEO } from '../../src/world/geo';
import { walkPath } from './walker';
import { run } from './helpers';

const w = getWorld('yuzhong'), X = GEO.landmarks.xiaoshizi;

describe('Xinhua Road and Xiaoshizi (M6-05)', () => {
  it('has the station entrances and the bridge approach, and he walks there from Shibati', () => {
    expect(w.teleports.filter(t => t.name === 'Metro 小什字').length, 'Xiaoshizi station entrances').toBeGreaterThanOrEqual(2);
    const bridge = GEO.streets.filter(s => (s[2] & 2) && s[4].includes('东水门'));
    expect(bridge.length, 'the Dongshuimen Bridge').toBeGreaterThan(0);
    const s = createState(5, w), from = w.teleports.find(t => t.name === 'shibati')!, to = w.teleports.find(t => t.name === 'xiaoshizi')!;
    s.flags.god = true; s.flags.clear = true; s.time = 12 * 3600;
    // (Out of their sight: this is the way, not the machines.)
    for (const u of s.units) u.off = Infinity;
    teleport(s.player, from.x, from.y, from.z);
    run(s, w, 3);
    const way = navPath(w.nav!, s.player.pos, to, 'street')!;
    expect(way).toBeTruthy();
    // (To the last of the street's points: the landmark's own spot may be in a doorway or a stall.)
    const pts = way.pts.slice(0, -1), r = walkPath(s, w, pts);
    expect(r.reached, `stopped at ${r.at.x.toFixed(0)},${r.at.y.toFixed(0)},${r.at.z.toFixed(0)}, point ${r.reached} of ${pts.length}`).toBe(pts.length);
    expect(Math.hypot(s.player.pos.x - X.x, s.player.pos.z - X.z)).toBeLessThan(60);
  }, 600000);
});
