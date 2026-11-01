// M5-11: the hacked drone. Launched from the laptop with the controller, it flies where he steers it while he stands
// still, on its battery (eight minutes full; run flat, it's lost), and what it flies over fills in on Anna's map. A
// machine that sees it is suspicious; an armed one that keeps it in sight three seconds shoots it down.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { FLIGHT } from '../../src/sim/flight';
import { cellKey } from '../../src/sim/automap';
import type { Patrol } from '../../src/world/world';

const launch = { cmds: [{ c: 'act' as const, name: 'launch' }] }, land = { cmds: [{ c: 'act' as const, name: 'land' }] };

describe('the hacked drone (M5-11)', () => {
  it('flies on its battery while he stands still, and fills in the map', () => {
    const { world: w, state: s } = setup([floor(0, 200)], { x: 0, y: 0, z: 0, yaw: 0 });
    s.time = 12 * 3600; s.flags.god = true;
    addItem(s, s.inv.pack, 'drone', 1);
    run(s, w, 3, launch);
    expect(s.flight).toBeUndefined(); // (no controller)
    addItem(s, s.inv.pack, 'dronectl', 1);
    run(s, w, 1, launch);
    expect(s.flight).toBeDefined();
    const me = { ...s.player.pos };
    run(s, w, secs(5), { my: 1, yaw: 0 });
    expect(s.flight!.z).toBeCloseTo(-FLIGHT.speed * 5, 0);
    expect(Math.hypot(s.player.pos.x - me.x, s.player.pos.z - me.z)).toBeLessThan(0.01);
    const d = s.inv.pack.items.find(i => i.id === 'drone')!;
    expect(d.charge).toBeCloseTo(100 - (100 * 5) / FLIGHT.battery, 0);
    expect(s.explored![cellKey(0, -30, 1)]).toBe(1);
    expect(s.explored![cellKey(30, -40, 1)]).toBe(1);
    run(s, w, 1, land);
    expect(s.flight).toBeUndefined();
    // Nearly flat: a second's flight and it comes down, lost.
    d.charge = 0.1;
    run(s, w, 1, launch);
    run(s, w, secs(1));
    expect(s.flight).toBeUndefined();
    expect(s.inv.pack.items.some(i => i.id === 'drone')).toBe(false);
  });
  it('is seen by the machines, and shot down by an armed one', () => {
    const beat: Patrol = { kind: 'street', unit: 'humanoid', pts: [{ x: 0, y: 0, z: -30 }, { x: 0, y: 0, z: -29.99 }], dwell: [600, 600], hours: [0, 24] };
    const { world: w, state: s } = setup([floor(0, 200)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [beat] });
    s.time = 12 * 3600; s.flags.god = true; s.player.posture = 'crawl';
    const man = s.units[0];
    man.stop = { x: 0, y: 0, z: -30, yaw: 0, t: 0 };
    addItem(s, s.inv.pack, 'drone', 1); addItem(s, s.inv.pack, 'dronectl', 1);
    run(s, w, 1, launch);
    run(s, w, secs(0.5), { buttons: 1 }); // (up a little, in its view)
    expect(man.aware ?? 0).toBeGreaterThanOrEqual(0.5);
    expect(s.inv.pack.items.some(i => i.id === 'drone')).toBe(true);
    run(s, w, secs(FLIGHT.shot + 0.5));
    expect(s.flight).toBeUndefined();
    expect(s.inv.pack.items.some(i => i.id === 'drone')).toBe(false);
  });
});
