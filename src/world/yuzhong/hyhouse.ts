// One of Hongyadong's stilt houses (M6-03, yuzhong/hongyadong.ts), in the complex's frame: u along the cliff, v up it
// (its front, the river face, at v0). Its storeys from its lowest floor to the terrace over it (its roof): a shop on
// the ground storey open to the street or terrace in front, rooms over it with a door and windows onto a balcony; a
// stair up its side (two lanes, the flights switching back along v) through every storey and out onto the terrace
// through a railed hole; party walls with a doorway at the front where the next house has a floor at the same height.
// Its river face under tiled eaves edged in gold neon, red lanterns hung under them, gold neon up its corner posts;
// timber stilts down to the ground wherever its lowest floor stands over it.
import { solid, type Solid } from '../geom';
import { MAT } from '../mats';
import { stair } from '../steps';
import { furnish, type Floor, type Kind } from '../city/rooms';
import type { Fabric, Lot } from '../city/buildings';
import type { Site } from '../world';
import { rand, type Rng } from '../../sim/rng';

export interface House {
  i: number; u0: number; u1: number; v0: number; v1: number;
  /** its storeys' floors, lowest first, and its roof (the terrace over it) */
  floors: number[]; top: number;
  /** a stair up its side to the roof (not the cellar's house) */
  stair: boolean;
  /** what its storeys are: the ground storey's, the rest's */
  ground: Kind[]; upper: Kind[];
  /** its back room on the ground storey is the cliff cellar */
  cellar?: boolean;
  /** its neighbours' floors (a doorway through the party wall where one matches) */
  left?: number[]; right?: number[];
  /** balconies run on into the next house's (the same floors): no railing across their ends */
  openL?: boolean; openR?: boolean;
}

/** The stair: the lanes' width, where its flights start in from the front, the steepest flight; the walls' and
 *  slabs' thickness; the balconies' depth; eaves out past them. */
export const HOUSE = { lane: 1.3, start: 2.5, slope: 0.7, wall: 0.25, slab: 0.3, balcony: 1.4, eave: 0.8, rail: 1.05 };
const TIMBER = 0x5a3a24, PLASTER = 0xe8e0cc, EAVE = 0x34383c, GOLD = 0xffb347, LANTERN = 0xff3418;

/** The stair's flights in a house: lane u-range, v from and to, rising toward +v (even flights) or -v. */
export function flights(h: House) {
  const H = HOUSE, ys = h.floors.concat(h.top), vs = h.v0 + H.start, run = Math.max(...ys.slice(1).map((y, k) => y - ys[k])) / H.slope, ve = vs + run;
  const lanes: [number, number][] = [[h.u1 - H.wall - H.lane, h.u1 - H.wall], [h.u1 - H.wall - 2 * H.lane, h.u1 - H.wall - H.lane]];
  return { vs, ve, lanes, ys, list: ys.slice(1).map((y1, k) => ({ k, lane: lanes[k % 2], y0: ys[k], y1, up: k % 2 === 0 })) };
}

type Rect = [number, number, number, number];
/** A rect less a hole: what's left of it in up to four pieces. */
const minus = (r: Rect, o: Rect): Rect[] => {
  if (o[0] >= r[2] || o[2] <= r[0] || o[1] >= r[3] || o[3] <= r[1]) return [r];
  const out: Rect[] = [], [a, b, c, d] = [Math.max(r[0], o[0]), Math.max(r[1], o[1]), Math.min(r[2], o[2]), Math.min(r[3], o[3])];
  if (b > r[1]) out.push([r[0], r[1], r[2], b]);
  if (d < r[3]) out.push([r[0], d, r[2], r[3]]);
  if (a > r[0]) out.push([r[0], b, a, d]);
  if (c < r[2]) out.push([c, b, r[2], d]);
  return out;
};

/** Build one house into f (local frame: x = cx + u, z = cz + v). ground(u, v) is the ground under a point once the
 *  complex's cut is made; sites gets its shelters (guest rooms with a bed, the cellar). */
export function buildHouse(h: House, cx: number, cz: number, ground: (u: number, v: number) => number, r: Rng, f: Fabric) {
  const H = HOUSE, W = H.wall, B = (u0: number, y0: number, v0: number, u1: number, y1: number, v1: number, mat: number, tint?: number, to: Solid[] = f.solids) => {
    const s = solid(cx + u0, y0, cz + v0, cx + u1, y1, cz + v1, mat);
    if (tint) s.tint = tint;
    to.push(s);
    return s;
  };
  const { u0, u1, v0, v1, floors, top } = h, st = flights(h), ys = st.ys, n = floors.length, um = (u0 + u1) / 2;
  // Slabs: each floor (its stair hole, from the flight arriving) and the roof, the terrace over it.
  for (let k = 0; k <= n; k++) {
    const y = ys[k], fl = k > 0 && h.stair ? st.list[k - 1] : null;
    let parts: Rect[] = [[u0, v0, u1, v1]];
    if (fl) parts = parts.flatMap(p => minus(p, [fl.lane[0] - 0.02, st.vs - 0.05, fl.lane[1] + 0.02, st.ve + 0.05]));
    for (const p of parts) B(p[0], y - H.slab, p[1], p[2], y, p[3], k === n ? MAT.stone : MAT.wood, k === n ? 0x9a948a : TIMBER);
    // (On the roof its hole railed along both sides and at the end the flight doesn't come up.)
    if (fl && k === n) {
      const [a, b] = fl.lane, end = fl.up ? st.vs - 0.05 : st.ve + 0.05;
      for (const u of [a - 0.04, b + 0.04]) B(u - 0.03, y, st.vs - 0.05, u + 0.03, y + H.rail, st.ve + 0.05, MAT.metal, 0x2a2a2a);
      B(a - 0.04, y, end - 0.03, b + 0.04, y + H.rail, end + 0.03, MAT.metal, 0x2a2a2a);
    }
  }
  // The stair's flights.
  if (h.stair) for (const fl of st.list) stair(cx + fl.lane[0], cz + st.vs, cx + fl.lane[1], cz + st.ve, fl.y0, fl.y1, fl.up ? 3 : 4, f.solids, f.decor);
  // Walls, storey by storey: the front (a shopfront on the ground storey, a door and two windows over it), the back,
  // the party walls (a doorway at the front where the next house has this floor), the cellar's partition.
  const wallU = (v: number, ya: number, yb: number, holes: [number, number, number, number][], mat: number, tint?: number) => {
    let at = u0;
    for (const [a, b, y0, y1] of holes.sort((p, q) => p[0] - q[0])) {
      if (a > at) B(at, ya, v, a, yb, v + W, mat, tint);
      if (y0 > ya) B(a, ya, v, b, y0, v + W, mat, tint);
      if (y1 < yb) B(a, y1, v, b, yb, v + W, mat, tint);
      at = b;
    }
    if (at < u1) B(at, ya, v, u1, yb, v + W, mat, tint);
  };
  const wallV = (u: number, ya: number, yb: number, doors: number[]) => {
    const d0 = v0 + 0.6, d1 = v0 + 1.8;
    let y = ya;
    for (const d of doors.filter(d => d >= ya - 0.01 && d < yb).sort((p, q) => p - q)) {
      if (d > y) B(u, y, v0, u + W, d, v1, MAT.plaster, PLASTER);
      B(u, d, v0, u + W, d + 2.2, d0, MAT.plaster, PLASTER); B(u, d, d1, u + W, d + 2.2, v1, MAT.plaster, PLASTER);
      y = d + 2.2;
    }
    if (yb > y) B(u, y, v0, u + W, yb, v1, MAT.plaster, PLASTER);
  };
  const lo = (side?: number[]) => Math.min(floors[0], side?.[0] ?? Infinity) - H.slab;
  wallV(u0, lo(h.left), top, floors.filter(y => h.left?.some(q => Math.abs(q - y) < 0.05)));
  wallV(u1 - W, lo(h.right), top, floors.filter(y => h.right?.some(q => Math.abs(q - y) < 0.05)));
  for (let k = 0; k < n; k++) {
    const y = ys[k], y1 = ys[k + 1], tall = y1 - y;
    const holes: [number, number, number, number][] = k === 0
      ? [[u0 + 0.9, u1 - 0.9, y, y + Math.min(3.2, tall - 0.6)]]
      : [[um - 0.6, um + 0.6, y, y + 2.2], [u0 + 1.4, u0 + 2.9, y + 0.9, y + 2.2], [u1 - 2.9, u1 - 1.4, y + 0.9, y + 2.2]];
    wallU(v0, y, y1, holes, MAT.plaster, PLASTER);
    wallU(v1 - W, y, y1, [], k === 0 && h.cellar ? MAT.stone : MAT.plaster, k === 0 && h.cellar ? 0x8a8478 : PLASTER);
  }
  // Timber posts up its front corners, gold neon up them.
  for (const u of [u0, u1 - 0.3]) {
    B(u, floors[0] - H.slab, v0 - 0.3, u + 0.3, top, v0, MAT.wood, TIMBER);
    B(u + 0.12, floors[0], v0 - 0.34, u + 0.18, top, v0 - 0.3, MAT.neon, GOLD, f.decor);
  }
  // Balconies on the storeys over the ground one, railed (not across into the next house's where they run on); the
  // eaves out past each, gold neon along their edges, lanterns under them; the terrace's balustrade along the roof's
  // front, an eave and its neon under that.
  for (let k = 1; k <= n; k++) {
    const y = ys[k], roof = k === n, out = roof ? 0 : H.balcony, e0 = v0 - out - H.eave;
    if (!roof) {
      B(u0 + 0.02, y - 0.25, v0 - out, u1 - 0.02, y, v0, MAT.wood, TIMBER);
      B(u0 + 0.02, y, v0 - out, u1 - 0.02, y + H.rail, v0 - out + 0.08, MAT.wood, TIMBER);
      if (!h.openL) B(u0 + 0.02, y, v0 - out, u0 + 0.1, y + H.rail, v0, MAT.wood, TIMBER);
      if (!h.openR) B(u1 - 0.1, y, v0 - out, u1 - 0.02, y + H.rail, v0, MAT.wood, TIMBER);
    } else B(u0, y, v0, u1, y + H.rail, v0 + 0.2, MAT.wood, TIMBER);
    B(u0 - 0.1, y - 0.42, e0, u1 + 0.1, y - 0.27, v0 - out, MAT.roofTile, EAVE, f.decor);
    B(u0 - 0.1, y - 0.5, e0 - 0.06, u1 + 0.1, y - 0.42, e0, MAT.neon, GOLD, f.decor);
    for (let u = u0 + 1.2; u < u1 - 0.8; u += 2.6) B(u - 0.18, y - 1.15, e0 + 0.25, u + 0.18, y - 0.7, e0 + 0.61, MAT.neon, LANTERN, f.decor);
  }
  // Stilts: under its lowest floor wherever the ground's well below it, a grid of timber posts down into the ground,
  // tied across.
  const y0 = floors[0] - H.slab, us = [u0 + 0.2, um - 0.15, u1 - 0.5], vv: number[] = [];
  for (let v = v0 + 0.2; v < v1 - 0.4; v += Math.min(5, (v1 - v0 - 0.6) / 2)) vv.push(v);
  vv.push(v1 - 0.5);
  for (const u of us) for (const v of vv) {
    const gy = ground(u + 0.15, v + 0.15);
    if (y0 - gy < 0.4) continue;
    B(u, gy - 1, v, u + 0.3, y0, v + 0.3, MAT.wood, TIMBER);
    for (let y = y0 - 3; y > gy + 0.5; y -= 3) B(u, y - 0.15, v0 + 0.2, u + 0.3, y, v1 - 0.2, MAT.wood, TIMBER, f.decor);
  }
  // Its rooms furnished: shops and food stalls on the ground storey, stores, homes, offices and guest rooms over it;
  // the ground storey's back room the cliff cellar in its house.
  const lot = { id: 7000 + h.i } as Lot, room = (k: number): Rect => [u0 + W, v0 + W, h.stair ? st.lanes[1][0] - 0.1 : u1 - W, k === 0 && h.cellar ? v1 - 6 - W : v1 - W];
  let nid = 0;
  for (let k = 0; k < n; k++) {
    const y = ys[k], floor: Floor = { l: lot, y, k, alongZ: false, decay: 0.3, nid: p => `h${h.i}.${k}.${p}${nid++}`,
      B: (a, b, c, d, e, g, mat) => solid(cx + a, b, cz + c, cx + d, e, cz + g, mat), at: (u, v) => [cx + u, cz + v] };
    const kinds = k === 0 ? h.ground : h.upper, kind = kinds[Math.floor(rand(r) * kinds.length)], rc = room(k);
    const keep: Rect[] = [[u0 + 0.6, v0 + W, u1 - 0.6, v0 + 1.6], [u0 + W, v0 + W, u0 + 1.4, v0 + 2.4], [rc[2] - 1.2, v0 + W, rc[2], v0 + 2.4], [rc[2] - 1.2, v1 - 2.2, rc[2], v1 - W]];
    const site: Site = { id: `h${h.i}.${k}`, kind: 'flat', x: cx + (rc[0] + rc[2]) / 2, y, z: cz + (rc[1] + rc[3]) / 2, bed: null, table: null, containers: [], exits: 2, windows: k === 0 ? 0 : 2, streetSides: 1 };
    furnish(floor, rc, kind, keep, false, r, f, site);
    if (kind === 'bedroom' && site.bed) f.sites.push(site);
    // A lamp in its ceiling.
    B(um - 0.3, ys[k + 1] - H.slab - 0.08, (v0 + v1) / 2 - 0.3, um + 0.3, ys[k + 1] - H.slab, (v0 + v1) / 2 + 0.3, MAT.lamp, 0xffd090, f.decor);
  }
  if (h.cellar) {
    // A stone partition across the back of the ground storey, a doorway through it into the cellar dug into the cliff.
    const y = floors[0], pv = v1 - 6;
    wallU(pv - W, y, ys[1], [[um - 0.55, um + 0.55, y, y + 2.1]], MAT.stone, 0x8a8478);
    const floor: Floor = { l: { id: 7900 } as Lot, y, k: 0, alongZ: false, decay: 0.5, nid: p => `cellar.${p}${nid++}`,
      B: (a, b, c, d, e, g, mat) => solid(cx + a, b, cz + c, cx + d, e, cz + g, mat), at: (u, v) => [cx + u, cz + v] };
    const rc: Rect = [u0 + W, pv, u1 - W, v1 - W], site: Site = { id: 'cellar', kind: 'cellar', name: ['洪崖洞崖下地窖', 'Hongyadong cliff cellar'], x: cx + um, y, z: cz + (pv + v1) / 2, bed: 'cot', table: null, containers: [], exits: 1, windows: 0, streetSides: 0 };
    // Someone's cot along the partition, left from when people sheltered down here.
    B(u0 + 0.6, y, pv + 0.15, u0 + 2.6, y + 0.45, pv + 0.95, MAT.cloth, 0x5a6a4a);
    f.inter.push({ id: 'cot', kind: 'mattress', x: cx + u0 + 1.6, y: y + 0.45, z: cz + pv + 0.55, r: 1, zh: '行军床', en: 'Cot' });
    furnish(floor, rc, 'store', [[um - 0.8, pv, um + 0.8, pv + 1.2], [u0 + 0.3, pv, u0 + 3.6, pv + 2.2]], false, r, f, site);
    f.sites.push(site);
  }
}
