// M5-26: the wearables (U-053: the climbing gloves are a chalk bag). Chalked hands spend half on a pipe; at night the
// headlamp lights him up for a machine to see, white more than red, off not at all; worn, the mylar blanket hides his
// heat (thermal.test.ts covers the blanket's tenth under thermal sight).
import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, aim, LMB, RMB } from './helpers';
import { solid } from '../../src/world/geom';
import { addItem } from '../../src/sim/inventory';
import { visibility } from '../../src/sim/perception';
import { unitPose } from '../../src/sim/units';
import type { Patrol } from '../../src/world/world';

describe('wearables (M5-26)', () => {
  it('chalk halves what a pipe costs his hands', () => {
    const spent = (chalk: boolean) => {
      const { world: w, state: s } = setup([floor(), solid(-5, 0, -30, 5, 12, -3)], { x: 0, y: 0, z: -2.3, yaw: 0 }, { climbables: [{ kind: 'pipe', x: 0, z: -2.95, y0: 0, y1: 12, nx: 0, nz: 1 }] });
      if (chalk) addItem(s, s.inv.pack, 'chalk', 1);
      run(s, w, 3);
      aim(s, 0, 2.2, -2.87);
      run(s, w, 2, { buttons: LMB | RMB });
      aim(s, 0, 2.2, -2.87);
      run(s, w, secs(1), { buttons: LMB | RMB });
      const e0 = s.player.endurance;
      run(s, w, secs(3), { buttons: LMB | RMB });
      return e0 - s.player.endurance;
    };
    const bare = spent(false), chalked = spent(true);
    expect(bare).toBeGreaterThan(0);
    expect(chalked / bare).toBeCloseTo(0.5, 1);
  });
  it('the headlamp lights him at night, white more than red', () => {
    const beat: Patrol = { kind: 'street', unit: 'humanoid', pts: [{ x: 0, y: 0, z: -12 }, { x: 0, y: 0, z: -11.99 }], dwell: [600, 600], hours: [0, 24] };
    const { world: w, state: s } = setup([floor(0, 100)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [beat] });
    s.time = 23 * 3600; s.flags.god = true;
    const man = s.units[0]; man.stop = { x: 0, y: 0, z: -12, yaw: 0, t: 0 };
    run(s, w, 2);
    const seen = (lamp: 0 | 1 | 2) => { s.player.lamp = lamp; return visibility(s, w, 'humanoid', unitPose(w, man, s.time)); };
    const off = seen(0), red = seen(2), white = seen(1);
    expect(white).toBeGreaterThan(red);
    expect(red).toBeGreaterThan(off);
  });
});
