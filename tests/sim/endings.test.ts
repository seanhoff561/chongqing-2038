// M7-01, M10-51: escapes and endings. A route's steps are kept in the run; into a site counts it; a district coming
// after him counts a time seen; walking into a route's ending zone ends the run on that route, and the save is gone.
// In the city each of the four ways out has its ending zone at its far end, only where that way gets him; reaching it
// ends the run with that ending, with his sister or without, and the summary tallies the run.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { stepDone, summary, closeRun } from '../../src/sim/escape';
import { ENDINGS } from '../../src/data/endings';
import { endingLines } from '../../src/data/dialogue';
import { writeSave, readSave } from '../../src/sim/save';
import { hurtUnit } from '../../src/sim/damage';
import { newUid } from '../../src/sim/inventory';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { startRun } from '../../src/sim/run';
import { teleport } from '../../src/sim/player';
import { sisterRoute, ROUTES } from '../../src/sim/sister';
import { heightAt } from '../../src/world/heightfield';
import { WATER_Y } from '../../src/world/yuzhong/ground';
import type { Box } from '../../src/world/geom';

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
    expect(summary(s)).toMatchObject({ days: 3, sites: 1, seen: 1, sister: false });
    closeRun(st, s);
    expect(readSave(st)).toBeNull();
  });

  it('tallies how far he went (not a teleport), the machines he destroyed (not cameras) and the documents he found', () => {
    const patrols = [{ kind: 'street' as const, unit: 'quadruped' as const, pts: [{ x: 0, y: 0, z: -40 }, { x: 0, y: 0, z: -60 }], dwell: [600, 5], hours: [0, 24] as [number, number] }];
    const cameras = [{ kind: 'camera' as const, x: 5, y: 4, z: 0, yaw: 0 }];
    const { world: w, state: s } = setup([floor(0, 200)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols, cameras });
    s.flags.god = true;
    run(s, w, 31);
    run(s, w, secs(10), { my: 1, yaw: 0 });
    const walked = s.stats!.dist!;
    expect(walked).toBeGreaterThan(20);
    teleport(s.player, 0, 0, 80);
    run(s, w, 61);
    expect(s.stats!.dist! - walked).toBeLessThan(1);
    for (const u of s.units) while (!u.dead) hurtUnit(s, w, u, 'body', 50);
    s.inv.pack.items.push({ uid: newUid(s), id: 'doc-chat', n: 1, x: 0, y: 0, rot: false }, { uid: newUid(s), id: 'xy-boat-2', n: 1, x: 0, y: 0, rot: false });
    run(s, w, 31);
    expect(summary(s)).toMatchObject({ kills: 1, docs: 2 });
  });
});

describe('the four ways out (M10-51)', () => {
  const w = getWorld('yuzhong');
  const zone = (route: string) => w.zones.find(z => z.kind === `ending:${route}`)!.box;
  const mid = (b: Box) => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, z: (b.z0 + b.z1) / 2 });
  const seedFor = (route: string) => { let n = 1; while (sisterRoute(n) !== route) n++; return n; };

  it('has an ending zone at each way out\'s far end, only where that way gets him', () => {
    for (const r of ROUTES) expect(zone(r), r).toBeDefined();
    const g = w.ground!, h = (x: number, z: number) => heightAt(g, x, z) ?? -Infinity;
    // The bridge's end on the far bank: dry ground, well up off the water.
    const b = mid(zone('bridge'));
    expect(h(b.x, b.z)).toBeGreaterThan(WATER_Y + 20);
    // The cableway: out over the open water, high above it.
    const c = zone('cable');
    for (const [x, z] of [[c.x0, c.z0], [c.x1, c.z0], [c.x0, c.z1], [c.x1, c.z1]]) expect(h(x, z), `cable ${x},${z}`).toBeLessThan(WATER_Y);
    expect(c.y0).toBeGreaterThan(WATER_Y + 15);
    // The river: open water all round, at the surface.
    const o = zone('boat');
    for (let x = o.x0; x <= o.x1; x += 40) for (let z = o.z0; z <= o.z1; z += 40) expect(h(x, z), `boat ${x},${z}`).toBeLessThan(WATER_Y);
    expect(o.y0 < WATER_Y && o.y1 > WATER_Y).toBe(true);
    // The tunnel: down at the metro's level, deep under the street.
    const t = mid(zone('tunnel'));
    expect(h(t.x, t.z) - t.y).toBeGreaterThan(10);
    // No teleport and none of the places he'd stand about in is in one.
    for (const q of w.teleports) for (const r of ROUTES) {
      const z = zone(r);
      expect(q.x >= z.x0 && q.x <= z.x1 && q.y >= z.y0 && q.y <= z.y1 && q.z >= z.z0 && q.z <= z.z1, `${q.name} in ${r}`).toBe(false);
    }
  }, 600000);

  for (const route of ['bridge', 'cable', 'boat', 'tunnel']) for (const sister of [false, true]) {
    it(`${route}: reaching its far end ends the run ${sister ? 'with Xiaoyu' : 'alone'}, its ending and summary`, () => {
      const s = createState(seedFor(route), w);
      s.flags.god = true;
      startRun(s, w);
      expect(s.sister?.route).toBe(route);
      // (By the river she has to have come down into the boat, M7-09; by the cableway, ridden the cabin with him, M7-05;
      // under the ground, the water pumped out, M7-11.)
      if (sister) { s.sister!.with = true; s.sister!.aboard = route === 'boat' || route === 'cable'; if (route === 'tunnel') s.escape = { tunnel: { drained: 0 } }; }
      run(s, w, 40);
      expect(s.ended).toBeUndefined();
      const p = mid(zone(route)), ends: unknown[] = [];
      teleport(s.player, p.x, p.y, p.z);
      s.player.vel = { x: 0, y: 0, z: 0 };
      run(s, w, 31, {}, x => { for (const e of x.events) if (e.t === 'ending') ends.push(e); });
      expect(ends).toEqual([{ t: 'ending', route, sister }]);
      expect(s.ended).toMatchObject({ route, sister });
      expect(summary(s)).toMatchObject({ days: 0, sister });
      // Its sequence: the exchange (Xiaoyu in it only if she came), and its name, crossing and last words.
      const lines = endingLines(route, sister);
      expect(lines.length).toBe(4);
      expect(lines.some(l => l.speaker === 'xiaoyu')).toBe(sister);
      const E = ENDINGS[route];
      expect(E.far.length * E.alone.length * E.together.length).toBeGreaterThan(0);
      expect(E.together).toContain('Xiaoyu');
      expect(E.alone).not.toContain('Xiaoyu');
    }, 600000);
  }
});
