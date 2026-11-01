// M4-45 (U-050): combat AI. An engaged drone keeps moving round him at a stand-off, never hanging over him; engaged
// humanoids bound between covers toward him by turns, holding and firing between.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { solid } from '../../src/world/geom';
import { unitPose } from '../../src/sim/units';
import type { Patrol } from '../../src/world/world';

const stand = (unit: Patrol['unit'], x: number, z: number, y = 0): Patrol => ({ kind: unit === 'drone' ? 'drone' : 'street', unit, pts: [{ x, y, z }, { x, y, z: z + 0.01 }], dwell: [600, 600], hours: [0, 24] });

describe('combat AI (M4-45)', () => {
  it('an engaged drone keeps moving round him, off the point over his head', () => {
    const { world, state } = setup([floor(0, 200)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [stand('drone', 0, -20, 9)] });
    state.time = 12 * 3600; state.flags.god = true; state.flags.clear = true;
    const u = state.units[0];
    u.aware = 1.2; u.seen = { ...state.player.pos };
    const ps: { x: number; z: number }[] = [];
    run(state, world, secs(10), {}, (s, i) => { if (i % 30 === 0) { const p = unitPose(world, u, s.time); ps.push({ x: p.x, z: p.z }); } });
    expect(u.state).toBe('engaged');
    const moved = ps.slice(1).reduce((a, p, i) => a + Math.hypot(p.x - ps[i].x, p.z - ps[i].z), 0), off = ps.filter(p => Math.hypot(p.x, p.z) > 8).length;
    expect(moved).toBeGreaterThan(30);
    expect(off / ps.length).toBeGreaterThan(0.8);
  });
  it('engaged humanoids under fire bound between covers toward him', () => {
    // Crates to take cover behind, scattered between them (at z = -30) and him (at the origin).
    const crates = [-8, 0, 8].flatMap(x => [-24, -17, -10].map(z => solid(x - 0.6 + (z % 3), 0, z - 0.4, x + 0.6 + (z % 3), 1.1, z + 0.4)));
    const { world, state } = setup([floor(0, 200), ...crates], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [stand('humanoid', -4, -30), stand('humanoid', 4, -30)] });
    state.time = 12 * 3600; state.flags.god = true; state.flags.clear = true;
    const them = state.units.filter(u => u.kind === 'humanoid' && !u.extra);
    for (const u of them) { u.aware = 1.2; u.seen = { ...state.player.pos }; }
    const stops = them.map(() => [] as { x: number; z: number }[]), last = them.map(() => ({ x: 0, z: 0, still: 0 }));
    run(state, world, secs(24), {}, s => them.forEach((u, k) => {
      const p = unitPose(world, u, s.time), L = last[k];
      if (Math.hypot(p.x - L.x, p.z - L.z) < 0.01) { if (++L.still === 40 && !stops[k].some(q => Math.hypot(q.x - p.x, q.z - p.z) < 2)) stops[k].push({ x: p.x, z: p.z }); } else L.still = 0;
      L.x = p.x; L.z = p.z;
    }));
    // Each held at two places or more, and between them they closed on him.
    for (const st of stops) expect(st.length).toBeGreaterThanOrEqual(2);
    const nearest = Math.min(...them.map(u => { const p = unitPose(world, u, state.time); return Math.hypot(p.x, p.z); }));
    expect(nearest).toBeLessThan(26);
  });
});
