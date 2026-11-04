// M5-25: bolt cutters. A chained door (its padlock with it): cut through in a second and a half, quietly; a grate
// bolted from below: its bolt cut from above and it lifts. Without them, neither.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs, aim } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { B } from '../../src/sim/types';
import { LOCKS } from '../../src/sim/locks';
import { GRATE } from '../../src/sim/grate';
import { solid } from '../../src/world/geom';
import type { Inter, Camera } from '../../src/world/world';
import { TAP } from '../../src/sim/camtap';
import { FENCE } from '../../src/sim/fence';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';

describe('bolt cutters (M5-25)', () => {
  it('cut chains and padlocks quietly, and a grate bolted from below', () => {
    const inter: Inter[] = [
      { id: 'd1', kind: 'door', x: 0, y: 1, z: -1.2, r: 0.7, zh: '门', en: 'Door', data: { solid: 1, lock: 'chained' } },
      { id: 'g1', kind: 'grate', x: 4, y: 0, z: -1.6, r: 0.8, zh: '格栅', en: 'Grate', data: { solid: 2, half: 0.5 } },
    ];
    const { world: w, state: s } = setup([solid(-50, -1, -50, 3.4, 0, 50), solid(4.6, -1, -50, 50, 0, 50), solid(3.4, -1, -50, 4.6, 0, -2.1), solid(3.4, -1, -1.1, 4.6, 0, 50), solid(-0.8, 0, -1.25, 0.8, 2.2, -1.15), solid(3.5, -0.05, -2.1, 4.5, 0, -1.1), floor(-6, 60)], { x: 0, y: 0, z: 0, yaw: 0 }, { inter });
    run(s, w, 3);
    const msgs: string[] = [];
    let loud = 0;
    const hear = (st: typeof s) => { for (const e of st.events) { if (e.t === 'msg') msgs.push(e.text); if (e.t === 'blocked') msgs.push(e.why); if (e.t === 'noise') loud = Math.max(loud, e.r); } };
    const at = (x: number, y: number, z: number) => { s.player.pos.x = x; run(s, w, 2); aim(s, x === 0 ? 0 : 4, y, z); };
    const work = (n: number) => { loud = 0; run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT }, hear); run(s, w, n, { buttons: B.INTERACT }, hear); };
    at(0, 1, -1.2); work(secs(3)); expect(s.wstate.open.d1).toBeFalsy(); expect(msgs.at(-1)).toBe('chained shut');
    at(4, 0, -1.6); work(secs(4)); expect(s.wstate.open.g1).toBeFalsy(); expect(msgs.at(-1)).toMatch(/bolted/);
    addItem(s, s.inv.pack, 'boltcutters', 1);
    at(0, 1, -1.2); work(secs(LOCKS.cut + 0.3));
    expect(s.wstate.open.d1).toBe(true); expect(loud).toBeLessThanOrEqual(4);
    at(4, 0, -1.6); work(secs(GRATE.cut + 0.3));
    expect(s.wstate.open.g1).toBe(true);
  });
  it("cut a camera's power cable at its junction box, shocking him without insulated gloves (M5-25b)", () => {
    const cameras: Camera[] = [{ kind: 'camera', x: 0, y: 3, z: -1.3, yaw: 0, box: { x: 0, y: 1.3, z: -1.2, yaw: 0 } }, { kind: 'camera', x: 4, y: 3, z: -1.3, yaw: 0, box: { x: 4, y: 1.3, z: -1.2, yaw: 0 } }];
    const inter: Inter[] = cameras.map((c, i) => ({ id: `jbox${i}`, kind: 'jbox', x: c.box!.x, y: c.box!.y, z: c.box!.z, r: 0.5, zh: '接线盒', en: 'Junction box', data: { cam: i } }));
    const { world: w, state: s } = setup([floor(0, 50)], { x: 0, y: 0, z: 0, yaw: 0 }, { cameras, inter });
    run(s, w, 3);
    addItem(s, s.inv.pack, 'boltcutters', 1); s.inv.hotbar[0] = s.inv.pack.items.find(i => i.id === 'boltcutters')!.uid; s.inv.held = 1;
    const cut = (x: number) => { s.player.pos.x = x; run(s, w, 2); aim(s, x, 1.3, -1.2); run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT }); run(s, w, secs(TAP.cut + 0.2), { buttons: B.INTERACT }); };
    const hp = s.body.hp;
    cut(0);
    expect(s.units.find(u => u.cam === 0)!.shut).toBe(true);
    expect(s.body.hp).toBeLessThan(hp - 10);
    addItem(s, s.inv.pack, 'insgloves', 1);
    const hp2 = s.body.hp;
    cut(4);
    expect(s.units.find(u => u.cam === 1)!.shut).toBe(true);
    expect(s.body.hp).toBeGreaterThanOrEqual(hp2);
  });
  it('cut a crawl gap through a chain-link fence (M5-25b)', () => {
    const w = getWorld('gym'), s = createState(1, w), f = w.inter.find(i => i.kind === 'fence')!;
    s.player.pos = { x: 5, y: 0, z: -2.6 }; s.player.yaw = 0;
    run(s, w, 3);
    // Crawling at it: the mesh holds him.
    run(s, w, 1, { pressed: B.CRAWL }); run(s, w, secs(1));
    expect(s.player.posture).toBe('crawl');
    run(s, w, secs(3), { my: 1 });
    expect(s.player.pos.z).toBeGreaterThan(-4);
    addItem(s, s.inv.pack, 'boltcutters', 1);
    s.player.pos.z = -3.2; run(s, w, secs(1));
    aim(s, 5, 0.5, -4);
    run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
    run(s, w, secs(FENCE.cut + 0.3), { buttons: B.INTERACT });
    expect(s.wstate.open[f.id]).toBe(true);
    run(s, w, secs(5), { my: 1, pitch: 0 });
    expect(s.player.posture).toBe('crawl');
    expect(s.player.pos.z).toBeLessThan(-4.5);
  });
});

