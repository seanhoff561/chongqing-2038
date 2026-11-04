// M10-47: a machine on the ground destroyed is a wreck where it fell: walking its beat when it's killed, it lies right
// there (not a step on), stays there, and its wreck is there to search. (Its ragdoll is drawn only: tests/render.)
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { unitPose } from '../../src/sim/units';
import { hurtUnit } from '../../src/sim/damage';
import { allInters } from '../../src/sim/interact';
import type { Patrol } from '../../src/world/world';

const beat = (unit: 'humanoid' | 'quadruped'): Patrol => ({ kind: 'street', unit, pts: [{ x: 20, y: 0, z: 0 }, { x: 60, y: 0, z: 0 }], dwell: [1, 1], hours: [0, 24] });

describe('a machine destroyed is a wreck where it fell (M10-47)', () => {
  for (const kind of ['humanoid', 'quadruped'] as const) it(`a ${kind} shot dead mid-stride lies where it fell`, () => {
    const { world, state } = setup([floor(0, 300)], { x: 0, y: 0, z: -150, yaw: 0 }, { patrols: [beat(kind)] });
    state.time = 12 * 3600; state.flags.clear = true; state.flags.god = true;
    const u = state.units[0];
    run(state, world, secs(5));
    const a = unitPose(world, u, state.time);
    run(state, world, 1);
    const b = unitPose(world, u, state.time);
    // (Walking when it's hit.)
    expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeGreaterThan(0.01);
    hurtUnit(state, world, u, 'body', 1e6);
    expect(u.dead).toBe(true);
    run(state, world, secs(30));
    const c = unitPose(world, u, state.time);
    expect([c.x, c.y, c.z, c.yaw]).toEqual([b.x, b.y, b.z, b.yaw]);
    expect(c.active).toBe(false);
    const wreck = allInters(state, world).find(i => i.id === `wreck:${u.id}`)!;
    expect(Math.hypot(wreck.x - b.x, wreck.z - b.z)).toBeLessThan(0.01);
  });
});
