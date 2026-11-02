// M6-02: the LED screens run the machine's announcements between the campaigns: the line the street speakers would
// say for his district's alert and the hour (calm by day, the curfew by night, the alert when it's after him).
import { describe, it, expect } from 'vitest';
import { setup, floor } from '../sim/helpers';
import { edictAt, EDICT } from '../../src/render/edicts';
import { ANNOUNCE } from '../../src/data/announce';
import { districtOf } from '../../src/sim/district';

describe('LED edicts (M6-02)', () => {
  it('alternate campaigns and the announcement for the alert and the hour', () => {
    const { state } = setup([floor()]);
    state.time = 12 * 3600;
    expect(edictAt(state, 1)).toBeNull();
    expect(ANNOUNCE.calm).toContain(edictAt(state, EDICT.ads + 1));
    state.time = 23 * 3600;
    expect(ANNOUNCE.curfew).toContain(edictAt(state, EDICT.ads + 1));
    state.hive.districts[districtOf(state.player.pos.x, state.player.pos.z)] = { ...(state.hive.districts[districtOf(state.player.pos.x, state.player.pos.z)] ?? {}), state: 'engaged' } as never;
    expect(ANNOUNCE.alert).toContain(edictAt(state, EDICT.ads + 1));
    // The next turn, the next line.
    const C = EDICT.ads + EDICT.line;
    expect(edictAt(state, C + EDICT.ads + 1)).not.toBe(edictAt(state, EDICT.ads + 1));
  });
});
