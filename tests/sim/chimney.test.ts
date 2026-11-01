// M3-78 (U-043), M4-74 (U-055), M4-81 (U-060): chimneying. Braced across a gap 0.6 to 1.25 m wide with X (its own
// key; Space in a gap just jumps), standing in it or in the air, his body as low as lying down, he works up a 6 m shaft 0.8 m across and back down it, up a 40-degree sloped
// slot, and lets go with Space; a 1.6 m gap has nothing to brace across.
import { describe, it, expect } from 'vitest';
import { solid } from '../../src/world/geom';
import { B } from '../../src/sim/types';
import { setup, floor, run, secs } from './helpers';

/** Standing in a gap between walls, X (U-055: it braces him from the ground; U-060: its own key). */
function braced(walls: ReturnType<typeof solid>[], x: number, z: number, yaw = 0) {
  const { state, world } = setup([floor(), ...walls], { x, y: 0, z, yaw });
  run(state, world, 3);
  run(state, world, 1, { pressed: B.CHIMNEY, buttons: B.CHIMNEY });
  return { state, world };
}
const shaft = (w: number) => [solid(-2, 0, -0.5 - w / 2, 2, 7, -w / 2), solid(-2, 0, w / 2, 2, 7, w / 2 + 0.5)];

describe('chimneying (M3-78)', () => {
  it('braces in a shaft 0.8 m across, works up it 6 m looking up, holds, and back down to its foot', () => {
    const { state, world } = braced(shaft(0.8), 0, 0);
    expect(state.player.mode).toBe('chimney');
    run(state, world, secs(7.5), { my: 1, pitch: 1.4 });
    expect(state.player.pos.y).toBeGreaterThan(5);
    const y = state.player.pos.y;
    run(state, world, secs(2), { pitch: 1.4 });
    expect(state.player.pos.y).toBeCloseTo(y, 3);
    expect(state.player.mode).toBe('chimney');
    run(state, world, secs(9), { my: -1, pitch: 1.4 });
    expect(state.player.pos.y).toBeLessThan(0.2);
    run(state, world, secs(0.5));
    expect(state.player.mode).toBe('ground');
    expect(state.dead).toBeNull();
  });
  it('lets go with Space and drops', () => {
    const { state, world } = braced(shaft(0.8), 0, 0);
    run(state, world, secs(4), { my: 1, pitch: 1.4 });
    const y = state.player.pos.y;
    run(state, world, 1, { pressed: B.JUMP, buttons: B.JUMP });
    expect(state.player.mode).toBe('air');
    run(state, world, secs(1.5));
    expect(state.player.pos.y).toBeLessThan(y - 1);
  });
  it('works up a 40-degree slot 0.9 m across, looking up it', () => {
    const walls = [solid(-1, 0, -0.95, 6, 6, -0.45), solid(-1, 0, 0.45, 6, 6, 0.95),
      { ...solid(0, 0, -0.45, 4, 3.36, 0.45), ramp: 1 as const, low: 0 },
      ...[0, 1, 2, 3].map(i => solid(i, 1.8 + (i + 1) * 0.84, -0.45, i + 1, 6, 0.45)), solid(4, 3.16, -0.45, 6, 3.36, 0.45)];
    const { state, world } = braced(walls, 0.3, 0, -Math.PI / 2);
    expect(state.player.mode).toBe('chimney');
    run(state, world, secs(8), { my: 1, pitch: 0.7, yaw: -Math.PI / 2 });
    expect(state.player.pos.x).toBeGreaterThan(3);
    expect(state.player.pos.y).toBeGreaterThan(2.5);
  });
  it('braces from the air too, dropping into the shaft; braced, his body is as low as lying down (U-055)', () => {
    const { state, world } = setup([floor(), ...shaft(0.8)], { x: 0, y: 4, z: 0, yaw: 0 });
    state.player.mode = 'air'; state.player.onGround = false;
    run(state, world, secs(0.2));
    run(state, world, 1, { pressed: B.CHIMNEY, buttons: B.CHIMNEY });
    expect(state.player.mode).toBe('chimney');
    expect(state.player.posture).toBe('crawl');
    expect(state.player.pos.y).toBeGreaterThan(2);
  });
  it('Space in a gap jumps, without bracing; X braced lets go too (U-060)', () => {
    const { state, world } = setup([floor(), ...shaft(0.8)], { x: 0, y: 0, z: 0, yaw: 0 });
    run(state, world, 3);
    let top = 0;
    run(state, world, 1, { pressed: B.JUMP, buttons: B.JUMP });
    run(state, world, secs(0.8), {}, s => { top = Math.max(top, s.player.pos.y); expect(s.player.mode).not.toBe('chimney'); });
    expect(top).toBeGreaterThan(0.2); // (A standing jump's 0.28 m, walls or none.)
    run(state, world, secs(1));
    const b = braced(shaft(0.8), 0, 0);
    expect(b.state.player.mode).toBe('chimney');
    run(b.state, b.world, 1, { pressed: B.CHIMNEY, buttons: B.CHIMNEY });
    expect(b.state.player.mode).toBe('air');
  });
  it('has nothing to brace across in a 1.6 m gap', () => {
    const { state } = braced(shaft(1.6), 0, 0);
    expect(state.player.mode).not.toBe('chimney');
  });
});
