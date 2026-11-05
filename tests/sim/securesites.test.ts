// M10-38b: the high-security sites' own layouts (yuzhong/insides.ts, insides2.ts). Each walked on his own legs from
// just inside each of its ways in to its heart, along a way found through its rooms (its doors opened, its collapses
// standing); each lock on that way opened by what's found inside, reached without it; and its collapses forcing him
// round: cleared, some way in to the heart is shorter.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { syncWorld, doorSolid } from '../../src/sim/doors';
import { overlaps, raycast } from '../../src/world/geom';
import { MAT } from '../../src/world/mats';
import { B } from '../../src/sim/types';
import { run } from './helpers';
import type { Inter, Plot, Secure } from '../../src/world/world';

type P = { x: number; y: number; z: number };
const w = getWorld('yuzhong'), G = 0.2;
/** (The last way's nearest point to its first goal, for what's said when there's none.) */
let near = '';

function inside(c: [number, number][], x: number, z: number) {
  let n = false;
  for (let i = 0, j = c.length - 1; i < c.length; j = i++) if ((c[i][1] > z) !== (c[j][1] > z) && x < ((c[j][0] - c[i][0]) * (z - c[i][1])) / (c[j][1] - c[i][1]) + c[i][0]) n = !n;
  return n;
}
const floorAt = (x: number, y: number, z: number, down = 1.5) => { const h = raycast(w.index, x, y + 0.5, z, 0, -1, 0, down + 0.5); return h ? y + 0.5 - h.t : null; };
/** Room for him to stand there (0.25 m round; more, to keep off walls). */
const room = (x: number, y: number, z: number, r = 0.25) => !overlaps(w.index, { x0: x - r, y0: y + 0.35, z0: z - r, x1: x + r, y1: y + 1.7, z1: z + r });

/** A way on foot through a plot's building on a 0.2 m grid (up steps and ramps, down off them a metre at most, with
 *  his headroom, keeping off walls where there's room), from a point (in it, or by it) to within a metre of any of the goals: its
 *  points, or null. Every door in it open but the collapsed ones and those in `shut`; `off` solids taken away too. */
function way(p: Plot, from: P, goals: P[], shut = new Set<string>(), off: number[] = []): P[] | null {
  const doors = w.inter.filter(i => i.id.startsWith(`${p.prefix}-`) && (i.kind === 'door' || i.kind === 'grate') && i.data?.lock !== 'collapsed' && !shut.has(i.id)).map(doorSolid).filter(id => id >= 0);
  const was = [...doors, ...off].map(id => w.index.off[id]);
  for (const id of [...doors, ...off]) w.index.off[id] = 1;
  const y0 = floorAt(from.x, from.y + 0.3, from.z, 2)!, i0 = Math.round(from.x / G), j0 = Math.round(from.z / G);
  const key = (i: number, j: number, y: number) => `${i},${j},${Math.round(y * 2)}`, k0 = key(i0, j0, y0);
  const seen = new Map<string, string | null>([[k0, null]]), at = new Map<string, P>([[k0, { x: i0 * G, y: y0, z: j0 * G }]]);
  // (Dial's buckets by cost: a step 2, across 3, 6 more where it's tight; eight ways, so a turned building's doors
  // are gone through straight.)
  const buckets: [number, number, number, string][][] = [[[i0, j0, y0, k0]]], done = new Set<string>();
  let end: string | null = null;
  for (let c = 0; c < buckets.length && !end && done.size < 300000; c++) {
    for (const [i, j, y, k] of buckets[c] ?? []) {
      if (done.has(k)) continue;
      done.add(k);
      if (goals.some(g => Math.hypot(g.x - i * G, g.z - j * G) < 1 && Math.abs(g.y - y) < 0.6)) { end = k; break; }
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const ni = i + di, nj = j + dj, x = ni * G, z = nj * G;
        if (!inside(p.corners, x, z) && Math.hypot(x - from.x, z - from.z) > 1.6) continue;
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
    const g = goals[0], best = [...at.values()].reduce((a, b) => (Math.hypot(b.x - g?.x, b.z - g?.z) + Math.abs(b.y - g?.y) < Math.hypot(a.x - g?.x, a.z - g?.z) + Math.abs(a.y - g?.y) ? b : a));
    near = `${seen.size} cells; nearest ${best.x.toFixed(1)},${best.y.toFixed(1)},${best.z.toFixed(1)}`;
    return null;
  }
  const path: P[] = [];
  for (let k: string | null = end; k; k = seen.get(k)!) path.unshift(at.get(k)!);
  return path;
}

/** At a way in: on the street door's step, inside the roof door on its top landing, beside the manhole in the
 *  cellar, or a metre in through a way in an outer wall. */
function inFrom(S: Secure, p: Plot, kind: string, it: Inter): P {
  if (kind === 'card' || kind === 'door') return p.route![0];
  if (kind === 'roof') return p.route![p.route!.length - 2];
  const r = kind === 'basement' ? [1.3, 1.7] : [1.0, 1.4], y = kind === 'basement' ? it.y : it.y - 1.1;
  for (const d of r) for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8, x = it.x + Math.sin(a) * d, z = it.z + Math.cos(a) * d, f = floorAt(x, y + 0.3, z, 1);
    if (inside(p.corners, x, z) && f !== null && Math.abs(f - y) < 0.4 && room(x, f, z)) return { x, y: f, z };
  }
  throw new Error(`${S.id}: nowhere inside its ${kind}`);
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

describe('the high-security sites made by hand (M10-38b)', () => {
  for (const id of ['hospital', 'police', 'market', 'telecom', 'substation']) {
    it(`the ${id}: walked from each way in to its heart, its locks opened by what's inside, its collapses in the way`, () => {
      const S = w.secure!.find(q => q.id === id)!, p = w.plots.find(q => q.prefix === S.prefix)!, its = w.inter.filter(i => i.id.startsWith(`${S.prefix}-`));
      expect(inside(p.corners, S.heart.x, S.heart.z), 'its heart inside it').toBe(true);
      expect(S.heart.y, 'its heart up off the street').toBeGreaterThan(p.base + 2);
      const failed: string[] = [], lengths: number[] = [];
      for (const wy of S.ways) {
        const it = its.find(i => i.id === wy.id)!, from = inFrom(S, p, wy.kind, it), path = way(p, from, [S.heart]);
        if (!path) { failed.push(`${wy.kind}: no way to the heart from ${from.x.toFixed(1)},${from.y.toFixed(1)},${from.z.toFixed(1)} (${near})`); continue; }
        lengths.push(path.length);
        // The locks on the way: each opened by something found inside, reached from here without going through it.
        const locked = its.filter(d => d.kind === 'door' && needs(d).length && !S.ways.some(q => q.id === d.id) && path.some(q => Math.hypot(q.x - d.x, q.z - d.z) < 0.7 && Math.abs(q.y + 1.1 - d.y) < 0.8));
        const shut = new Set(locked.map(d => d.id));
        for (const d of locked) {
          const holders = its.filter(c => c.kind === 'container' && (c.data?.items as [string, number][] | undefined)?.some(([i]) => needs(d).includes(i)));
          const goals = holders.map(c => ({ x: c.x, y: floorAt(c.x, c.y, c.z, 3) ?? c.y, z: c.z }));
          if (!way(p, from, goals, shut)) failed.push(`${wy.kind}: nothing inside opens ${d.en} (${needs(d).join('/')})`);
        }
        const walked = walk(path);
        if (!walked.ok) failed.push(`${wy.kind}: stuck ${walked.at}`);
      }
      expect(failed.join('\n')).toBe('');
      // Its collapses (the heaps where it came down, its buried doors, its stairwell's fill) cleared: shorter.
      const fill = w.index.solids.map((q, n) => ({ q, n })).filter(({ q }) => q.mat === MAT.rubble && inside(p.corners, (q.x0 + q.x1) / 2, (q.z0 + q.z1) / 2)).map(({ n }) => n);
      const buried = its.filter(d => d.data?.lock === 'collapsed').map(doorSolid);
      const shorter = S.ways.some((wy, n) => { const it = its.find(i => i.id === wy.id)!, path = way(p, inFrom(S, p, wy.kind, it), [S.heart], new Set(), [...fill, ...buried]); return path && path.length < lengths[n] - 8; });
      expect(fill.length + buried.length, 'collapses').toBeGreaterThan(0);
      expect(shorter, 'a collapse in the way').toBe(true);
    }, 600000);
  }
});
