// M10-45 (U-104): no machine enters another's body or his, nor a wall. A dozen quadrupeds and humanoids sent after
// him across a yard with walls in it, 20 s: never in each other, in him or in a wall, and they still get to him.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { solid, overlaps } from '../../src/world/geom';
import { NAV, type Patrol } from '../../src/world/world';
import { leave } from '../../src/sim/alert';
import { unitPose } from '../../src/sim/units';
import { BODY } from '../../src/sim/damage';
import { movement as M } from '../../src/data/movement';

const WALLS = [solid(-6, 0, 6, -1.5, 3, 6.4), solid(1.5, 0, -6.4, 6, 3, -6), solid(6, 0, 1.5, 6.4, 3, 6), solid(-6.4, 0, -6, -6, 3, -1.5), solid(9, 0, -1, 11, 3, 1), solid(-2, 0, -12, 2, 3, -11)];
/** How far a point is from the nearest wall, across the ground. */
const clear = (x: number, z: number) => Math.min(...WALLS.map(b => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.z0 - z, 0, z - b.z1))));

describe('machines keep out of each other, of him and of the walls (M10-45)', () => {
  it('a dozen sent after him never overlap and still reach him', () => {
    const N = 12, beats: Patrol[] = Array.from({ length: N }, (_, k) => {
      const a = (k / N) * Math.PI * 2, R = 15 + (k % 3) * 2, x = Math.cos(a) * R, z = Math.sin(a) * R;
      return { kind: 'street', unit: k % 2 ? 'humanoid' : 'quadruped', pts: [{ x, y: 0, z }, { x: x + 0.5, y: 0, z }], dwell: [5, 5], hours: [0, 24] };
    });
    const { world, state } = setup([floor(0, 100), ...WALLS], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: beats });
    // Their ways about: a 2 m grid clear of the walls by a metre.
    const pts: { x: number; y: number; z: number }[] = [], adj: [number, number, number][][] = [], at = new Map<string, number>();
    for (let i = -12; i <= 12; i++) for (let j = -12; j <= 12; j++) if (clear(i * 2, j * 2) >= 1) { at.set(`${i},${j}`, pts.length); pts.push({ x: i * 2, y: 0, z: j * 2 }); adj.push([]); }
    for (const [key, n] of at) {
      const [i, j] = key.split(',').map(Number);
      for (const [di, dj] of [[1, 0], [0, 1], [1, 1], [1, -1], [-1, 0], [0, -1], [-1, -1], [-1, 1]]) {
        const m = at.get(`${i + di},${j + dj}`);
        if (m !== undefined && [0.25, 0.5, 0.75].every(f => clear((i + di * f) * 2, (j + dj * f) * 2) >= 0.6)) adj[n].push([m, Math.hypot(di, dj) * 2, NAV.street]);
      }
    }
    world.nav = { pts, adj };
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
