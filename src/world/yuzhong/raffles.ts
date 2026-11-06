// Chaotianmen and Raffles City (M6-04, U-108): the square at the peninsula's tip, where the green Jialing meets the
// brown Yangtze, and Raffles City's eight curved glass towers rising from its podium (the machines' factory now,
// factory.ts), The Crystal laid across the tops of the middle four 250 m up. Built once the city stands: what the
// city put up on the square and the towers' stand-ins are cut to their footings first (cutdown.ts, found before the
// city's built, so its dice all fall as they did), and what it set out there afterwards is taken away (`covers`).
// The square: a granite deck level with Chaoqian Road at its head, out over the falling ground to a prow high over
// the rivers' meeting, a parapet wherever it stands over what's below, and the great stair down from it to the road
// round the tip. The towers: OpenStreetMap's footprints and heights (T3N and T4N 350 m, the rest 250 m), each bowing
// out from the middle of the eight as it rises.
import { solid, rampSolid, turn, carve, type Solid, type Box } from '../geom';
import { MAT } from '../mats';
import { stepsFor } from '../steps';
import type { Heightfield } from '../heightfield';
import type { Prop, Feature, Teleport, Plot, Inter, Climbable, Camera } from '../world';
import { GEO } from '../geo';
import { PODIUM } from './ground';
import { points, minRect, inside, type Obb, type P2 } from './shapes';
import type { Plan } from './lots';
import type { Ceil } from './cutdown';
import { built } from './handbuilt';
import { sin, cos, atan2 } from '../trig';

/** The square's deck (game y), the great stair's slope; The Crystal over its towers' feet (m), its half-width and
 *  height, how far it reaches out past its end towers; the towers' segments (m). */
export const RAFFLES = { deck: 44, slope: 0.6, rise: 250, half: 16, tall: 26, reach: 22, seg: 10, belly: 4 };

/** Chaotianmen square's outline (OpenStreetMap's). */
export const SQUARE: P2[] = points(GEO.buildings.find(b => b[3] === '朝天门广场')?.[4] ?? [], 0.1);
export interface Tower { name: string; h: number; obb: Obb; crystal: boolean; bow: number }
/** The eight towers, T1 to T6 (OpenStreetMap's), the four The Crystal lies on, how far each bows out at its top. */
export const TOWERS: Tower[] = GEO.buildings.filter(b => b[3].endsWith('塔楼')).map(b => {
  const name = b[3].slice(0, -2), crystal = ['T2', 'T3S', 'T4S', 'T5'].includes(name);
  return { name, h: b[1] / 10 || 250, obb: minRect(points(b[4], 0.1)), crystal, bow: crystal ? 3 : name.endsWith('N') ? 5 : 12 };
});
const inObb = (o: Obb, x: number, z: number, m = 0) => { const c = cos(o.yaw), s = sin(o.yaw), dx = x - o.cx, dz = z - o.cz; return Math.abs(c * dx + s * dz) <= o.hw + m && Math.abs(-s * dx + c * dz) <= o.hd + m; };
const planOf = (plans: Plan[], t: Tower) => plans.find(p => p.osm && p.name === `${t.name}塔楼`);

/** The point past the square, beyond the road round it: within this of the square's prow (m), open to the rivers. */
const POINT = 75, prow = SQUARE.reduce((a, q) => (q[1] < a[1] ? q : a), SQUARE[0] ?? [0, 0]);
const onPoint = (x: number, z: number) => z < prow[1] - 3 && Math.hypot(x - prow[0], z - prow[1]) < POINT;
/** The city's buildings where these stand, to be cut to their footings (cutdown.ts): the towers' stand-ins, what
 *  stood on the square and out on the point past it. */
export function raffleCuts(plans: Plan[]): Map<Plan, number> {
  const m = new Map<Plan, number>();
  for (const p of plans) if (!p.far && (p.osm ? p.name.endsWith('塔楼') : inside(SQUARE, p.obb.cx, p.obb.cz) || onPoint(p.obb.cx, p.obb.cz))) m.set(p, p.base);
  return m;
}
/** Nothing of the city's own over the square, the point or the towers' footprints (cutdown.ts: nothing strung or set
 *  out there). */
export const raffleCeil: Ceil = pts => (pts.some(([x, z]) => inside(SQUARE, x, z) || onPoint(x, z) || TOWERS.some(t => inObb(t.obb, x, z, 1))) ? -Infinity : Infinity);

/** The Crystal's frame: t along it from over T2's middle toward T5's, s across (south +), its floor; its ends. */
export interface Frame { ox: number; oz: number; ux: number; uz: number; y: number; t0: number; t1: number; yaw: number; pt: (t: number, s: number) => P2 }
export function crystalFrame(plans: Plan[]): Frame {
  const cs = TOWERS.filter(t => t.crystal), a = cs.find(t => t.name === 'T2')!.obb, b = cs.find(t => t.name === 'T5')!.obb;
  const l = Math.hypot(b.cx - a.cx, b.cz - a.cz), ux = (b.cx - a.cx) / l, uz = (b.cz - a.cz) / l, nx = -uz, nz = ux;
  const s0 = cs.reduce((m, t) => m + (t.obb.cx - a.cx) * nx + (t.obb.cz - a.cz) * nz, 0) / cs.length, ox = a.cx + nx * s0, oz = a.cz + nz * s0;
  const ts = cs.flatMap(t => [-1, 1].flatMap(i => [-1, 1].map(j => { const c = cos(t.obb.yaw), s = sin(t.obb.yaw), x = t.obb.cx + c * i * t.obb.hw - s * j * t.obb.hd, z = t.obb.cz + s * i * t.obb.hw + c * j * t.obb.hd; return (x - ox) * ux + (z - oz) * uz; })));
  const y = Math.round(cs.reduce((m, t) => m + (planOf(plans, t)?.base ?? 0), 0) / cs.length + RAFFLES.rise);
  return { ox, oz, ux, uz, y, t0: Math.min(...ts) - RAFFLES.reach, t1: Math.max(...ts) + RAFFLES.reach, yaw: atan2(uz, ux), pt: (t, s) => [ox + ux * t + nx * s, oz + uz * t + nz * s] };
}

export interface Raffles {
  solids: Solid[]; decor: Solid[]; far: Solid[]; props: Prop[]; features: Feature[]; teleports: Teleport[]; inter: Inter[]; climbables: Climbable[]; cameras: Camera[];
  /** what's cut out of The Crystal's shell, in its frame (t as x, s as z): ways through its floor, walls and roof */
  cuts: Box[];
  /** whether what the city set out at a point is where these now stand */
  covers: (x: number, z: number) => boolean;
  frame: Frame;
}

/** A tower's own frame (its footprint's axes, x along hw), for laying out what's made inside it; how far its
 *  footprint's bowed out (x, z) at a height. */
export interface TowerHand { t: Tower; base: number; top: number; b: ReturnType<typeof built>; bow: (y: number) => P2 }

/** What's made inside the towers and The Crystal (hub.ts): each tower's insides as it's built, The Crystal's once its
 *  shell stands (its ways through the shell cut out by then). */
export interface Fitting { fit(h: TowerHand, r: Raffles): void; inside(r: Raffles): void }

/** The square, the towers and The Crystal. The cut buildings' plots stand as high as what's there now: the square's
 *  deck, the towers' roofs. */
export function raffles(g: Heightfield, plans: Plan[], plots: Plot[], hub?: Fitting): Raffles {
  const r: Raffles = { solids: [], decor: [], far: [], props: [], features: [], teleports: [], inter: [], climbables: [], cameras: [], cuts: [], covers: () => false, frame: crystalFrame(plans) };
  const deck = square(g, plans, r);
  plans.forEach((p, n) => { if (!p.osm && !p.far && inside(SQUARE, p.obb.cx, p.obb.cz)) plots[n].wall = plots[n].top = RAFFLES.deck; });
  towers(plans, plots, r, hub && (h => hub.fit(h, r)));
  shell(r);
  hub?.inside(r);
  r.covers = (x, z) => { const i = Math.round(x / g.cell), j = Math.round(z / g.cell); return (i >= 0 && j >= 0 && i < g.w && j < g.h && deck[j * g.w + i] > 0) || TOWERS.some(t => inObb(t.obb, x, z, 1)); };
  return r;
}

/** Chaotianmen square: per ground sample on it (off the streets, the podium and what still stands), its deck at
 *  RAFFLES.deck, or the great stair down to the tip; the ground under it brought down under it. Returns the samples
 *  (1 the deck, 2 the stair). */
function square(g: Heightfield, plans: Plan[], r: Raffles): Uint8Array {
  const { deck: Y, slope } = RAFFLES, m = new Uint8Array(g.y.length), C = g.cell, cut = raffleCuts(plans);
  const zs = SQUARE.map(q => q[1]), xs = SQUARE.map(q => q[0]);
  const stand = plans.filter(p => !cut.has(p) && !p.far && p.obb.cx > Math.min(...xs) - 60 && p.obb.cx < Math.max(...xs) + 60 && p.obb.cz > Math.min(...zs) - 60 && p.obb.cz < Math.max(...zs) + 60);
  const i0 = Math.floor(Math.min(...xs) / C), i1 = Math.ceil(Math.max(...xs) / C), j0 = Math.floor(Math.min(...zs) / C), j1 = Math.ceil(Math.max(...zs) / C);
  const street = (i: number, j: number) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (g.street![(j + b) * g.w + i + a]) return true; return false; };
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const x = i * C, z = j * C;
    if (![[-1, -1], [1, -1], [-1, 1], [1, 1]].every(([a, b]) => inside(SQUARE, x + a, z + b)) || inside(PODIUM, x, z) || street(i, j) || stand.some(p => inObb(p.obb, x, z, 1.5))) continue;
    m[j * g.w + i] = 1;
  }
  // The great stair: from the road round the tip, as high as the ground at its foot, up to the deck.
  let jf = j0;
  while (jf < j1 && !m.subarray(jf * g.w + i0, jf * g.w + i1 + 1).some(v => v)) jf++;
  let low = -Infinity;
  for (let i = i0; i <= i1; i++) if (m[jf * g.w + i]) low = Math.max(low, g.y[jf * g.w + i]);
  const foot = jf * C - C / 2;
  const top = foot + (Y - low) / slope, at = (z: number) => Math.min(Y, low + (z - foot) * slope);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (m[j * g.w + i] && j * C < top) m[j * g.w + i] = 2;
  const surf = (k: number, z: number) => (m[k] === 1 ? Y : m[k] === 2 ? at(z) : g.y[k]);
  const granite = 0xb4ab9c;
  for (let j = j0; j <= j1; j++) {
    const z = j * C;
    for (let i = i0; i <= i1; i++) {
      const k = j * g.w + i, v = m[k];
      if (!v || m[k - 1] === v) continue;
      let e = i, under = g.y[k];
      while (m[j * g.w + e + 1] === v) under = Math.min(under, g.y[j * g.w + ++e]);
      const x0 = i * C - C / 2, x1 = e * C + C / 2;
      if (v === 1) r.solids.push({ ...solid(x0, under - 0.5, z - C / 2, x1, Y, z + C / 2, MAT.stone), tint: granite });
      else { const q = rampSolid(x0, under - 0.5, z - C / 2, x1, z + C / 2, at(z - C / 2), at(z + C / 2), 3, MAT.hidden); r.solids.push(q); stepsFor(q, r.decor); }
    }
  }
  // Nothing of the ground over it; a parapet wherever it stands a metre over what's next to it.
  for (let k = 0; k < m.length; k++) if (m[k]) g.y[k] = Math.min(g.y[k], (m[k] === 1 ? Y : at(Math.floor(k / g.w) * C - C / 2)) - 0.3);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const k = j * g.w + i, x = i * C, z = j * C;
    if (!m[k]) continue;
    const h = surf(k, z);
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = (j + b) * g.w + i + a;
      if (m[n] || surf(n, z + b * C) > h - 1) continue;
      // (Along a side of the stair, stepped with it.)
      const y = m[k] === 2 ? at(z + C / 2) : h, ex = x + (a * C) / 2, ez = z + (b * C) / 2;
      r.solids.push({ ...(a ? solid(ex - a * 0.3, y, z - C / 2, ex, y + 1.1, z + C / 2, MAT.stone) : solid(x - C / 2, y, ez - b * 0.3, x + C / 2, y + 1.1, ez, MAT.stone)), tint: granite });
    }
  }
  // Lamps over the deck every 40 m (smart ones: each its camera, patrols.ts), benches facing the prow; where it is, the head of the stair over the tip.
  const on = (x: number, z: number) => m[Math.round(z / C) * g.w + Math.round(x / C)] === 1;
  let n = 0, sx = 0, sz = 0;
  for (let k = 0; k < m.length; k++) if (m[k] === 1) { n++; sx += (k % g.w) * C; sz += Math.floor(k / g.w) * C; }
  const mid: P2 = [sx / n, sz / n];
  for (let z = Math.ceil(top / 40) * 40 + 8; z < Math.max(...zs); z += 40) for (let x = Math.floor(Math.min(...xs) / 40) * 40 + 12; x < Math.max(...xs); x += 40) {
    if (![[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]].every(([a, b]) => on(x + a, z + b))) continue;
    r.props.push({ kind: 'lamppost', x, y: Y, z, yaw: 0 }, { kind: 'bench', x: x + 2, y: Y, z: z - 1, yaw: Math.PI });
    r.solids.push(solid(x + 1.1, Y, z - 1.25, x + 2.9, Y + 0.5, z - 0.8, MAT.hidden));
  }
  const row = [...Array(i1 - i0 + 1).keys()].map(i => i + i0).filter(i => m[jf * g.w + i]), tipX = ((row[0] + row[row.length - 1]) / 2) * C;
  r.features.push({ kind: 'chaotianmen:plaza', x: mid[0], y: Y, z: mid[1], group: 0 }, { kind: 'chaotianmen:stair', x: tipX, y: Y, z: top + 2, group: 0 }, { kind: 'chaotianmen:foot', x: tipX, y: low, z: foot - 2, group: 0 });
  r.teleports.push({ name: 'Chaotianmen square', x: tipX, y: Y + 1.5, z: top + 4, yaw: 0 });
  return m;
}

/** The towers from their footings, in segments bowing out from the middle of the eight; the four under The Crystal
 *  up to its floor, T3N and T4N crowned with a mast. */
function towers(plans: Plan[], plots: Plot[], r: Raffles, fit?: (h: TowerHand) => void) {
  const F = r.frame, cx = TOWERS.reduce((a, t) => a + t.obb.cx, 0) / TOWERS.length, cz = TOWERS.reduce((a, t) => a + t.obb.cz, 0) / TOWERS.length;
  for (const t of TOWERS) {
    const p = planOf(plans, t);
    if (!p) continue;
    const o = t.obb, base = p.base, top = t.crystal ? F.y : base + t.h, H = top - base, c = cos(o.yaw), sn = sin(o.yaw);
    const ol = Math.hypot(o.cx - cx, o.cz - cz) || 1, wx = (o.cx - cx) / ol, wz = (o.cz - cz) / ol, lx = c * wx + sn * wz, lz = -sn * wx + c * wz;
    const box = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, mat: number) => solid(o.cx + x0, y0, o.cz + z0, o.cx + x1, y1, o.cz + z1, mat);
    const pt = (x: number, z: number): P2 => [o.cx + c * x - sn * z, o.cz + sn * x + c * z];
    const b = built(`raffles-${t.name.toLowerCase()}`, base, box, pt), tint = t.crystal ? 0xc4d4e0 : 0xb4c4d2;
    const bow = (y: number): P2 => { const d = t.bow * ((y - base) / H) ** 2; return [lx * d, lz * d]; };
    for (let y = base; y < top - 0.01; y += RAFFLES.seg) {
      const y1 = Math.min(top, y + RAFFLES.seg), [ex, ez] = bow((y + y1) / 2);
      // (A crown on the tall two: a step in over their last 20 m.)
      const inn = !t.crystal && y1 > top - 20 ? 2 : 0;
      b.shell(ex - o.hw + inn, ex + o.hw - inn, ez - o.hd + inn, ez + o.hd - inn, y === base ? y - 1 : y, y1, MAT.glass, tint);
      // Its plant floors: a dark band every 40 m.
      if (Math.round(y - base) % 40 === 30) b.H.decor.push(box(ex - o.hw - 0.08, ex + o.hw + 0.08, ez - o.hd - 0.08, ez + o.hd + 0.08, y1 - 1.6, y1, MAT.metal));
    }
    if (t.name.endsWith('N')) {
      const d = t.bow;
      b.H.decor.push(box(lx * d - 0.4, lx * d + 0.4, lz * d - 0.4, lz * d + 0.4, top, top + 24, MAT.metal), box(lx * d - 0.5, lx * d + 0.5, lz * d - 0.5, lz * d + 0.5, top + 24, top + 25, MAT.lamp));
    }
    fit?.({ t, base, top, b, bow });
    plots[plans.indexOf(p)].wall = plots[plans.indexOf(p)].top = top;
    r.solids.push(...turn(b.solids(), o.yaw, o.cx, o.cz));
    r.decor.push(...turn(b.H.decor, o.yaw, o.cx, o.cz));
    r.props.push(...b.H.props); r.features.push(...b.H.features); r.inter.push(...b.H.inter);
    r.far.push({ ...turn([solid(o.cx - o.hw, base, o.cz - o.hd, o.cx + o.hw, top, o.cz + o.hd, MAT.glass)], o.yaw, o.cx, o.cz)[0], tint });
  }
}

/** The Crystal's shell over its four towers: its belly and floor, glass walls and roof on steel ribs, and over the
 *  gap between T3S and T4S its floor of glass panes on steel beams. */
function shell(r: Raffles) {
  const F = r.frame, { half: S, tall, belly } = RAFFLES, Y = F.y, ox = F.ox, oz = F.oz;
  const box = (t0: number, t1: number, s0: number, s1: number, y0: number, y1: number, mat: number, tint?: number): Solid => ({ ...solid(ox + t0, y0, oz + s0, ox + t1, y1, oz + s1, mat), ...(tint ? { tint } : {}) });
  const own: Solid[] = [], decor: Solid[] = [], steel = 0x4a5058, pane = 0xbcd6e4, g = glassFloor(r);
  // (Its floor over the belly and the towers' tops alike: stone.)
  for (const [a, c] of [[F.t0, g[0]], [g[1], F.t1]]) { own.push(box(a, c, -S, S, Y - belly, Y, MAT.metal, steel)); decor.push(box(a, c, -S, S, Y, Y + 0.02, MAT.stone, 0xc8c2b6)); }
  own.push(box(g[0], g[1], -S, S, Y - 0.2, Y, MAT.hidden), box(g[0], g[1], -S, S, Y - belly, Y - belly + 0.4, MAT.metal, steel));
  // The glass floor: panes 3 m square on beams (0.4 m) both ways.
  for (let t = g[0]; t < g[1] - 0.1; t += 3) for (let s = -S; s < S - 0.1; s += 3) decor.push(box(t + 0.2, Math.min(g[1], t + 3) - 0.2, s + 0.2, Math.min(S, s + 3) - 0.2, Y - 0.05, Y - 0.01, MAT.glass, pane));
  for (let t = g[0]; t <= g[1] + 0.01; t += 3) decor.push(box(t - 0.2, t + 0.2, -S, S, Y - 0.6, Y, MAT.metal, steel));
  for (let s = -S; s <= S + 0.01; s += 3) decor.push(box(g[0], g[1], s - 0.2, s + 0.2, Y - 0.6, Y, MAT.metal, steel));
  // Walls and roof of glass, ribs every 6 m.
  for (const s of [-S, S]) own.push(box(F.t0, F.t1, s - 0.15, s + 0.15, Y, Y + tall, MAT.glass, pane));
  for (const t of [F.t0, F.t1]) own.push(box(t - 0.15, t + 0.15, -S, S, Y, Y + tall, MAT.glass, pane));
  own.push(box(F.t0, F.t1, -S, S, Y + tall, Y + tall + 0.4, MAT.glass, pane));
  for (let t = F.t0; t <= F.t1; t += 6) for (const s of [-1, 1]) decor.push(box(t - 0.2, t + 0.2, s * S - 0.35, s * S + 0.35, Y - belly, Y + tall + 0.6, MAT.metal, steel));
  for (let t = F.t0; t <= F.t1; t += 6) decor.push(box(t - 0.2, t + 0.2, -S - 0.35, S + 0.35, Y + tall + 0.4, Y + tall + 0.7, MAT.metal, steel));
  r.solids.push(...turn(r.cuts.reduce((a, c) => carve(a, { ...c, x0: ox + c.x0, x1: ox + c.x1, z0: oz + c.z0, z1: oz + c.z1 }), own), F.yaw, ox, oz));
  r.decor.push(...turn(decor, F.yaw, ox, oz));
  r.far.push({ ...turn([box(F.t0, F.t1, -S, S, Y - belly, Y + tall, MAT.glass, pane)], F.yaw, ox, oz)[0] });
  const [ax, az] = F.pt(0, 0), [bx, bz] = F.pt(F.t1, 0), [wx, wz] = F.pt(F.t0, 0);
  const [g0x, g0z] = F.pt(g[0], 0), [g1x, g1z] = F.pt(g[1], 0);
  r.features.push({ kind: 'crystal', x: ax, y: Y, z: az, group: 0, nx: F.ux, nz: F.uz }, { kind: 'crystal:east', x: bx, y: Y, z: bz, group: 0 }, { kind: 'crystal:west', x: wx, y: Y, z: wz, group: 0 },
    { kind: 'crystal:glass', x: g0x, y: Y, z: g0z, group: 0 }, { kind: 'crystal:glass', x: g1x, y: Y, z: g1z, group: 1 });
}

/** Where a tower's footprint lies in The Crystal's frame: from and to along it (t), across it (s), its middle. */
export function spanOf(F: Frame, name: string) {
  const o = TOWERS.find(t => t.name === name)!.obb, c = cos(o.yaw), s = sin(o.yaw), nx = -F.uz, nz = F.ux;
  const k = [-1, 1].flatMap(i => [-1, 1].map(j => [o.cx + c * i * o.hw - s * j * o.hd - F.ox, o.cz + s * i * o.hw + c * j * o.hd - F.oz]));
  const ts = k.map(([x, z]) => x * F.ux + z * F.uz), ss = k.map(([x, z]) => x * nx + z * nz);
  return { t0: Math.min(...ts), t1: Math.max(...ts), s0: Math.min(...ss), s1: Math.max(...ss), t: (o.cx - F.ox) * F.ux + (o.cz - F.oz) * F.uz, s: (o.cx - F.ox) * nx + (o.cz - F.oz) * nz };
}

/** The glass floor over the gap between T3S and T4S: its ends along The Crystal (t). */
export function glassFloor(r: { frame: Frame }): [number, number] {
  const a = spanOf(r.frame, 'T3S').t1, b = spanOf(r.frame, 'T4S').t0;
  return [Math.ceil(a), Math.floor(b)];
}
