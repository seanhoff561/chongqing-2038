// M5-18: the shotgun and the nail gun. A shotgun blast at a quadruped 8 m off: several pellets in it, a 180 m noise, a
// shell gone; R loads shells one by one from a box. The nail gun: a 25 m noise, nothing past 15 m; a strip swapped in
// with R; point-blank at a shut door it nails it shut (four nails): he can't open it without the crowbar, and with
// it he prises it open.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs, aim, LMB, RMB } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { B } from '../../src/sim/types';
import { SHOTGUN, NAILGUN, UNITS } from '../../src/data/units';
import { solid } from '../../src/world/geom';
import type { Patrol, Inter } from '../../src/world/world';

const hold = (s: ReturnType<typeof setup>['state'], id: string, charge: number) => {
  addItem(s, s.inv.pack, id, 1, { charge });
  s.inv.hotbar[0] = s.inv.pack.items.find(i => i.id === id)!.uid; s.inv.held = 1;
  return s.inv.pack.items.find(i => i.id === id)!;
};

describe('the shotgun and the nail gun (M5-18)', () => {
  it('blasts pellets loud and loads shell by shell; the nail gun is quiet and short', () => {
    const beat = (z: number): Patrol => ({ kind: 'street', unit: 'quadruped', pts: [{ x: 0, y: 0, z }, { x: 0, y: 0, z: z + 0.01 }], dwell: [600, 600], hours: [0, 24] });
    const { world: w, state: s } = setup([floor(0, 100)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [beat(-8), beat(-20)] });
    s.time = 12 * 3600; s.flags.god = true;
    const [dog, far] = s.units;
    dog.stop = { x: 0, y: 0, z: -8, yaw: 0, t: 0 }; far.stop = { x: 0, y: 0, z: -20, yaw: 0, t: 0 };
    run(s, w, 2);
    const gun = hold(s, 'shotgun', 2);
    let loud = 0;
    aim(s, 0, 0.6, -8);
    run(s, w, 1, { pressed: LMB, buttons: LMB | RMB }, st => { for (const e of st.events) if (e.t === 'noise') loud = Math.max(loud, e.r); });
    expect(gun.charge).toBe(1);
    expect(loud).toBe(SHOTGUN.noise);
    const lost = UNITS.quadruped.hp - (dog.hp ?? UNITS.quadruped.hp);
    expect(lost).toBeGreaterThan(SHOTGUN.damage * 2 * 0.2); // (several pellets in it, its body taking a fifth)
    // R: a shell at a time from the box, to the tube's five.
    addItem(s, s.inv.pack, 'shells', 1);
    run(s, w, 1, { pressed: B.RELOAD });
    run(s, w, secs(SHOTGUN.shell * 4 + 0.3));
    expect(gun.charge).toBe(SHOTGUN.tube);
    expect(s.inv.pack.items.find(i => i.id === 'shells')?.charge).toBe(1);
    // The nail gun: quiet, and the dog 20 m off out of its reach.
    s.inv.pack.items.splice(s.inv.pack.items.indexOf(gun), 1);
    const nails = hold(s, 'nailgun', 3);
    const was = far.hp ?? UNITS.quadruped.hp;
    loud = 0; aim(s, 0, 0.6, -20);
    run(s, w, secs(NAILGUN.every + 0.05), { pressed: LMB, buttons: LMB }, st => { for (const e of st.events) if (e.t === 'noise') loud = Math.max(loud, e.r); });
    expect(loud).toBe(NAILGUN.noise);
    expect(far.hp ?? UNITS.quadruped.hp).toBe(was);
    // A strip swapped in; the one in it back in the pack with what it had.
    addItem(s, s.inv.pack, 'nails', 1);
    run(s, w, 1, { pressed: B.RELOAD });
    run(s, w, secs(NAILGUN.reload + 0.2));
    expect(nails.charge).toBe(NAILGUN.strip);
    expect(s.inv.pack.items.find(i => i.id === 'nails')?.charge).toBe(2);
  });
  it('nails a door shut, prised open only with the crowbar', () => {
    const inter: Inter[] = [{ id: 'd1', kind: 'door', x: 0, y: 1, z: -1, r: 0.8, zh: '门', en: 'Door', data: { solid: 1 } }];
    const { world: w, state: s } = setup([floor(0, 50), solid(-0.8, 0, -1.05, 0.8, 2.2, -0.95)], { x: 0, y: 0, z: 0, yaw: 0 }, { inter });
    run(s, w, 3);
    const gun = hold(s, 'nailgun', NAILGUN.strip);
    aim(s, 0, 1, -1);
    run(s, w, 1, { pressed: LMB, buttons: LMB });
    expect(s.wstate.pinned?.d1).toBe(true);
    expect(gun.charge).toBe(NAILGUN.strip - NAILGUN.pin);
    const msgs: string[] = [], hear = (st: typeof s) => { for (const e of st.events) if (e.t === 'msg') msgs.push(e.text); };
    s.inv.held = 0;
    run(s, w, secs(1));
    run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT }, hear);
    expect(msgs.at(-1)).toBe('nailed shut');
    expect(s.wstate.open.d1).toBeFalsy();
    addItem(s, s.inv.pack, 'crowbar', 1);
    run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
    run(s, w, secs(2.2), { buttons: B.INTERACT });
    expect(s.wstate.open.d1).toBe(true);
    expect(s.wstate.pinned?.d1).toBeUndefined();
  });
});
