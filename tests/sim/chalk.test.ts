// M4-69 (U-053): a chalk bag, not climbing gloves. Chalked hands hang about twice as long; the bag runs down with use
// and runs out; a chalk block fills it again.
import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, aim, LMB } from './helpers';
import { solid } from '../../src/world/geom';
import { B } from '../../src/sim/types';
import { addItem } from '../../src/sim/inventory';
import { itemById } from '../../src/data/items';
import { loot } from '../../src/data/loot';

/** Seconds he hangs from a 2.7 m lip before slipping, with chalk at `chalk` percent in a bag (none: no bag). */
function hang(chalk?: number) {
  const { world, state } = setup([floor(), solid(-2, 0, -30, 2, 2.7, -3), solid(-2, 2.7, -30, 2, 6, -3.4)], { x: 0, y: 0, z: -2.55, yaw: 0 });
  if (chalk !== undefined) { addItem(state, state.inv.pack, 'chalk', 1); state.inv.pack.items[0].charge = chalk; }
  run(state, world, 3);
  aim(state, 0, 2.6, -3);
  run(state, world, 1, { pressed: B.JUMP, buttons: B.JUMP });
  for (let i = 0; i < 40 && state.player.mode !== 'grip'; i++) { aim(state, 0, 2.6, -3); run(state, world, 1, { buttons: LMB | B.JUMP }); }
  expect(state.player.mode).toBe('grip');
  let slipped = -1;
  run(state, world, secs(45), { buttons: LMB }, (s, i) => { if (slipped < 0 && s.player.mode !== 'grip') slipped = i / 60; });
  return { slipped, state };
}

describe('chalk (M4-69)', () => {
  it('chalked hands hang about twice as long, and use up chalk', () => {
    const bare = hang().slipped, chalked = hang(100);
    expect(chalked.slipped).toBeGreaterThan(bare * 1.8);
    const left = chalked.state.inv.pack.items[0].charge!;
    expect(left).toBeLessThan(100);
    expect(left).toBeGreaterThan(90);
  });
  it('the chalk runs out mid-hang and the hands tire as bare ones', () => {
    const bare = hang().slipped, r = hang(0.5);
    expect(r.state.inv.pack.items[0].charge).toBe(0);
    expect(r.slipped).toBeLessThan(bare + 2);
  });
  it('the gloves are gone; chalk is found in their place, and a block fills the bag', () => {
    expect(itemById.has('gloves')).toBe(false);
    expect(loot.workshop.items.some(i => i.id === 'chalk')).toBe(true);
    const { world, state } = setup([floor()]);
    addItem(state, state.inv.pack, 'chalk', 1); state.inv.pack.items[0].charge = 10;
    addItem(state, state.inv.pack, 'chalkblock', 2);
    state.inv.hotbar[0] = state.inv.pack.items[1].uid; state.inv.held = 1;
    run(state, world, 1, { pressed: LMB, buttons: LMB });
    expect(state.inv.pack.items[0].charge).toBe(100);
    expect(state.inv.pack.items[1].n).toBe(1);
  });
});
