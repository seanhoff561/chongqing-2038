// Cutting the city down under what passes over it (M6-16, M6-07): the cableway's ropes and the bridges' decks. What
// the city made in their way (its own buildings, and what it strung or set out there) stands lower, found before the
// city's built and cut once it stands and is joined up, so every die falls as it did and nothing else moves.
import { solid, turn, type Solid } from '../geom';
import { MAT } from '../mats';
import { SLAB, FLOOR } from '../city/rooms';
import { corners } from './shapes';
import type { Fabric } from '../city/buildings';
import type { Plan } from './lots';
import type { Plot } from '../world';
import { sin, cos } from '../trig';

/** How high what the city made may stand at a footprint's points (x, z): Infinity where nothing passes over. */
export type Ceil = (pts: [number, number][]) => number;

/** The city's own buildings (none on the map, nor one made by hand) in the way, and the height each is cut down to:
 *  by whole floors to under the ceiling, a floor at least (none, under a `bare` one). Found before the city's built, cut once it stands
 *  (cutDown()): everything drawn for its dice is drawn as it was. */
export function cutsUnder(plans: Plan[], ceil: Ceil, bare?: Ceil): Map<Plan, number> {
  const cuts = new Map<Plan, number>();
  for (const p of plans) {
    if (p.osm || p.inside) continue;
    // (Under a bridge's deck where it comes down to the ground, not a floor kept: razed to its ground floor's slab.)
    const k = corners(p.obb), y = ceil(k), least = bare && bare(k) <= y ? 0 : 1, c = p.base + Math.max(least, Math.floor((y - p.base) / FLOOR)) * FLOOR;
    if (c < p.wall) cuts.set(p, c);
  }
  return cuts;
}

/** Whether a connection from a to b (a plank, a cable, a beam: crossings.ts) would be in the way: through the space
 *  over the ceiling, or to a building cut down there, over its cut. */
export const inWayUnder = (ceil: Ceil, cuts: Map<Plan, number>) => (a: [number, number, number], b: [number, number, number]) => {
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2])) + 1;
  for (let i = 0; i <= n; i++) {
    const x = a[0] + ((b[0] - a[0]) * i) / n, y = a[1] + ((b[1] - a[1]) * i) / n, z = a[2] + ((b[2] - a[2]) * i) / n;
    if (y > ceil([[x, z]])) return true;
    for (const [p, c] of cuts) if (y > c - 0.5 && inObb(p, x, z, 1.5)) return true;
  }
  return false;
};
const inObb = (p: Plan, x: number, z: number, m: number) => {
  const o = p.obb, c = cos(o.yaw), s = sin(o.yaw), dx = x - o.cx, dz = z - o.cz;
  return Math.abs(c * dx + s * dz) <= o.hw + m && Math.abs(-s * dx + c * dz) <= o.hd + m;
};

/** Once the city stands and is joined up, the buildings in the way cut down (cutsUnder()): all a building made
 *  over its cut gone (its windows there kept as ghosts and its shelters 'gone', for the routes' dice, as a hand-made
 *  building's are), a roof over the rest; and whatever else the city strung or set out in the space over the line
 *  (the alleys' cables and junk) taken away. The joins' connections there were never built (inWayUnder()). */
export function cutDown(ceil: Ceil, cuts: Map<Plan, number>, plans: Plan[], plots: Plot[], out: Fabric) {
  const K = ['solids', 'decor', 'far', 'props', 'inter', 'climbables', 'hides', 'features', 'sites'] as const;
  const owned = Object.fromEntries(K.map(k => [k, new Uint8Array(out[k].length)])) as Record<(typeof K)[number], Uint8Array>;
  const drop = Object.fromEntries(K.map(k => [k, new Set<number>()])) as Record<(typeof K)[number], Set<number>>;
  plans.forEach((p, n) => {
    const own = plots[n].own;
    if (!own) return;
    for (const k of K) owned[k].fill(1, own[k][0], own[k][1]);
    const c = cuts.get(p);
    if (c === undefined) return;
    const o = p.obb, lot = { x0: o.cx - o.hw, z0: o.cz - o.hd, x1: o.cx + o.hw, z1: o.cz + o.hd }, at = (k: (typeof K)[number]) => Array.from({ length: own[k][1] - own[k][0] }, (_, i) => own[k][0] + i);
    // (Its pieces carved apart where a neighbour's floor met it are its own too, M3-76.)
    const mine = at('solids').concat(out.solids.flatMap((q, i) => (i >= own.solids[1] && q.orig && q.orig.x0 === lot.x0 && q.orig.z0 === lot.z0 && q.orig.x1 === lot.x1 && q.orig.z1 === lot.z1 ? [i] : [])));
    for (const i of mine) { const q = out.solids[i]; if (q.y0 >= c - 0.01 || (q.y1 > c && q.ramp)) drop.solids.add(i); else if (q.y1 > c) out.solids[i] = { ...q, y1: c }; }
    for (const k of ['decor', 'far'] as const) for (const i of at(k)) { const q = out[k][i]; if (q.y0 >= c - 0.01) drop[k].add(i); else if (q.y1 > c) out[k][i] = { ...q, y1: c }; }
    for (const k of ['props', 'inter'] as const) for (const i of at(k)) if (out[k][i].y >= c - 0.01) drop[k].add(i);
    for (const i of at('climbables')) { const q = out.climbables[i]; if (q.y0 >= c - 0.5) drop.climbables.add(i); else if (q.y1 > c) out.climbables[i] = { ...q, y1: c }; }
    for (const i of at('hides')) if (out.hides[i].inner.y0 >= c - 0.01) drop.hides.add(i);
    for (const i of at('features')) { const q = out.features[i]; if (q.y < c - 0.01) continue; if (q.kind === 'win:open' || q.kind === 'win:glass') out.features[i] = { ...q, kind: 'win:gone' }; else drop.features.add(i); }
    for (const i of at('sites')) if (out.sites[i].y >= c - 0.01) out.sites[i] = { ...out.sites[i], kind: 'gone' };
    // Its roof over what's left (and over its stairwell's shaft).
    out.solids.push(turn([solid(lot.x0, c - SLAB, lot.z0, lot.x1, c, lot.z1, MAT.concrete)], o.yaw, o.cx, o.cz)[0]);
    p.wall = plots[n].wall = plots[n].top = c;
    const lt = out.lots.find(q => q.id === n);
    if (lt) lt.wall = lt.top = c;
  });
  // What isn't a building's, over the ceiling.
  const pt = (x: number, z: number): [number, number][] => [[x, z]], bx = (q: Solid): [number, number][] => [[q.x0, q.z0], [q.x1, q.z0], [q.x0, q.z1], [q.x1, q.z1]];
  for (const k of ['solids', 'decor', 'far'] as const) out[k].forEach((q, i) => { if (!owned[k][i] && q.y1 > ceil(bx(q))) drop[k].add(i); });
  for (const k of ['props', 'inter'] as const) out[k].forEach((q, i) => { if (!owned[k][i] && q.y > ceil(pt(q.x, q.z))) drop[k].add(i); });
  out.climbables.forEach((q, i) => { if (!owned.climbables[i] && q.y1 > ceil(pt(q.x, q.z))) drop.climbables.add(i); });
  // (Each building's ranges in the lists moved down past what's gone before them.)
  for (const k of K) {
    if (!drop[k].size) continue;
    const before = new Int32Array(out[k].length + 1);
    for (let i = 0; i < out[k].length; i++) before[i + 1] = before[i] + (drop[k].has(i) ? 1 : 0);
    (out as unknown as Record<string, unknown[]>)[k] = out[k].filter((_: unknown, i: number) => !drop[k].has(i));
    for (const q of plots) if (q.own) q.own[k] = [q.own[k][0] - before[q.own[k][0]], q.own[k][1] - before[q.own[k][1]]];
  }
  out.hides.forEach((h, i) => { h.id = i; });
}

