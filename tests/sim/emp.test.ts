// M5-14: the EMP. Set off, 6 m round him: a drone falls, a quadruped 4 m off stops 30 s, a humanoid within 2 m is
// shut down for good, a camera's out 60 s, a turret 45 s; a quadruped 10 m off is untouched; one charge gone of three.
// Rigged crouched, it lies there till a machine comes within 2 m, sets it off, and is left lying there.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { isOff } from '../../src/sim/units';
import { EMP } from '../../src/sim/emp';
import type { Patrol, Camera } from '../../src/world/world';

const still = (unit: Patrol['unit'], x: number, z: number, kind: Patrol['kind'] = 'street'): Patrol => ({ kind, unit, pts: [{ x, y: 0, z }, { x, y: 0, z: z + 0.01 }], dwell: [600, 600], hours: [0, 24] });

describe('the EMP device (M5-14)', () => {
  it('downs drones, stops robots and puts out cameras and turrets within 6 m', () => {
    const cameras: Camera[] = [{ kind: 'camera', x: 0, y: 3, z: 4, yaw: 0 }, { kind: 'turret', x: 4, y: 3, z: 0, yaw: 0 }];
    const { world: w, state: s } = setup([floor(0, 100)], { x: 0, y: 0, z: 0, yaw: 0 }, { cameras, patrols: [still('quadruped', -4, 0), still('quadruped', -10, 0), still('humanoid', 1.5, 0), still('drone', 0, -3, 'drone')] });
    s.time = 12 * 3600; s.flags.god = true;
    const [dog, far, man] = s.units.filter(u => u.patrol >= 0 && u.kind !== 'drone'), drone = s.units.find(u => u.kind === 'drone')!;
    const cam = s.units.find(u => u.kind === 'camera')!, turret = s.units.find(u => u.kind === 'turret')!;
    for (const u of [dog, far, man]) u.stop = { x: u === dog ? -4 : u === far ? -10 : 1.5, y: 0, z: u === man ? 0 : 0.005, yaw: 0, t: 0 };
    drone.stop = { x: 0, y: 3, z: -3, yaw: 0, t: 0 };
    addItem(s, s.inv.pack, 'emp', 1);
    const st = s.inv.pack.items.find(i => i.id === 'emp')!;
    run(s, w, 2);
    run(s, w, 1, { cmds: [{ c: 'use', uid: st.uid }] });
    expect(st.charge).toBe(EMP.charges - 1);
    expect(drone.crash).toBeDefined();
    expect(man.shut).toBe(true);
    expect(isOff(s, dog) && isOff(s, cam) && isOff(s, turret)).toBe(true);
    expect(isOff(s, far)).toBe(false);
    run(s, w, secs(EMP.robot + 1));
    expect(isOff(s, dog)).toBe(false);
    expect(isOff(s, turret) && isOff(s, cam)).toBe(true);
    run(s, w, secs(EMP.turret - EMP.robot));
    expect(isOff(s, turret)).toBe(false);
    expect(isOff(s, cam)).toBe(true);
    run(s, w, secs(EMP.camera - EMP.turret));
    expect(isOff(s, cam)).toBe(false);
    expect(isOff(s, man)).toBe(true);
  });
  it('rigged as a trap, goes off when a machine comes within 2 m', () => {
    const beat: Patrol = { kind: 'street', unit: 'quadruped', pts: [{ x: -30, y: 0, z: 0 }, { x: 30, y: 0, z: 0 }], dwell: [0, 0], hours: [0, 24] };
    const { world: w, state: s } = setup([floor(0, 100)], { x: 0, y: 0, z: 20, yaw: 0 }, { patrols: [beat] });
    s.time = 12 * 3600; s.flags.god = true;
    const dog = s.units[0];
    addItem(s, s.inv.pack, 'emp', 1);
    const st = s.inv.pack.items.find(i => i.id === 'emp')!;
    run(s, w, 2);
    s.player.pos = { x: 0, y: 0, z: 0.5 }; s.player.posture = 'crouch';
    run(s, w, 1, { buttons: 4, cmds: [{ c: 'use', uid: st.uid }] }); // (crouched)
    expect(s.traps).toHaveLength(1);
    expect(s.inv.pack.items.some(i => i.id === 'emp')).toBe(false);
    s.player.pos = { x: 0, y: 0, z: 40 };
    run(s, w, secs(60), {}, () => { if (s.traps?.length === 0 && !isOff(s, dog)) throw new Error('went off and the dog is still on'); });
    expect(s.traps).toHaveLength(0);
    expect(s.dropped.find(d => d.stack.id === 'emp')?.stack.charge).toBe(EMP.charges - 1);
  });
});
