// M5-08: the SDR dongle. Carried, with the laptop open after thirty seconds'
// listening the district's drone beats and when each drone is home on its dock (not before, nor with the laptop
// shut); used, the dongle picks the tag off.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { SDR, droneBeats } from '../../src/sim/sdr';
import { dockTimes, unitPose } from '../../src/sim/units';
import { DRONE, TAG } from '../../src/data/units';
import { SCALE } from '../../src/sim/clock';
import type { Patrol } from '../../src/world/world';

describe('the SDR dongle (M5-08)', () => {
  it('hears a tag, then the district drones and their dock times; and picks the tag off', () => {
    const beat: Patrol = { kind: 'drone', unit: 'drone', pts: [{ x: -60, y: 0, z: -60 }, { x: 60, y: 0, z: -60 }, { x: 60, y: 0, z: 60 }], dwell: [0, 0, 0], hours: [0, 24], dock: 0 };
    const { world: w, state: s } = setup([floor(0, 200)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [beat], docks: [{ x: 30, y: 0, z: 30 }] });
    s.time = 12 * 3600; s.flags.god = true; s.player.tag = true;
    addItem(s, s.inv.pack, 'sdr', 1);
    const msgs: string[] = [], hear = (st: typeof s) => { for (const e of st.events) { if (e.t === 'msg') msgs.push(e.text); else if (e.t === 'blocked') msgs.push(e.why); else if (e.t === 'say') msgs.push(e.id); } };
    // The laptop shut: nothing.
    run(s, w, secs(SDR.listen + 1), {}, hear);
    expect(s.sdr?.heard.yuzhong).toBeUndefined();
    // Open: the drones not before thirty seconds, then.
    run(s, w, 1, { cmds: [{ c: 'act', name: 'laptop' }] }, hear);
    run(s, w, secs(1), {}, hear);
    run(s, w, secs(SDR.listen - 2), {}, hear);
    expect(s.sdr?.heard.yuzhong).toBeUndefined();
    run(s, w, secs(1.5), {}, hear);
    expect(s.sdr!.heard.yuzhong).toBe(true);
    expect(droneBeats(w, 'yuzhong')).toEqual([0]);
    // Its dock times are where the drone is: on its dock between them, out on its beat before.
    const u = s.units.find(x => x.kind === 'drone')!, d = dockTimes(w, u, s.time)!;
    expect(d.out - d.back).toBe(DRONE.charge * SCALE);
    expect(unitPose(w, u, (d.back + d.out) / 2).docked).toBe(true);
    expect(unitPose(w, u, d.out + 60 * SCALE).docked).toBeFalsy();
    if (d.back > s.time) expect(unitPose(w, u, d.back - 60 * SCALE).docked).toBeFalsy();
    // Used: the tag picked off.
    run(s, w, 1, { cmds: [{ c: 'act', name: 'laptop' }, { c: 'use', uid: s.inv.pack.items.find(i => i.id === 'sdr')!.uid }] });
    run(s, w, secs(TAG.remove + 0.2));
    expect(s.player.tag).toBe(false);
  });
});
