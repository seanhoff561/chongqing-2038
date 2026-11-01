// M4-52 (U-051): frightening machines. He hears a machine's eye on him before it notices him, louder as it makes him
// out; the moment one notices him and the moment one has him are marked; the city's alert climbs fast when it's
// after him and falls slowly, so he stays on edge.
import { describe, it, expect } from 'vitest';
import { easeAlert, watcher, changes, DREAD } from '../../src/audio/dread';
import type { Unit } from '../../src/sim/units';

const unit = (id: number, state: Unit['state'], aware = 0) => ({ id, kind: 'humanoid', patrol: 0, phase: 0, state, aware }) as Unit;

describe('dread (M4-52)', () => {
  it('watched, noticed, hunted; the alert up fast and down slowly', () => {
    // Watched: by the one that knows most of those still making him out; none, none.
    expect(watcher([unit(1, 'unaware', 0.1), unit(2, 'unaware', 0.24), unit(3, 'engaged', 1.5)])).toMatchObject({ level: 0.8 });
    expect(watcher([unit(1, 'unaware', 0)]).level).toBe(0);
    // Noticed and hunted once each, as the states change.
    const seen = new Map<number, string>(), a = unit(1, 'unaware'), b = unit(2, 'unaware');
    expect(changes(seen, [a, b])).toEqual({ noticed: [], hunted: [] });
    a.state = 'suspicious';
    expect(changes(seen, [a, b]).noticed).toEqual([a]);
    expect(changes(seen, [a, b]).noticed).toEqual([]);
    a.state = 'engaged'; b.state = 'engaged';
    expect(changes(seen, [a, b]).hunted).toEqual([a, b]);
    // The alert: to full within 2 s of the district engaging; half a minute after it's calm again, still high.
    let A = 0;
    for (let i = 0; i < 120; i++) A = easeAlert(A, 'engaged', 1 / 60);
    expect(A).toBe(1);
    for (let i = 0; i < 30 * 60; i++) A = easeAlert(A, 'unaware', 1 / 60);
    expect(A).toBeGreaterThan(0.7);
    for (let i = 0; i < 120 * 60; i++) A = easeAlert(A, 'unaware', 1 / 60);
    expect(A).toBe(0);
    expect(DREAD.level.searching).toBeGreaterThan(DREAD.level.heightened);
  });
});
