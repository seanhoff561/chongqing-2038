// M5-09: camera taps. Without a tap the junction box says so; with one, eight seconds at it and the camera's tapped
// (the tap used up). Looped from the laptop, the camera that had him in its view sees nothing for 90 s, and nobody
// notices a silence; then it sees again. The network credentials at an exchange's terminal (M5-10): every camera's
// feed in the districts it serves, and none elsewhere.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs, aim } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { B } from '../../src/sim/types';
import { TAP } from '../../src/sim/camtap';
import type { Camera, Inter } from '../../src/world/world';
import { GEO } from '../../src/world/geo';
import { districtOf } from '../../src/sim/district';

describe('camera taps (M5-09)', () => {
  it('fits a tap in 8 s, and a looped camera is blind for 90 s without a silence', () => {
    const box = { x: 0.6, y: 1.4, z: -1.2, yaw: 0 };
    const cameras: Camera[] = [{ kind: 'camera', x: 0, y: 3, z: 7, yaw: Math.PI, box }];
    const inter: Inter[] = [{ id: 'jbox0', kind: 'jbox', x: box.x, y: box.y, z: box.z, r: 0.5, zh: '接线盒', en: 'Junction box', data: { cam: 0 } }];
    const { world: w, state: s } = setup([floor(0, 100)], { x: 0, y: 0, z: 0, yaw: 0 }, { cameras, inter });
    s.time = 12 * 3600; s.flags.god = true;
    const cam = s.units.find(u => u.cam === 0)!, msgs: string[] = [], hear = (st: typeof s) => { for (const e of st.events) { if (e.t === 'msg') msgs.push(e.text); if (e.t === 'blocked') msgs.push(e.why); } };
    run(s, w, 3); aim(s, box.x, box.y, box.z);
    // No tap: it says what it needs.
    run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT }, hear);
    expect(msgs.at(-1)).toMatch(/camera tap/);
    // With one: not yet at 7 s; at 8, tapped and the tap gone.
    addItem(s, s.inv.pack, 'cameratap', 1);
    run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
    run(s, w, secs(TAP.fit - 1), { buttons: B.INTERACT });
    expect(s.taps ?? []).toHaveLength(0);
    run(s, w, secs(1.2), { buttons: B.INTERACT });
    expect(s.taps).toEqual([0]);
    expect(s.inv.pack.items.some(i => i.id === 'cameratap')).toBe(false);
    // He turns to face it, in its view all along: looped, it doesn't see him, and no silence is noticed.
    cam.aware = 0; cam.state = 'unaware';
    run(s, w, 1, { cmds: [{ c: 'act', name: 'loop', arg: 0 }] });
    run(s, w, secs(TAP.loop - 5));
    expect(cam.aware ?? 0).toBe(0);
    expect(cam.state).toBe('unaware');
    expect(s.hive.silent).toHaveLength(0);
    // Its loop out: it sees him.
    run(s, w, secs(8));
    expect(cam.aware ?? 0).toBeGreaterThan(0);
  });
  it("opens every camera in the exchange's districts with the network credentials (M5-10)", () => {
    const J = GEO.landmarks.jiefangbei, cameras: Camera[] = [
      { kind: 'camera', x: J.x + 20, y: 3, z: J.z, yaw: 0 }, { kind: 'lamppost', x: J.x - 30, y: 6, z: J.z + 10, yaw: 0 }, { kind: 'sweeper', x: J.x, y: 6, z: J.z - 40, yaw: 0 },
      { kind: 'turret', x: J.x, y: 7, z: J.z + 5, yaw: 0 }, { kind: 'camera', x: 5, y: 3, z: 5, yaw: 0 }];
    const inter: Inter[] = [{ id: 'term', kind: 'exchange', x: 0, y: 1.2, z: -1.2, r: 0.5, zh: '终端', en: 'Terminal', data: { serves: ['jiefangbei'] } }];
    const { world: w, state: s } = setup([floor(0, 100)], { x: 0, y: 0, z: 0, yaw: 0 }, { cameras, inter });
    expect(districtOf(5, 5)).not.toBe('jiefangbei');
    run(s, w, 3); aim(s, 0, 1.2, -1.2);
    run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
    run(s, w, secs(TAP.admin + 0.5), { buttons: B.INTERACT });
    expect(s.taps ?? []).toHaveLength(0);
    addItem(s, s.inv.pack, 'netcreds', 1);
    run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
    run(s, w, secs(TAP.admin + 0.5), { buttons: B.INTERACT });
    expect([...s.taps!].sort()).toEqual([0, 1, 2]);
  });
});
