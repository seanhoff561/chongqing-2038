// M4-44 (U-050): every item use answers. Each item in the catalogue, in hand on open ground, used (left mouse): it
// does something he can tell (a sound, a noise, a task, the stack or its charge changed) or a message says why not.
import { describe, it, expect } from 'vitest';
import { setup, run, floor, LMB } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { items } from '../../src/data/items';

describe('every item use answers (M4-44)', () => {
  it('each item in the catalogue, used in hand on open ground, does something or says why not', () => {
    const silent: string[] = [];
    for (const it of items) {
      const { world, state } = setup([floor()], { x: 0, y: 0, z: 0, yaw: 0 });
      run(state, world, 3);
      addItem(state, state.inv.pack, it.id, 1, it.id === 'pistol' ? { charge: 0 } : {});
      const st = state.inv.pack.items.find(i => i.id === it.id);
      if (!st) continue;
      state.inv.hotbar[0] = st.uid; state.inv.held = 1;
      const before = JSON.stringify({ n: st.n, c: st.charge, task: state.task });
      let said = false;
      run(state, world, 1, { pressed: LMB, buttons: LMB }, s => { if (s.events.some(e => e.t !== 'use' && e.t !== 'land')) said = true; });
      if (!said && JSON.stringify({ n: st.n, c: st.charge, task: state.task }) === before) silent.push(it.id);
    }
    expect(silent).toEqual([]);
  });
  it('tells him why: a key, a part, the headlamp', () => {
    const msg = (id: string) => {
      const { world, state } = setup([floor()], { x: 0, y: 0, z: 0, yaw: 0 });
      run(state, world, 3);
      addItem(state, state.inv.pack, id, 1);
      state.inv.hotbar[0] = state.inv.pack.items.find(i => i.id === id)!.uid; state.inv.held = 1;
      let text = '';
      run(state, world, 1, { pressed: LMB, buttons: LMB }, s => { for (const e of s.events) if (e.t === 'msg') text = e.text; });
      return text;
    };
    expect(msg('metrokey')).toMatch(/opens something/);
    expect(msg('coil')).toMatch(/workbench/);
    expect(msg('headlamp')).toMatch(/H switches/);
  });
});
