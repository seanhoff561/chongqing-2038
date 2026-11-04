// M5-23: prising with the crowbar. A locked door (or vent cover) takes its time and is heard 20 m; a door with a
// keycard reader won't give; an armoury's locked crate is prised open (20 m) and its stock is there; a scooter's battery
// cells come out (20 m). Without the crowbar, none of them.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs, aim } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { B } from '../../src/sim/types';
import { PRY } from '../../src/sim/containers';
import { SCOOTER } from '../../src/sim/pry';
import { solid } from '../../src/world/geom';
import type { Inter } from '../../src/world/world';

describe('prising with the crowbar (M5-23)', () => {
  it('prises doors, crates and scooters, loudly, not secure doors', () => {
    const inter: Inter[] = [
      { id: 'd1', kind: 'door', x: 0, y: 1, z: -1.2, r: 0.7, zh: '门', en: 'Door', data: { solid: 1, lock: 'locked' } },
      { id: 'd2', kind: 'door', x: 3, y: 1, z: -1.2, r: 0.7, zh: '门', en: 'Door', data: { solid: 2, key: 'sitecard' } },
      { id: 'c1', kind: 'container', x: -3, y: 0.6, z: -1.2, r: 0.6, zh: '箱', en: 'Crate', data: { type: 'crate', loot: 'armory', lock: 'locked' } },
      { id: 's1', kind: 'scooter', x: 6, y: 0.45, z: -1.2, r: 0.6, zh: '电动车', en: 'Scooter' },
    ];
    const { world: w, state: s } = setup([floor(0, 50), solid(-0.8, 0, -1.25, 0.8, 2.2, -1.15), solid(2.2, 0, -1.25, 3.8, 2.2, -1.15)], { x: 0, y: 0, z: 0, yaw: 0 }, { inter });
    run(s, w, 3);
    const msgs: string[] = [];
    let loud = 0;
    const hear = (st: typeof s) => { for (const e of st.events) { if (e.t === 'msg') msgs.push(e.text); if (e.t === 'blocked') msgs.push(e.why); if (e.t === 'noise') loud = Math.max(loud, e.r); } };
    const at = (x: number, y: number) => { s.player.pos.x = x; run(s, w, 2); aim(s, x, y, -1.2); };
    const work = (n: number) => { loud = 0; run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT }, hear); run(s, w, n, { buttons: B.INTERACT }, hear); };
    // No crowbar: the crate won't open, nor the scooter.
    at(-3, 0.6); work(5); expect(msgs.at(-1)).toMatch(/crowbar/);
    at(6, 0.45); work(5); expect(msgs.at(-1)).toMatch(/crowbar/);
    addItem(s, s.inv.pack, 'crowbar', 1);
    // The locked door: forced, 20 m.
    at(0, 1); work(secs(1.8));
    expect(s.wstate.open.d1).toBe(true); expect(loud).toBe(PRY.noise);
    // The keycard door: no.
    at(3, 1); work(secs(2));
    expect(s.wstate.open.d2).toBeFalsy();
    // The armoury crate: prised, 20 m, and open.
    at(-3, 0.6); work(secs(PRY.secs + 0.3));
    expect(s.openContainer).toBe('c1'); expect(loud).toBe(PRY.noise);
    s.openContainer = null;
    // The scooter's cells.
    at(6, 0.45); work(secs(SCOOTER.secs + 0.3));
    expect(s.inv.pack.items.some(i => i.id === 'scootercells')).toBe(true); expect(loud).toBe(PRY.noise);
  });
});
