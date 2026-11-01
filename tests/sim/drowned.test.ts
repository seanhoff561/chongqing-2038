// M4-94 (U-069): stairways blocked part-way more often, sewers blocked and drowned more often. In every district about
// two stairwells in five are blocked at a floor above the first; of the sewers' runs, well over a third are flooded
// (a dip full to the roof, or standing water the length of them) and some are plugged, but most stay open.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { districtOf } from '../../src/sim/district';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { run } from './helpers';

describe('blocked stairways and drowned sewers (M4-94)', () => {
  it('blocks stairwells part-way and drowns and plugs the sewers', () => {
    const w = getWorld('yuzhong'), by: Record<string, { n: number; blocked: number }> = {};
    for (const p of w.plots.filter(p => !p.far && p.route && p.route.length > 1)) {
      const d = districtOf(p.route![0].x, p.route![0].z), c = (by[d] ??= { n: 0, blocked: 0 });
      c.n++; if (p.blocked !== undefined) { c.blocked++; expect(p.blocked).toBeGreaterThanOrEqual(1); }
    }
    for (const [d, c] of Object.entries(by)) if (c.n >= 15) { expect(c.blocked / c.n, d).toBeGreaterThan(0.15); expect(c.blocked / c.n, d).toBeLessThan(0.75); }
    const count = (k: string) => w.features.filter(f => f.kind === k).length, runs = count('drain') / 2;
    expect(runs).toBeGreaterThan(50);
    expect((count('sump') + count('flood')) / runs).toBeGreaterThan(0.35);
    expect(count('plug')).toBeGreaterThan(0);
    expect(count('plug') / runs).toBeLessThan(0.2);
  });
  it('really blocks a stairwell: walking up its way from the blocked floor gets him no higher (U-079)', () => {
    const w = getWorld('yuzhong'), lot = w.plots.find(p => !p.far && p.blocked !== undefined && p.route && p.route.length > 8)!, route = lot.route!;
    const k = lot.blocked!, y0 = route[3 + 4 * k].y, s = createState(1, w);
    s.flags.god = true;
    teleport(s.player, route[3 + 4 * k].x, y0 + 0.05, route[3 + 4 * k].z);
    let top = y0;
    // Up the next flights' points one by one, a minute on each at most (jumping as he goes, in case a step would do).
    for (const pt of route.slice(4 + 4 * k, 8 + 4 * k)) for (let i = 0; i < 60 * 15; i++) {
      const p = s.player, dx = pt.x - p.pos.x, dz = pt.z - p.pos.z;
      if (Math.hypot(dx, dz) < 0.3) break;
      run(s, w, 1, { my: 1, yaw: Math.atan2(-dx, -dz), buttons: i % 40 === 0 ? 1 : 0, pressed: i % 40 === 0 ? 1 : 0 });
      top = Math.max(top, p.pos.y);
    }
    expect(top - y0).toBeLessThan(1.5);
  });
});
