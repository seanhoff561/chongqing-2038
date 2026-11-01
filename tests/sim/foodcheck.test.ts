// M5-05: food checks. Food Anna has scanned shows its shelf life left (in days, then hours), then that it's spoiled;
// food she hasn't, even the same kind, shows nothing.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { addItem, grid } from '../../src/sim/inventory';
import { foodCheck } from '../../src/sim/food';
import { item } from '../../src/data/items';

describe('food checks (M5-05)', () => {
  it('shows a scanned packet its shelf life, then spoiled; an unscanned one nothing', () => {
    const { world, state: s } = setup([floor(0, 100)], { x: 0, y: 0, z: 0, yaw: 0 });
    s.time = 12 * 3600;
    addItem(s, s.inv.pack, 'bread', 1);
    const [a] = s.inv.pack.items.filter(i => i.id === 'bread');
    expect(foodCheck(s, a)).toBeNull();
    // Holding it, the laptop open, looking up: two seconds and she's read it.
    s.inv.hotbar[0] = a.uid; s.inv.held = 1;
    run(s, world, 1, { pitch: 1.2, cmds: [{ c: 'act', name: 'laptop' }] });
    run(s, world, secs(2.3), { pitch: 1.2 });
    expect(s.lastScan).toBe('item:bread');
    const days = item('bread').food!.shelfDays;
    expect(foodCheck(s, a)?.[1]).toBe(`keeps ${days - 1} more day${days - 1 > 1 ? 's' : ''}`);
    // Another loaf, never scanned: nothing.
    const box = grid(4, 4); addItem(s, box, 'bread', 1); const b = box.items[0];
    expect(foodCheck(s, b)).toBeNull();
    // Hours at the last, then spoiled.
    s.time = a.made! + (days - 0.25) * 86400;
    expect(foodCheck(s, a)?.[1]).toBe('keeps 6 more hours');
    s.time = a.made! + (days + 0.1) * 86400;
    expect(foodCheck(s, a)?.[1]).toMatch(/spoiled/);
  });
});
