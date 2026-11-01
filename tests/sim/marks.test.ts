// M4-61 (U-052): rounds and blows leave their marks where they land: a shot at a wall marks the wall, facing back at
// him; on metal it's a metal mark; a crowbar's blow leaves a scrape.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, LMB, secs } from './helpers';
import { solid } from '../../src/world/geom';
import { MAT } from '../../src/world/mats';
import { addItem } from '../../src/sim/inventory';
import type { SimEvent } from '../../src/sim/types';

function fire(id: 'pistol' | 'crowbar', mat: number, d: number) {
  const { world, state } = setup([floor(0, 100), solid(-3, 0, -d - 0.5, 3, 4, -d, mat)]);
  state.time = 12 * 3600; state.flags.god = true;
  addItem(state, state.inv.pack, id, 1, id === 'pistol' ? { charge: 15 } : {});
  state.inv.hotbar[0] = state.inv.pack.items[0].uid; state.inv.held = 1;
  run(state, world, secs(0.3));
  const marks: SimEvent[] = [];
  run(state, world, 1, { pressed: LMB, buttons: LMB }, s => marks.push(...s.events.filter(e => e.t === 'mark')));
  return marks as Extract<SimEvent, { t: 'mark' }>[];
}

describe('marks of damage (M4-61)', () => {
  it('a shot marks the wall where it lands, facing back at him', () => {
    const [m] = fire('pistol', MAT.concrete, 6);
    expect(m).toMatchObject({ kind: 'bullet', on: 'hard' });
    expect(m.z).toBeCloseTo(-6, 1);
    expect(m.nz).toBeCloseTo(1, 3);
    expect(fire('pistol', MAT.metal, 6)[0]).toMatchObject({ on: 'metal' });
  });
  it("a crowbar's blow leaves a scrape", () => {
    expect(fire('crowbar', MAT.concrete, 1.3)[0]).toMatchObject({ kind: 'scrape', on: 'hard' });
  });
});
