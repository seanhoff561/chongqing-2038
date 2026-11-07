// Pathing on the machines' ways (M4-02): A* over the nav graph between the points nearest two places, each kind
// of unit on the stretches it can take (a delivery robot no stairs and nothing steep; a quadruped a metre's jump
// too; the others the rest).
import { NAV, type Nav } from '../world/world';
import type { UnitKind } from '../data/units';

type V3 = { x: number; y: number; z: number };
export interface NavPath { pts: V3[]; kinds: number[]; length: number }

/** Which stretches a kind of unit can take. */
export function canTake(kind: UnitKind | 'street', e: [number, number, number], from: V3, to: V3): boolean {
  if (kind === 'street') return e[2] === NAV.street || e[2] === NAV.stairs;
  // A metre's jump: a quadruped's only (M4-09).
  if (e[2] === NAV.jump) return kind === 'quadruped';
  // The giants (U-050, U-068) are too big for alleys, doors, rooms and stairways: they keep to the roads.
  if (kind === 'colossus' || kind === 'spider') return e[2] === NAV.street;
  if (kind === 'delivery' || kind === 'carrier') return e[2] === NAV.street && Math.abs(to.y - from.y) <= 0.15 * e[1] + 0.1;
  return true;
}

/** Each nav graph's points with a way out, bucketed by 16 m cell (made once, on first use): looking through every point
 *  in the city for the nearest was most of a fight's cost (U-076). */
const CELL = 16, grids = new WeakMap<Nav, Map<number, number[]>>();
const key = (i: number, j: number) => i * 65536 + j;
function gridOf(nav: Nav) {
  let g = grids.get(nav);
  if (g) return g;
  g = new Map();
  nav.pts.forEach((q, i) => { if (!nav.adj[i].length) return; const k = key(Math.floor(q.x / CELL), Math.floor(q.z / CELL)); const c = g!.get(k); if (c) c.push(i); else g!.set(k, [i]); });
  grids.set(nav, g);
  return g;
}

/** The nav point nearest a place, within r, that has a way out of it. */
export function nearestNav(nav: Nav, p: V3, r = 60): number {
  const g = gridOf(nav), ci = Math.floor(p.x / CELL), cj = Math.floor(p.z / CELL), n = Math.ceil(r / CELL);
  let best = -1, bd = r;
  for (let di = -n; di <= n; di++) for (let dj = -n; dj <= n; dj++) {
    const c = g.get(key(ci + di, cj + dj));
    if (!c) continue;
    for (const i of c) { const q = nav.pts[i], d = Math.hypot(q.x - p.x, q.z - p.z) + Math.abs(q.y - p.y) * 2; if (d < bd) { bd = d; best = i; } }
  }
  return best;
}

/** Each nav graph's search arrays, made once and used again: a point's are this search's only once it's stamped with
 *  it (a city's hunt asks for ways several times a tick, and filling arrays the size of the city's graph each time, and
 *  collecting them after, was most of it). */
const searches = new WeakMap<Nav, { stamp: Uint32Array; n: number; dist: Float64Array; prev: Int32Array; via: Int8Array }>();
let heapF = new Float64Array(1024), heapI = new Int32Array(1024);

/** Which kinds take the same stretches: the one that stands for each. */
const TAKES = (kind: UnitKind | 'street'): UnitKind | 'street' => (kind === 'street' || kind === 'quadruped' ? kind : kind === 'colossus' || kind === 'spider' ? 'colossus' : kind === 'delivery' || kind === 'carrier' ? 'delivery' : 'humanoid');
/** Each nav graph's points by the piece of it they're in for each such kind, its stretches taken either way (made once
 *  a kind, on first use): two places in different pieces have no way between them, known without searching the whole
 *  piece one's in for it (a machine sent where it can't go did, most of a hunt's cost). */
const pieces = new WeakMap<Nav, Map<UnitKind | 'street', Int32Array>>();
function pieceOf(nav: Nav, kind: UnitKind | 'street'): Int32Array {
  let m = pieces.get(nav);
  if (!m) pieces.set(nav, (m = new Map()));
  const k = TAKES(kind);
  let ids = m.get(k);
  if (ids) return ids;
  // (Joined stretch by stretch, each point to the root of its piece.)
  const P = nav.pts, up = new Int32Array(P.length).map((_, i) => i);
  const root = (i: number) => { while (up[i] !== i) i = up[i] = up[up[i]]; return i; };
  nav.adj.forEach((es, i) => { for (const e of es) if (canTake(k, e, P[i], P[e[0]])) up[root(i)] = root(e[0]); });
  ids = up.map((_, i) => root(i));
  m.set(k, ids);
  return ids;
}

/** The shortest way between two places for a kind of unit ('street': along the streets and stairs only), or null. */
export function navPath(nav: Nav, from: V3, to: V3, kind: UnitKind | 'street'): NavPath | null {
  const a = nearestNav(nav, from), b = nearestNav(nav, to), P = nav.pts;
  if (a < 0 || b < 0) return null;
  const piece = pieceOf(nav, kind);
  if (piece[a] !== piece[b]) return null;
  let S = searches.get(nav);
  if (!S || S.stamp.length !== P.length || S.n === 0xffffffff) searches.set(nav, (S = { stamp: new Uint32Array(P.length), n: 0, dist: new Float64Array(P.length), prev: new Int32Array(P.length), via: new Int8Array(P.length) }));
  const n = ++S.n, { stamp, dist, prev, via } = S;
  // (A point first come to this search: as far as can be, from nowhere.)
  const at = (i: number) => { if (stamp[i] !== n) { stamp[i] = n; dist[i] = Infinity; prev[i] = -1; via[i] = 0; } return i; };
  const hd = (i: number) => Math.hypot(P[i].x - P[b].x, P[i].y - P[b].y, P[i].z - P[b].z);
  // (The open list a binary heap in two arrays, its keys and its points: no garbage made a step.)
  let hf = heapF, hi = heapI, size = 0;
  const swap = (p: number, q: number) => { const f = hf[p], i = hi[p]; hf[p] = hf[q]; hi[p] = hi[q]; hf[q] = f; hi[q] = i; };
  const push = (f: number, i: number) => {
    if (size === hf.length) { const F = new Float64Array(size * 2), I = new Int32Array(size * 2); F.set(hf); I.set(hi); hf = heapF = F; hi = heapI = I; }
    hf[size] = f; hi[size] = i; size++;
    for (let k = size - 1; k > 0;) { const q = (k - 1) >> 1; if (hf[q] <= hf[k]) break; swap(q, k); k = q; }
  };
  const pop = () => {
    size--;
    if (size) { hf[0] = hf[size]; hi[0] = hi[size]; for (let k = 0; ;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < size && hf[l] < hf[m]) m = l; if (r < size && hf[r] < hf[m]) m = r; if (m === k) break; swap(m, k); k = m; } }
  };
  at(a); at(b); dist[a] = 0; push(hd(a), a);
  while (size) {
    const f = hf[0], i = hi[0];
    pop();
    if (i === b) break;
    if (f - hd(i) > dist[i] + 1e-9) continue;
    for (const e of nav.adj[i]) {
      const j = at(e[0]), c = dist[i] + e[1];
      if (c < dist[j] && canTake(kind, e, P[i], P[j])) { dist[j] = c; prev[j] = i; via[j] = e[2]; push(c + hd(j), j); }
    }
  }
  if (!Number.isFinite(dist[b])) return null;
  const way: number[] = [];
  for (let i = b; i >= 0; i = prev[i]) way.unshift(i);
  return { pts: way.map(i => ({ ...P[i] })), kinds: way.slice(1).map(i => via[i]), length: dist[b] };
}
