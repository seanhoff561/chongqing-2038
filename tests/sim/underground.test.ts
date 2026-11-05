// M10-38c: the places under the city made by hand: the air-raid shelter (yuzhong/airraid.ts), Jiefangbei station's
// concourse and control room (metroroom.ts) and the Grand Tunnel's galleries and cool room (tunnels.ts). Each walked on
// his own legs from each of its ways in (its `in:<place>:<way>` marks) to its heart, along a way found through its
// halls (its doors open, its collapses standing); each lock on that way opened by what's found in it, reached without
// going through it; its collapses sending him round (cleared, some way in to the heart is shorter); its story in it.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { syncWorld, doorSolid } from '../../src/sim/doors';
import { overlaps, raycast } from '../../src/world/geom';
import { MAT } from '../../src/world/mats';
import { docSpot } from '../../src/sim/documents';
import { B } from '../../src/sim/types';
import { run } from './helpers';
import type { Inter } from '../../src/world/world';

type P = { x: number; y: number; z: number };
type Box = { x0: number; z0: number; x1: number; z1: number };
const w = getWorld('yuzhong'), G = 0.25;
let near = '';

const floorAt = (x: number, y: number, z: number, down = 1.5) => { const h = raycast(w.index, x, y + 0.5, z, 0, -1, 0, down + 0.5); return h ? y + 0.5 - h.t : null; };
const room = (x: number, y: number, z: number, r = 0.25) => !overlaps(w.index, { x0: x - r, y0: y + 0.35, z0: z - r, x1: x + r, y1: y + 1.7, z1: z + r });
const within = (b: Box, x: number, z: number) => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1;

/** A way on foot within the box on a 0.25 m grid (up steps and ramps, down off them a metre at most, with his
 *  headroom, off the walls where there's room), from a point to within a metre of any of the goals: its points, or
 *  null. Every door in the box open but the buried ones and those in `shut`; `off` solids taken away too. */
function way(b: Box, from: P, goals: P[], shut = new Set<string>(), off: number[] = []): P[] | null {
  const doors = w.inter.filter(i => (i.kind === 'door' || i.kind === 'grate') && within(b, i.x, i.z) && i.data?.lock !== 'collapsed' && !shut.has(i.id)).map(doorSolid).filter(id => id >= 0);
  const was = [...doors, ...off].map(id => w.index.off[id]);
  for (const id of [...doors, ...off]) w.index.off[id] = 1;
  const y0 = floorAt(from.x, from.y + 0.3, from.z, 2)!, i0 = Math.round(from.x / G), j0 = Math.round(from.z / G);
  const key = (i: number, j: number, y: number) => `${i},${j},${Math.round(y * 2)}`, k0 = key(i0, j0, y0);
  const seen = new Map<string, string | null>([[k0, null]]), at = new Map<string, P>([[k0, { x: i0 * G, y: y0, z: j0 * G }]]);
  const buckets: [number, number, number, string][][] = [[[i0, j0, y0, k0]]], done = new Set<string>();
  let end: string | null = null;
  for (let c = 0; c < buckets.length && !end && done.size < 600000; c++) {
    for (const [i, j, y, k] of buckets[c] ?? []) {
      if (done.has(k)) continue;
      done.add(k);
      if (goals.some(g => Math.hypot(g.x - i * G, g.z - j * G) < 1 && Math.abs(g.y - y) < 0.6)) { end = k; break; }
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const ni = i + di, nj = j + dj, x = ni * G, z = nj * G;
        if (!within(b, x, z)) continue;
        const ny = floorAt(x, y, z, 1);
        if (ny === null || ny > y + 0.46 || !room(x, ny, z, 0.25)) continue;
        const nk = key(ni, nj, ny);
        if (seen.has(nk)) continue;
        seen.set(nk, k); at.set(nk, { x, y: ny, z });
        (buckets[c + (di && dj ? 3 : 2) + (room(x, ny, z, 0.45) ? 0 : 6)] ??= []).push([ni, nj, ny, nk]);
      }
    }
  }
  [...doors, ...off].forEach((id, n) => (w.index.off[id] = was[n]));
  if (!end) {
    const g = goals[0], best = [...at.values()].reduce((a, q) => (Math.hypot(q.x - g.x, q.z - g.z) + Math.abs(q.y - g.y) < Math.hypot(a.x - g.x, a.z - g.z) + Math.abs(a.y - g.y) ? q : a));
    near = `${seen.size} cells; nearest ${best.x.toFixed(1)},${best.y.toFixed(1)},${best.z.toFixed(1)}`;
    return null;
  }
  const path: P[] = [];
  for (let k: string | null = end; k; k = seen.get(k)!) path.unshift(at.get(k)!);
  return path;
}

/** Walk him along a way's points (every third), facing each, at a run, hopping when he's stuck; how far he got. */
function walk(path: P[]) {
  const s = createState(5, w);
  s.flags.clear = true; s.flags.god = true; s.time = 12 * 3600;
  for (const u of s.units) u.off = Infinity;
  for (const it of w.inter) if (it.kind === 'door' && it.data?.lock !== 'collapsed') s.wstate.open[it.id] = true;
  syncWorld(s, w);
  teleport(s.player, path[0].x, path[0].y + 0.05, path[0].z);
  run(s, w, 10);
  const pts = path.filter((_, n) => n % 3 === 0 || n === path.length - 1);
  for (let n = 0; n < pts.length; n++) {
    const q = pts[n];
    let still = 0, last = { ...s.player.pos };
    for (let t = 0; t < 60 * 4; t++) {
      const p = s.player.pos, dx = q.x - p.x, dz = q.z - p.z;
      if (Math.hypot(dx, dz) < 0.4 && Math.abs(q.y - p.y) < 0.8) break;
      const hop = still > 20 && still % 30 < 2, side = still > 10 ? (Math.floor(still / 15) % 2 ? 1 : -1) : 0;
      run(s, w, 1, { yaw: Math.atan2(-dx, -dz), my: 1, mx: side, buttons: B.SPRINT | (hop ? B.JUMP : 0), pressed: hop ? B.JUMP : 0 });
      if (Math.hypot(p.x - last.x, p.z - last.z) < 0.02) still++; else { still = 0; last = { ...p }; }
    }
    const p = s.player.pos;
    if (Math.hypot(q.x - p.x, q.z - p.z) >= 0.6 || Math.abs(q.y - p.y) >= 0.8) return { ok: false, at: `${n}/${pts.length}: at ${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)} for ${q.x.toFixed(1)},${q.y.toFixed(1)},${q.z.toFixed(1)}` };
  }
  return { ok: !s.dead, at: '' };
}

/** What opens a door, if it needs anything: its card, or a tool. */
const needs = (it: Inter): string[] => (it.data?.key ? [it.data.key as string] : it.data?.lock === 'chained' ? ['boltcutters', 'crowbar'] : it.data?.lock === 'locked' ? ['crowbar'] : []);

describe('the places under the city made by hand (M10-38c)', () => {
  for (const [place, doc] of [['shelter', 'shelter'], ['metro', 'metro'], ['gt', null]] as const) {
    it(`the ${place}: walked from each way in to its heart, its locks opened by what's in it, its collapses in the way`, () => {
      const ins = w.features.filter(f => f.kind.startsWith(`in:${place}:`)), heart = w.features.find(f => f.kind === `heart:${place}`)!;
      expect(ins.length, 'ways in').toBeGreaterThanOrEqual(3);
      const all = [...ins, heart], b: Box = { x0: Math.min(...all.map(q => q.x)) - 14, z0: Math.min(...all.map(q => q.z)) - 14, x1: Math.max(...all.map(q => q.x)) + 14, z1: Math.max(...all.map(q => q.z)) + 14 };
      const its = w.inter.filter(i => within(b, i.x, i.z) && Math.abs(i.y - heart.y) < 12);
      const failed: string[] = [], lengths: number[] = [];
      for (const from of ins) {
        const path = way(b, from, [heart]);
        if (!path) { failed.push(`${from.kind}: no way to the heart (${near})`); lengths.push(Infinity); continue; }
        lengths.push(path.length);
        // The locks on the way: each opened by something found in the place, reached from here without going through it.
        const locked = its.filter(d => d.kind === 'door' && needs(d).length && path.some(q => Math.hypot(q.x - d.x, q.z - d.z) < 0.8 && Math.abs(q.y + 1.1 - d.y) < 0.8));
        const shut = new Set(locked.map(d => d.id));
        for (const d of locked) {
          const holders = its.filter(c => c.kind === 'container' && (c.data?.items as [string, number][] | undefined)?.some(([i]) => needs(d).includes(i)));
          const goals = holders.map(c => ({ x: c.x, y: floorAt(c.x, c.y, c.z, 3) ?? c.y, z: c.z }));
          if (!goals.length || !way(b, from, goals, shut)) failed.push(`${from.kind}: nothing in it opens ${d.en} (${needs(d).join('/')})`);
        }
        const walked = walk(path);
        if (!walked.ok) failed.push(`${from.kind}: stuck ${walked.at}`);
      }
      expect(failed.join('\n')).toBe('');
      // Its collapses (heaps where it came down, buried doors) cleared: some way in to the heart shorter.
      const fill = w.index.solids.map((q, n) => ({ q, n })).filter(({ q }) => q.mat === MAT.rubble && within(b, (q.x0 + q.x1) / 2, (q.z0 + q.z1) / 2) && Math.abs(q.y0 - heart.y) < 1).map(({ n }) => n);
      const buried = its.filter(d => d.data?.lock === 'collapsed').map(doorSolid);
      expect(fill.length + buried.length, 'collapses').toBeGreaterThan(0);
      const cleared = ins.map(from => way(b, from, [heart], new Set(), [...fill, ...buried])?.length ?? Infinity);
      expect(cleared.some((l, n) => l < lengths[n] - 8), `a collapse in the way (${lengths.join(', ')} cleared ${cleared.join(', ')})`).toBe(true);
      // Its story in what's in it: words on its walls, and its story document by its heart.
      expect(w.props.filter(p => p.kind === 'graffiti' && within(b, p.x, p.z) && Math.abs(p.y - heart.y) < 6).length, 'words on its walls').toBeGreaterThanOrEqual(4);
      if (doc) { const t = docSpot(w, doc)!; expect(Math.hypot(t.x - heart.x, t.z - heart.z), 'its document by its heart').toBeLessThan(6); }
    }, 900000);
  }
});
