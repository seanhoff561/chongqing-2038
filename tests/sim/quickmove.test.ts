// M4-71: shift-click and 'take all' move things across where they fit, topping up alike stacks first.
import { describe, it, expect } from 'vitest';
import { quickMove, addItem, type Grid } from '../../src/sim/inventory';
import type { SimState } from '../../src/sim/types';

describe('quick moves', () => {
  it('tops up alike stacks, then finds room, and stops when full', () => {
    const s = { nextUid: 0, time: 0 } as SimState, a: Grid = { w: 4, h: 4, items: [] }, b: Grid = { w: 2, h: 2, items: [] };
    addItem(s, b, 'bandage', 3);
    addItem(s, a, 'bandage', 3);
    expect(quickMove(a, b, a.items[0].uid)).toBe(true);
    expect(b.items.map(x => x.n)).toEqual([4, 2]);
    expect(a.items).toEqual([]);
    addItem(s, a, 'firstaid', 1);
    expect(quickMove(a, b, a.items[0].uid)).toBe(false);
    expect(a.items.length).toBe(1);
    addItem(s, a, 'tape', 1);
    expect(quickMove(a, b, a.items[1].uid)).toBe(true);
    expect(b.items.map(x => x.id)).toEqual(['bandage', 'bandage', 'tape']);
  });
});
