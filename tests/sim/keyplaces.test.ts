// M10-40 (U-104): key places come onto Anna's map as he learns of them. None is known as a run starts; a document or
// a note of his sister's that names one marks it once he has it, and walking into one marks it; the next time the map
// comes up Anna says her line on each new one (the first time, his family's flat), and it's new on the map until he
// puts the map away.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { startRun } from '../../src/sim/run';
import { teleport } from '../../src/sim/player';
import { keyPlaces, isNew } from '../../src/sim/places';
import { DOCS } from '../../src/data/documents';
import { NOTES } from '../../src/data/sister';
import { MAP_LINES } from '../../src/data/dialogue';
import { newUid } from '../../src/sim/inventory';
import type { SimState } from '../../src/sim/types';
import { run } from './helpers';

const w = getWorld('yuzhong');
const fresh = () => { const s = createState(7, w); s.flags.god = true; startRun(s, w); return s; };
/** The map brought up (or put away), and what Anna says. */
const map = (s: SimState, up: boolean) => { const said: string[] = []; run(s, w, 1, { cmds: [{ c: 'act', name: 'map', arg: up ? 1 : 0 }] }, x => { for (const e of x.events) if (e.t === 'say') said.push(e.id); }); return said; };

describe('key places on the map as he learns of them (M10-40)', () => {
  it('has every site, the exits\' approaches and the rest; every place a clue names is one of them', () => {
    const ps = keyPlaces(w), ids = ps.map(q => q.id);
    for (const k of ['hospital', 'police', 'market', 'telecom', 'substation', 'site', 'pier', 'tunnel', 'shelter', 'junction', 'metro', 'flat', 'steps', 'cableway', 'bridge']) expect(ids, k).toContain(k);
    expect(ids.filter(i => i.startsWith('metro:')).length).toBeGreaterThanOrEqual(4);
    for (const d of [...DOCS, ...NOTES]) for (const n of d.names ?? []) expect(ids, `${d.id} names ${n}`).toContain(n);
    // (Every one has Anna's word on it.)
    for (const q of ps) expect(MAP_LINES[q.id] ?? MAP_LINES[q.id.split(':')[0]], q.id).toBeTruthy();
  }, 600000);

  it('knows none at the start; a clue he picks up marks its places; Anna names them as the map comes up', () => {
    const s = fresh();
    expect(s.known ?? {}).toEqual({});
    // (The friends' hideout is no key place: a little while there marks nothing.)
    run(s, w, 60);
    expect(s.known ?? {}).toEqual({});
    // The first look at the map: his family's flat, with Anna's two lines.
    expect(map(s, true)).toEqual(['map-flat-1', 'map-flat-2']);
    expect(Object.keys(s.known!)).toEqual(['flat']);
    expect(isNew(s, 'flat')).toBe(true);
    map(s, false);
    expect(isNew(s, 'flat')).toBe(false);
    // The printed chat log, picked up: the bridge and the cableway, said the next time the map's up, and only then.
    s.inv.pack.items.push({ uid: newUid(s), id: 'doc-chat', n: 1, x: 0, y: 0, rot: false });
    run(s, w, 31);
    expect(Object.keys(s.known!).sort()).toEqual(['bridge', 'cableway', 'flat']);
    expect(map(s, true)).toEqual(['map-bridge', 'map-cableway']);
    expect(isNew(s, 'bridge') && !isNew(s, 'flat')).toBe(true);
    expect(map(s, false)).toEqual([]);
    expect(map(s, true)).toEqual([]);
    // One of her notes the same.
    s.inv.pack.items.push({ uid: newUid(s), id: 'xy-boat-2', n: 1, x: 0, y: 0, rot: false });
    run(s, w, 31);
    expect(s.known!.pier).toBeDefined();
  }, 600000);

  it('marks a place he walks into, and not one he only passes near', () => {
    const s = fresh(), sh = w.teleports.find(t => t.name === 'Air-raid shelter')!, sub = keyPlaces(w).find(q => q.id === 'substation')!;
    // Out on the street above the shelter, metres higher: not in it.
    teleport(s.player, sh.x, sh.y + 30, sh.z);
    s.player.vel = { x: 0, y: 0, z: 0 };
    run(s, w, 31);
    expect(s.known?.shelter).toBeUndefined();
    teleport(s.player, sh.x, sh.y, sh.z);
    run(s, w, 31);
    expect(s.known?.shelter).toBeDefined();
    // Into the substation's yard, inside its footprint.
    teleport(s.player, (sub.box!.x0 + sub.box!.x1) / 2, 200, (sub.box!.z0 + sub.box!.z1) / 2);
    run(s, w, 31);
    expect(s.known?.substation).toBeDefined();
    expect(map(s, true)).toEqual(['map-shelter', 'map-substation', 'map-flat-1', 'map-flat-2']);
  }, 600000);
});
