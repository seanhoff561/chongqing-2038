// Where he can get to on his own legs (M7-14), as the world stands and with the tools he has: a flood over the floors
// in half-metre steps (a step up or down, a drop or a pull-up over a lip no higher than the movement envelope's
// comfortable mantle, either way; a ladder, foot to top; never along a deep river bed), crouched, through the doors,
// windows, grates and the rest his tools open (the game's own lock rules), until it meets the machines' ways
// (the nav graph) where they join the start hideout's. A place is reachable if a flood from where he'd stand to work
// it (within reach of it, nothing between) gets there.
import { raycast } from '../../src/world/geom';
import { free } from '../../src/sim/physics';
import { movement as M } from '../../src/data/movement';
import { REACH } from '../../src/data/reach';
import { REACH as LOOK } from '../../src/sim/interact';
import { lockWay } from '../../src/sim/locks';
import { doorSolid } from '../../src/sim/doors';
import { has } from '../../src/sim/inventory';
import { nearestNav } from '../../src/sim/nav';
import type { SimState } from '../../src/sim/types';
import type { Box } from '../../src/world/geom';
import type { Inter, World } from '../../src/world/world';

type V3 = { x: number; y: number; z: number };
// (LOW: what he steps over, or stands on a slope of, without it counting against his room.)
const C = 0.5, H = M.height.crouch, UP = REACH.climb.up, STEP = M.stepHeight, LOW = 0.3;
const DIRS = [[C, 0], [-C, 0], [0, C], [0, -C], [C, C], [C, -C], [-C, C], [-C, -C]], NUDGE = [[0, 0], [0.2, 0], [-0.2, 0], [0, 0.2], [0, -0.2]];
const SHUT = new Set(['door', 'window', 'grate', 'rubble', 'fence', 'blastdoor']);

/** Whether he gets through a shut thing with what's in `s`'s pack (its own rules: sim/doors.ts, locks.ts, grate.ts,
 *  fence.ts, tunnelend.ts); `start` the grate over the start hideout, worked from below. */
export function opens(s: SimState, it: Inter, start?: string): boolean {
  const kit = (...ids: string[]) => ids.some(id => has(s.inv.pack, id));
  switch (it.kind) {
    case 'door': {
      if (it.data?.shutter) return kit('crowbar');
      const lock = it.data?.lock as string | undefined;
      return lock !== 'collapsed' && typeof lockWay(s, it, lock) !== 'string';
    }
    case 'window': return true;
    case 'grate': return it.id === start || !!it.data?.loose || kit('boltcutters', 'grinder');
    case 'rubble': return kit('crowbar');
    case 'fence': return kit('boltcutters');
    case 'blastdoor': return kit(it.data!.key as string, 'grinder', 'breach');
    default: return false;
  }
}

export interface Ways { w: World; s: SimState; start: string; dry: Box[]; nav: Set<number>; navGrid: Map<string, number[]>; links?: Map<string, V3[][]>; known?: Set<string> }

/** The world opened as far as `s`'s pack opens it (`dry`: water boxes taken as drained), the nav points joined to
 *  the start hideout's way out (`from`) by ways not through anything still shut; `run` inside it, the world put back after. */
export function withWays<T>(w: World, s: SimState, from: V3, start: string, dry: Box[], run: (g: Ways) => T): T {
  const ids: number[] = [], was: number[] = [];
  for (const it of w.inter) {
    const k = SHUT.has(it.kind) ? doorSolid(it) : -1;
    if (k === undefined || k < 0) continue;
    ids.push(k); was.push(w.index.off[k]);
    w.index.off[k] = opens(s, it, start) ? 1 : 0;
  }
  try {
    const nav = w.nav!, P = nav.pts, shut = new Set(ids.filter(k => !w.index.off[k]));
    // A stretch of the machines' ways that runs into something still shut is no way for him.
    const blocked = (i: number, j: number) => [0.5, 1.2].some(h => {
      const a = P[i], b = P[j], L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      if (L < 0.01) return false;
      const hit = raycast(w.index, a.x, a.y + h, a.z, (b.x - a.x) / L, (b.y - a.y) / L, (b.z - a.z) / L, L);
      return !!hit && shut.has(hit.id);
    });
    const seen = new Set<number>(), a0 = nearestNav(nav, from), q = [a0];
    seen.add(a0);
    while (q.length) {
      const i = q.pop()!;
      for (const [j] of nav.adj[i]) if (!seen.has(j) && !blocked(i, j)) { seen.add(j); q.push(j); }
    }
    const navGrid = new Map<string, number[]>();
    for (const i of seen) { const k = `${Math.floor(P[i].x / 4)},${Math.floor(P[i].z / 4)}`; (navGrid.get(k) ?? navGrid.set(k, []).get(k)!).push(i); }
    return run({ w, s, start, dry, nav: seen, navGrid });
  } finally {
    ids.forEach((k, n) => (w.index.off[k] = was[n]));
  }
}

/** Whether a floor here is under deep water (he'd swim, not walk; `dry` boxes drained). */
const deep = (g: Ways, x: number, f: number, z: number) => g.w.water.some(b => !g.dry.includes(b) && x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && f < b.y1 - 1.2 && f > b.y0 - 3);
/** A floor he fits on (crouched) in the column at x, z, looked for from `top` down `len`. */
function floorAt(g: Ways, x: number, top: number, z: number, len: number): number | null {
  const hit = raycast(g.w.index, x, top, z, 0, -1, 0, len);
  if (!hit) return null;
  const f = top - hit.t;
  return free(g.w.index, x, f + LOW, z, H - LOW) && !deep(g, x, f, z) ? f : null;
}

/** The ladders and doorways in each 4 m cell, once a world. */
const cell = (x: number, z: number) => `${Math.floor(x / 4)},${Math.floor(z / 4)}`, things = new WeakMap<World, Map<string, (Inter | World['climbables'][number])[]>>();
function thingsIn(w: World, k: string) {
  let m = things.get(w);
  if (!m) {
    things.set(w, (m = new Map()));
    for (const t of [...w.climbables.filter(c => c.kind === 'ladder'), ...w.inter.filter(i => i.kind === 'door' || i.kind === 'blastdoor')]) { const c = cell(t.x, t.z); (m.get(c) ?? m.set(c, []).get(c)!).push(t); }
  }
  return m.get(k) ?? [];
}

/** The ways through that the lattice can miss in a 4 m cell, each a set of floors joined to each other: a ladder (its
 *  foot, and the floors he steps off onto round its top, up to 2 m off, nothing between) and a doorway open to him (the
 *  floors either side of it, nothing between them and its middle: a turned building's doorway is narrower than a
 *  cell's reach). Found as the floods come to them. */
export function links(g: Ways, k: string): V3[][] {
  const got = (g.links ??= new Map()).get(k);
  if (got) return got;
  const out: V3[][] = [];
  g.links.set(k, out);
  const round = (cx: number, cy: number, cz: number, ds: number[], ok: (f: number) => boolean, h: number) => {
    const e: V3[] = [];
    for (const d of ds) for (let n = 0; n < 16; n++) {
      const dx = Math.sin((n * Math.PI) / 8) * d, dz = Math.cos((n * Math.PI) / 8) * d, f = floorAt(g, cx + dx, cy, cz + dz, 2.6);
      if (f !== null && ok(f) && !raycast(g.w.index, cx, f + h, cz, dx / d, 0, dz / d, d)) e.push({ x: cx + dx, y: f, z: cz + dz });
    }
    return e;
  };
  for (const t of thingsIn(g.w, k)) {
    if ('y0' in t) {
      const f0 = floorAt(g, t.x + t.nx * 0.6, t.y0 + 1, t.z + t.nz * 0.6, 2.5), e = round(t.x + t.nx * 0.3, t.y1 + 1.2, t.z + t.nz * 0.3, [0.5, 1, 1.5, 2], f => f > t.y1 - 1.6, 1.3);
      if (f0 !== null && e.length) out.push([{ x: t.x + t.nx * 0.6, y: f0, z: t.z + t.nz * 0.6 }, ...e]);
    } else if (g.w.index.off[doorSolid(t) ?? -1]) {
      const y = t.y - 1.1, e = round(t.x, y + 0.6, t.z, [0.5, 0.7, 0.9], f => Math.abs(f - y) < 0.5, 0.8);
      if (e.length > 1) out.push(e);
    }
  }
  return out;
}

/** A flood from `seeds` (kept to cells `keep` takes) until `done` (the cell where it was), or null when it runs out
 *  (or past `max` cells). Each step half a metre (or a diagonal), nudged up to 0.2 m aside to fit, nothing between at
 *  the knee; a step up or down, a drop, or a lip pulled up over. */
export function flood(g: Ways, seeds: V3[], done: (p: V3) => boolean, max = 60000, keep = (_: V3) => true, seen = new Set<string>()): V3 | null {
  const q: V3[] = [], idx = g.w.index;
  const push = (p: V3) => { const k = key(p.x, p.y, p.z); if (!seen.has(k) && keep(p)) { seen.add(k); q.push(p); } };
  const clear = (x: number, y: number, z: number, nx: number, nz: number) => { const d = Math.hypot(nx - x, nz - z); return !raycast(idx, x, y, z, (nx - x) / d, 0, (nz - z) / d, d); };
  seeds.forEach(push);
  for (let n = 0; n < q.length && n < max; n++) {
    const { x, y: f, z } = q[n];
    if (done(q[n])) return q[n];
    for (const [dx, dz] of DIRS) for (const [ox, oz] of NUDGE) {
      if (seen.has(key(x + dx, f, z + dz)) && (ox || oz)) break;
      const nx = x + dx + ox, nz = z + dz + oz, f1 = floorAt(g, nx, f + STEP + 0.05, nz, STEP + UP + 0.05);
      if (f1 !== null && clear(x, Math.max(f, f1) + 0.6, z, nx, nz)) { push({ x: nx, y: f1, z: nz }); break; }
      // (A lip to pull himself up over.)
      const f2 = f1 === null && !ox && !oz ? floorAt(g, nx, f + UP + 0.05, nz, UP - STEP) : null;
      if (f2 !== null && f2 > f + STEP && free(idx, x, f + LOW, z, f2 - f + H - LOW)) { push({ x: nx, y: f2, z: nz }); break; }
    }
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const e of links(g, `${Math.floor(x / 4) + i},${Math.floor(z / 4) + j}`))
      if (e.some(p => Math.hypot(p.x - x, p.z - z) < 0.5 && Math.abs(p.y - f) < 0.6)) e.forEach(push);
  }
  return null;
}

/** Whether a cell is on the machines' ways joined to the hideout's (or one a flood from them has been through). */
export const onWays = (g: Ways) => (p: V3) => {
  if (g.known?.has(key(p.x, p.y, p.z))) return true;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const n of g.navGrid.get(`${Math.floor(p.x / 4) + i},${Math.floor(p.z / 4) + j}`) ?? []) {
    const q = g.w.nav!.pts[n];
    if (Math.hypot(q.x - p.x, q.z - p.z) < 1 && Math.abs(q.y - p.y) < 1.2) return true;
  }
  return false;
};

const key = (x: number, f: number, z: number) => `${Math.round(x / C)},${Math.round(f)},${Math.round(z / C)}`;

/** Where he'd stand to work a thing at `t` (reach `r`, as interact.ts's look): floors within reach, his eyes (crouched
 *  or standing) on it with nothing between. */
export function standsBy(g: Ways, t: V3, r = 0.5): V3[] {
  const out: V3[] = [], R = LOOK + r - 0.3;
  for (let i = -Math.ceil(R / C); i <= Math.ceil(R / C); i++) for (let j = -Math.ceil(R / C); j <= Math.ceil(R / C); j++) {
    const x = Math.round(t.x / C) * C + i * C, z = Math.round(t.z / C) * C + j * C;
    if (Math.hypot(x - t.x, z - t.z) > R) continue;
    const f = floorAt(g, x, t.y + 0.6, z, 3.5);
    if (f === null) continue;
    const ok = [M.eye.crouch, M.eye.stand].some(e => {
      const ey = f + e, d = Math.hypot(t.x - x, t.y - ey, t.z - z);
      if (d > LOOK + r || (e === M.eye.stand && !free(g.w.index, x, f + LOW, z, M.height.stand - LOW))) return false;
      const hit = raycast(g.w.index, x, ey, z, (t.x - x) / d, (t.y - ey) / d, (t.z - z) / d, d);
      return !hit || hit.t >= d - r - 0.05;
    });
    if (ok) out.push({ x, y: f, z });
  }
  return out;
}

/** Whether he gets to work a thing and back to the ways: the cell he left by, or null. (The floor a flood that got
 *  there went over is known to be joined to them, for the next.) */
export function reachable(g: Ways, t: V3, r = 0.5): V3 | null {
  const by = standsBy(g, t, r), seen = new Set<string>(), at = by.length ? flood(g, by, onWays(g), 100000, undefined, seen) : null;
  if (at) for (const k of seen) (g.known ??= new Set()).add(k);
  return at;
}
