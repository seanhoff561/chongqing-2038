// The Li family flat (M3-19, M10-38, DESIGN section 2): a flat on an upper floor nearest the top of Shibati's stair.
// Its rooms keep what happened to the family (home: the beds, the dinner, the calendar, the bags, the height marks,
// Xiaoyu's desk), then gone through: drawers pulled out and tipped, chairs over, papers, clothes and books across the
// floor, broken glass, the family photo face down. His father's work badge, the cracked phone with its one voicemail
// and his own site card lie on its floor (put there when a run starts, sim/run.ts, from the 'li:' features).
import type { World, Plot, Inter } from '../world';
import { raycast, solid, overlaps, turn, grow } from '../geom';
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

/** Something put down on the floor: its middle, its turn (a prop's yaw: its front, local +z, out along
 *  (sin, cos)), its size across and deep. */
interface Put { kind: string; x: number; z: number; yaw: number; w: number; d: number }

/** A point under something put down (or within m of it). */
const under = (q: Put, x: number, z: number, m = 0) => { const dx = x - q.x, dz = z - q.z, u = dx * Math.cos(q.yaw) - dz * Math.sin(q.yaw), v = dx * Math.sin(q.yaw) + dz * Math.cos(q.yaw); return Math.abs(u) <= q.w / 2 + m && Math.abs(v) <= q.d / 2 + m; };

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Standing room at a floor's point: as floorWay walks it. */
const stand = (w: World, x: number, y: number, z: number) => !overlaps(w.index, { x0: x - 0.2, y0: y + 0.25, z0: z - 0.2, x1: x + 0.2, y1: y + 1.7, z1: z + 0.2 }) && !!raycast(w.index, x, y + 0.2, z, 0, -1, 0, 0.5);

/** The rooms of a floor (M10-38): its standing room on floorWay's grid flooded with its doors shut, from the stair
 *  landing (the stairwell's side of it: a corridor or a hall) first, then from beside each door on the floor (the room
 *  behind it, with its door); only those he can walk to. */
function floorRooms(w: World, p: Plot, y: number) {
  const land = p.route![2], G = 0.2, seen = new Set<number>(), key = (i: number, j: number) => i * 1000 + j;
  const flood = (i0: number, j0: number) => {
    const cells: { x: number; z: number }[] = [], q = [[i0, j0]];
    seen.add(key(i0, j0));
    for (let h = 0; h < q.length && q.length < 6000; h++) {
      const [i, j] = q[h];
      cells.push({ x: land.x + i * G, z: land.z + j * G });
      for (const [di, dj] of DIRS) {
        const ni = i + di, nj = j + dj;
        if (seen.has(key(ni, nj)) || Math.abs(ni) > 150 || Math.abs(nj) > 150 || !stand(w, land.x + ni * G, y, land.z + nj * G)) continue;
        seen.add(key(ni, nj));
        q.push([ni, nj]);
      }
    }
    return cells;
  };
  const rooms: { cells: { x: number; z: number }[]; door?: Inter }[] = [{ cells: flood(0, 0) }];
  for (const door of w.inter.filter(it => it.kind === 'door' && it.id.startsWith(`${p.prefix}-`) && Math.abs(it.y - (y + 1.1)) < 1.2)) {
    const di = Math.round((door.x - land.x) / G), dj = Math.round((door.z - land.z) / G);
    for (let i = di - 5; i <= di + 5; i++) for (let j = dj - 5; j <= dj + 5; j++) {
      if (!seen.has(key(i, j)) && stand(w, land.x + i * G, y, land.z + j * G)) rooms.push({ cells: flood(i, j), door });
    }
  }
  return rooms.filter((r, n) => n === 0 || floorWay(w, p, { x: r.cells[0].x, y, z: r.cells[0].z }));
}

/** His family's flat (M10-38, U-104): the floor's rooms keep what happened to them. Two bedrolls slept in and a third
 *  laid out for his father and never slept in, in the flat's biggest room (they slept together, at the back); dinner
 *  for three on a table by the room he's put in, two bowls eaten from, his father's under a plate, the registration
 *  reminder by it (its story document); a calendar on that room's wall crossed off to the 13th; packed bags by the
 *  stairs, two (Xiaoyu took hers); the children's height marks up a door frame; Xiaoyu's desk in a room of its own,
 *  a map on it with a way drawn across the city (where her trail starts, M10-39). The table and the desk stand solid.
 *  Gives back what's laid on the floor, for the ransack to leave be, and the middles of the flat's rooms. */
function home(w: World, p: Plot, s: { x: number; y: number; z: number }): { laid: Put[]; rooms: { x: number; z: number }[] } {
  const y = s.y, land = p.route![2], rooms = floorRooms(w, p, y), taken: Put[] = [];
  const [a, b] = p.corners, frame = Math.atan2(b[0] - a[0], b[1] - a[1]), yaws = [0, 1, 2, 3].map(k => frame + (k * Math.PI) / 2);
  const local = (q: { x: number; z: number; yaw: number }, u: number, v: number) => ({ x: q.x + u * Math.cos(q.yaw) + v * Math.sin(q.yaw), z: q.z - u * Math.sin(q.yaw) + v * Math.cos(q.yaw) });
  // (Floor all under it, nothing standing over it up to h, nothing else put there.)
  const fits = (q: Put, h: number) => {
    const nu = Math.ceil(q.w / 0.15), nv = Math.ceil(q.d / 0.15);
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      const { x, z } = local(q, (i / nu - 0.5) * q.w, (j / nv - 0.5) * q.d), dn = raycast(w.index, x, y + 0.2, z, 0, -1, 0, 0.35);
      if (!dn || Math.abs(dn.t - 0.2) > 0.08 || overlaps(w.index, { x0: x - 0.03, y0: y + 0.05, z0: z - 0.03, x1: x + 0.03, y1: y + h, z1: z + 0.03 }) || taken.some(t => under(t, x, z))) return false;
    }
    return true;
  };
  // (Every room and every cupboard on the floor still to be walked to, past something solid put down, but where it
  // stands.)
  const reps = rooms.flatMap(r => [r.cells[0], r.cells.reduce((f, c) => (Math.hypot(c.x - r.cells[0].x, c.z - r.cells[0].z) > Math.hypot(f.x - r.cells[0].x, f.z - r.cells[0].z) ? c : f))])
    .concat(w.inter.filter(it => it.kind === 'container' && it.id.startsWith(`${p.prefix}-`) && Math.abs(it.y - y - 0.8) < 0.8), [s])
    .filter(r => floorWay(w, p, { x: r.x, y, z: r.z }));
  /** Put down nearest `to` in the first of `where` it fits in, its front turned toward `face` if given: a prop, solid
   *  (hidden) if it's furniture, so long as everything's still walked to. */
  const put = (where: { x: number; z: number }[][], kind: string, wd: number, h: number, d: number, to: { x: number; z: number }, o: { face?: { x: number; z: number }; solid?: boolean; away?: number; fallen?: boolean } = {}): Put | null => {
    for (const cells of where) {
      for (const c of [...cells].sort((m, n) => Math.hypot(m.x - to.x, m.z - to.z) - Math.hypot(n.x - to.x, n.z - to.z))) {
        if (o.away && Math.hypot(c.x - to.x, c.z - to.z) < o.away) continue;
        const turns = o.face ? [...yaws].sort((m, n) => Math.cos(n - Math.atan2(o.face!.x - c.x, o.face!.z - c.z)) - Math.cos(m - Math.atan2(o.face!.x - c.x, o.face!.z - c.z))) : yaws;
        for (const yaw of turns) {
          const q = { kind, x: c.x, z: c.z, yaw, w: wd, d };
          if (!fits(q, h)) continue;
          if (o.solid) {
            const id = w.index.solids.length;
            w.index.solids.push(...turn([solid(q.x - wd / 2, y, q.z - d / 2, q.x + wd / 2, y + h, q.z + d / 2, MAT.hidden)], -yaw, q.x, q.z));
            grow(w.index);
            const cut = reps.find(r => !under(q, r.x, r.z, 0.4) && !floorWay(w, p, { x: r.x, y, z: r.z }));
            if (cut) { w.index.off[id] = 1; continue; }
          }
          taken.push(q);
          w.props.push({ kind: `f:${kind}`, x: q.x, y, z: q.z, yaw, w: wd, h, d, ...(o.fallen ? { text: 'fallen' } : {}) });
          return q;
        }
      }
    }
    return null;
  };
  const near = (pt: { x: number; z: number }) => rooms.findIndex(r => r.cells.some(c => Math.hypot(c.x - pt.x, c.z - pt.z) < 0.3));
  const lounge = Math.max(0, near(s)), big = rooms.reduce((m, r, n) => (n > 0 && r.cells.length > (rooms[m]?.cells.length ?? 0) ? n : m), lounge);
  const others = rooms.map((_, n) => n).filter(n => n > 0 && n !== lounge && n !== big).sort((m, n) => rooms[n].cells.length - rooms[m].cells.length);
  const middle = (n: number) => { const c = rooms[n].cells; return { x: c.reduce((t, q) => t + q.x, 0) / c.length, z: c.reduce((t, q) => t + q.z, 0) / c.length }; };
  const farFrom = (n: number, pt: { x: number; z: number }) => rooms[n].cells.reduce((f, c) => (Math.hypot(c.x - pt.x, c.z - pt.z) > Math.hypot(f.x - pt.x, f.z - pt.z) ? c : f));
  const room = (n: number) => [rooms[n].cells];
  // Xiaoyu's desk, in a room of its own if there's one, against its far wall; the map on it.
  for (const n of [...others, big, lounge]) {
    const desk = put(room(n), 'desk', 1.0, 0.76, 0.5, farFrom(n, rooms[n].door ?? rooms[n].cells[0]), { solid: true, face: middle(n) });
    if (!desk) continue;
    const c = local(desk, -0.2, 0);
    w.props.push({ kind: 'f:map', x: c.x, y: y + 0.765, z: c.z, yaw: desk.yaw, w: 0.5, h: 0.01, d: 0.36 });
    break;
  }
  // The bedding, side by side, from the far end of the biggest room.
  let at: { x: number; z: number } = farFrom(big, rooms[big].door ?? rooms[big].cells[0]);
  for (const kind of ['bedroll', 'bedroll', 'bedmade']) { const q = put(room(big), kind, 0.65, 0.25, 1.9, at); if (q) at = q; }
  // The table they ate at, by the room he's put in.
  const eat = [lounge, big, ...others].filter((n, i, all) => all.indexOf(n) === i);
  const table = put(eat.map(n => rooms[n].cells), 'table', 0.8, 0.75, 0.6, s, { solid: true });
  if (table) {
    w.props.push({ kind: 'f:dinner', x: table.x, y: y + 0.75, z: table.z, yaw: table.yaw, w: 0.8, h: 0.1, d: 0.6 });
    const doc = local(table, -0.24, 0.16);
    w.features.push({ kind: 'doc:flat', x: doc.x, y: y + 0.76, z: doc.z, group: w.features.length });
  } else w.features.push({ kind: 'doc:flat', x: s.x, y: y + 0.03, z: s.z, group: w.features.length });
  // The calendar on a wall of that room, clear of its windows and doors, high over what stands against it.
  const wall = (n: number) => {
    const c = middle(n), fit: { x: number; z: number; yaw: number; t: number }[] = [];
    for (const yaw of yaws) {
      const dx = Math.sin(yaw), dz = Math.cos(yaw), hi = raycast(w.index, c.x, y + 1.95, c.z, dx, 0, dz, 6), lo = raycast(w.index, c.x, y + 1.4, c.z, dx, 0, dz, 6);
      if (!hi || !lo || Math.abs(hi.t - lo.t) > 0.05) continue;
      const x = c.x + dx * (hi.t - 0.01), z = c.z + dz * (hi.t - 0.01);
      if (w.inter.some(it => (it.kind === 'door' || it.kind === 'window') && Math.hypot(it.x - x, it.z - z) < 1.1 && Math.abs(it.y - y - 1.2) < 1.5)) continue;
      fit.push({ x, z, yaw: yaw + Math.PI, t: hi.t });
    }
    return fit.sort((m, n) => m.t - n.t)[0];
  };
  const cal = wall(table ? eat.find(n => rooms[n].cells.some(c => Math.hypot(c.x - table.x, c.z - table.z) < 0.8)) ?? lounge : lounge);
  if (cal) w.props.push({ kind: 'f:calendar', x: cal.x, y: y + 1.4, z: cal.z, yaw: cal.yaw });
  // The bags packed to go, by the stairs: one stood, one gone through.
  put(room(0), 'bag', 0.4, 0.45, 0.3, land, { away: 0.7 });
  put(room(0), 'bag', 0.4, 0.45, 0.3, land, { away: 0.7, fallen: true });
  // The height marks inside the frame of the door into the room he's put in (or any on the floor).
  const frameOf = (door: Inter) => {
    const id = door.data?.solid as number | undefined;
    if (id !== undefined) w.index.off[id] = 1;
    let mark: { x: number; z: number; yaw: number } | null = null;
    for (const yaw of yaws) {
      const dx = Math.sin(yaw), dz = Math.cos(yaw), h = raycast(w.index, door.x, y + 1.2, door.z, dx, 0, dz, 0.8), back = raycast(w.index, door.x, y + 1.2, door.z, -dx, 0, -dz, 0.8);
      if (h && back && h.t > 0.3 && back.t > 0.3) { mark = { x: door.x + dx * (h.t - 0.003), z: door.z + dz * (h.t - 0.003), yaw: yaw + Math.PI }; break; }
    }
    if (id !== undefined) w.index.off[id] = 0;
    return mark;
  };
  const marks = [rooms[lounge].door, ...rooms.map(r => r.door)].map(d => (d ? frameOf(d) : null)).find(m => m);
  if (marks) w.props.push({ kind: 'f:marks', ...marks, y });
  return { laid: taken, rooms: rooms.slice(1).map((_, n) => middle(n + 1)) };
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
    if (floorAround(w, s.x, s.y, s.z).length < 10) continue;
    // What's left of his family's life in it; then the ransack, over all but what's left standing or laid ready (the
    // beds they slept in turned over with the rest).
    // (In the room he's put in first, then in the flat's other rooms round it.)
    const flat = home(w, plot, s), laid = flat.laid.filter(q => q.kind !== 'bedroll'), clear = ([x, z]: [number, number]) => !laid.some(q => under(q, x, z, 0.1));
    const free = floorAround(w, s.x, s.y, s.z).filter(clear);
    const more = flat.rooms.flatMap(c => floorAround(w, c.x, s.y, c.z)).filter(q => clear(q) && Math.hypot(q[0] - s.x, q[1] - s.z) < 5 && !free.some(f => Math.hypot(f[0] - q[0], f[1] - q[1]) < 0.3));
    const r = makeRng(7), take = () => { const from = free.length ? free : more; return from.length ? from.splice(randInt(r, from.length), 1)[0] : null; };
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
    // (And his own site access card from when he worked on the tower, M6-10, thrown down with the rest.)
    const [cx, cz] = take() ?? [px + 0.3, pz];
    w.features.push({ kind: 'li:sitecard', x: cx, y: s.y + 0.03, z: cz, group: w.features.length });
    for (let i = 0; i < 6; i++) { const at = take(); if (!at) break; const a = 0.05 + rand(r) * 0.12; w.decor.push({ ...solid(at[0] - a, s.y + 0.03, at[1] - a * 0.6, at[0] + a, s.y + 0.04, at[1] + a * 0.6, MAT.glass), inner: true }); }
    w.teleports.push({ name: 'Li family flat', x: s.x, y: s.y + 1.5, z: s.z, yaw: Math.atan2(s.x - bx, s.z - bz) });
    flatNeon(w, s);
    forced(w, plot, s.y);
    return s;
  }
  throw new Error('no flat for the Li family in upper Shibati');
}
