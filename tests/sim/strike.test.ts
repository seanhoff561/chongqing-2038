// M4-47 (U-050): strike drones. Kept in a camera's view, he's had too long: from the dock a kamikaze comes after 25 s
// and blows up at him; one shot down on its way doesn't.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { hurtUnit } from '../../src/sim/damage';
import { STRIKE } from '../../src/data/units';

function watched() {
  const { world, state } = setup([floor(0, 1000)], { x: 0, y: 0, z: 12, yaw: 0 }, { cameras: [{ kind: 'camera', x: 0, y: 4, z: 0, yaw: 0 }], docks: [{ x: 150, y: 20, z: 0 }] });
  state.time = 12 * 3600; state.flags.clear = true; state.flags.god = true; state.weather = { fog: 0, rain: 0 };
  return { world, state, fpv: () => state.units.find(u => u.kind === 'fpv' && u.trip && !u.dead) };
}

describe('strike drones (M4-47)', () => {
  it('seen too long: a kamikaze comes from the dock and blows up at him', () => {
    const t = watched();
    let launched = -1, blasts = 0;
    run(t.state, t.world, secs(60), {}, (s, i) => { if (launched < 0 && t.fpv()) launched = i / 60; for (const e of s.events) if (e.t === 'hurt' && e.cause === 'blast') blasts++; });
    expect(launched).toBeGreaterThan(STRIKE.after - 1);
    expect(launched).toBeLessThan(STRIKE.after + 8);
    expect(blasts).toBeGreaterThanOrEqual(1);
  });
  it('one shot down on its way blows up nowhere near him', () => {
    const t = watched();
    let blasts = 0;
    for (let i = 0; i < secs(40) && !t.fpv(); i++) run(t.state, t.world, 1);
    const u = t.fpv()!;
    hurtUnit(t.state, t.world, u, 'body', 25);
    expect(u.dead).toBe(true);
    run(t.state, t.world, secs(10), {}, s => { for (const e of s.events) if (e.t === 'hurt' && e.cause === 'blast') blasts++; });
    expect(blasts).toBe(0);
  });
});
