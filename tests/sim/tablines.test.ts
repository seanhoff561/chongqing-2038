// M10-53 (U-104): the first time he turns to each of the laptop's apps Anna says her line on it, once a run; the
// status page's is her first speech (M10-52), the map's the family flat (M10-40), and each place he learns of after
// gets her line the next time the map comes up.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { startRun } from '../../src/sim/run';
import { learn } from '../../src/sim/places';
import { TAB_LINES, MAP_LINES } from '../../src/data/dialogue';
import type { SimState } from '../../src/sim/types';
import { run } from './helpers';

const w = getWorld('hideout');
/** A command, and what Anna says to it. */
const act = (s: SimState, name: string, arg?: string | number) => { const said: string[] = []; run(s, w, 1, { cmds: [{ c: 'act', name, arg }] }, x => { for (const e of x.events) if (e.t === 'say') said.push(e.id); }); return said; };

describe("Anna's word on each app (M10-53)", () => {
  it('every app but the map and status has a line of its own (ui/lappages.ts PAGES)', () => {
    expect(Object.keys(TAB_LINES).sort()).toEqual(['cams', 'drone', 'logs', 'notes', 'scan', 'songs', 'training']);
  });

  it('says each app\'s line the first time he turns to it, and never again', () => {
    const s = createState(2, w);
    startRun(s, w);
    for (const id of Object.keys(TAB_LINES)) {
      expect(act(s, 'tab', id), id).toEqual(TAB_LINES[id].map(l => l.id));
      expect(act(s, 'tab', id), id).toEqual([]);
    }
    // (Remembered in the run.)
    expect(JSON.parse(JSON.stringify(s)).tabs).toEqual(Object.keys(TAB_LINES));
    expect(act(s, 'tab', 'status')).toEqual([]);
    expect(act(s, 'tab', 'nonsense')).toEqual([]);
  });

  it('the map: the flat the first time; a place learned since, its line the next time', () => {
    const s = createState(2, w);
    startRun(s, w);
    expect(act(s, 'map', 1)).toEqual(MAP_LINES.flat.map(l => l.id));
    act(s, 'map', 0);
    expect(act(s, 'map', 1)).toEqual([]);
    act(s, 'map', 0);
    run(s, w, 2);
    learn(s, 'pier');
    expect(act(s, 'map', 1)).toEqual(MAP_LINES.pier.map(l => l.id));
    act(s, 'map', 0);
    expect(act(s, 'map', 1)).toEqual([]);
  });
});
