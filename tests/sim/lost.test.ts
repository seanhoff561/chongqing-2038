// M4-25 (U-013): a lost shelter. Raided, if he lives (out before they came, or the EMP trap), or raided while he was
// away, the hideout is burnt out: its stash and what he kept or left there gone, its bed no use, no longer his. He
// makes a new one somewhere else (M3-28) and it works as any other.
import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, LMB } from './helpers';
import { claimBed, stashIds } from '../../src/sim/shelter';
import { addItem } from '../../src/sim/inventory';
import { RAID } from '../../src/data/units';
import { B } from '../../src/sim/types';
import type { Inter } from '../../src/world/world';

const bed = (id: string, x: number): Inter => ({ id, kind: 'mattress', x, y: 0.3, z: 0, r: 0.8, zh: '床', en: 'Bed' });
const stash: Inter = { id: 'stash', kind: 'container', x: 2, y: 0.5, z: 0, r: 0.6, zh: '箱', en: 'Crate', data: { type: 'crate' } };

/** His hideout, its stash stocked, a crate he set down by it and a can he dropped there; given away, raid at noon. */
function hideout() {
  const { world, state } = setup([floor(0, 200)], { x: 0, y: 0, z: 1, yaw: 0 }, { inter: [bed('home', 0), stash, bed('far', 80)] });
  state.time = 12 * 3600; state.flags.god = false;
  claimBed(state, world.inter[0]);
  const h = state.shelters[0];
  // (The stash opened and stocked, as he would.)
  state.player.pos = { x: 2, y: 0, z: 1.2 };
  run(state, world, 5, { yaw: 0, pitch: -0.5 });
  run(state, world, secs(4), { yaw: 0, pitch: -0.5, pressed: B.INTERACT, buttons: B.INTERACT });
  expect(state.containers.stash).toBeDefined();
  addItem(state, state.containers.stash, 'water', 2);
  state.placed.push({ id: 'placed900', item: 'foldcrate', x: -2, y: 0, z: 1, yaw: 0 });
  state.dropped.push({ stack: { uid: 901, id: 'water', n: 1, x: 0, y: 0, rot: false }, x: 1, y: 0, z: -1 } as never);
  state.openContainer = null;
  Object.assign(h, { compromised: true, raid: state.time + 60 });
  return { world, state, h };
}

describe('a lost shelter (M4-25)', () => {
  it('raided while he is away: stash, his things there and the bed gone; back there, he sees it burnt out', () => {
    const t = hideout();
    expect(stashIds(t.state, t.world, t.h)).toContain('stash');
    t.state.player.pos = { x: 60, y: 0, z: 0 };
    run(t.state, t.world, secs(3));
    expect(t.state.shelters).toEqual([]);
    expect(t.state.containers.stash).toBeUndefined();
    expect(t.state.placed.some(p => p.id === 'placed900')).toBe(false);
    expect(t.state.dropped.length).toBe(0);
    // Back at it: told so; the bed and the stash offer nothing.
    t.state.player.pos = { x: 1.5, y: 0, z: 1.5 };
    const said: string[] = [];
    run(t.state, t.world, 2, {}, s => said.push(...s.events.flatMap(e => (e.t === 'msg' ? [e.text] : []))));
    expect(said.filter(m => /burnt out/.test(m)).length).toBe(1);
    for (const [id, x] of [['home', 0], ['stash', 2]] as const) {
      t.state.player.pos = { x, y: 0, z: 1.2 };
      run(t.state, t.world, 3, { yaw: 0, pitch: -0.6 });
      expect(t.state.target, id).not.toBe(id);
    }
    // (While the far bed, untouched, still is one.)
    t.state.player.pos = { x: 80, y: 0, z: 1.2 };
    run(t.state, t.world, 3, { yaw: 0, pitch: -0.6 });
    expect(t.state.target).toBe('far');
  });
  it('raided and he lives (the EMP trap): it is burnt out all the same, and a new hideout elsewhere is his', () => {
    const t = hideout();
    addItem(t.state, t.state.inv.pack, 'emp');
    t.state.inv.hotbar[0] = t.state.inv.pack.items.find(i => i.id === 'emp')!.uid; t.state.inv.held = 1;
    run(t.state, t.world, 1, { pressed: LMB, buttons: LMB });
    expect(t.h.trap).toBe(true);
    run(t.state, t.world, secs(RAID.warn + 4));
    expect(t.state.dead).toBeFalsy();
    expect(t.state.shelters).toEqual([]);
    expect(t.state.containers.stash).toBeUndefined();
    // A new one, at the far bed: his, and he can sleep there.
    t.state.player.pos = { x: 80, y: 0, z: 1.2 };
    run(t.state, t.world, 3, { yaw: 0, pitch: -0.6 });
    run(t.state, t.world, 1, { yaw: 0, pitch: -0.6, pressed: B.INTERACT });
    expect(t.state.shelters.map(h => h.id)).toEqual(['far']);
    expect(t.state.shelters[0].compromised).toBe(false);
  });
});
