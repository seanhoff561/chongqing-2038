// M4-78 (U-058): the pistol's attachments. A suppressor dropped onto it is fitted and its shot is heard 40 m round,
// not 150; right-click takes it off again; an extended magazine loads 25 rounds; a reflex sight halves the aimed spread
// and the 4x scope's view is a quarter of the field.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs, LMB } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { spreadOf } from '../../src/sim/pistol';
import { MODS, PISTOL } from '../../src/data/units';
import { B, type SimState } from '../../src/sim/types';
import { zoomOf } from '../../src/render/gunfeel';

function armed(...extra: string[]) {
  const { world, state } = setup([floor(0, 100)]);
  state.time = 12 * 3600; state.flags.god = true;
  addItem(state, state.inv.pack, 'pistol', 1, { charge: 15 });
  for (const id of extra) addItem(state, state.inv.pack, id, 1);
  const gun = state.inv.pack.items.find(i => i.id === 'pistol')!;
  state.inv.hotbar[0] = gun.uid; state.inv.held = 1;
  return { world, state, gun, uid: (id: string) => state.inv.pack.items.find(i => i.id === id)!.uid };
}
const shotNoise = (s: SimState, w: Parameters<typeof run>[1]) => { let r = 0; run(s, w, 1, { pressed: LMB, buttons: LMB }, st => { for (const e of st.events) if (e.t === 'noise' && e.kind === 'pistol') r = e.r; }); return r; };

describe('pistol attachments (M4-78)', () => {
  it('fits a suppressor: the shot heard 40 m round; taken off, 150 again', () => {
    const t = armed('suppressor');
    run(t.state, t.world, 1, { cmds: [{ c: 'fit', uid: t.uid('suppressor'), onto: t.gun.uid }] });
    expect(t.gun.mods).toEqual(['suppressor']);
    expect(t.state.inv.pack.items.some(i => i.id === 'suppressor')).toBe(false);
    expect(shotNoise(t.state, t.world)).toBe(MODS.suppressor.noise);
    run(t.state, t.world, secs(0.5));
    run(t.state, t.world, 1, { cmds: [{ c: 'strip', uid: t.gun.uid }] });
    expect(t.gun.mods).toEqual([]);
    expect(t.state.inv.pack.items.some(i => i.id === 'suppressor')).toBe(true);
    expect(shotNoise(t.state, t.world)).toBe(PISTOL.noise);
  });
  it('loads the extended magazine: 25 rounds', () => {
    const t = armed('mag9', 'mag9x');
    t.gun.charge = 0;
    run(t.state, t.world, 1, { pressed: B.RELOAD, buttons: B.RELOAD });
    run(t.state, t.world, secs(PISTOL.reload + 0.1));
    expect(t.gun.charge).toBe(25);
    expect(t.gun.mag).toBe('mag9x');
  });
  it('a reflex sight halves the aimed spread; the scope shows a quarter of the field', () => {
    const t = armed('reddot');
    const before = spreadOf(t.state, true, t.gun);
    run(t.state, t.world, 1, { cmds: [{ c: 'fit', uid: t.uid('reddot'), onto: t.gun.uid }] });
    expect(spreadOf(t.state, true, t.gun)).toBeCloseTo(before * 0.5, 5);
    expect(1 - 0.38 * zoomOf(['scope4x'])).toBeCloseTo(0.25, 5);
    expect(zoomOf([])).toBe(1);
  });
});
