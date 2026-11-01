// M5-13: the signal jammer. On, within 25 m: a camera and a drone are cut off (out, dark, the drone hovering where it
// was); an engaged humanoid's word not yet sent is lost (the network notices a silence) and it can't tell the network
// while it's cut off; a drone 150 m off flies on. After 20 s running it's a beacon: the nearest working drone is sent
// to look where he is.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { isOff, unitPose } from '../../src/sim/units';
import { JAM } from '../../src/sim/jammer';
import { SCALE } from '../../src/sim/clock';
import type { Patrol, Camera } from '../../src/world/world';

describe('the signal jammer (M5-13)', () => {
  it("cuts the machines' link within 25 m, and becomes a beacon after 20 s", () => {
    const fly = (x: number, z: number): Patrol => ({ kind: 'drone', unit: 'drone', pts: [{ x, y: 0, z }, { x: x + 20, y: 0, z }], dwell: [0, 0], hours: [0, 24] });
    const walk: Patrol = { kind: 'street', unit: 'humanoid', pts: [{ x: 0, y: 0, z: -15 }, { x: 0, y: 0, z: -14.99 }], dwell: [600, 600], hours: [0, 24] };
    const cameras: Camera[] = [{ kind: 'camera', x: 0, y: 3, z: 10, yaw: Math.PI }];
    const { world: w, state: s } = setup([floor(0, 250)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [fly(-10, 0), fly(150, 0), walk], cameras });
    s.time = 12 * 3600; s.flags.god = true;
    const [near, far] = s.units.filter(u => u.kind === 'drone'), man = s.units.find(u => u.kind === 'humanoid')!, cam = s.units.find(u => u.kind === 'camera')!;
    near.stop = { ...unitPose(w, near, s.time), t: s.time };
    man.stop = { x: 0, y: 0, z: -15, yaw: 0, t: s.time };
    addItem(s, s.inv.pack, 'jammer', 1);
    const uid = s.inv.pack.items.find(i => i.id === 'jammer')!.uid;
    run(s, w, 2);
    // The humanoid has him, its word on its way.
    Object.assign(man, { state: 'engaged', aware: 1, saw: s.time, seen: { ...s.player.pos }, cast: s.time + 2 * SCALE });
    run(s, w, 1, { cmds: [{ c: 'use', uid }] });
    run(s, w, secs(0.5));
    expect(isOff(s, cam)).toBe(true);
    expect(isOff(s, near)).toBe(true);
    expect(isOff(s, far)).toBe(false);
    expect(s.hive.silent.length).toBeGreaterThan(0);
    // Hovering where it was cut off.
    const at = unitPose(w, near, s.time);
    run(s, w, secs(5));
    expect(Math.hypot(unitPose(w, near, s.time).x - at.x, unitPose(w, near, s.time).z - at.z)).toBeLessThan(0.01);
    // The humanoid still has him in sight, but the network never hears.
    expect(s.hive.districts.yuzhong?.contact ?? -1).toBe(-1);
    expect(far.trip).toBeUndefined();
    // Twenty seconds on: a beacon; the drone 150 m off is sent to look.
    run(s, w, secs(JAM.beacon - 5));
    expect(far.trip?.kind).toBe('look');
    // Off: the link back.
    run(s, w, 1, { cmds: [{ c: 'use', uid }] });
    run(s, w, secs(1));
    expect(isOff(s, cam)).toBe(false);
  });
});
