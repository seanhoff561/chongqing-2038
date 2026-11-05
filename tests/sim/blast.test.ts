// M10-65 (U-107): a real blast throws him hard, metres, by how near: off his feet close in, only shoved further out,
// and not at all through a wall.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { blast } from '../../src/sim/strike';
import { solid } from '../../src/world/geom';
import { ROCKET } from '../../src/data/units';

/** A rocket's blast d m east of him at chest height, on open ground (or with a wall between): how fast he's thrown,
 *  how far he's carried in 1.5 s, and whether he went down. */
function throwAt(d: number, wall = false) {
  const { world, state } = setup(wall ? [floor(0, 100), solid(0.8, 0, -3, 1.1, 3, 3)] : [floor(0, 100)], { x: 0, y: 0, z: 0, yaw: 0 });
  state.flags.god = true;
  run(state, world, 30);
  blast(state, world, { x: d, y: 1, z: 0 }, ROCKET);
  const v = -state.player.vel.x;
  let down = false;
  run(state, world, secs(1.5), {}, s => { if (s.player.mode === 'down') down = true; });
  return { v, moved: -state.player.pos.x, down };
}

describe('blasts throw him (M10-65)', () => {
  it('the nearer, the harder and further; off his feet close, not far out', () => {
    const a = throwAt(1.5), b = throwAt(4), c = throwAt(8);
    expect(a.v).toBeGreaterThan(8.5);
    expect(a.v).toBeGreaterThan(b.v);
    expect(b.v).toBeGreaterThan(c.v);
    expect(c.v).toBeGreaterThan(0);
    expect(a.moved).toBeGreaterThan(3);
    expect(a.moved).toBeGreaterThan(b.moved);
    expect(b.moved).toBeGreaterThan(c.moved);
    expect(a.down).toBe(true);
    expect(c.down).toBe(false);
  });
  it('a wall between shelters him', () => {
    const r = throwAt(2, true);
    expect(Math.abs(r.v)).toBe(0);
    expect(r.moved).toBeLessThan(0.05);
    expect(r.down).toBe(false);
  });
});
