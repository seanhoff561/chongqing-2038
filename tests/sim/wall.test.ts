import { describe, it, expect } from 'vitest';
import { setup, run, secs, sprintJumpAt } from './helpers';
import { solid } from '../../src/world/geom';
import { B } from '../../src/sim/types';

/** Sprint, jump at the edge, then Space again in the air looking along the wall (U-004). */
function wallRunGap(gap: number) {
  const r = setup([
    solid(-5, -1, 0, 5, 0, 40), solid(-5, -1, -40, 5, 0, -gap), solid(-20, -12, -60, 20, -10, 60),
    solid(-1.2, -10, -40, -1.0, 4, 40), // wall along the left side
  ], { x: -0.5, y: 0, z: 30, yaw: 0 });
  sprintJumpAt(r.state, r.world, 0.05);
  run(r.state, r.world, 6, { my: 1, buttons: B.SPRINT });
  run(r.state, r.world, 1, { my: 1, buttons: B.SPRINT | B.JUMP, pressed: B.JUMP });
  return r;
}

describe('wall-run', () => {
  it('crosses a 6 m gap along a wall that a plain jump cannot', () => {
    const { world, state } = wallRunGap(6);
    let ran = 0;
    run(state, world, secs(2), { my: 1, buttons: B.SPRINT }, s => { if (s.player.mode === 'wallrun') ran++; });
    expect(ran / 60).toBeGreaterThan(0.6);
    expect(ran / 60).toBeLessThanOrEqual(0.92);
    expect(state.player.pos.y).toBeCloseTo(0, 2);
    expect(state.player.pos.z).toBeLessThan(-6);
  });
  it('a plain jump falls into the 6 m gap', () => {
    const r = setup([solid(-5, -1, 0, 5, 0, 40), solid(-5, -1, -40, 5, 0, -6), solid(-20, -12, -60, 20, -10, 60)], { x: 0, y: 0, z: 30, yaw: 0 });
    sprintJumpAt(r.state, r.world, 0.05);
    run(r.state, r.world, secs(2), { my: 1, buttons: B.SPRINT });
    expect(r.state.player.pos.y).toBeLessThan(-0.5);
  });
  it('jumping during a wall-run leaps away from the wall', () => {
    const { world, state } = wallRunGap(6);
    run(state, world, 10, { my: 1, buttons: B.SPRINT });
    expect(state.player.mode).toBe('wallrun');
    run(state, world, 1, { my: 1, pressed: B.JUMP, yaw: -Math.PI / 4 }); // looking away from the wall, 45 degrees right
    expect(state.player.mode).toBe('air');
    expect(state.player.vel.x).toBeGreaterThan(3);
    expect(state.player.vel.z).toBeLessThan(-3);
  });
  it('Space on the ground beside a wall is only a jump', () => {
    const r = setup([solid(-5, -1, -40, 5, 0, 40), solid(-1.2, -1, -40, -1.0, 4, 40)], { x: -0.5, y: 0, z: 30, yaw: 0 });
    run(r.state, r.world, secs(1.5), { my: 1, buttons: B.SPRINT });
    let wallrun = false;
    run(r.state, r.world, 1, { my: 1, buttons: B.SPRINT, pressed: B.JUMP });
    run(r.state, r.world, secs(1), { my: 1, buttons: B.SPRINT }, s => { if (s.player.mode === 'wallrun') wallrun = true; });
    expect(wallrun).toBe(false);
  });
});


describe('wall-runs that start when meant (M4-75, U-055)', () => {
  /** Sprinting along a long wall on his left 0.9 m off, he turns `deg` toward it, jumps, and Space again 8 ticks later,
   *  looking where he runs. */
  function runAt(deg: number) {
    const yaw = (deg * Math.PI) / 180;
    const r = setup([solid(-30, -1, -60, 30, 0, 60), solid(-1.2, 0, -60, -1.0, 6, 60)], { x: -0.1, y: 0, z: 40, yaw: 0 });
    run(r.state, r.world, 3);
    run(r.state, r.world, secs(1.5), { my: 1, yaw: 0, buttons: B.SPRINT });
    run(r.state, r.world, 1, { my: 1, yaw, buttons: B.SPRINT | B.JUMP, pressed: B.JUMP });
    run(r.state, r.world, 8, { my: 1, yaw, buttons: B.SPRINT });
    run(r.state, r.world, 1, { my: 1, yaw, buttons: B.SPRINT | B.JUMP, pressed: B.JUMP });
    return r.state.player.mode;
  }
  it('runs along the wall from any approach up to 35 degrees to it, looking where he runs', () => {
    for (const deg of [5, 15, 25, 35]) expect(runAt(deg), `${deg} degrees`).toBe('wallrun');
  });
});
