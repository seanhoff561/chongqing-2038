// M4-34: delivery robots. Six-wheeled, 2 m/s on their rounds of the flat streets, never down stairs (the way it takes
// between the top and the foot of a flight of steps has no stair in it, if it has one at all), short-sighted, and a
// loud noise near one (a firecracker, a shot) scares it off its round, away from the noise, not toward it.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { getWorld } from '../../src/world/build';
import { navPath } from '../../src/sim/nav';
import { unitPose } from '../../src/sim/units';
import { stepHearing } from '../../src/sim/perception';
import { SENSES, UNITS } from '../../src/data/units';
import type { Patrol } from '../../src/world/world';

describe('delivery robots (M4-34)', () => {
  it('go their rounds at 2 m/s, short-sighted, and a loud noise sends them off away from it', () => {
    const beat: Patrol = { kind: 'street', unit: 'delivery', pts: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -80 }], dwell: [0, 0], hours: [0, 24] };
    const { world, state } = setup([floor(0, 300)], { x: 60, y: 0, z: 60, yaw: 0 }, { patrols: [beat] });
    state.time = 12 * 3600; state.flags.god = true;
    const u = state.units[0], a = unitPose(world, u, state.time);
    run(state, world, secs(5));
    const b = unitPose(world, u, state.time);
    expect(Math.hypot(b.x - a.x, b.z - a.z) / 5).toBeCloseTo(UNITS.delivery.patrol, 0);
    expect(SENSES.delivery.day).toBeLessThan(SENSES.humanoid.day);
    // A firecracker 15 m east of it: off it goes, west, away.
    state.events.push({ t: 'noise', x: b.x + 15, y: 0, z: b.z, r: 120, kind: 'firecrackers' });
    stepHearing(state, world);
    run(state, world, secs(8));
    const c = unitPose(world, u, state.time);
    expect(u.trip).toBeDefined();
    expect(c.x).toBeLessThan(b.x - 8);
    expect(u.state).toBe('unaware');
  });
  it('never takes stairs', () => {
    const w = getWorld('yuzhong');
    // A flight of steps 5 m or more from foot to top.
    const flight = w.streets.filter(st => st.kind === 'steps' && st.pts.length > 1).map(st => { const [a, b] = [st.pts[0], st.pts[st.pts.length - 1]]; return { a: { x: a[0], y: 0, z: a[1] }, b: { x: b[0], y: 0, z: b[1] } }; })
      .map(f => { const pa = navPath(w.nav!, f.a, f.b, 'quadruped'); return { ...f, rise: pa ? Math.abs(pa.pts[0].y - pa.pts[pa.pts.length - 1].y) : 0 }; }).find(f => f.rise > 5)!;
    expect(flight).toBeDefined();
    const p = navPath(w.nav!, flight.a, flight.b, 'delivery');
    for (const [i, q] of (p?.pts ?? []).entries()) if (i) { const o = p!.pts[i - 1]; expect(Math.abs(q.y - o.y)).toBeLessThanOrEqual(0.15 * Math.hypot(q.x - o.x, q.z - o.z) + 0.1 + 1e-6); }
  });
});
