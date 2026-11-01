// M4-66 (U-052): falls that feel like falls; the wind in his ears rises with his fall speed. (U-078: a drop, however big,
// no longer puts him down on the ground: he lands and goes on, hurt or not.)
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { windOf } from '../../src/sim/move';

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
  it('lands and goes on from any height he lives through (U-078)', () => {
    for (const h of [5, 8.5, 11]) expect(downFor(h), `${h} m`).toBe(0);
  });
  it('the wind rises with his fall speed', () => {
    expect(windOf(-3)).toBe(0);
    expect(windOf(-10)).toBeGreaterThan(0);
    expect(windOf(-18)).toBeGreaterThan(windOf(-10));
    expect(windOf(-40)).toBe(1);
  });
});
