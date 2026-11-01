// M5-15: crafting. Every recipe's parts are items; at a bench, a bandage takes its time, then the cloth and alcohol are
// gone and the bandage is in the backpack; short of a part, nothing's made; walking off the bench stops it.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { RECIPES, recipe } from '../../src/data/recipes';
import { item } from '../../src/data/items';
import { addItem } from '../../src/sim/inventory';
import { countOf } from '../../src/sim/craft';
import type { Inter } from '../../src/world/world';

describe('crafting (M5-15)', () => {
  it('has every recipe made of real items', () => {
    for (const r of RECIPES) { expect(() => item(r.id), r.id).not.toThrow(); for (const [id] of r.parts) expect(() => item(id), `${r.id}: ${id}`).not.toThrow(); }
  });
  it('makes a bandage at the bench, in its time, from its parts', () => {
    const inter: Inter[] = [{ id: 'wb', kind: 'bench', x: 0, y: 0.95, z: -1, r: 0.7, zh: '工作台', en: 'Workbench' }];
    const { world: w, state: s } = setup([floor(0, 50)], { x: 0, y: 0, z: 0, yaw: 0 }, { inter });
    const craft = { cmds: [{ c: 'act' as const, name: 'craft', arg: 'bandage' }] }, dur = recipe('bandage')!.secs;
    run(s, w, 2);
    addItem(s, s.inv.pack, 'cloth', 1);
    run(s, w, 1, craft);
    expect(s.task).toBeNull();
    addItem(s, s.inv.pack, 'alcohol', 1);
    run(s, w, 1, craft);
    run(s, w, secs(dur - 0.5));
    expect(countOf(s, 'bandage')).toBe(0);
    run(s, w, secs(0.7));
    expect(countOf(s, 'bandage')).toBe(1);
    expect(countOf(s, 'cloth') + countOf(s, 'alcohol')).toBe(0);
    // Walked off half way: nothing made, nothing used.
    addItem(s, s.inv.pack, 'cloth', 1); addItem(s, s.inv.pack, 'alcohol', 1);
    run(s, w, 1, craft);
    run(s, w, secs(1));
    s.player.pos.z = 5;
    run(s, w, secs(dur));
    expect(countOf(s, 'bandage')).toBe(1);
    expect(countOf(s, 'cloth')).toBe(1);
  });
});
