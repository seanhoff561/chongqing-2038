// M5-27: a hideout's power. With no battery the laptop doesn't charge there; a car battery (out of a car, with its
// charge) and an inverter wired in, it charges, drawing the battery; electronics at the bench want the power and draw
// it; a solar charger puts back 5% a day. M10-28: one battery pack charges the laptop and all he carries full.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs, LMB } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { claimBed } from '../../src/sim/shelter';
import { POWER } from '../../src/sim/power';
import { rollOne } from '../../src/sim/loot';
import { loot } from '../../src/data/loot';
import { makeRng } from '../../src/sim/rng';
import type { Inter } from '../../src/world/world';

describe('hideout power (M5-27)', () => {
  it('runs the laptop and the soldering off a car battery and inverter; solar tops it up', () => {
    const inter: Inter[] = [{ id: 'bed', kind: 'mattress', x: 2, y: 0.3, z: 2, r: 1, zh: '床', en: 'Bed' }, { id: 'wb', kind: 'bench', x: 0, y: 0.95, z: -1, r: 0.7, zh: '工作台', en: 'Workbench' }];
    const { world: w, state: s } = setup([floor(0, 50)], { x: 0, y: 0, z: 0, yaw: 0 }, { inter });
    run(s, w, 2);
    claimBed(s, inter[0]);
    const h = s.shelters[0], use = (id: string) => run(s, w, 1, { cmds: [{ c: 'use', uid: s.inv.pack.items.find(i => i.id === id)!.uid }] });
    s.laptop = { open: false, charge: 0.5 };
    run(s, w, secs(10));
    expect(s.laptop.charge).toBe(0.5);
    // A car's battery comes with some charge left in it.
    const cars = Array.from({ length: 400 }, (_, i) => rollOne(s, makeRng(i), loot.car)).filter(([id]) => id === 'carbattery');
    expect(cars.length).toBeGreaterThan(5);
    for (const [, , x] of cars) { expect(x.charge).toBeGreaterThanOrEqual(20); expect(x.charge).toBeLessThanOrEqual(80); }
    addItem(s, s.inv.pack, 'carbattery', 1, { charge: 60 }); use('carbattery');
    expect(h.battery).toBe(60);
    run(s, w, secs(10));
    expect(s.laptop.charge).toBe(0.5); // (no inverter yet)
    addItem(s, s.inv.pack, 'inverter', 1); use('inverter');
    run(s, w, secs(30));
    expect(s.laptop.charge).toBeGreaterThan(0.5);
    expect(h.battery).toBeLessThan(60);
    // Soldering a camera tap draws it.
    for (const id of ['board', 'cable', 'clips']) addItem(s, s.inv.pack, id, 1);
    const before = h.battery;
    run(s, w, 1, { cmds: [{ c: 'act', name: 'craft', arg: 'cameratap' }] });
    run(s, w, secs(16));
    expect(s.inv.pack.items.some(i => i.id === 'cameratap')).toBe(true);
    expect(before - h.battery).toBeGreaterThanOrEqual(POWER.job);
    // The solar charger: 5% a game day.
    addItem(s, s.inv.pack, 'solar', 1); use('solar');
    s.laptop.charge = 1;
    const b0 = h.battery;
    run(s, w, secs(86400 / 40 / 4));
    expect(h.battery - b0).toBeCloseTo(POWER.solar / 4, 0);
  });

  it('one battery pack charges a flat laptop, phone and headlamp full, and is used up (M10-28)', () => {
    const { world: w, state: s } = setup([floor()]);
    const use = () => run(s, w, 1, { cmds: [{ c: 'use', uid: s.inv.pack.items.find(i => i.id === 'battpack')!.uid }] });
    const charge = (id: string) => s.inv.pack.items.find(i => i.id === id)!.charge;
    s.laptop = { open: false, charge: 0 };
    addItem(s, s.inv.pack, 'phone', 1, { charge: 0 });
    addItem(s, s.inv.pack, 'headlamp', 1, { charge: 0 });
    addItem(s, s.inv.pack, 'battpack', 2);
    use();
    expect(s.laptop.charge).toBe(1);
    expect(charge('phone')).toBe(100);
    expect(charge('headlamp')).toBe(100);
    expect(s.inv.pack.items.filter(i => i.id === 'battpack').reduce((n, i) => n + i.n, 0)).toBe(1);
    // With everything full, a pack isn't used.
    let why = '';
    run(s, w, 1, { cmds: [{ c: 'use', uid: s.inv.pack.items.find(i => i.id === 'battpack')!.uid }] }, st => { for (const e of st.events) if (e.t === 'blocked') why = e.why; });
    expect(why).toBe('nothing needs charging');
    expect(s.inv.pack.items.some(i => i.id === 'battpack')).toBe(true);
    // Held and used, the last one goes from his hand.
    s.laptop.charge = 0.2;
    s.inv.hotbar[0] = s.inv.pack.items.find(i => i.id === 'battpack')!.uid; s.inv.held = 1;
    run(s, w, 1, { pressed: LMB, buttons: LMB });
    expect(s.laptop.charge).toBe(1);
    expect(s.inv.pack.items.some(i => i.id === 'battpack')).toBe(false);
    expect(s.inv.held).toBe(0);
  });
});
