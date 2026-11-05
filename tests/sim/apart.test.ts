// M10-45 (U-104): no machine enters another's body or his, nor a wall, and he doesn't walk into one. A dozen
// quadrupeds and humanoids sent after him across a yard with walls in it, 20 s: never in each other, in him or in a
// wall, and they still get to him. Four on their beats meeting at a crossing of narrow streets, a lame one in the way:
// never in each other or a wall, and all get through. Him walking at a lame one: stopped at its body. A crowd pressed
// through a gap in a wall after him: never in a wall, and through.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { solid, overlaps } from '../../src/world/geom';
import { NAV, type Patrol } from '../../src/world/world';
import { leave } from '../../src/sim/alert';
import { hurtUnit } from '../../src/sim/damage';
import { SCALE } from '../../src/sim/clock';
import { loopOf, type Unit } from '../../src/sim/units';
import type { World } from '../../src/world/world';
import type { SimState } from '../../src/sim/types';
import { unitPose } from '../../src/sim/units';
import { BODY } from '../../src/sim/damage';
import { movement as M } from '../../src/data/movement';

const WALLS = [solid(-6, 0, 6, -1.5, 3, 6.4), solid(1.5, 0, -6.4, 6, 3, -6), solid(6, 0, 1.5, 6.4, 3, 6), solid(-6.4, 0, -6, -6, 3, -1.5), solid(9, 0, -1, 11, 3, 1), solid(-2, 0, -12, 2, 3, -11)];

/** Their ways about: a grid (`g` m) clear of the walls by a metre, its stretches by 0.6 m. */
function ways(walls: typeof WALLS, g: number, n: number): World['nav'] {
  const clear = (x: number, z: number) => Math.min(...walls.map(b => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.z0 - z, 0, z - b.z1))));
  const pts: { x: number; y: number; z: number }[] = [], adj: [number, number, number][][] = [], at = new Map<string, number>();
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) if (clear(i * g, j * g) >= 1) { at.set(`${i},${j}`, pts.length); pts.push({ x: i * g, y: 0, z: j * g }); adj.push([]); }
  for (const [key, k] of at) {
    const [i, j] = key.split(',').map(Number);
    for (const [di, dj] of [[1, 0], [0, 1], [1, 1], [1, -1], [-1, 0], [0, -1], [-1, -1], [-1, 1]]) {
      const m = at.get(`${i + di},${j + dj}`);
      if (m !== undefined && [0.25, 0.5, 0.75].every(f => clear((i + di * f) * g, (j + dj * f) * g) >= 0.6)) adj[k].push([m, Math.hypot(di, dj) * g, NAV.street]);
    }
  }
  return { pts, adj };
}

describe('machines keep out of each other, of him and of the walls (M10-45)', () => {
  it('a dozen sent after him never overlap and still reach him', () => {
    const N = 12, beats: Patrol[] = Array.from({ length: N }, (_, k) => {
      const a = (k / N) * Math.PI * 2, R = 15 + (k % 3) * 2, x = Math.cos(a) * R, z = Math.sin(a) * R;
      return { kind: 'street', unit: k % 2 ? 'humanoid' : 'quadruped', pts: [{ x, y: 0, z }, { x: x + 0.5, y: 0, z }], dwell: [5, 5], hours: [0, 24] };
    });
    const { world, state } = setup([floor(0, 100), ...WALLS], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: beats });
    world.nav = ways(WALLS, 2, 12);
    state.time = 12 * 3600; state.flags.god = true; state.weather = { fog: 0, rain: 0 };
    const units = state.units.filter(u => !u.extra && !u.reserve && u.patrol >= 0);
    expect(units.length).toBe(N);
    // Told where he is (and seeing nothing on the way, so none stops to shoot): all of them after him.
    for (const u of units) { u.blind = true; leave(state, world, u, 'hunt', { ...state.player.pos }); }
    const closest = units.map(() => Infinity), p = state.player.pos, hw = M.width / 2;
    const worst = { other: 0, him: 0, wall: 0 };
    run(state, world, secs(20), {}, () => {
      const q = units.map(u => unitPose(world, u, state.time));
      units.forEach((u, k) => {
        const [, y1, r] = BODY[u.kind], x = q[k].x, z = q[k].z;
        for (let l = k + 1; l < N; l++) worst.other = Math.max(worst.other, r + BODY[units[l].kind][2] - Math.hypot(q[l].x - x, q[l].z - z));
        const dx = Math.max(p.x - hw - x, 0, x - p.x - hw), dz = Math.max(p.z - hw - z, 0, z - p.z - hw);
        worst.him = Math.max(worst.him, r - Math.hypot(dx, dz));
        if (overlaps(world.index, { x0: x - r, z0: z - r, x1: x + r, z1: z + r, y0: q[k].y + 0.3, y1: q[k].y + y1 })) worst.wall++;
        closest[k] = Math.min(closest[k], Math.hypot(x - p.x, z - p.z));
      });
    });
    expect(worst.other, 'deepest one machine into another (m)').toBeLessThan(0.05);
    expect(worst.him, 'deepest a machine into him (m)').toBeLessThan(0.05);
    expect(worst.wall, 'ticks a machine was in a wall').toBe(0);
    // And the crowd round him: every one came within 3 m of him, most within 1.5.
    expect(Math.max(...closest)).toBeLessThan(3);
    expect(closest.filter(d => d < 1.5).length).toBeGreaterThanOrEqual(N / 2);
  });
});

/** The deepest any two of these machines are in each other this tick (m), and how many are in a wall. */
function worstOf(state: SimState, world: World, units: Unit[]) {
  const q = units.map(u => unitPose(world, u, state.time));
  let other = 0, wall = 0;
  units.forEach((u, k) => {
    const [, y1, r] = BODY[u.kind], { x, z } = q[k];
    for (let l = k + 1; l < units.length; l++) other = Math.max(other, r + BODY[units[l].kind][2] - Math.hypot(q[l].x - x, q[l].z - z));
    if (overlaps(world.index, { x0: x - r, z0: z - r, x1: x + r, z1: z + r, y0: q[k].y + 0.3, y1: q[k].y + y1 })) wall++;
  });
  return { other, wall };
}

/** Breaks both a humanoid's knees: it stands where it is (M4-19). */
function lame(state: SimState, world: World, u: Unit) {
  for (let k = 0; k < 50 && !u.lame; k++) { hurtUnit(state, world, u, 'kneeL', 4); hurtUnit(state, world, u, 'kneeR', 4); }
  expect(u.dead).toBeFalsy();
  expect(u.stop).toBeDefined();
  // (Long since: it's lost him.)
  u.aware = 0; u.seen = undefined; u.state = 'unaware';
}

describe('machines on their beats give way, and he is stopped by a body (M10-45)', () => {
  it('four meeting at a crossing of narrow streets, a lame one in the way, never overlap or go in a wall', () => {
    // Two streets 3.6 m wide crossing, four blocks round them; a walker each way down each, all due at the crossing at
    // once; a lame humanoid in the north-south street.
    const blocks = [solid(-30, 0, 1.8, -1.8, 3, 30), solid(1.8, 0, 1.8, 30, 3, 30), solid(-30, 0, -30, -1.8, 3, -1.8), solid(1.8, 0, -30, 30, 3, -1.8)];
    const beat = (unit: 'humanoid' | 'quadruped', a: [number, number], b: [number, number]): Patrol => ({ kind: 'street', unit, pts: [{ x: a[0], y: 0, z: a[1] }, { x: b[0], y: 0, z: b[1] }], dwell: [1, 1], hours: [0, 24] });
    const beats = [beat('humanoid', [-15, 0], [15, 0]), beat('quadruped', [15, 0], [-15, 0]), beat('quadruped', [0, -15], [0, 15]), beat('humanoid', [0, 15], [0, -15]), beat('humanoid', [0, 8], [0, 8.5])];
    const { world, state } = setup([floor(0, 100), ...blocks], { x: -8, y: 0, z: 1.2, yaw: 0 }, { patrols: beats });
    state.time = 12 * 3600; state.flags.god = true; state.weather = { fog: 0, rain: 0 };
    const units = state.units.filter(u => !u.extra && !u.reserve && u.patrol >= 0);
    expect(units.length).toBe(5);
    // (Each at the start of its loop now: still for a second, then 15 m to the crossing at the same pace.)
    for (const u of units) { u.blind = true; u.phase = -((state.time / SCALE) % loopOf(world, u)); }
    lame(state, world, units[4]);
    const ends = beats.slice(0, 4).map(b => b.pts[1]), closest = [Infinity, Infinity, Infinity, Infinity];
    let other = 0, wall = 0;
    run(state, world, secs(25), {}, () => {
      const w = worstOf(state, world, units);
      other = Math.max(other, w.other); wall += w.wall;
      units.slice(0, 4).forEach((u, k) => { const q = unitPose(world, u, state.time); closest[k] = Math.min(closest[k], Math.hypot(q.x - ends[k].x, q.z - ends[k].z)); });
    });
    expect(units.map(u => u.trip?.kind ?? '-').join(), 'all kept to their beats').toBe('-,-,-,-,-');
    expect(other, 'deepest one machine into another (m)').toBeLessThan(0.05);
    expect(wall, 'ticks a machine was in a wall').toBe(0);
    // All got through to the far end of their beats.
    expect(Math.max(...closest)).toBeLessThan(1.5);
  });

  it('he walks at a lame machine and is stopped at its body', () => {
    const { world, state } = setup([floor(0, 100)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [{ kind: 'street', unit: 'humanoid', pts: [{ x: 0.1, y: 0, z: -4 }, { x: 0.1, y: 0, z: -4.5 }], dwell: [5, 5], hours: [0, 24] }] });
    state.time = 12 * 3600; state.flags.god = true;
    const u = state.units.find(v => v.patrol === 0 && !v.extra)!;
    u.blind = true; u.disarmed = true;
    lame(state, world, u);
    const at = unitPose(world, u, state.time), r = BODY[u.kind][2], hw = M.width / 2, p = state.player.pos;
    let deepest = -Infinity;
    run(state, world, secs(4), { my: 1 }, () => {
      const dx = Math.max(p.x - hw - at.x, 0, at.x - p.x - hw), dz = Math.max(p.z - hw - at.z, 0, at.z - p.z - hw);
      deepest = Math.max(deepest, r - Math.hypot(dx, dz));
    });
    expect(deepest, 'deepest he went into it (m)').toBeLessThan(0.01);
    // Up against it (slid a little round it, maybe, but no further on).
    expect(p.z).toBeGreaterThan(at.z);
    expect(Math.hypot(p.x - at.x, p.z - at.z)).toBeLessThan(r + hw * Math.SQRT2 + 0.1);
  });

  it('a crowd pressed through a gap in a wall after him never ends in a wall', () => {
    // A wall with a 2.4 m gap in it, him beyond it off to one side; sixteen sent after him from the near side jostle
    // through it, their ways a half-metre grid (so a pushed one's next point is often round the end of the wall).
    const wall = [solid(-12, 0, -4.2, -1.2, 3, -3.8), solid(1.2, 0, -4.2, 12, 3, -3.8)];
    const N = 16, beats: Patrol[] = Array.from({ length: N }, (_, k) => {
      const x = -9 + (k % 10) * 2, z = 4 + (k % 3) * 2 + (k >= 10 ? 5 : 0);
      return { kind: 'street', unit: k % 2 ? 'humanoid' : 'quadruped', pts: [{ x, y: 0, z }, { x: x + 0.5, y: 0, z }], dwell: [5, 5], hours: [0, 24] };
    });
    const { world, state } = setup([floor(0, 100), ...wall], { x: 3, y: 0, z: -6, yaw: 0 }, { patrols: beats });
    world.nav = ways(wall, 0.5, 30);
    state.time = 12 * 3600; state.flags.god = true; state.weather = { fog: 0, rain: 0 };
    const units = state.units.filter(u => !u.extra && !u.reserve && u.patrol >= 0);
    for (const u of units) { u.blind = true; leave(state, world, u, 'hunt', { ...state.player.pos }); }
    const p = state.player.pos, closest = units.map(() => Infinity);
    let other = 0, walled = 0;
    run(state, world, secs(14), {}, () => {
      const w = worstOf(state, world, units);
      other = Math.max(other, w.other); walled += w.wall;
      units.forEach((u, k) => { const q = unitPose(world, u, state.time); closest[k] = Math.min(closest[k], Math.hypot(q.x - p.x, q.z - p.z)); });
    });
    expect(walled, 'ticks a machine was in a wall').toBe(0);
    expect(other, 'deepest one machine into another (m)').toBeLessThan(0.05);
    // (And they did get through to him.)
    expect(closest.filter(d => d < 2.5).length).toBeGreaterThanOrEqual(N - 2);
  });
});
