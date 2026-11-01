// M4-28 (U-053): the street speakers say the occupier's line for his district's alert and the hour, every couple of
// minutes and soon after the alert changes or the curfew starts, heard from a lamppost near him, not under the ground.
import { describe, it, expect } from 'vitest';
import { paKind, PA, ANNOUNCE, boardOf } from '../../src/data/announce';
import { districtOf } from '../../src/sim/district';
import { teleport } from '../../src/sim/player';
import { setup, floor, run, secs } from './helpers';
import { SCALE } from '../../src/sim/clock';

describe('street speakers (M4-28)', () => {
  it('pick the line for each alert and hour', () => {
    expect(paKind('unaware', 12)).toBe('calm');
    expect(paKind('suspicious', 10)).toBe('calm');
    expect(paKind('unaware', 22)).toBe('curfew');
    expect(paKind('unaware', 3)).toBe('curfew');
    expect(paKind('unaware', 7)).toBe('calm');
    expect(paKind('engaged', 22)).toBe('alert');
    expect(paKind('searching', 12)).toBe('search');
    expect(paKind('heightened', 2)).toBe('heightened');
    expect(['calm', 'curfew', 'alert', 'search', 'heightened'].map(k => boardOf(k as never))).toEqual([0, 1, 2, 3, 3]);
  });
  it('speak near a lamppost, soon after the curfew starts or a search begins', () => {
    const { world, state } = setup([floor()], { x: 0, y: 0, z: 0, yaw: 0 }, { cameras: [{ kind: 'lamppost', x: 12, y: 6.2, z: 0, yaw: 0 }] });
    const heard: string[] = [], listen = (n: number) => run(state, world, n, {}, s => { for (const e of s.events) if (e.t === 'pa') heard.push(e.id); });
    state.time = 12 * 3600;
    listen(secs(PA.every * 0.4 + 1));
    expect(heard).toEqual([ANNOUNCE.calm[0].id]);
    // A little before nine, the next due in two minutes: the curfew's line as it starts, not two minutes on.
    state.time = 21 * 3600 - 30; state.pa!.at = state.time + PA.every * SCALE;
    listen(secs(PA.react + 2));
    expect(heard[1]).toMatch(/^pa-curfew-/);
    // A search in his district: its line within seconds.
    state.hive.districts[districtOf(0, 0)] = { state: 'searching', since: state.time, contact: state.time, until: 0 };
    listen(secs(PA.react + 1));
    expect(heard[2]).toMatch(/^pa-search-/);
    expect(heard.length).toBe(3);
    // Out of earshot of any lamppost, nothing.
    teleport(state.player, 200, 0, 0);
    listen(secs(PA.every + 5));
    expect(heard.length).toBe(3);
  });
});
