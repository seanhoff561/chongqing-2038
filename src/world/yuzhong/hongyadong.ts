// Hongyadong 洪崖洞 (M6-03, U-108): the stilt-house complex stacked down the Jialing cliff under Jiefangbei's ridge,
// where the city had its stand-in rows. Built in the frame of its real footprint (OSM's 洪崖洞): u along the cliff,
// west to east; v up it, from the riverside street at its foot to the clifftop path by Cangbai Road. Three tiers of
// stilt houses (yuzhong/hyhouse.ts) step up the cliff, each tier's roof the terrace the next opens onto: the foot on
// the riverside street (its 1F, y 38, HY.foot); A's roof the 12 m terrace, B's the 30 m one, C's and the plaza behind
// it the top at 44 m, level with the clifftop path. Street entrances at those three heights: where a terrace's end or
// back meets the hillside, a landing or a flight of steps on to it; elsewhere a balustrade, or a retaining wall where
// the hill stands higher. Lit like the rest by night: gold neon along the eaves and up the posts, red lanterns.
// It needs only the ground: built before the city's cut, what the city made where it stands is razed (cutdown.ts),
// the city's later dressing there swept, and the ground under it cut down to its floors and stilts' footings last.
import { solid, type Solid } from '../geom';
import { MAT } from '../mats';
import { GEO } from '../geo';
import { heightAt, type Heightfield } from '../heightfield';
import { makeRng, hashString, rand } from '../../sim/rng';
import type { Fabric } from '../city/buildings';
import type { Plot, Teleport, Feature } from '../world';
import type { Plan } from './lots';
import { points, minRect, obbOverlap, type Obb, type P2 } from './shapes';
import { stair } from '../steps';
import { buildHouse, flights, HOUSE, type House } from './hyhouse';
import { sin, cos, atan2 } from '../trig';

/** The foot (the riverside street's level, its 1F) and the terraces 12, 30 and 44 m over it. */
export const HY = { foot: 38, decks: [50, 68, 82] };
type Rect = [number, number, number, number];
/** The tiers' and the plaza's u0, v0, u1, v1 in the complex's frame; B's and C's storeys. */
const A: Rect = [-76, -33, 94, -15], Bt: Rect = [-76, -15, 94, 1], C: Rect = [-60, 1, 86, 17], PLAZA: Rect = [-60, 17, 86, 33];
const B_FLOORS = [50, 54.5, 59, 63.5], C_FLOORS = [68, 72.65, 77.3];
const empty = (): Fabric => ({ solids: [], decor: [], props: [], lots: [], inter: [], climbables: [], hides: [], features: [], sites: [], far: [] });
const within = (b: Rect, u: number, v: number, m = 0) => u >= b[0] - m && u <= b[2] + m && v >= b[1] - m && v <= b[3] + m;

/** The complex built (in its own frame: place() turns it into the world about o's middle), and what goes with it. */
export function hongyadong(g: Heightfield, plans: Plan[]) {
  const o: Obb = minRect(points(GEO.buildings.find(b => b[3] === '洪崖洞')![4], 0.1)), c = cos(o.yaw), s = sin(o.yaw), { cx, cz } = o;
  const W = (u: number, v: number): P2 => [cx + c * u - s * v, cz + s * u + c * v];
  const U = (x: number, z: number): P2 => { const dx = x - cx, dz = z - cz; return [c * dx + s * dz, -s * dx + c * dz]; };
  const was = (u: number, v: number) => heightAt(g, ...W(u, v)) ?? -Infinity, r = makeRng(hashString('hongyadong'));
  const obb = (b: Rect): Obb => { const [x, z] = W((b[0] + b[2]) / 2, (b[1] + b[3]) / 2); return { cx: x, cz: z, hw: (b[2] - b[0]) / 2, hd: (b[3] - b[1]) / 2, yaw: o.yaw }; };
  // The houses, 9.5 to 14 m wide along each tier: A's from the street at its front, its storeys to the terrace; the
  // cliff cellar behind the ground storey of B's house at the west end, where the cliff stood highest.
  const split = (u0: number, u1: number): [number, number][] => {
    const out: [number, number][] = [];
    for (let u = u0; u < u1 - 0.01;) { let w = 9.5 + rand(r) * 4.5; if (u1 - u - w < 9.5) w = u1 - u > 15 ? (u1 - u) / 2 : u1 - u; out.push([u, u + w]); u += w; }
    return out;
  };
  const tier = (b: Rect, top: number, floorsAt: (a: number, z: number) => number[], ground: House['ground'], upper: House['upper']) => split(b[0], b[2]).map(([u0, u1]): House => ({ i: 0, u0, u1, v0: b[1], v1: b[3], floors: floorsAt(u0, u1), top, stair: true, ground, upper }));
  const ha = tier(A, HY.decks[0], (a, z) => {
    const gf = Math.min(47, Math.round(was((a + z) / 2, A[1] - 3.5) * 20) / 20), n = Math.max(1, Math.floor((HY.decks[0] - gf) / 3.6));
    return Array.from({ length: n }, (_, k) => gf + (k * (HY.decks[0] - gf)) / n);
  }, ['shop', 'restaurant', 'shop'], ['store', 'living', 'workshop']);
  const hb = tier(Bt, HY.decks[1], () => B_FLOORS, ['shop', 'restaurant'], ['store', 'office', 'living']);
  const hc = tier(C, HY.decks[2], () => C_FLOORS, ['restaurant', 'shop'], ['bedroom']);
  const cellar = hb[0];
  Object.assign(cellar, { cellar: true, stair: false });
  const houses = ha.concat(hb, hc);
  houses.forEach((h, i) => { h.i = i; });
  for (const row of [ha, hb, hc]) row.forEach((h, k) => {
    const L = row[k - 1], R = row[k + 1], same = (q?: House) => !!q && q.floors.length === h.floors.length && q.floors.every((y, j) => Math.abs(y - h.floors[j]) < 0.05);
    Object.assign(h, { left: L?.floors, right: R?.floors, openL: same(L), openR: same(R) });
  });
  /** Where the ground goes once the complex stands: under each house a little under its lowest floor (A's) or its
   *  slab (B's, C's, the plaza's); Infinity off it. */
  const grade = (u: number, v: number) => {
    if (within(A, u, v)) { const h = ha.find(q => u >= q.u0 - 0.01 && u <= q.u1 + 0.01); return h ? h.floors[0] - 0.05 : Infinity; }
    if (within(Bt, u, v)) return B_FLOORS[0] - HOUSE.slab - 0.05;
    if (within(C, u, v)) return C_FLOORS[0] - HOUSE.slab - 0.05;
    return within(PLAZA, u, v) ? HY.decks[2] - HOUSE.slab - 0.05 : Infinity;
  };
  const after = (u: number, v: number) => Math.min(was(u, v), grade(u, v));
  const f = empty(), box = (u0: number, y0: number, v0: number, u1: number, y1: number, v1: number, mat: number, tint?: number, to: Solid[] = f.solids) => {
    const q = solid(cx + Math.min(u0, u1), y0, cz + Math.min(v0, v1), cx + Math.max(u0, u1), y1, cz + Math.max(v0, v1), mat);
    if (tint) q.tint = tint;
    to.push(q);
  };
  for (const h of houses) {
    buildHouse(h, cx, cz, after, r, f);
    // Its shop's sign by the door: red lanterns over a lit plaque, a light box now and then (only those facing the
    // street stand: the city's rule for signs, index.ts).
    const y = h.floors[0];
    f.props.push({ kind: 'neonblade', x: cx + h.u0 + 0.45, y: y + 0.4, z: cz + h.v0 - 0.05, yaw: Math.PI, h: 2.4, text: `${rand(r) < 0.7 ? 'lantern' : 'box'}:${h.i % 10}` });
  }
  // The plaza on top, out from C's roof to the clifftop path: stone on timber stilts where the ground's below it.
  box(PLAZA[0], HY.decks[2] - HOUSE.slab, PLAZA[1], PLAZA[2], HY.decks[2], PLAZA[3], MAT.stone, 0x9a948a);
  for (let u = PLAZA[0] + 0.5; u < PLAZA[2]; u += 6) for (let v = PLAZA[1] + 2; v < PLAZA[3]; v += 6) {
    const gy = after(u, v);
    if (HY.decks[2] - HOUSE.slab - gy > 0.4) box(u, gy - 1, v, u + 0.35, HY.decks[2] - HOUSE.slab, v + 0.35, MAT.wood, 0x5a3a24);
  }
  // Along each terrace: lantern posts by its front balustrade; on it a few food stalls and mahjong tables.
  for (const [b, y] of [[A, HY.decks[0]], [Bt, HY.decks[1]], [C, HY.decks[2]]] as const) for (let u = b[0] + 7; u < b[2] - 4; u += 14) {
    box(u - 0.08, y, b[1] + 0.35, u + 0.08, y + 2.6, b[1] + 0.51, MAT.wood, 0x5a3a24);
    box(u - 0.2, y + 2.6, b[1] + 0.23, u + 0.2, y + 3.05, b[1] + 0.63, MAT.neon, 0xff3418, f.decor);
    const kind = rand(r) < 0.5 ? 'stall' : 'mahjong', d = b[1] + 1.3;
    f.props.push({ kind, x: cx + u + 3, y, z: cz + d, yaw: Math.PI });
    box(u + 3 - 0.85, y, d - 0.45, u + 3 + 0.85, y + 0.95, d + 0.45, MAT.hidden);
  }
  // The terraces' open ends and backs (and the plaza's), 2 m at a time, by the ground 3.5 m out: level with it, a
  // landing on to it; within 4.5 m of it, a flight of steps; far under it, a balustrade; well over it, a retaining
  // wall up to it. Not toward the tower that stands west of the top (an OSM building, kept).
  const kept = plans.filter(p => p.osm && ![A, Bt, C, PLAZA].some(b => obbOverlap(p.obb, obb(b), 1)));
  const pieces: Rect[] = [], features: Feature[] = [], entrance = new Map<number, { u: number; v: number; nu: number; nv: number; out: number }>();
  const edge = (y: number, a: P2, b: P2, nu: number, nv: number) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), tu = (b[0] - a[0]) / len, tv = (b[1] - a[1]) / len, n = Math.round(len / 2);
    for (let k = 0; k < n; k++) {
      const t0 = (k * len) / n, t1 = ((k + 1) * len) / n, mu = a[0] + tu * (t0 + t1) / 2, mv = a[1] + tv * (t0 + t1) / 2, dy = was(mu + nu * 3.5, mv + nv * 3.5) - y;
      const out = Math.abs(dy) <= 0.35 ? 3.5 : Math.abs(dy) <= 4.5 ? Math.max(3.5, Math.abs(dy) / 0.7) : dy > 0 ? 0.8 : 0;
      const p: Rect = [Math.min(a[0] + tu * t0, a[0] + tu * t1 + nu * out), Math.min(a[1] + tv * t0, a[1] + tv * t1 + nv * out), Math.max(a[0] + tu * t0, a[0] + tu * t1 + nu * out), Math.max(a[1] + tv * t0, a[1] + tv * t1 + nv * out)];
      const blocked = out > 0 && kept.some(q => obbOverlap(q.obb, obb(p), 0.5));
      if (dy < -4.5 || blocked) {
        // (The balustrade on the terrace's edge.)
        const e: Rect = [p[0], p[1], p[2], p[3]];
        if (nu) { e[0] = e[2] = a[0] - nu * 0.1; e[0] -= 0.1; e[2] += 0.1; } else { e[1] = e[3] = a[1] - nv * 0.1; e[1] -= 0.1; e[3] += 0.1; }
        box(e[0], y, e[1], e[2], y + HOUSE.rail, e[3], MAT.wood, 0x5a3a24);
        continue;
      }
      pieces.push(p);
      if (dy > 4.5) { box(p[0], y - 1, p[1], p[2], was(mu + nu * 3.5, mv + nv * 3.5) + 0.2, p[3], MAT.stone, 0x8a8478); continue; }
      if (Math.abs(dy) <= 0.35) box(p[0], y - HOUSE.slab, p[1], p[2], y, p[3], MAT.stone, 0x9a948a);
      else stair(cx + p[0], cz + p[1], cx + p[2], cz + p[3], Math.min(y, y + dy), Math.max(y, y + dy), (nu > 0) === (dy > 0) && nu ? 1 : nu ? 2 : (nv > 0) === (dy > 0) ? 3 : 4, f.solids, f.decor);
      if (!entrance.has(y)) entrance.set(y, { u: mu, v: mv, nu, nv, out });
    }
  };
  const [d12, d30, d44] = HY.decks;
  edge(d12, [A[0], A[1]], [A[0], A[3]], -1, 0); edge(d12, [A[2], A[1]], [A[2], A[3]], 1, 0);
  edge(d30, [Bt[0], Bt[1]], [Bt[0], Bt[3]], -1, 0); edge(d30, [Bt[2], Bt[1]], [Bt[2], Bt[3]], 1, 0);
  edge(d30, [Bt[0], Bt[3]], [C[0], Bt[3]], 0, 1); edge(d30, [C[2], Bt[3]], [Bt[2], Bt[3]], 0, 1);
  edge(d44, [PLAZA[0], PLAZA[3]], [PLAZA[2], PLAZA[3]], 0, 1);
  edge(d44, [C[0], C[1]], [C[0], PLAZA[3]], -1, 0); edge(d44, [C[2], C[1]], [C[2], PLAZA[3]], 1, 0);
  const at = (u: number, v: number, y: number) => ({ x: cx + u, y, z: cz + v });
  for (const [y, e] of entrance) features.push({ kind: 'hy:entrance', ...at(e.u + e.nu * (e.out + 1), e.v + e.nv * (e.out + 1), y), group: y });
  // The way up through it, for the walk (tests/sim/hongyadong.test.ts): in off the riverside street, up an A house's
  // stair to the 12 m terrace, a B house's to the 30 m one, a C house's to the top, out on to the clifftop path.
  const way: { x: number; y: number; z: number }[] = [], go = (u: number, v: number, y: number) => way.push(at(u, v, y));
  const climb = (h: House, free: number) => {
    const st = flights(h), um = (h.u0 + h.u1) / 2;
    go(um, h.v0 - 1.5, h.floors[0]); go(um, h.v0 + 1.0, h.floors[0]);
    for (const fl of st.list) { const lu = (fl.lane[0] + fl.lane[1]) / 2; go(lu, fl.up ? st.vs - 0.6 : st.ve + 0.7, fl.y0); go(lu, fl.up ? st.ve + 0.7 : st.vs - 0.6, fl.y1); }
    const lv = way[way.length - 1].z - cz;
    go(st.lanes[1][0] - 1.2, lv, h.top); go(st.lanes[1][0] - 1.2, free, h.top);
  };
  const near = (row: House[], u: number) => row.filter(h => h.stair).sort((p, q) => Math.abs((p.u0 + p.u1) / 2 - u) - Math.abs((q.u0 + q.u1) / 2 - u))[0];
  const ra = near(ha, -30), rb = near(hb, -30), rc = near(hc, -30);
  go((ra.u0 + ra.u1) / 2, A[1] - 3.5, ra.floors[0]);
  climb(ra, A[3] - 2.5); climb(rb, Bt[3] - 2.5); climb(rc, PLAZA[1] + 3);
  const top = [...entrance.entries()].find(([y]) => y === d44)?.[1];
  if (top) { go(top.u, top.v - 2, d44); go(top.u + top.nu * (top.out + 1.5), top.v + top.nv * (top.out + 1.5), was(top.u + top.nu * (top.out + 1.5), top.v + top.nv * (top.out + 1.5))); }
  way.forEach((q, n) => features.push({ kind: 'hy:route', ...q, group: n }));
  // In the world's frame: its parts (each a box in its frame, for what's razed and swept) and its plots (the tiers and
  // the plaza, shops on the map).
  const parts: Rect[] = [A, Bt, C, PLAZA, ...pieces];
  const ends = parts.flatMap(b => [W(b[0], b[1]), W(b[2], b[1]), W(b[2], b[3]), W(b[0], b[3])]), xs = ends.map(q => q[0]), zs = ends.map(q => q[1]);
  const bb = [Math.min(...xs) - 5, Math.min(...zs) - 5, Math.max(...xs) + 5, Math.max(...zs) + 5];
  const inside = (x: number, z: number, m = 0) => {
    if (x < bb[0] || z < bb[1] || x > bb[2] || z > bb[3]) return false;
    const [u, v] = U(x, z);
    return parts.some(b => within(b, u, v, m));
  };
  // (Each down to the lowest ground round it, as the city's are: its stilts reach it.)
  const lowest = (b: Rect) => { let y = Infinity; for (let u = b[0] - 4.5; u <= b[2] + 4.5; u += 2) for (let v = b[1] - 4.5; v <= b[3] + 4.5; v += 2) y = Math.min(y, after(u, v)); return y; };
  // (B's and C's ways in off the city's streets, for the routes over the city (network.ts): B's off the stepped street
  // at the 30 m terrace's west end, C's off the clifftop path onto the top. A's houses stand at the street's levels,
  // not on one floor: no such way.)
  const into = (y: number) => {
    const e = entrance.get(y);
    return e && ([[e.out + 1, was(e.u + e.nu * (e.out + 1), e.v + e.nv * (e.out + 1))], [-2, y]] as const).map(([d, h]) => { const [x, z] = W(e.u + e.nu * d, e.v + e.nv * d); return { x, y: h, z }; });
  };
  const plots = ([[A, Math.min(...ha.map(h => h.floors[0])), d12, undefined], [Bt, B_FLOORS[0], d30, into(d30)], [C, C_FLOORS[0], d44, into(d44)], [PLAZA, d44 - HOUSE.slab, d44, undefined]] as [Rect, number, number, Plot['route']][]).map(([b, base, wall, route]): Plot => ({
    corners: [W(b[0], b[1]), W(b[2], b[1]), W(b[2], b[3]), W(b[0], b[3])], base, wall, top: wall, kind: 'res', found: Math.min(base, lowest(b)) - 1, far: false, osm: false, prefix: 'hongyadong', type: 'mall', route }));
  const look = (du: number, dv: number) => { const dx = c * du - s * dv, dz = s * du + c * dv; return atan2(-dx, -dz); };
  const tp = (name: string, u: number, v: number, y: number, du: number, dv: number): Teleport => { const [x, z] = W(u, v); return { name, x, y: y + 0.3, z, yaw: look(du, dv) }; };
  const teleports = [tp('hongyadong', -60, Bt[3] - 3, d30, 1, 0), tp('Hongyadong riverfront', (ra.u0 + ra.u1) / 2, A[1] - 3.5, ra.floors[0], 0, 1),
    tp('Hongyadong 12 m terrace', -60, A[3] - 3, d12, 1, 0), tp('Hongyadong top (Cangbai Road)', 0, PLAZA[3] - 4, d44, 0, -1)];
  f.features.push(...features);
  // The machines' ways about it (nav.ts walks): along each terrace behind its stair holes, and the way up.
  const line = (v: number, y: number, u0: number, u1: number) => Array.from({ length: Math.round((u1 - u0) / 6) + 1 }, (_, k) => { const [x, z] = W(u0 + ((u1 - u0) * k) / Math.round((u1 - u0) / 6), v); return { x, y, z }; });
  const walks = [line(A[3] - 2.5, d12, A[0] + 1, A[2] - 1), line(Bt[3] - 2.5, d30, Bt[0] + 1, Bt[2] - 1), line(PLAZA[1] + 8, d44, C[0] + 1, C[2] - 1), way.map(q => { const [x, z] = W(q.x - cx, q.z - cz); return { x, y: q.y, z }; })];
  // Its own drone, docked on the plaza: along the 12 m terrace, up past its west end, back along the 30 m one, up past
  // C's west end and along the top, and back the same way.
  const fly = [[-70, A[3] - 9, d12 + 10], [88, A[3] - 9, d12 + 10], [-70, A[3] - 9, d12 + 10], [-82, A[3] - 9, d30 + 8], [-82, Bt[3] - 7, d30 + 8], [88, Bt[3] - 7, d30 + 8], [-66, Bt[3] - 7, d30 + 8],
    [-66, Bt[3] - 7, d44 + 8], [-66, PLAZA[1] + 8, d44 + 8], [80, PLAZA[1] + 8, d44 + 8]].map(([u, v, y]) => { const [x, z] = W(u, v); return { x, y, z }; });
  const [dx, dz] = W(10, PLAZA[3] - 5), drone = { pts: fly.concat(fly.slice(0, -1).reverse()), dock: { x: dx, y: d44 + 2.3, z: dz }, pad: { kind: 'dronedock', x: dx, y: d44, z: dz, yaw: 0 } };
  return {
    o, f, plots, teleports, walks, drone,
    /** Whether (x, z) is under any part of it (m metres round). */
    inside,
    /** Whether (x, z) is under its tiers or plaza (not its steps and landings out on to the ground round it). */
    built: (x: number, z: number, m = 0) => { const [u, v] = U(x, z); return [A, Bt, C, PLAZA].some(b => within(b, u, v, m)); },
    /** The ground at (x, z) once it stands: under it, its floors' or footings' level; round it, as it was. */
    low: (x: number, z: number) => { const [u, v] = U(x, z); return Math.min(was(u, v), grade(u, v)); },
    /** The city's buildings where it stands, razed (cutdown.ts: to nothing). */
    cuts: new Map(plans.filter(p => parts.some(b => obbOverlap(p.obb, obb(b), 1))).map(p => [p, -Infinity])),
    /** The ground cut down under it (each sample to the lowest it must be within a sample of it), no holes left. */
    grade(gr: Heightfield) {
      const d = gr.cell, [i0, j0, i1, j1] = [Math.floor(bb[0] / d), Math.floor(bb[1] / d), Math.ceil(bb[2] / d), Math.ceil(bb[3] / d)];
      const low = new Map<number, number>();
      for (let j = Math.max(0, j0); j <= Math.min(gr.h - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(gr.w - 1, i1); i++) {
        let y = Infinity;
        for (const [a, b] of [[0, 0], [d, 0], [-d, 0], [0, d], [0, -d], [d, d], [-d, -d], [d, -d], [-d, d]]) y = Math.min(y, grade(...U(i * d + a, j * d + b)));
        if (y < Infinity) low.set(j * gr.w + i, y);
      }
      for (const [k, y] of low) gr.y[k] = Math.min(gr.y[k], y);
      for (let j = Math.max(0, j0); j < Math.min(gr.h - 1, j1); j++) for (let i = Math.max(0, i0); i < Math.min(gr.w - 1, i1); i++) if (inside((i + 0.5) * d, (j + 0.5) * d, 2)) gr.hole[j * (gr.w - 1) + i] = 0;
    },
  };
}
