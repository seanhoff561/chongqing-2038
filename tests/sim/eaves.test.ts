// M4-40 (U-050): the eaves of a pitched tile roof are a ledge. He hangs from one and pulls up onto the slope; and in the
// city, the old quarter's roofs round the start hideout offer their eaves to his hands.
import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, aim, LMB } from './helpers';
import { solid, rampSolid } from '../../src/world/geom';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { findGrab } from '../../src/sim/grip';
import { MAT } from '../../src/world/mats';

describe('pitched roof eaves (M4-40)', () => {
  it('grabs a pitched roof\'s eave and pulls up onto its slope', () => {
    // A house 1.9 m to the eaves (as buildings.ts lays a pitched roof: 25 degrees, the eave 0.4 m out over the wall).
    const wall = 1.9, z0 = -10, z1 = -3, zm = (z0 + z1) / 2, h = (zm - z0) * 0.47;
    const { world, state } = setup([floor(), solid(-4, 0, z0, 4, wall, z1, MAT.brick), rampSolid(-4.3, wall, z0 - 0.4, 4.3, zm, wall + 0.12, wall + h, 3, MAT.roofTile), rampSolid(-4.3, wall, zm, 4.3, z1 + 0.4, wall + 0.12, wall + h, 4, MAT.roofTile)], { x: 0, y: 0, z: -2.1, yaw: 0 });
    run(state, world, 3);
    const eave = wall + 0.12;
    for (let i = 0; i < 40 && state.player.mode !== 'grip'; i++) { aim(state, 0, eave - 0.06, z1 + 0.4); run(state, world, 1, { buttons: LMB }); }
    expect(state.player.mode).toBe('grip');
    // (Hanging out from the wall under the eave: W held hauls him up and over.)
    for (let i = 0; i < secs(3) && state.player.mode === 'grip'; i++) run(state, world, 1, { buttons: LMB, my: 1 });
    run(state, world, secs(2));
    expect(state.player.mode).toBe('ground');
    expect(state.player.pos.y).toBeGreaterThan(eave);
    expect(state.player.pos.z).toBeLessThan(z1 + 0.4);
  });
  it("offers the old quarter's eaves round the start hideout to his hands", () => {
    const w = getWorld('yuzhong'), s = createState(1, w), grate = w.inter.find(i => i.id === 'airraid-grate')!;
    const eaves = w.index.solids.filter(q => q.ramp && q.mat === MAT.roofTile && Math.hypot((q.x0 + q.x1) / 2 - grate.x, (q.z0 + q.z1) / 2 - grate.z) < 120);
    expect(eaves.length).toBeGreaterThan(10);
    let found = 0;
    for (const q of eaves.slice(0, 20)) {
      // Hanging under the middle of its low edge, 0.3 m out, looking at it.
      const r = q.rot, lowZ = q.ramp === 3 ? (r ?? q).z0 : (r ?? q).z1, out = q.ramp === 3 ? -1 : 1, mx = ((r ?? q).x0 + (r ?? q).x1) / 2;
      const lx = mx, lz = lowZ + out * 0.3, [wx, wz] = r ? [r.px + r.c * (lx - r.px) - r.s * (lz - r.pz), r.pz + r.s * (lx - r.px) + r.c * (lz - r.pz)] : [lx, lz];
      const [ex, ez] = r ? [r.px + r.c * (mx - r.px) - r.s * (lowZ - r.pz), r.pz + r.s * (mx - r.px) + r.c * (lowZ - r.pz)] : [mx, lowZ];
      const p = s.player;
      Object.assign(p.pos, { x: wx, y: q.low - 1.75, z: wz });
      p.yaw = Math.atan2(-(ex - wx), -(ez - wz)); p.pitch = Math.atan2(q.low - 0.06 - (p.pos.y + 1.62), Math.hypot(ex - wx, ez - wz));
      const g = findGrab(w, p);
      if (g && g.kind === 'lip' && Math.abs(g.top - q.low) < 0.1) found++;
    }
    expect(found).toBeGreaterThanOrEqual(12);
  });
});
