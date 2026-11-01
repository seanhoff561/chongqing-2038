// M5-30: the hiking pack. Used, the backpack's grid is 10 x 7 and what he carried is all still there, where it was;
// a 10 x 7 load fits that wouldn't before.
import { describe, it, expect } from 'vitest';
import { setup, floor, run } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { HIKING } from '../../src/sim/backpack';

describe('the hiking pack (M5-30)', () => {
  it('raises the grid to 10 x 7 and keeps its contents', () => {
    const { world: w, state: s } = setup([floor()], { x: 0, y: 0, z: 0, yaw: 0 });
    run(s, w, 2);
    s.inv.pack.items.length = 0;
    addItem(s, s.inv.pack, 'crowbar', 1); addItem(s, s.inv.pack, 'water', 3); addItem(s, s.inv.pack, 'hikingpack', 1);
    const before = s.inv.pack.items.filter(i => i.id !== 'hikingpack').map(i => `${i.id}:${i.n}:${i.x},${i.y}`);
    run(s, w, 1, { cmds: [{ c: 'use', uid: s.inv.pack.items.find(i => i.id === 'hikingpack')!.uid }] });
    expect([s.inv.pack.w, s.inv.pack.h]).toEqual([HIKING.w, HIKING.h]);
    expect(s.inv.pack.items.map(i => `${i.id}:${i.n}:${i.x},${i.y}`)).toEqual(before);
    // Room now for 70 single circuit boards, where 48 fitted before.
    s.inv.pack.items.length = 0;
    expect(addItem(s, s.inv.pack, 'board', 70)).toBe(0);
  });
});
