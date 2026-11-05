// The Yangtze River Cableway's north station on Xinhua Road (M6-16, M10-38d, U-104), made by hand in its building's
// frame (city/handmade.ts: u along the long side, v across; the street door at u = U). A low building, as the real
// one is: the cabins leave from its top two floors, the ropes out of the street end along the real line across the
// river to Shangxin Street (cableLine(); what the city made under them stands lower, cutCableway()). Below, the
// ticket hall off the street (the turnstiles, the stair down to the cellar), the staff corridor, come down in the
// middle, round it through the switch room where the 10 kV feeder comes in dead (the tool cabinet: a crowbar), to
// the stairwell. Up it to the upper station's door off the landing, locked: the stair room; its door onto the
// platform buried where the roof sheeting came down, so round by the machine deck behind the bullwheel, past its
// rim (creeping in the wind, the brake off: sim/cableway.ts); off the stair room the operator's booth (locked; its
// desk drawer the operator key and the operator's note) and the rope store (the rope gear); cabin 2 parked at the
// platform (the heart), its door open. Its ways in: the street door, the staff door on the side street, the roof (down the
// stairwell), the sewer up into its cellar.
import { handmade } from '../city/handmade';
import { FLOOR, WALL, SLAB } from '../city/rooms';
import { MAT } from '../mats';
import { solid, turn, type Solid } from '../geom';
import { GEO } from '../geo';
import { corners, inside } from './shapes';
import type { Lot, Fabric } from '../city/buildings';
import type { Plan } from './lots';
import type { World, Line, Feature, Plot } from '../world';
import { sin, cos } from '../trig';

/** The ropes' line across the hall (v); their height over the platform's floor, the track ropes either side of the
 *  haul rope (m), their sag mid-span; how far either side of them and how far under them the city's own buildings
 *  keep clear (the cabin hangs 5.3 m under its ropes, 1.6 m either side, and swings; the roofs' huts and tanks); the
 *  ropes' height over the south station's floor. */
export const CABLE = { v: 9.7, rope: 5.3, track: 0.45, sag: 8, wide: 6, clear: 10, south: 12 };

export const cableway: Lot['inside'] = (fr, from, out, look, rolled) => {
  const n0 = out.features.length, K = handmade(fr, from, out, look), { U, V } = K, { B, at, base } = fr, y = (k: number) => base + k * FLOOR, T = fr.n - 2, H = y(T);
  const box = (u0: number, u1: number, v0: number, v1: number, y0: number, y1: number, mat: number) => B(u0, y0, v0, u1, y1, v1, mat);
  const late: Solid[] = [];
  const feat = (kind: string, u: number, v: number, yy: number, face: [number, number] = [1, 0]) => {
    const [x, z] = at(u, v), [ax, az] = at(0, 0), [bx, bz] = at(face[0], face[1]);
    out.features.push({ kind, x, y: yy, z, group: out.features.length, nx: bx - ax, nz: bz - az });
  };
  // Ground floor.
  K.room(0, 0, 2.6, 6.1, 5.5, 'lobby'); // stair hall
  K.room(0, 0, 5.8, 6.1, V, 'workshop'); // switch room, the cellar hatch in its floor
  K.room(0, 6.4, 0, 9.0, V, 'corridor'); // staff corridor
  K.heap(0, 6.4, 6.2, 9.0, 7.8);
  K.room(0, 9.3, 0, U, V, 'lobby'); // ticket hall
  K.door(0, 6.25, 4.0, 'u', 'open');
  K.door(0, 6.25, 10.5, 'u', 'shut');
  K.door(0, 9.15, 10.5, 'u', 'shut', { label: ['员工通道', 'Staff only'] });
  K.door(0, 3.0, 5.65, 'v', 'jammed');
  K.door(0, 7.7, -0.12, 'v', 'locked', { label: ['员工门', 'Staff door'], way: 'staff' });
  // The turnstiles across the ticket hall, the wide gate smashed open; the ticket office; the queue's leavings.
  K.block(0, 'counter', 11.3, 0.3, 11.8, 9.9, 1.0, [1, 0]);
  K.block(0, 'counter', 11.3, 11.5, 11.8, V - 0.3, 1.0, [1, 0]);
  K.block(0, 'counter', 14.5, 0.3, 17.0, 2.2, 1.1, [0, 1]);
  K.cellarStair(9.5, 3.4, 10.9, 8.2, '+v'); // the stair down to the cellar, beside the turnstiles
  K.prop(0, 'papers', 15.5, 1.4, [0, 1], 0.5, 0.02, 0.4, false, 1.1);
  for (const [u, v] of [[13.5, 6.0], [15.8, 11.2], [12.6, 3.4]]) K.prop(0, 'bag', u, v, [1, 0], 0.4, 0.4, 0.3);
  K.scrawl(0, 11.55, 9.0, [1, 0], '长江索道 · 停运  YANGTZE RIVER CABLEWAY · SUSPENDED', 2.4);
  K.scrawl(0, U - 0.02, 4.0, [-1, 0], '1号车厢 41人 16:30全部下车  CABIN 1 · 41 ABOARD · ALL OFF BY 16:30');
  // The switch room: the feeder's incoming panel, dead; the tool cabinet.
  K.block(0, 'cabinet', 0, 11.2, 0.7, V - 0.2, 2.2, [1, 0]);
  K.scrawl(0, 0.72, 12.3, [1, 0], '10kV进线 新华路变电站 · 无电  10 kV FEEDER FROM XINHUA RD SUBSTATION · DEAD');
  K.put(0, 'cabinet', 5.85, 7.6, [-1, 0], { zh: '工具柜', en: 'Tool cabinet', items: [['crowbar', 1]] });
  K.scrawl(0, 8.98, 3.0, [-1, 0], '上站 · 四楼 · 别碰主轮  TO THE UPPER STATION · 4TH FLOOR · KEEP OFF THE BULLWHEEL');
  K.entry([[U - 0.8, 8.05], [12.6, 10.7], [10.2, 10.5], [7.7, 10.5], [5.6, 10.5], [3.0, 9.0], [3.0, 4.5]]);

  // The upper station, its top two floors: the stair room off the stairwell's landing, the rope store and the
  // operator's booth off it; the machine deck and the platform two floors high; the platform open at the street end.
  const r = CABLE.v, R = H + CABLE.rope;
  K.room(T, 0, 2.9, 12.0, 6.0); // stair room
  K.room(T, 6.4, 0, 12.0, 2.6); // rope store
  K.room(T, 12.3, 0, U, 6.0); // operator's booth
  K.room(T, 0, 6.3, 7.0, V, null, { floors: 2 }); // machine deck
  K.room(T, 7.3, 6.3, U, V, null, { floors: 2 }); // platform
  K.room(T, U - 0.1, r - 2.3, U + 0.5, r + 2.3, null, { floors: 2 }); // the open end the ropes leave by
  K.door(T, 0.6, 2.75, 'v', 'locked', { label: ['上站', 'Upper station'] });
  K.door(T, 3.0, 6.15, 'v', 'shut');
  K.door(T, 9.5, 6.15, 'v', 'collapsed');
  K.door(T, 9.0, 2.75, 'v', 'shut');
  K.door(T, 12.15, 4.5, 'u', 'locked', { label: ['操作室', "Operator's booth"] });
  K.door(T, 7.15, V - 0.9, 'u', 'open');
  // The booth: the control desk (its drawer the operator key and the note), the dead screens; the store's rope gear.
  K.put(T, 'drawer', U - 0.3, 2.0, [-1, 0], { zh: '操作台抽屉', en: 'Control desk drawer', items: [['opkey', 1]], doc: true });
  K.put(T, 'desk', U - 0.4, 3.8, [-1, 0]);
  K.prop(T, 'chair', U - 1.4, 3.6, [1, 0], 0.45, 0.9, 0.45, true);
  K.block(T, 'cabinet', 12.5, 0.2, 13.3, 1.7, 1.6, [1, 0]);
  K.prop(T, 'papers', U - 0.5, 4.2, [-1, 0], 0.5, 0.02, 0.4, false, 0.76);
  K.scrawl(T, 12.32, 2.5, [1, 0], '钥匙在操作台  KEY AT THE DESK · DON\'T TAKE IT HOME');
  // (Up here only what's set out by hand.)
  for (const u of [7.4, 8.6]) K.put(T, 'shelf', u, 0.2, [0, 1]);
  K.put(T, 'locker', 11.0, 0.25, [0, 1], { zh: '绳索工具柜', en: 'Rope gear locker', items: [['rope', 1], ['harness', 1]] });
  K.scrawl(T, 10.8, 5.98, [0, -1], '顶棚塌了 走机房  ROOF CAME DOWN · GO ROUND BY THE MACHINE DECK');
  // The bullwheel on the machine deck: its hub, its rim (solid where it stands), the haul rope off it over the deck
  // and up over the platform; its brake lever on the way round it, behind it.
  const wy = H + 1.1, wu = 3.2;
  late.push(box(wu - 0.3, wu + 0.3, r - 0.3, r + 0.3, H, wy + 0.5, MAT.metal), box(wu - 2, wu + 2, r - 2, r + 2, wy - 0.15, wy + 0.15, MAT.hidden));
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8, u = wu + cos(a) * 1.9, v = r + sin(a) * 1.9;
    out.decor.push(box(u - 0.25, u + 0.25, v - 0.25, v + 0.25, wy - 0.12, wy + 0.12, MAT.metal));
    if (i % 4 === 0) out.decor.push(box(Math.min(wu, u), Math.max(wu, u), Math.min(r, v), Math.max(r, v), wy - 0.05, wy + 0.05, MAT.metal));
  }
  out.decor.push(box(wu + 2, 7.2, r - 0.03, r + 0.03, wy - 0.03, wy + 0.03, MAT.metal), box(7.1, 7.2, r - 0.03, r + 0.03, wy, R - 0.2, MAT.metal), box(7.1, U + 0.5, r - 0.03, r + 0.03, R - 0.23, R - 0.17, MAT.metal));
  feat('cable:bullwheel', wu, r, H);
  K.block(T, 'cabinet', wu - 0.5, V - 0.5, wu + 0.5, V, 1.1, [0, -1]);
  const [lx, lz] = at(wu, V - 0.8);
  out.inter.push({ id: 'cablebrake', kind: 'cablebrake', x: lx, y: H + 1.2, z: lz, r: 0.7, zh: '主轮制动手柄', en: 'Bullwheel brake' });
  K.scrawl(T, 6.98, r + 1.5, [-1, 0], '制动未合 · 风吹轮转 · 别靠近轮缘  BRAKE OFF · THE WIND TURNS IT · KEEP OFF THE RIM');
  K.scrawl(T, 0.02, 8.0, [1, 0], '驱动无电 · 应急驱动用完  MAIN DRIVE DEAD · EMERGENCY DRIVE SPENT');
  // The track ropes along the hall to the open end, anchored at the back wall.
  for (const dv of [-CABLE.track, CABLE.track]) out.decor.push(box(0.05, U + 0.5, r + dv - 0.035, r + dv + 0.035, R - 0.035, R + 0.035, MAT.metal));
  // Cabin 2, parked: its floor on the platform's, its door open toward the platform's edge, glass round it, hung from
  // its carriage on the track ropes.
  const c = { u0: U - 6.6, u1: U - 0.4, v0: r - 1.6, v1: r + 1.6 }, uc = (c.u0 + c.u1) / 2, glass = (q: Solid) => late.push({ ...q, tint: 0x9ab8c8 });
  late.push(box(c.u0, c.u1, c.v0, c.v1, H, H + 0.1, MAT.metal), box(c.u0 - 0.1, c.u1 + 0.1, c.v0 - 0.1, c.v1 + 0.1, H + 2.3, H + 2.45, MAT.metal));
  const walls: [number, number, number, number][] = [[c.u0, uc - 0.7, c.v0, c.v0 + 0.08], [uc + 0.7, c.u1, c.v0, c.v0 + 0.08], [c.u0, c.u1, c.v1 - 0.08, c.v1], [c.u0, c.u0 + 0.08, c.v0, c.v1], [c.u1 - 0.08, c.u1, c.v0, c.v1]];
  for (const [u0, u1, v0, v1] of walls) { late.push(box(u0, u1, v0, v1, H + 0.1, H + 1.1, MAT.metal), box(u0, u1, v0, v1, H + 2.1, H + 2.3, MAT.metal)); glass(box(u0, u1, v0, v1, H + 1.1, H + 2.1, MAT.glass)); }
  out.decor.push(box(uc - 0.3, uc + 0.3, r - 0.15, r + 0.15, H + 2.45, R - 0.3, MAT.metal), box(uc - 1.7, uc + 1.7, r - 0.55, r + 0.55, R - 0.35, R - 0.05, MAT.tealMetal));
  feat('cable:cabin', uc, c.v0 + 0.25, H, [0, -1]);
  // Its control panel on its far wall, where the operator key starts the drive (sim/cablecar.ts).
  const [px, pz] = at(uc, c.v1 - 0.35);
  out.inter.push({ id: 'cabinpanel', kind: 'cabin', x: px, y: H + 1.2, z: pz, r: 0.4, zh: '2号车厢操作盘', en: "Cabin 2's control panel" });
  K.prop(T, 'bag', c.u1 - 0.6, c.v1 - 0.6, [0, -1], 0.4, 0.4, 0.3);
  K.prop(T, 'papers', 8.5, 8.0, [1, 0], 0.5, 0.02, 0.4);
  K.scrawl(T, 7.32, r - 0.7, [1, 0], '2号车厢 停放 · 1号车厢在上新街  CABIN 2 PARKED · CABIN 1 AT SHANGXIN STREET');
  K.mark('heart', T, uc, r);
  // Where the ropes leave, over the street and on across the river (cableLine()).
  feat('cable:saddle', U + 0.3, r, R);
  K.build();
  // (What stands in its rooms, set after they're carved.)
  out.solids.push(...late);
  // (Its rooms as the city's ways through it and its waiting machines know them: those it was rolled with, M6-16, so
  // the city round it stands as it did.)
  const mine = out.features.splice(n0);
  out.features.push(...rolled.features.filter(f => f.kind.startsWith('inside:')), ...mine.filter(f => !f.kind.startsWith('inside:')));
};

type P3 = { x: number; y: number; z: number };
/** The ropes' line: the haul rope's ends, its bearing and length over the ground; ropeY() its height f of the way
 *  along, sagging. */
export interface CableLine { a: P3; b: P3; dx: number; dz: number; len: number }
export const ropeY = (l: CableLine, f: number) => l.a.y + (l.b.y - l.a.y) * f - CABLE.sag * 4 * f * (1 - f);

/** The ropes' line (M6-16), before the city's built: from the north station's open end (its frame as hollow() and
 *  place() make it) on the real line's bearing (OpenStreetMap's aerialway) to the south station on Shangxin Street,
 *  the building at the line's far end, where it meets its wall at CABLE.south over its floor. That station is set
 *  low, as the real one is (its height on the map is unknown: rolled, it stood a tower). */
export function cableLine(plans: Plan[], north: Plan): CableLine | null {
  const real = GEO.aerial.filter(q => q[0] === '长江索道').map(q => q[1].map(d => d / 10));
  if (!real.length) return null;
  const ex = real.reduce((s, q) => s + q[2], 0) / real.length, ez = real.reduce((s, q) => s + q[3], 0) / real.length;
  const south = plans.find(p => inside(corners(p.obb), ex, ez));
  if (!south) return null;
  const o = north.obb, alongZ = o.hd >= o.hw, U = (alongZ ? o.hd : o.hw) * 2 - 2 * WALL, u = U + 0.3, v = CABLE.v;
  const lx = o.cx - o.hw + WALL + (alongZ ? v : u), lz = o.cz - o.hd + WALL + (alongZ ? u : v), c = cos(o.yaw), s = sin(o.yaw);
  const a = { x: o.cx + c * (lx - o.cx) - s * (lz - o.cz), y: north.base + (Math.round((north.wall - north.base) / FLOOR) - 2) * FLOOR + CABLE.rope, z: o.cz + s * (lx - o.cx) + c * (lz - o.cz) };
  const d = Math.hypot(ex - a.x, ez - a.z), dx = (ex - a.x) / d, dz = (ez - a.z) / d, sc = corners(south.obb);
  let t = 0;
  while (t < d && !inside(sc, a.x + dx * t, a.z + dz * t)) t += 0.25;
  const len = t - 0.3;
  south.wall = south.base + CABLE.south + 3;
  return { a, b: { x: a.x + dx * len, y: south.base + CABLE.south, z: a.z + dz * len }, dx, dz, len };
}

/** How high what the city made may stand at a footprint's points (x, z) for the cabins (M6-16): CABLE.clear under the
 *  ropes' lowest over it where it's within CABLE.wide of the line (from a metre out of the north station's hall to
 *  the south station's wall), else Infinity. */
function under(l: CableLine, pts: [number, number][]): number {
  let t0 = Infinity, t1 = -Infinity, s0 = Infinity, s1 = -Infinity;
  for (const [x, z] of pts) {
    const t = (x - l.a.x) * l.dx + (z - l.a.z) * l.dz, s = (z - l.a.z) * l.dx - (x - l.a.x) * l.dz;
    t0 = Math.min(t0, t); t1 = Math.max(t1, t); s0 = Math.min(s0, s); s1 = Math.max(s1, s);
  }
  t0 = Math.max(t0, 1); t1 = Math.min(t1, l.len);
  if (t1 < t0 || s0 > CABLE.wide || s1 < -CABLE.wide) return Infinity;
  let y = Infinity;
  for (let t = t0; ; t = Math.min(t + 1, t1)) { y = Math.min(y, ropeY(l, t / l.len)); if (t >= t1) break; }
  return y - CABLE.clear;
}

/** The city's own buildings (none on the map, nor one made by hand) in the cabins' way, and the height each is cut
 *  down to: by whole floors to under it, a floor at least. Found before the city's built, cut once it stands
 *  (cutCableway()): everything drawn for its dice is drawn as it was. */
export function cableCuts(plans: Plan[], l: CableLine): Map<Plan, number> {
  const cuts = new Map<Plan, number>();
  for (const p of plans) {
    if (p.osm || p.inside) continue;
    const y = under(l, corners(p.obb)), c = p.base + Math.max(1, Math.floor((y - p.base) / FLOOR)) * FLOOR;
    if (c < p.wall) cuts.set(p, c);
  }
  return cuts;
}

/** Whether a connection from a to b (a plank, a cable, a beam: crossings.ts) would be in the cabins' way: through the
 *  space over the line, or to a building cut down there, over its cut. */
export const inCableWay = (l: CableLine, cuts: Map<Plan, number>) => (a: [number, number, number], b: [number, number, number]) => {
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2])) + 1;
  for (let i = 0; i <= n; i++) {
    const x = a[0] + ((b[0] - a[0]) * i) / n, y = a[1] + ((b[1] - a[1]) * i) / n, z = a[2] + ((b[2] - a[2]) * i) / n;
    if (y > under(l, [[x, z]])) return true;
    for (const [p, c] of cuts) if (y > c - 0.5 && inObb(p, x, z, 1.5)) return true;
  }
  return false;
};
const inObb = (p: Plan, x: number, z: number, m: number) => {
  const o = p.obb, c = cos(o.yaw), s = sin(o.yaw), dx = x - o.cx, dz = z - o.cz;
  return Math.abs(c * dx + s * dz) <= o.hw + m && Math.abs(-s * dx + c * dz) <= o.hd + m;
};

/** Once the city stands and is joined up, the buildings in the cabins' way cut down (cableCuts()): all a building made
 *  over its cut gone (its windows there kept as ghosts and its shelters 'gone', for the routes' dice, as a hand-made
 *  building's are), a roof over the rest; and whatever else the city strung or set out in the space over the line
 *  (the alleys' cables and junk) taken away. The joins' connections there were never built (inCableWay()). */
export function cutCableway(l: CableLine, cuts: Map<Plan, number>, plans: Plan[], plots: Plot[], out: Fabric) {
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
  // What isn't a building's, over the line.
  const pt = (x: number, z: number): [number, number][] => [[x, z]], bx = (q: Solid): [number, number][] => [[q.x0, q.z0], [q.x1, q.z0], [q.x0, q.z1], [q.x1, q.z1]];
  for (const k of ['solids', 'decor', 'far'] as const) out[k].forEach((q, i) => { if (!owned[k][i] && q.y1 > under(l, bx(q))) drop[k].add(i); });
  for (const k of ['props', 'inter'] as const) out[k].forEach((q, i) => { if (!owned[k][i] && q.y > under(l, pt(q.x, q.z))) drop[k].add(i); });
  out.climbables.forEach((q, i) => { if (!owned.climbables[i] && q.y1 > under(l, pt(q.x, q.z))) drop.climbables.add(i); });
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

/** The ropes over the city and the river from the north station's open end to the south station: two track ropes
 *  and the haul rope between, drawn (`w.ropes`); cabin 1 drawn at the south station's wall. Marks the haul rope's
 *  two ends ('cable:rope'). */
export function cableRopes(w: World, l: CableLine): { ropes: Line[]; features: Feature[] } {
  const { a, b, dx, dz } = l, ropes: Line[] = [], n = 16;
  for (const side of [-CABLE.track, 0, CABLE.track]) {
    const ox = -dz * side, oz = dx * side, dy = side ? 0 : -0.2;
    const at = (f: number) => ({ x: a.x + ox + (b.x - a.x) * f, y: ropeY(l, f) + dy, z: a.z + oz + (b.z - a.z) * f });
    for (let i = 0; i < n; i++) ropes.push({ a: at(i / n), b: at((i + 1) / n) });
  }
  // Cabin 1 at the south station, come in on the emergency drive: its body under its carriage, its hanger.
  const sb = (p: number, q: number, c: number, d: number, y0: number, y1: number, mat: number) => solid(Math.min(b.x - dx * p - dz * c, b.x - dx * q - dz * d), y0, Math.min(b.z - dz * p + dx * c, b.z - dz * q + dx * d), Math.max(b.x - dx * p - dz * c, b.x - dx * q - dz * d), y1, Math.max(b.z - dz * p + dx * c, b.z - dz * q + dx * d), mat);
  w.decor.push(sb(0.4, 6.6, -1.6, 1.6, b.y - CABLE.rope, b.y - CABLE.rope + 2.45, MAT.metal), sb(3.2, 3.8, -0.15, 0.15, b.y - CABLE.rope + 2.45, b.y - 0.3, MAT.metal), sb(1.8, 5.2, -0.55, 0.55, b.y - 0.35, b.y - 0.05, MAT.tealMetal));
  return { ropes, features: [{ kind: 'cable:rope', x: a.x, y: a.y - 0.2, z: a.z, group: 0, nx: dx, nz: dz }, { kind: 'cable:rope', x: b.x, y: b.y - 0.2, z: b.z, group: 1, nx: -dx, nz: -dz }] };
}
