// M5-16: salvage. A downed drone's wreck, without a tool, can't be taken apart; with a knife, six seconds' work (not
// five) and it opens: rotors, radio and camera modules, a battery pack. A humanoid shut down where it stands, with a
// toolbox: its armour plate, power cell and rifle (DESIGN section 8).
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs, aim } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { B } from '../../src/sim/types';
import { SALVAGE } from '../../src/sim/scrap';
import type { Patrol } from '../../src/world/world';

describe('salvage (M5-16)', () => {
  it('takes a wreck apart with a tool, for its parts', () => {
    const beat = (unit: 'drone' | 'humanoid', x: number): Patrol => ({ kind: 'street', unit, pts: [{ x, y: 0, z: -40 }, { x, y: 0, z: -39.99 }], dwell: [600, 600], hours: [0, 24] });
    const { world: w, state: s } = setup([floor(0, 100)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [beat('drone', 0), beat('humanoid', 3)] });
    s.time = 12 * 3600; s.flags.god = true;
    const [drone, man] = s.units, msgs: string[] = [], hear = (st: typeof s) => { for (const e of st.events) { if (e.t === 'msg') msgs.push(e.text); if (e.t === 'blocked') msgs.push(e.why); } };
    drone.dead = true; drone.stop = { x: 0, y: 0, z: -1.2, yaw: 0, t: s.time };
    run(s, w, 3); aim(s, 0, 0.3, -1.2);
    const press = (n: number) => { run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT }, hear); run(s, w, n, { buttons: B.INTERACT }, hear); };
    press(5);
    expect(msgs.at(-1)).toMatch(/needs a tool/);
    addItem(s, s.inv.pack, 'knife', 1);
    press(secs(SALVAGE.secs.small - 1));
    expect(s.openContainer).toBeFalsy();
    run(s, w, secs(1.2), { buttons: B.INTERACT });
    expect(s.openContainer).toBe(`wreck:${drone.id}`);
    expect([...new Set(s.containers[s.openContainer!].items.map(i => i.id))].sort()).toEqual(['battpack', 'cammod', 'radiomod', 'rotor']);
    // A humanoid shut down, a toolbox: quicker than the knife would be.
    s.openContainer = null;
    man.shut = true; man.stop = { x: 1.5, y: 0, z: -1, yaw: 0, t: s.time };
    addItem(s, s.inv.pack, 'toolbox', 1);
    run(s, w, 2); aim(s, 1.5, 0.3, -1);
    press(secs(SALVAGE.secs.walker / SALVAGE.tools.toolbox[0] + 0.3));
    expect(s.openContainer).toBe(`wreck:${man.id}`);
    expect([...new Set(s.containers[s.openContainer!].items.map(i => i.id))].sort()).toEqual(['armour', 'mrifle', 'powercell', 'servo']);
  });
});
