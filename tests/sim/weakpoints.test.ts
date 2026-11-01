// M5-12: robot weak points. Scanning a working machine tells what it is, not its weak points; scanning one shut down,
// or a wreck at his feet, gives Anna that kind's (her diagram: each part, what it takes of a hit, what breaks it).
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import type { Patrol } from '../../src/world/world';

describe('robot weak points (M5-12)', () => {
  it('come from scanning a disabled machine, a shut-down one or a wreck', () => {
    const beat = (unit: 'quadruped' | 'humanoid', z: number): Patrol => ({ kind: 'street', unit, pts: [{ x: 0, y: 0, z }, { x: 0, y: 0, z: z + 0.01 }], dwell: [600, 600], hours: [0, 24] });
    const { world: w, state: s } = setup([floor(0, 100)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [beat('quadruped', -8), beat('humanoid', 30)] });
    s.time = 12 * 3600; s.flags.god = true;
    const [dog, man] = s.units;
    dog.stop = { x: 0, y: 0, z: -8, yaw: 0, t: 0 };
    const look = { pitch: Math.atan2(0.6 - 1.62, 8) };
    run(s, w, 1, { ...look, cmds: [{ c: 'act', name: 'laptop' }] });
    // Working: what it is, but not its weak points.
    run(s, w, secs(2.3), look);
    expect(s.lastScan).toBe('unit:quadruped');
    expect(s.weak?.quadruped).toBeUndefined();
    // Shut down (its battery shot out): looked at again, its weak points.
    dog.shut = true;
    run(s, w, secs(0.2), { pitch: 1.2 });
    run(s, w, secs(2.3), look);
    expect(s.weak?.quadruped).toBe(true);
    // A humanoid's wreck at his feet: a humanoid's.
    man.dead = true; man.stop = { x: 0, y: 0, z: -1.2, yaw: 0, t: s.time };
    run(s, w, secs(2.5), { pitch: Math.atan2(0.3 - 1.62, 1.2) });
    expect(s.weak?.humanoid).toBe(true);
  });
});
