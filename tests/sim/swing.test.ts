// M4-60: the knife and crowbar always swing; the blow lands on a machine in reach, else a wall or thing (heard by what
// it's made of), else the air.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, LMB } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { solid } from '../../src/world/geom';
import { MAT } from '../../src/world/mats';
import { MELEE } from '../../src/data/units';
import type { SimState, SimEvent } from '../../src/sim/types';
import type { Solid } from '../../src/world/geom';

function blow(id: 'knife' | 'crowbar', solids: Solid[], cameras = [] as { kind: 'turret'; x: number; y: number; z: number; yaw: number }[]) {
  const { world, state } = setup([floor(0, 100), ...solids], { x: 0, y: 0, z: 0, yaw: 0 }, { cameras });
  state.time = 12 * 3600; state.flags.god = true;
  addItem(state, state.inv.pack, id, 1);
  state.inv.hotbar[0] = state.inv.pack.items.find(i => i.id === id)!.uid; state.inv.held = 1;
  const ev: SimEvent[] = [];
  run(state, world, 1, { pressed: LMB, buttons: LMB }, (s: SimState) => ev.push(...s.events));
  return { swing: ev.find(e => e.t === 'swing'), hit: ev.find(e => e.t === 'hit'), noise: ev.filter(e => e.t === 'noise').map(e => (e as { r: number }).r), state };
}

describe('melee swings (M4-60)', () => {
  it('swings through the air with nothing in reach', () => {
    for (const id of ['knife', 'crowbar'] as const) {
      const r = blow(id, []);
      expect(r.swing).toEqual({ t: 'swing', kind: id, on: 'air' });
      expect(r.noise).toEqual([]);
    }
  });
  it('lands on a wall in reach, heard by what the wall is', () => {
    const wall = (mat: number) => [solid(-2, 0, -2.2, 2, 3, -1.2, mat)];
    expect(blow('crowbar', wall(MAT.concrete)).swing).toMatchObject({ on: 'hard' });
    expect(blow('crowbar', wall(MAT.concrete)).noise).toEqual([MELEE.crowbar.wall.hard]);
    expect(blow('crowbar', wall(MAT.metal)).swing).toMatchObject({ on: 'metal' });
    expect(blow('knife', wall(MAT.wood)).swing).toMatchObject({ on: 'soft' });
    expect(blow('knife', wall(MAT.wood)).noise).toEqual([MELEE.knife.wall.soft]);
    // Out of reach it's the air.
    expect(blow('knife', [solid(-2, 0, -4, 2, 3, -3, MAT.concrete)]).swing).toMatchObject({ on: 'air' });
  });
  it('lands on a machine in reach', () => {
    const r = blow('crowbar', [], [{ kind: 'turret', x: 0, y: 1.5, z: -1.4, yaw: 0 }]);
    expect(r.swing).toMatchObject({ on: 'machine' });
    expect(r.hit).toMatchObject({ t: 'hit', dmg: MELEE.crowbar.damage });
  });
});
