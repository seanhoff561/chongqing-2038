// The friends' hideout (M3-72, U-038, U-047, U-048): their old air-raid chamber, 10 m under a real alley between two
// of the city's own buildings, its vent shaft rising to a grate in the alley's floor under a heap of rubbish bags.
// The alley is the one at the heart of the district's routes, nearest the middle of its other key points (Jiaochangkou,
// the top of Shibati's stair, the riverfront); a drainpipe goes up the taller wall beside it onto the roofs. The
// chamber is sealed: no tunnel joins it to the Grand Tunnel or the underground, and no stairway mouth or way down is
// within 60 m of the grate. Its one other way out (M4-24) has to be opened first: a rubble fall at the end of the
// passage stub east, cleared with a crowbar, and past it the old tunnel jogs on under the alley to an old vent with iron
// rungs up to a manhole further along.
import { solid, carve, turn, type Solid, type Box } from '../geom';
import { MAT } from '../mats';
import { hideoutParts, HIDEOUT } from '../sets/hideout';
import { cover } from '../city/access';
import type { Heightfield } from '../heightfield';
import { heightAt } from '../heightfield';
import type { Plan } from './lots';
import type { Prop, Inter, Climbable, Zone, Site, Feature } from '../world';
import { sin, cos, atan2 } from '../trig';

type V3 = { x: number; y: number; z: number };
/** How deep the chamber's floor is under the alley; the alley's least and most width (wall to wall) and least length;
 *  how far from any way down the grate must be; how far the collapsed side passage runs; how high over the alley the
 *  roof the drainpipe climbs to may be. */
export const HOME = { depth: 10, gap: 2, wide: 6, length: 8, clear: 60, side: 4, roof: [4, 20], shaft: 0.7 };

export interface Home {
  /** the two buildings either side (their plans' indices), and the chamber's turn on the map */
  pair: [number, number]; yaw: number;
  at: Record<string, V3>;
  solids: Solid[]; props: Prop[]; inter: Inter[]; climbables: Climbable[]; zones: Zone[]; sites: Site[]; features: Feature[];
}

/** An alley between neighbours in a row: its middle, its length's way on the map, its width and length, and the walls
 *  either side (each lot's face on the alley, as an x along the alley's across-way from its middle). */
function alleysOf(plans: Plan[]) {
  const out: { n: number; x: number; z: number; ax: number; az: number; gap: number; len: number }[] = [];
  for (let n = 0; n + 1 < plans.length; n++) {
    const a = plans[n], b = plans[n + 1];
    if (!a.row || a.row !== b.row || a.far || b.far || a.sheer || b.sheer || Math.abs(sin(a.obb.yaw - b.obb.yaw)) > 0.06) continue;
    const o = a.obb, c = cos(o.yaw), s = sin(o.yaw), dx = b.obb.cx - o.cx, dz = b.obb.cz - o.cz;
    const lx = c * dx + s * dz, lz = -s * dx + c * dz, gap = Math.abs(lx) - o.hw - b.obb.hw;
    const z0 = Math.max(-o.hd, lz - b.obb.hd), z1 = Math.min(o.hd, lz + b.obb.hd), len = z1 - z0;
    if (gap < HOME.gap || gap > HOME.wide || len < HOME.length) continue;
    const x = Math.sign(lx) * (o.hw + gap / 2), z = (z0 + z1) / 2;
    out.push({ n, x: o.cx + c * x - s * z, z: o.cz + s * x + c * z, ax: -s, az: c, gap, len });
  }
  return out;
}

/** The chamber's room underground, on the map: its box (with a margin) for a chamber whose shaft is at (px, pz). */
function chamberBox(px: number, pz: number, yaw: number, floor: number): Box {
  const x0 = px - HIDEOUT.shaftX - 1, x1 = px - HIDEOUT.shaftX + HIDEOUT.length + 7, z0 = pz - HOME.side - 1, z1 = pz + 3;
  const c = cos(yaw), s = sin(yaw), cs = [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].map(([x, z]) => [px + c * (x - px) - s * (z - pz), pz + s * (x - px) + c * (z - pz)]);
  return { x0: Math.min(...cs.map(q => q[0])) - 2, y0: floor - 2, z0: Math.min(...cs.map(q => q[1])) - 2, x1: Math.max(...cs.map(q => q[0])) + 2, y1: floor + 6, z1: Math.max(...cs.map(q => q[1])) + 2 };
}
/** The neighbour whose roof a drainpipe from the alley reaches (4 to 20 m up), the lower if both do. */
function climbTo(plans: Plan[], q: { n: number }, gy: number): Plan | null {
  const [lo, hi] = HOME.roof, ok = [plans[q.n], plans[q.n + 1]].filter(p => p.wall - gy >= lo && p.wall - gy <= hi);
  return ok.sort((a, b) => a.wall - b.wall)[0] ?? null;
}
/** The old way out (M4-24): from the rubble fall at the passage stub's end (16 m east of the grate) a tunnel 4 m on,
 *  a 3 m jog sideways (out of the chamber's line of sight) and on to a vent shaft 24-40 m along the alley's line from
 *  the grate, up to a manhole on open ground; rock at least 4.5 m over the tunnel all the way and no building's
 *  basement near it. */
export const EXIT = { from: 24, to: 40, jog: 3, half: 0.6, cover: 4.5 };
/** The one vent (U-047, M6-21): off the old way out's first stretch past the rubble (`at` m along from the grate), a
 *  duct crouch-high (w wide, h high) through the rock, across under the Grand Tunnel, then along to the foot of a shaft
 *  square to the map (`half` its half width), its ladder up into the underground's junction room, a loose grate over
 *  it in that room's floor. */
export const VENT = { at: 19.1, w: 1.2, h: 1.3, half: 0.6 };
/** The way out's line, as offsets (along the alley, across it) from the grate, for a shaft d along. */
const exitLine = (d: number) => {
  const line: [number, number][] = [];
  for (let x = 16; x <= 20; x++) line.push([x, 0]);
  for (let z = 1; z <= EXIT.jog; z++) line.push([19.1, z]);
  for (let x = 20; x <= d; x++) line.push([x, EXIT.jog]);
  return line;
};
function exitOf(g: Heightfield, plans: Plan[], q: ReturnType<typeof alleysOf>[number], gy: number, avoid: Box[]): number | null {
  const floor = gy - HOME.depth, W = (a: number, b: number): [number, number] => [q.x + q.ax * a - q.az * b, q.z + q.az * a + q.ax * b];
  const over = (x: number, z: number, pad: number) => plans.find(p => {
    if (p.far) return false;
    const o = p.obb, dx = x - o.cx, dz = z - o.cz, c = cos(o.yaw), s = sin(o.yaw);
    return Math.abs(c * dx + s * dz) <= o.hw + pad && Math.abs(-s * dx + c * dz) <= o.hd + pad;
  });
  for (let d = EXIT.from; d <= EXIT.to; d++) {
    const [sx, sz] = W(d, EXIT.jog), top = heightAt(g, sx, sz);
    if (top === null || top < floor + 6 || top > floor + 16 || over(sx, sz, 1.5)) continue;
    const ok = exitLine(d).every(([a, b]) => {
      const [x, z] = W(a, b), h = heightAt(g, x, z), p = over(x, z, 1);
      return h !== null && h >= floor + EXIT.cover && (!p || p.base - 5 > floor + 3.6);
    });
    if (!ok) continue;
    const cs = [W(15, -2), W(d + 2, -2), W(15, EXIT.jog + 2), W(d + 2, EXIT.jog + 2)];
    const box = { x0: Math.min(...cs.map(v => v[0])), y0: floor - 1, z0: Math.min(...cs.map(v => v[1])), x1: Math.max(...cs.map(v => v[0])), y1: top, z1: Math.max(...cs.map(v => v[1])) };
    if (avoid.some(b => overlap(b, box))) continue;
    return d;
  }
  return null;
}
const overlap = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1 && a.z0 < b.z1 && b.z0 < a.z1;

/** The alley for it: nearest `heart` of those wide and long enough, clear of every way down by 60 m and of every
 *  dug space by its chamber, with room for its old way out. */
export function chooseAlley(g: Heightfield, plans: Plan[], heart: V3, avoid: { points: V3[]; boxes: Box[] }) {
  let best: (ReturnType<typeof alleysOf>[number] & { exit: number }) | null = null, bd = Infinity;
  for (const q of alleysOf(plans)) {
    const d = Math.hypot(q.x - heart.x, q.z - heart.z);
    if (d >= bd || avoid.points.some(p => Math.hypot(p.x - q.x, p.z - q.z) < HOME.clear)) continue;
    const gy = heightAt(g, q.x, q.z);
    if (gy === null || !climbTo(plans, q, gy)) continue;
    const box = chamberBox(q.x, q.z, atan2(q.az, q.ax), gy - HOME.depth);
    if (avoid.boxes.some(b => overlap(b, box))) continue;
    const exit = exitOf(g, plans, q, gy, avoid.boxes);
    if (exit === null) continue;
    best = { ...q, exit }; bd = d;
  }
  return best;
}

/** The hideout dug under the chosen alley; the ground holed over its shaft. `vent`: where the vent's shaft comes up,
 *  on the floor it comes up through. */
export function buildHome(g: Heightfield, plans: Plan[], q: NonNullable<ReturnType<typeof chooseAlley>>, vent: V3): Home {
  const px = q.x, pz = q.z, yaw = atan2(q.az, q.ax), gy = heightAt(g, px, pz)!, floor = gy - HOME.depth, hs = HOME.shaft;
  const c = cos(yaw), s = sin(yaw), P = (x: number, z: number): [number, number] => [px + c * (x - px) - s * (z - pz), pz + s * (x - px) + c * (z - pz)];
  const ox = px - HIDEOUT.shaftX, oz = pz;
  const h = hideoutParts(ox, floor, oz, { shaftTop: gy - floor, kit: 'start', prefix: 'airraid-', side: HOME.side + 2, shaftHalf: hs });
  // The rock it's dug from: round the chamber, its stub and side passage; round the shaft up to the paving; a ring of
  // paving round the grate over the ground's cut edges.
  const t = hs + 0.3, r = hs + 1.3, sh = gy - 0.4;
  let rock: Solid[] = [solid(ox - 1, floor - 1, oz - HOME.side - 3, ox + HIDEOUT.length + 7, floor + 3.6, oz + 3, MAT.stone),
    solid(px - t, floor + 3, pz - t, px + t, sh, pz - hs, MAT.stone), solid(px - t, floor + 3, pz + hs, px + t, sh, pz + t, MAT.stone),
    solid(px - t, floor + 3, pz - hs, px - hs, sh, pz + hs, MAT.stone), solid(px + hs, floor + 3, pz - hs, px + t, sh, pz + hs, MAT.stone),
    solid(px - r, gy - 0.4, pz - r, px + r, gy + 0.02, pz - hs, MAT.concrete), solid(px - r, gy - 0.4, pz + hs, px + r, gy + 0.02, pz + r, MAT.concrete),
    solid(px - r, gy - 0.4, pz - hs, px - hs, gy + 0.02, pz + hs, MAT.concrete), solid(px + hs, gy - 0.4, pz - hs, px + r, gy + 0.02, pz + hs, MAT.concrete)];
  // The old way out (M4-24): the rubble fall at the stub's end, the tunnel on past it with its jog, the vent shaft
  // with its rungs up to a manhole, paved round like the grate.
  const d = q.exit, J = EXIT.jog, eh = EXIT.half, [ex, ez] = P(px + d, pz + J), top = heightAt(g, ex, ez)!, et = eh + 0.3, er = eh + 1.3, cx = px + d, cz = pz + J;
  const exitCuts: Box[] = [
    { x0: px + 16, y0: floor, z0: pz - 0.9, x1: px + 20, y1: floor + 2.2, z1: pz + 0.9 },
    { x0: px + 18.2, y0: floor, z0: pz + 0.9, x1: px + 20, y1: floor + 2.2, z1: pz + J + 0.9 },
    { x0: px + 18.2, y0: floor, z0: pz + J - 0.9, x1: cx + eh, y1: floor + 2.2, z1: pz + J + 0.9 },
    { x0: cx - eh, y0: floor + 2.1, z0: cz - eh, x1: cx + eh, y1: top + 1, z1: cz + eh },
  ];
  rock.push(solid(px + 15, floor - 1, pz - 2, cx + 2, floor + 3.6, cz + 2, MAT.stone),
    solid(cx - et, floor + 3, cz - et, cx + et, top - 0.4, cz - eh, MAT.stone), solid(cx - et, floor + 3, cz + eh, cx + et, top - 0.4, cz + et, MAT.stone),
    solid(cx - et, floor + 3, cz - eh, cx - eh, top - 0.4, cz + eh, MAT.stone), solid(cx + eh, floor + 3, cz - eh, cx + et, top - 0.4, cz + eh, MAT.stone),
    solid(cx - er, top - 0.4, cz - er, cx + er, top + 0.02, cz - eh, MAT.concrete), solid(cx - er, top - 0.4, cz + eh, cx + er, top + 0.02, cz + er, MAT.concrete),
    solid(cx - er, top - 0.4, cz - eh, cx - eh, top + 0.02, cz + eh, MAT.concrete), solid(cx + eh, top - 0.4, cz - eh, cx + er, top + 0.02, cz + eh, MAT.concrete));
  // The vent (M6-21), in the chamber's frame: across from the way out, along to a room at the shaft's foot, up
  // through the rock's top round the shaft (its square's extent in this frame).
  const vx = vent.x - px, vz = vent.z - pz, lx = px + c * vx + s * vz, lz = pz - s * vx + c * vz, hw = VENT.w / 2, vh = floor + VENT.h, va = px + VENT.at, vr = VENT.half * (Math.abs(c) + Math.abs(s));
  const ducts: Box[] = [
    { x0: va - hw, y0: floor, z0: Math.min(lz, pz) - hw, x1: va + hw, y1: vh, z1: Math.max(lz, pz - 0.5) },
    { x0: Math.min(lx, va) - hw, y0: floor, z0: lz - hw, x1: Math.max(lx, va) + hw, y1: vh, z1: lz + hw },
    { x0: lx - 1, y0: floor, z0: lz - 1, x1: lx + 1, y1: vh, z1: lz + 1 },
  ];
  for (const b of ducts) rock.push(solid(b.x0 - 0.4, floor - 0.4, b.z0 - 0.4, b.x1 + 0.4, vh + 0.4, b.z1 + 0.4, MAT.stone));
  exitCuts.push(...ducts, { x0: lx - vr, y0: vh - 0.01, z0: lz - vr, x1: lx + vr, y1: vh + 0.5, z1: lz + vr });
  for (const b of h.cuts.concat(exitCuts)) rock = carve(rock, b);
  const shut = [{ ...solid(px + 14.45, floor, pz - 0.95, px + 15.95, floor + 2.35, pz + 0.95, MAT.hidden), part: 'airraid-plug' }, { ...solid(cx - eh, top - 0.08, cz - eh, cx + eh, top, cz + eh, MAT.hidden), part: 'airraid-exit' }];
  h.inter.push({ id: 'airraid-plug', kind: 'rubble', x: px + 14.4, y: floor + 1, z: pz, r: 1.3, zh: '塌方', en: 'Rubble', data: { part: 'airraid-plug' } },
    { id: 'airraid-exit', kind: 'grate', x: cx, y: top - 0.04, z: cz, r: 1.5, zh: '井盖', en: 'Manhole cover', data: { part: 'airraid-exit', half: eh, manhole: true } });
  // (Three heaps deep, across the passage.)
  h.props.push(...[[14.9, 0, 0], [15.3, -0.1, 2.9], [15.7, 0.1, 0.3]].map(([x, z, t]) => ({ kind: 'rubble', x: px + x, y: floor, z: pz + z, yaw: Math.PI / 2 + t, w: 1.9, h: 2.4, text: 'airraid-plug' })), { kind: 'hatch', x: cx, y: top - 0.02, z: cz, yaw: 0, w: 2 * eh, text: 'airraid-exit' });
  h.climbables.push({ kind: 'ladder', x: cx, z: cz - eh, y0: floor, y1: top + 1, nx: 0, nz: 1 });
  h.zones.push({ kind: 'under', box: { x0: px + 15, y0: floor - 1, z0: pz - 1, x1: cx + 1, y1: top - 0.5, z1: cz + 1 } });
  for (const b of ducts) h.zones.push({ kind: 'under', box: { ...b, y0: floor - 0.5 } });
  // The ground holed over both shafts.
  for (const [ax, az, ah] of [[px, pz, hs], [cx, cz, eh]]) for (let x = ax - ah; x <= ax + ah + 1e-6; x += 0.25) for (let z = az - ah; z <= az + ah + 1e-6; z += 0.25) {
    const [mx, mz] = P(Math.min(x, ax + ah), Math.min(z, az + ah)), i = Math.floor(mx / g.cell), j = Math.floor(mz / g.cell);
    if (i >= 0 && j >= 0 && i < g.w - 1 && j < g.h - 1) g.hole[j * (g.w - 1) + i] = 1;
  }
  const out: Home = { pair: [q.n, q.n + 1], yaw, at: {}, solids: turn(rock.concat(h.solids, shut), yaw, px, pz), props: [], inter: [], climbables: [], zones: [], sites: [], features: [] };
  out.props.push(...h.props.map(p => { const [x, z] = P(p.x, p.z); return { ...p, x, z, yaw: p.yaw - yaw }; }));
  out.inter.push(...h.inter.map(i => { const [x, z] = P(i.x, i.z); return { ...i, x, z }; }));
  out.climbables.push(...h.climbables.map(cl => { const [x, z] = P(cl.x, cl.z), [ax, az] = P(cl.x + cl.nx, cl.z + cl.nz); return { ...cl, x, z, nx: ax - x, nz: az - z }; }));
  out.zones.push(...h.zones.map(zn => {
    const cs = [P(zn.box.x0, zn.box.z0), P(zn.box.x1, zn.box.z0), P(zn.box.x0, zn.box.z1), P(zn.box.x1, zn.box.z1)], xs = cs.map(v => v[0]), zs = cs.map(v => v[1]);
    return { ...zn, box: { ...zn.box, x0: Math.min(...xs), z0: Math.min(...zs), x1: Math.max(...xs), z1: Math.max(...zs) } };
  }));
  for (const [k, v] of Object.entries(h.at)) { const [x, z] = P(v.x, v.z); out.at[k] = { x, y: v.y, z }; }
  out.at.grate = { x: px, y: gy, z: pz };
  out.at.exit = { x: ex, y: top, z: ez };
  // (The way out from the chamber, for tests: past the shaft's foot, through the rubble, the jog, the vent's foot.)
  ([[13, 0], [17.4, 0], [19.1, 0], [19.1, J], [d - 0.3, J]] as const).forEach(([a, b], n) => { const [x, z] = P(px + a, pz + b); out.features.push({ kind: 'homeExit', x, y: floor, z, group: n }); });
  // The vent's shaft, square to the map: lined from the duct's top to the floor it comes up through (the caller cuts
  // that floor), its ladder, the loose grate over it; the vent's walk, for tests.
  const vs = VENT.half, vt = 0.3, sx0 = vent.x - vs, sx1 = vent.x + vs, sz0 = vent.z - vs, sz1 = vent.z + vs, sy = vent.y - 0.8;
  out.solids.push(solid(sx0 - vt, vh, sz0 - vt, sx1 + vt, sy, sz0, MAT.stone), solid(sx0 - vt, vh, sz1, sx1 + vt, sy, sz1 + vt, MAT.stone), solid(sx0 - vt, vh, sz0, sx0, sy, sz1, MAT.stone), solid(sx1, vh, sz0, sx1 + vt, sy, sz1, MAT.stone));
  out.climbables.push({ kind: 'ladder', x: sx0, z: vent.z, y0: floor, y1: vent.y + 1, nx: 1, nz: 0 });
  cover('airraid-vent', solid(sx0, vent.y - 0.04, sz0, sx1, vent.y + 0.03, sz1, MAT.metal), [vent.x, vent.z], 2 * vs, 'grate', true, out, ['通风口铁栅', 'Vent grate']);
  out.zones.push({ kind: 'under', box: { x0: sx0, y0: vh, z0: sz0, x1: sx1, y1: vent.y, z1: sz1 } });
  ([[va, pz], [va, lz], [lx, lz]] as const).forEach(([a, b], n) => { const [x, z] = P(a, b); out.features.push({ kind: 'homeVent', x, y: floor, z, group: n }); });
  out.at.vent = { ...vent };
  out.sites.push({ id: 'airraid', kind: 'cellar', x: out.at.table.x, y: floor, z: out.at.table.z, bed: null, table: 'airraid-table', containers: ['airraid-stash'], exits: 1, windows: 0, streetSides: 0 });
  // The alley's dressing: shop neon on both walls over the grate (a noodle bar's, a mahjong room's), its glow, a bin.
  const ux = -q.az, uz = q.ax, half = q.gap / 2;
  // (Up the walls, U-054: the vertical one's top character on the second floor, under the lower roof; the mahjong
  // room's over its door.)
  const under = Math.min(plans[q.n].wall, plans[q.n + 1].wall) - 0.6;
  // (The vertical one hangs down from its top, four characters 1.05 apart: its letters sized to fit between 2.6 m up
  // and the lower roof, and never into the ground, U-079.)
  const vTop = Math.min(gy + 7.6, under), vw = Math.min(1.1, Math.max(0.5, (vTop - gy - 2.6) / (3 * 1.05 + 1))), vy = Math.max(vTop, gy + 2.6 + vw * (3 * 1.05 + 1) - vw / 2);
  ([[-1, '老巷小面', vw, vw * 3.6, vy], [1, '麻将 · 24小时', 0, 0.5, Math.max(gy + 2.8, Math.min(gy + 4.4, under))]] as const).forEach(([k, text, w, h, y]) => out.props.push({ kind: 'neon', x: px + ux * k * (half - 0.06) + q.ax * 2, y, z: pz + uz * k * (half - 0.06) + q.az * 2, yaw: atan2(-ux * k, -uz * k), ...(w ? { w } : {}), h, text }));
  out.props.push({ kind: 'neonGlow', x: px + q.ax * 2, y: gy + 4.5, z: pz + q.az * 2, yaw: 0 });
  out.props.push({ kind: 'trash', x: px + ux * (half - 0.5) - q.ax * 2.5, y: gy, z: pz + uz * (half - 0.5) - q.az * 2.5, yaw: yaw });
  // The way up: a drainpipe on a wall, 4 m along from the grate, from the alley to its roof.
  const tall = climbTo(plans, q, gy)!;
  const side = Math.sign((tall.obb.cx - px) * ux + (tall.obb.cz - pz) * uz), wx = px + ux * side * (half - 0.12) + q.ax * 4, wz = pz + uz * side * (half - 0.12) + q.az * 4;
  out.climbables.push({ kind: 'pipe', x: wx, z: wz, y0: gy, y1: tall.wall + 0.2, nx: -ux * side, nz: -uz * side });
  out.solids.push(solid(wx - 0.06, gy, wz - 0.06, wx + 0.06, tall.wall + 0.2, wz + 0.06, MAT.metal));
  out.features.push({ kind: 'climbUp', x: wx - ux * side * 0.4, y: gy, z: wz - uz * side * 0.4, group: 0 }, { kind: 'climbUp', x: wx + ux * side * 1.2, y: tall.wall, z: wz + uz * side * 1.2, group: 0 });
  out.at.pipe = { x: wx, y: gy, z: wz };
  return out;
}
