// M4-66 (U-052): falls that feel like falls. From 5 m he lands and goes on (the old roll's sound); from 8.5 m his knees
// buckle a moment; past 10 m he's down on the ground a while; the wind in his ears rises with his fall speed.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { windOf, FALL_FEEL } from '../../src/sim/move';

/** Seconds he's down after a drop of h metres onto a floor. */
function downFor(h: number) {
  const { world, state } = setup([floor(0, 100)], { x: 0, y: h, z: 0, yaw: 0 });
  state.flags.god = true;
  state.player.mode = 'air'; state.player.onGround = false; state.player.fallFrom = h;
  let down = 0;
  run(state, world, secs(6), {}, s => { if (s.player.mode === 'down') down += 1 / 60; });
  return down;
}

describe('falls that feel like falls (M4-66)', () => {
  it('lands and goes on, stumbles, or lies down, by the height', () => {
    expect(downFor(5)).toBe(0);
    expect(downFor(8.5)).toBeCloseTo(FALL_FEEL.stumble, 1);
    expect(downFor(11)).toBeCloseTo(FALL_FEEL.down, 1);
  });
  it('the wind rises with his fall speed', () => {
    expect(windOf(-3)).toBe(0);
    expect(windOf(-10)).toBeGreaterThan(0);
    expect(windOf(-18)).toBeGreaterThan(windOf(-10));
    expect(windOf(-40)).toBe(1);
  });
});
