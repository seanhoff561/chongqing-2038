// M5-29: water. At the river's edge an empty bottle fills (every empty one) with river water; away from water it's
// thrown; river water drunk makes him sick about one time in two; a tablet makes a bottle of it clean water.
import { describe, it, expect } from 'vitest';
import { setup, run } from './helpers';
import { solid } from '../../src/world/geom';
import { addItem } from '../../src/sim/inventory';
import { createState } from '../../src/sim/sim';
import { eat } from '../../src/sim/food';

describe('water (M5-29)', () => {
  it('fills from the river, sickens unpurified, is made safe with a tablet', () => {
    const river = { x0: -50, y0: -6, z0: -60, x1: 50, y1: -0.6, z1: -1 };
    const { world: w, state: s } = setup([solid(-50, -1, -1, 50, 0, 50), solid(-50, -7, -60, 50, -6, -1)], { x: 0, y: 0, z: 0, yaw: 0 }, { water: [river] });
    run(s, w, 3);
    addItem(s, s.inv.pack, 'bottle', 3);
    const use = () => run(s, w, 1, { cmds: [{ c: 'use', uid: s.inv.pack.items.find(i => i.id === 'bottle')!.uid }] });
    // Back from the edge: no water to fill it from, so it's thrown (M5-19).
    s.player.pos.z = 6; run(s, w, 2); use();
    expect(s.inv.pack.items.some(i => i.id === 'riverwater')).toBe(false);
    expect(s.thrown?.[0]?.id).toBe('bottle');
    run(s, w, 60);
    // At the edge, facing it.
    s.player.pos.z = 0.3; run(s, w, 2); use();
    expect(s.inv.pack.items.filter(i => i.id === 'riverwater').reduce((a, i) => a + i.n, 0)).toBe(2);
    // A tablet: one bottle clean.
    addItem(s, s.inv.pack, 'tablets', 1);
    run(s, w, 1, { cmds: [{ c: 'use', uid: s.inv.pack.items.find(i => i.id === 'tablets')!.uid }] });
    expect(s.inv.pack.items.find(i => i.id === 'water')?.n).toBe(1);
    expect(s.inv.pack.items.find(i => i.id === 'riverwater')?.n).toBe(1);
    // Drunk as it is, about half the time sick.
    let sick = 0;
    for (let i = 0; i < 200; i++) {
      const t = createState(100 + i, w), st = { uid: 1, id: 'riverwater', n: 1, x: 0, y: 0, rot: false, made: 0 };
      t.inv.pack.items.push(st); eat(t, st); if (t.body.sickUntil > t.time) sick++;
    }
    expect(sick / 200).toBeGreaterThan(0.38); expect(sick / 200).toBeLessThan(0.62);
  });
});
