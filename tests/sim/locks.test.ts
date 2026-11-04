// M5-24: lock grades. A bad lock: the lockpick opens it quietly (the improvised picks slower, a use spent); a good lock
// won't pick, the crowbar forces it, loudly; a secure door (a keycard reader) takes neither: the cloner held to its
// reader copies the card and opens it, and the copy opens the next door wanting that card. The cloner on a wrecked
// humanoid copies its badge.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs, aim } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { B } from '../../src/sim/types';
import { LOCKS, gradeOf } from '../../src/sim/locks';
import type { Inter, Patrol } from '../../src/world/world';

const door = (id: string, x: number, data: Record<string, unknown>): Inter => ({ id, kind: 'door', x, y: 1, z: -1.2, r: 0.7, zh: '门', en: 'Door', data: { solid: -1, ...data } });
const ids = (g: string) => Array.from({ length: 50 }, (_, i) => `door${i}`).find(id => gradeOf(door(id, 0, { lock: 'locked' })) === g)!;

describe('lock grades (M5-24)', () => {
  it('picks bad locks, forces good ones, clones its way through secure ones', () => {
    const bad = ids('bad'), good = ids('good'), bad2 = Array.from({ length: 50 }, (_, i) => `door${i}`).filter(id => gradeOf(door(id, 0, { lock: 'locked' })) === 'bad')[1];
    const inter = [door(bad, 0, { lock: 'locked' }), door(bad2, 2, { lock: 'locked' }), door(good, 4, { lock: 'locked' }), door('sec1', 6, { key: 'sitecard' }), door('sec2', 8, { key: 'sitecard' })];
    const beat: Patrol = { kind: 'street', unit: 'humanoid', pts: [{ x: 20, y: 0, z: 0 }, { x: 20, y: 0, z: 0.01 }], dwell: [600, 600], hours: [0, 24] };
    const { world: w, state: s } = setup([floor(0, 50)], { x: 0, y: 0, z: 0, yaw: 0 }, { inter, patrols: [beat] });
    s.time = 12 * 3600; s.flags.god = true;
    run(s, w, 3);
    const msgs: string[] = [];
    let loud = 0;
    const hear = (st: typeof s) => { for (const e of st.events) { if (e.t === 'msg') msgs.push(e.text); if (e.t === 'blocked') msgs.push(e.why); if (e.t === 'noise') loud = Math.max(loud, e.r); } };
    const at = (x: number, y = 1, z = -1.2) => { s.player.pos.x = x; run(s, w, 2); aim(s, x, y, z); };
    const work = (n: number) => { loud = 0; run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT }, hear); run(s, w, n, { buttons: B.INTERACT }, hear); };
    addItem(s, s.inv.pack, 'lockpick', 1);
    // Bad: picked in its time, quietly.
    at(0); work(secs(LOCKS.pick - 0.5)); expect(s.wstate.open[bad]).toBeFalsy();
    run(s, w, secs(0.7), { buttons: B.INTERACT }, hear);
    expect(s.wstate.open[bad]).toBe(true); expect(loud).toBeLessThanOrEqual(4);
    // Good: no picking it.
    at(4); work(secs(2)); expect(s.wstate.open[good]).toBeFalsy(); expect(msgs.at(-1)).toMatch(/crowbar/);
    // Improvised picks on another bad one: slower, a use gone.
    s.inv.pack.items.splice(s.inv.pack.items.findIndex(i => i.id === 'lockpick'), 1);
    addItem(s, s.inv.pack, 'picks', 1, { charge: 3 });
    at(2); work(secs(LOCKS.picks + 0.3));
    expect(s.wstate.open[bad2]).toBe(true);
    expect(s.inv.pack.items.find(i => i.id === 'picks')!.charge).toBe(2);
    // The crowbar on the good one: forced, loud.
    addItem(s, s.inv.pack, 'crowbar', 1);
    at(4); work(secs(1.9)); expect(s.wstate.open[good]).toBe(true); expect(loud).toBeGreaterThanOrEqual(14);
    // Secure: not the crowbar.
    at(6); work(secs(2)); expect(s.wstate.open.sec1).toBeFalsy(); expect(msgs.at(-1)).toMatch(/keycard/);
    // The cloner at its reader: copied, open; the copy opens the other at once.
    addItem(s, s.inv.pack, 'cloner', 1); s.inv.hotbar[0] = s.inv.pack.items.find(i => i.id === 'cloner')!.uid; s.inv.held = 1;
    at(6); work(secs(LOCKS.clone + 0.3));
    expect(s.wstate.open.sec1).toBe(true); expect(s.cloned).toEqual(['sitecard']);
    s.inv.held = 0;
    at(8); work(2); expect(s.wstate.open.sec2).toBe(true);
    // A humanoid's wreck: its badge.
    const man = s.units[0]; man.dead = true; man.stop = { x: 8, y: 0, z: -1.5, yaw: 0, t: s.time };
    s.inv.held = 1;
    at(8, 0.3, -1.5);
    run(s, w, 1, { pressed: 64, buttons: 64 });
    expect(s.cloned).toContain(LOCKS.badge);
  });
});
