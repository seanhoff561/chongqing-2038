// M5-04: scanning. Every item and every kind of machine has Anna's text (an item's uses each with words for them);
// with the laptop open, two seconds' look at a machine scans it (one isn't enough), and kept; with nothing before
// him, what he holds.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { items } from '../../src/data/items';
import { UNITS } from '../../src/data/units';
import { USE, UNIT_SCAN } from '../../src/data/scan';
import { addItem } from '../../src/sim/inventory';
import type { Patrol } from '../../src/world/world';

describe('scanning (M5-04)', () => {
  it('has words for every item and machine', () => {
    for (const it of items) { expect(it.desc.length, it.id).toBeGreaterThan(3); for (const u of it.uses ?? []) expect(USE[u], `${it.id}: ${u}`).toBeDefined(); }
    for (const k of Object.keys(UNITS)) expect(UNIT_SCAN[k as keyof typeof UNIT_SCAN], k).toBeDefined();
  });
  it('scans a machine looked at for two seconds with the laptop open, then what he holds', () => {
    const beat: Patrol = { kind: 'street', unit: 'quadruped', pts: [{ x: 0, y: 0, z: -8 }, { x: 0, y: 0, z: -7.99 }], dwell: [600, 600], hours: [0, 24] };
    const { world, state } = setup([floor(0, 100)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [beat] });
    state.time = 12 * 3600; state.flags.god = true;
    state.units[0].stop = { x: 0, y: 0, z: -8, yaw: 0, t: 0 };
    const look = { pitch: Math.atan2(0.6 - 1.62, 8) };
    run(state, world, 2); // (landed first: he takes it out on his feet)
    run(state, world, 1, { ...look, cmds: [{ c: 'act', name: 'laptop' }] });
    let scanned = '';
    run(state, world, secs(1), look);
    expect(state.scans?.['unit:quadruped']).toBeUndefined();
    run(state, world, secs(1.2), look, s => { for (const e of s.events) if (e.t === 'scan') scanned = e.id; });
    expect(scanned).toBe('unit:quadruped');
    expect(state.scans!['unit:quadruped']).toBe(true);
    // Looking up at the sky, holding a crowbar: the crowbar.
    addItem(state, state.inv.pack, 'crowbar', 1);
    state.inv.hotbar[0] = state.inv.pack.items.find(i => i.id === 'crowbar')!.uid; state.inv.held = 1;
    run(state, world, secs(2.3), { pitch: 1.2 });
    expect(state.lastScan).toBe('item:crowbar');
  });
});
