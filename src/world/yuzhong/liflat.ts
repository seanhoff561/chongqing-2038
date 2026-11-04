// The Li family flat (M3-19, DESIGN section 13): a flat on an upper floor nearest the top of Shibati's stair, its
// room gone through: drawers pulled out and tipped, chairs over, papers, clothes and books across the floor, broken glass,
// the family photo face down. His father's work badge and the cracked phone with its one voicemail lie on its
// floor (put there when a run starts, sim/run.ts, from the 'li:' features).
import type { World, Plot } from '../world';
import { raycast, solid, overlaps } from '../geom';
import { MAT } from '../mats';
import { heightAt } from '../heightfield';
import { districtAt } from './lots';
import { makeRng, rand, randInt } from '../../sim/rng';
import { FLOOR } from '../city/rooms';

/** Free floor in the room round a flat's point, at its floor's height: points 0.5 m apart within 4.5 m that are
 *  floor (headroom over them, nothing within 0.3 m) and seen from the point. */
function floorAround(w: World, x: number, y: number, z: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = -9; i <= 9; i++) for (let j = -9; j <= 9; j++) {
    const px = x + i * 0.5, pz = z + j * 0.5, d = Math.hypot(px - x, pz - z);
    if (d > 4.5) continue;
    const down = raycast(w.index, px, y + 1, pz, 0, -1, 0, 1.3);
    if (!down || Math.abs(down.t - 1) > 0.12) continue;
    const up = raycast(w.index, px, y + 1, pz, 0, 1, 0, 1.5);
    if (up && up.t < 1.1) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => raycast(w.index, px, y + 0.3, pz, a, 0, b, 0.3))) continue;
    if (d > 0.1 && raycast(w.index, x, y + 1.2, z, (px - x) / d, 0, (pz - z) / d, d)) continue;
    out.push([px, pz]);
  }
  return out;
}

/** The neon by the flat (U-104): an ice-blue blade sign on the building's outside, at the flat's window height, on the
 *  nearest outer wall: out from the room through its walls till there's open air ahead and overhead (15 m at most). */
function flatNeon(w: World, s: { x: number; y: number; z: number }) {
  const y = s.y + 1.2;
  let best: { x: number; z: number; yaw: number; d: number } | null = null;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2, dx = Math.sin(a), dz = Math.cos(a);
    let t = 0;
    for (let k = 0; k < 8 && t < 15; k++) {
      const hit = raycast(w.index, s.x + dx * t, y, s.z + dz * t, dx, 0, dz, 15 - t);
      if (!hit) break;
      // (Through this wall: its far face.)
      const at = t + hit.t + 1, back = raycast(w.index, s.x + dx * at, y, s.z + dz * at, -dx, 0, -dz, 1);
      if (!back) break;
      t = at - back.t + 0.01;
      const ox = s.x + dx * (t + 0.6), oz = s.z + dz * (t + 0.6);
      if (!raycast(w.index, s.x + dx * t, y, s.z + dz * t, dx, 0, dz, 3) && !raycast(w.index, ox, y, oz, 0, 1, 0, 3)) {
        if (!best || t < best.d) best = { x: s.x + dx * t, z: s.z + dz * t, yaw: a, d: t };
        break;
      }
    }
  }
  if (best) w.props.push({ kind: 'flatneon', x: best.x, y, z: best.z, yaw: best.yaw });
}

/** Inside a footprint. */
function within(c: [number, number][], x: number, z: number) {
  let hit = false;
  for (let i = 0, j = c.length - 1; i < c.length; j = i++) { const [xi, zi] = c[i], [xj, zj] = c[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit; }
  return hit;
}

/** The building a room's in, if he can walk up to it from the street: a way in at its door and up its stairwell to the
 *  room's floor (U-104: the flat a place to visit). */
export function walkUp(w: World, s: { x: number; y: number; z: number }): Plot | null {
  const p = w.plots.find(q => !q.far && q.route && within(q.corners, s.x, s.z));
  if (!p) return null;
  const floor = Math.round((s.y - p.base) / FLOOR);
  // (A stairwell blocked part-way up is filled from the blocked floor's level, over the last flight up to it too.)
  if (p.blocked !== undefined && floor >= p.blocked) return null;
  // (A collapsed doorway on the way holds for good: not that one.)
  if (wayDoors(w, p, s.y).some(it => it.data?.lock === 'collapsed')) return null;
  if (!p.route!.some(q => Math.abs(q.y - s.y) < 0.6)) return null;
  return floorWay(w, p, s) ? p : null;
}

/** A way on foot across a floor from its stair landing (where the ground floor's is, that floor up) to a point, on a
 *  0.2 m grid, standing height, its doors passable (they open): the points, or null if there's none (a room behind a
 *  vent or a collapse). */
export function floorWay(w: World, p: Plot, to: { x: number; y: number; z: number }): { x: number; z: number }[] | null {
  const land = p.route![2], G = 0.2, y = to.y, off = w.index.off;
  const doors = wayDoors(w, p, y).map(it => it.data?.solid as number).filter(id => id >= 0 && !off[id]);
  for (const id of doors) off[id] = 1;
  const free = (x: number, z: number) => !overlaps(w.index, { x0: x - 0.2, y0: y + 0.25, z0: z - 0.2, x1: x + 0.2, y1: y + 1.7, z1: z + 0.2 }) && !!raycast(w.index, x, y + 0.2, z, 0, -1, 0, 0.5);
  const key = (i: number, j: number) => i * 1000 + j, at = (i: number, j: number) => ({ x: land.x + i * G, z: land.z + j * G });
  const gi = Math.round((to.x - land.x) / G), gj = Math.round((to.z - land.z) / G);
  const from = new Map<number, number>([[key(0, 0), NaN]]), q: [number, number][] = [[0, 0]];
  let end: [number, number] | null = null;
  for (let h = 0; h < q.length && !end && from.size < 20000; h++) {
    const [i, j] = q[h];
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj, k = key(ni, nj);
      if (from.has(k) || Math.abs(ni) > 150 || Math.abs(nj) > 150) continue;
      const c = at(ni, nj);
      if (!free(c.x, c.z)) continue;
      from.set(k, key(i, j));
      if (Math.abs(ni - gi) <= 2 && Math.abs(nj - gj) <= 2) { end = [ni, nj]; break; }
      q.push([ni, nj]);
    }
  }
  for (const id of doors) off[id] = 0;
  if (!end) return null;
  const path: { x: number; z: number }[] = [];
  for (let k = key(end[0], end[1]); !Number.isNaN(k); k = from.get(k)!) { const j = ((k % 1000) + 1000 + 500) % 1000 - 500, i = Math.round((k - j) / 1000); path.unshift(at(i, j)); }
  return path;
}

/** The doors of a building on the way up to a floor (its street door, the stairwell's) and on that floor. */
const wayDoors = (w: World, p: Plot, y: number) => w.inter.filter(it => it.kind === 'door' && it.id.startsWith(`${p.prefix}-`) &&
  ((it.y <= y + 1.5 && p.route!.some(q => Math.hypot(q.x - it.x, q.z - it.z) < 2.5 && Math.abs(q.y + 1.1 - it.y) < 1.5)) || Math.abs(it.y - (y + 1.1)) < 1.2));

/** The way into the flat forced (they came for the family): those doors unlocked, their chains and padlocks gone. */
function forced(w: World, p: Plot, y: number) {
  for (const it of wayDoors(w, p, y)) {
    if (!it.data?.lock) continue;
    const part = it.data.part;
    delete it.data.lock;
    w.props = w.props.filter(q => !((q.kind === 'chain' || q.kind === 'padlock') && q.text === part));
  }
}

export function liFlat(w: World) {
  const top = w.teleports.find(t => t.name === 'Shibati top')!, g = w.ground!;
  // A living room or bedroom on an upper floor (not the ground floor) of a house in Shibati, the nearest to the top
  // of the stair that he can walk up to from the street (U-104), with room to turn over: from the corner its feature
  // marks, across to the far one.
  const rooms = w.features.filter(f => (f.kind === 'inside:living' || f.kind === 'inside:bedroom') && districtAt(f.x, f.z).district === 'shibati' && f.y > (heightAt(g, f.x, f.z) ?? 0) + 2.5)
    .map(f => ({ x: f.x + f.nx! / 2, y: f.y, z: f.z + f.nz! / 2 }))
    .sort((a, b) => Math.hypot(a.x - top.x, a.z - top.z) - Math.hypot(b.x - top.x, b.z - top.z));
  for (const s of rooms) {
    // (One he can walk up to from the street.)
    const plot = walkUp(w, s);
    if (!plot) continue;
    const free = floorAround(w, s.x, s.y, s.z);
    if (free.length < 10) continue;
    const r = makeRng(7), take = () => (free.length ? free.splice(randInt(r, free.length), 1)[0] : null);
    const prop = (kind: string, wd: number, h: number, d: number, fallen = false) => { const at = take(); if (at) w.props.push({ kind: `f:${kind}`, x: at[0], y: s.y, z: at[1], yaw: rand(r) * Math.PI * 2, w: wd, h, d, ...(fallen ? { text: 'fallen' } : {}) }); };
    // His father's badge and the phone, apart; the family photo face down in its frame.
    const [bx, bz] = take()!, [qx, qz] = take()!, [px, pz] = take()!;
    w.features.push({ kind: 'li:badge', x: bx, y: s.y + 0.03, z: bz, group: w.features.length }, { kind: 'li:phone', x: qx, y: s.y + 0.03, z: qz, group: w.features.length + 1 });
    w.decor.push({ ...solid(px - 0.17, s.y + 0.03, pz - 0.13, px + 0.17, s.y + 0.055, pz + 0.13, MAT.wood), inner: true });
    // What they kept, thrown down; what they couldn't carry, tipped over; and as much more as the floor holds: papers,
    // clothes, broken glass from the cabinet's doors and the window pane.
    prop('drawer', 0.9, 0.8, 0.5, true);
    prop('chair', 0.45, 0.9, 0.45, true);
    prop('chair', 0.45, 0.9, 0.45, true);
    prop('box', 0.5, 0.35, 0.4, true);
    prop('papers', 0.5, 0.02, 0.4); prop('clothes', 0.6, 0.05, 0.5); prop('books', 0.4, 0.2, 0.3);
    for (let i = 0; i < 3; i++) { prop('papers', 0.5, 0.02, 0.4); prop('clothes', 0.6, 0.05, 0.5); }
    for (let i = 0; i < 6; i++) { const at = take(); if (!at) break; const a = 0.05 + rand(r) * 0.12; w.decor.push({ ...solid(at[0] - a, s.y + 0.03, at[1] - a * 0.6, at[0] + a, s.y + 0.04, at[1] + a * 0.6, MAT.glass), inner: true }); }
    w.teleports.push({ name: 'Li family flat', x: s.x, y: s.y + 1.5, z: s.z, yaw: Math.atan2(s.x - bx, s.z - bz) });
    flatNeon(w, s);
    forced(w, plot, s.y);
    return s;
  }
  throw new Error('no flat for the Li family in upper Shibati');
}
