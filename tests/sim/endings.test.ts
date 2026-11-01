// M7-01: escapes and endings. A route's steps are kept in the run; into a site counts it; a district coming after him
// counts a time seen; walking into a route's ending zone ends the run on that route, and the save is gone.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { stepDone, summary, closeRun, ENDINGS } from '../../src/sim/escape';
import { writeSave, readSave } from '../../src/sim/save';

const shim = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };

describe('escapes and endings (M7-01)', () => {
  it('keeps route progress, counts sites and sightings, and ends the run on a route, clearing the save', () => {
    const zones = [{ kind: 'site:police', box: { x0: -2, y0: -1, z0: -12, x1: 2, y1: 4, z1: -8 } }, { kind: 'ending:boat', box: { x0: -2, y0: -1, z0: -32, x1: 2, y1: 4, z1: -28 } }];
    const { world: w, state: s } = setup([floor(0, 60)], { x: 0, y: 0, z: 0, yaw: 0 }, { zones });
    s.time = 3 * 86400 + 12 * 3600;
    const st = shim();
    writeSave(st, 'run', s);
    stepDone(s, 'boat', 'fuel'); stepDone(s, 'boat', 'battery');
    expect(Object.keys(s.escape!.boat)).toEqual(['fuel', 'battery']);
    // A district after him: one time seen.
    s.hive.districts.yuzhong = { state: 'engaged', since: s.time, contact: s.time, until: 0 };
    run(s, w, 31);
    s.hive.districts.yuzhong.state = 'searching';
    run(s, w, 31);
    // Through the site and on to the ending.
    const ends: string[] = [];
    run(s, w, secs(12), { my: 1, yaw: 0 }, x => { for (const e of x.events) if (e.t === 'ending') ends.push(e.route); });
    expect(ends).toEqual(['boat']);
    expect(s.ended?.route).toBe('boat');
    expect(ENDINGS[s.ended!.route].en).toBe('Into the Fog');
    expect(summary(s)).toEqual({ days: 3, sites: 1, seen: 1 });
    closeRun(st, s);
    expect(readSave(st)).toBeNull();
  });
});
