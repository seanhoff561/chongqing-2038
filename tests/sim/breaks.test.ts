// M4-62 (U-052): machines come apart where they're hit. A humanoid whose rifle is shot out of its hands stops firing;
// a drone hit in a rotor drops out of the air, crashes and blows up, hurting him if he's near.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { hurtUnit } from '../../src/sim/damage';
import { unitPose } from '../../src/sim/units';
import type { Patrol } from '../../src/world/world';

const stand = (unit: Patrol['unit'], z: number, y = 0): Patrol => ({ kind: unit === 'drone' ? 'drone' : 'street', unit, pts: [{ x: 0, y, z }, { x: 0, y, z: z + 0.01 }], dwell: [600, 600], hours: [0, 24] });

describe('machines that break apart (M4-62)', () => {
  it("a humanoid's rifle shot out of its hands: it stops firing", () => {
    const { world, state } = setup([floor(0, 200)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [stand('humanoid', -15)] });
    state.time = 12 * 3600; state.flags.god = true; state.flags.clear = true;
    const u = state.units[0];
    u.aware = 1.2; u.seen = { ...state.player.pos };
    let shots = 0;
    run(state, world, secs(6), {}, s => { shots += s.events.filter(e => e.t === 'shot').length; });
    expect(shots).toBeGreaterThan(0);
    hurtUnit(state, world, u, 'rifle', 25); hurtUnit(state, world, u, 'rifle', 25);
    expect(u.disarmed).toBe(true);
    shots = 0;
    run(state, world, secs(6), {}, s => { shots += s.events.filter(e => e.t === 'shot').length; });
    expect(shots).toBe(0);
  });
  it('a drone hit in a rotor drops, crashes and blows up; near, it hurts him', () => {
    const { world, state } = setup([floor(0, 200)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [stand('drone', -2, 9)] });
    state.time = 12 * 3600; state.flags.clear = true;
    const u = state.units[0];
    hurtUnit(state, world, u, 'rotors', 25);
    expect(u.crash).toBeTruthy();
    let boom = 0, hurt = 0;
    run(state, world, secs(3), {}, s => { for (const e of s.events) { if (e.t === 'noise' && e.kind === 'explosion') boom++; if (e.t === 'hurt' && e.cause === 'blast') hurt++; } });
    expect(u.dead).toBe(true);
    expect(unitPose(world, u, state.time).y).toBeCloseTo(0, 0);
    expect(boom).toBe(1);
    expect(hurt).toBe(1);
  });
});
