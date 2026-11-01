// M4-96 (U-069): refilling water at the sinks that still run. F at a running sink fills his empty bottles; a dry one
// gives nothing. Some run in every district.
import { describe, it, expect } from 'vitest';
import { setup, run, floor } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { getWorld } from '../../src/world/build';
import { districtOf } from '../../src/sim/district';
import { B } from '../../src/sim/types';

describe('running sinks (M4-96)', () => {
  it('fills his empty bottles at a running sink, not at a dry one; some run in every district', () => {
    const at = (running: boolean) => {
      const { world, state } = setup([floor()], { x: 0, y: 0, z: 0, yaw: 0 }, { inter: [{ id: 'k', kind: 'sink', x: 0, y: 0.9, z: -1.2, r: 0.6, zh: '水槽', en: 'Sink', data: { running } }] });
      addItem(state, state.inv.pack, 'bottle', 1); addItem(state, state.inv.pack, 'bottle', 1);
      run(state, world, 2, { pitch: -0.3 });
      run(state, world, 1, { pitch: -0.3, buttons: B.INTERACT, pressed: B.INTERACT });
      return state.inv.pack.items.map(i => i.id).sort().join();
    };
    expect(at(true)).toBe('water,water');
    expect(at(false)).toBe('bottle,bottle');
    const w = getWorld('yuzhong'), sinks = w.inter.filter(i => i.kind === 'sink'), on = new Set(sinks.filter(i => i.data?.running).map(i => districtOf(i.x, i.z)));
    expect(sinks.length).toBeGreaterThan(30);
    for (const d of ['jiefangbei', 'jiaochangkou', 'shibati', 'xiaoshizi']) expect(on.has(d), d).toBe(true);
  });
});
