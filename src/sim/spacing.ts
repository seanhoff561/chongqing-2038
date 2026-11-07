// Machines keep out of each other and of him, and he out of them (M10-45, U-104). Each tick a machine that moves,
// having stepped along its way (a trip's, or its beat's), is steered off the bodies near it (other machines', his),
// giving way to one in its way, weaves a little as it goes, and then is put just clear of any body it still overlaps.
// Where that would take its body into a wall it slides along it, or stands; a step that would leave it deeper in a body
// than it was, it doesn't take. One on its beat walks that much aside of it (Unit.aside), drifting back onto it as it
// can; out of his way, straight back. The bodies are BODY's standing cylinders (sim/damage.ts) and his box. (The columns
// are left out: they're placed by the clock alone.)
import type { SimState } from './types';
import type { World } from '../world/world';
import { UNITS } from '../data/units';
import { movement as M } from '../data/movement';
import { BODY } from './damage';
import { unitPose, isOff, type Unit } from './units';
import { beatBox } from './perception';
import { overlaps } from '../world/geom';
import { free } from './physics';
import { SCALE, GAME_PER_TICK } from './clock';
import { DT } from './types';

type V3 = { x: number; y: number; z: number };
/** How near (m) bodies are looked at; the room it likes round it (m); how hard it steers off one (m/s, full when
 *  touching); its weave either side of its way (m) and how fast (rad/s); the most it's put aside in a tick (m); how fast
 *  one aside of its beat drifts back onto it (m/s); how long one on a trip held off its way gives it up (s). */
export const SPACE = { near: 20, room: 0.6, steer: 1.5, weave: 0.3, rate: 1.1, cap: 0.3, back: 0.5, stall: 2 };

/** A machine's body this tick, where it is now (moved this tick, if it has). */
type Body = { u: Unit; x: number; y: number; z: number; /** its girth */ r: number };
/** (And by the 8 m cells they stood in as the tick began, with the girth of the widest: a city on the hunt has hundreds
 *  of machines on their way at once, each asking after the bodies near it.) */
let memo: { s: SimState | null; tick: number; list: Body[]; cells: Map<number, number[]>; maxR: number } = { s: null, tick: -1, list: [], cells: new Map(), maxR: 0 };
const CELL = 8;

/** This tick's bodies: every machine off its beat or stopped (a wreck, a lame one), and those on their beats near him. */
/** The fixed sensors: mounted on poles, walls and roofs (their housings the world's own solids), not bodies in the way. */
const FIXED = new Set(['camera', 'sweeper', 'lamppost', 'turret', 'pir', 'tripwire', 'acoustic']);

/** The machines that can ever be bodies (not the cameras, the fixed sensors or the columns: two thirds of the city's
 *  units), listed once for the units list (again if it grows), each with its beat's box (none for a reserve's). */
const movers = new WeakMap<Unit[], { n: number; list: Unit[]; boxes: (ReturnType<typeof beatBox> | null)[] }>();
function moversOf(units: Unit[], w: World) {
  let m = movers.get(units);
  if (!m || m.n !== units.length) {
    const list = units.filter(u => u.cam === undefined && !FIXED.has(u.kind) && !u.convoy);
    movers.set(units, (m = { n: units.length, list, boxes: list.map(u => (u.reserve || u.patrol < 0 ? null : beatBox(w, w.patrols[u.patrol]))) }));
  }
  return m;
}

function crowd(s: SimState, w: World): Body[] {
  if (memo.s === s && memo.tick === s.tick) return memo.list;
  const list: Body[] = [], him = s.player.pos, { list: all, boxes } = moversOf(s.units, w), R = SPACE.near;
  for (let i = 0; i < all.length; i++) {
    const u = all[i], b = boxes[i];
    if (u.crash && !u.dead) continue;
    // (On its beat and nowhere along it near him: farFromBeat, its box kept here.)
    if (!u.trip && !u.stop && (isOff(s, u) || (b && (him.x < b.x0 - R || him.x > b.x1 + R || him.z < b.z0 - R || him.z > b.z1 + R)))) continue;
    const p = unitPose(w, u, s.time);
    if (!p.active && !u.stop) continue;
    if (!u.trip && !u.stop && Math.hypot(p.x - him.x, p.z - him.z) > SPACE.near + 5) continue;
    list.push({ u, x: p.x, y: p.y, z: p.z, r: BODY[u.kind][2] });
  }
  const cells = new Map<number, number[]>();
  let maxR = 0;
  list.forEach((b, i) => { const k = Math.floor(b.x / CELL) * 65536 + Math.floor(b.z / CELL), a = cells.get(k); if (a) a.push(i); else cells.set(k, [i]); maxR = Math.max(maxR, b.r); });
  memo = { s, tick: s.tick, list, cells, maxR };
  return list;
}

/** This tick's bodies that stood within d of (x, z) as it began (and maybe a few more), in the crowd's order. */
function bodiesNear(s: SimState, w: World, x: number, z: number, d: number): Body[] {
  const list = crowd(s, w), ids: number[] = [];
  for (let i = Math.floor((x - d) / CELL); i <= Math.floor((x + d) / CELL); i++) for (let j = Math.floor((z - d) / CELL); j <= Math.floor((z + d) / CELL); j++) { const a = memo.cells.get(i * 65536 + j); if (a) for (const k of a) ids.push(k); }
  return ids.sort((a, b) => a - b).map(k => list[k]);
}

/** Where a body is now (one on a trip may have moved this tick). */
const where = (b: Body): V3 => (b.u.trip && !b.u.stop ? b.u.trip.pos : b);

/** Where a unit that was at `from` and steps to `base` goes instead (and whether that's off its way): kept out of the
 *  bodies near it and the walls. `step` is how far up or down it steps (its body's walls are what it can't step onto);
 *  `way` is where its way has it: if that's in a wall itself (a door it squeezes through, a stair along a wall, a beat
 *  along one), its step's taken into the wall when nothing better is. */
function apart(s: SimState, w: World, u: Unit, from: V3, base: V3, step: number, yaw: number, weave: boolean, way: V3): [V3, boolean] {
  const [y0, y1, r] = BODY[u.kind], fly = UNITS[u.kind].fly > 0;
  const near: { x: number; y: number; z: number; r: number; lo: number; hi: number; him?: boolean }[] = [];
  crowd(s, w);
  for (const b of bodiesNear(s, w, base.x, base.z, r + memo.maxR + SPACE.room + SPACE.cap + 2)) {
    // (Only bodies it could come within its room of this tick, first by where they stood as the tick began, give or take
    // a step: the rest change nothing, and in a crowd they were most of a tick's work, M10-49.)
    const reach = r + b.r + SPACE.room + SPACE.cap + 1;
    if (b.u === u || Math.abs(b.x - base.x) > reach + 1 || Math.abs(b.z - base.z) > reach + 1) continue;
    const q = where(b), B = BODY[b.u.kind];
    if (Math.abs(q.x - base.x) > reach || Math.abs(q.z - base.z) > reach) continue;
    near.push({ x: q.x, y: q.y, z: q.z, r: B[2], lo: q.y + B[0], hi: q.y + B[1] });
  }
  const P = s.player.pos;
  if (s.player.mode !== 'dead' && Math.abs(P.x - base.x) < SPACE.near && Math.abs(P.z - base.z) < SPACE.near) near.push({ x: P.x, y: P.y, z: P.z, r: M.width / 2, lo: P.y, hi: P.y + M.height[s.player.posture], him: true });
  // (Nothing near, a flyer, or a walker standing where it was (looking about at the end of its way), stays put: no
  // walls to ask after.)
  if (!near.length && (fly || (base.x === from.x && base.y === from.y && base.z === from.z))) return [base, false];
  // How far its body's edge is from another's (less than 0 inside it), and the way out (into nx, nz: no garbage made, a
  // crowd calls it thousands of times a tick): his body is a box.
  let nx = 0, nz = 0;
  const gap = (p: V3, b: (typeof near)[number]): number => {
    if (p.y + y1 <= b.lo || p.y + y0 >= b.hi) { nx = nz = 0; return Infinity; }
    const cx = b.him ? Math.max(b.x - b.r, Math.min(b.x + b.r, p.x)) : b.x, cz = b.him ? Math.max(b.z - b.r, Math.min(b.z + b.r, p.z)) : b.z;
    let dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
    if (d < 1e-6) { dx = p.x - b.x; dz = p.z - b.z; d = Math.hypot(dx, dz); if (d < 1e-6) { dx = -Math.sin(yaw); dz = -Math.cos(yaw); d = 1; } nx = dx / d; nz = dz / d; return -r - b.r; }
    nx = dx / d; nz = dz / d;
    return d - r - (b.him ? 0 : b.r);
  };
  const pen = (p: V3) => { let a = 0; for (const b of near) a -= Math.min(0, gap(p, b)); return a; };
  // (Its walls: what's higher than it steps, up its body; a flyer's, all of it.)
  const wall = (p: V3) => overlaps(w.index, { x0: p.x - r, z0: p.z - r, x1: p.x + r, z1: p.z + r, y0: fly ? p.y + y0 : p.y + step + 0.05, y1: fly ? p.y + y1 : p.y + Math.max(y1, step + 0.3) });
  const mx = base.x - from.x, mz = base.z - from.z, m = Math.hypot(mx, mz), fx = m > 1e-4 ? mx / m : 0, fz = m > 1e-4 ? mz / m : 0;
  const c = { ...base };
  // Weaving a little either side of its way as it goes (a walker).
  if (weave && !fly && m > 1e-4) {
    const ph = (s.time / SCALE) * SPACE.rate + u.id * 1.7, o = SPACE.weave * (Math.sin(ph) - Math.sin(ph - SPACE.rate * DT));
    c.x += fz * o; c.z -= fx * o;
  }
  const plain = { ...c };
  // Steered off the bodies near it: one in its way it gives way to (slowing) and steps round, on the side it's off
  // to already (its right, square on); one beside or behind, it eases off.
  for (const b of near) {
    const g = gap(base, b);
    if (g >= SPACE.room) continue;
    const k = Math.min(1, (SPACE.room - g) / SPACE.room) * SPACE.steer * DT, ahead = m > 1e-4 ? -(nx * fx + nz * fz) : 0;
    if (ahead > 0.3) {
      const side = nz * fx - nx * fz > 0.1 ? -1 : 1, slow = Math.min(m * 0.8, k * ahead);
      c.x += fz * k * side - fx * slow; c.z += -fx * k * side - fz * slow;
    } else { c.x += nx * k * 0.5; c.z += nz * k * 0.5; }
  }
  // Put just clear of any body it's still in, a few times over (one may push it into another).
  for (let k = 0; k < 3; k++) for (const b of near) { const g = gap(c, b); if (g < 0) { c.x += nx * (1e-3 - g); c.z += nz * (1e-3 - g); } }
  const ax = c.x - base.x, az = c.z - base.z, a = Math.hypot(ax, az);
  if (a > SPACE.cap) { c.x = base.x + (ax / a) * SPACE.cap; c.z = base.z + (az / a) * SPACE.cap; }
  // No deeper into a body than it was, and not into a wall it wasn't in: else along the wall, or its plain step, or
  // along the wall that way; or its plain step anyway, if its way's in the wall too; or standing.
  // (Whether it was in a wall itself, only asked once a step is: most steps are clear.)
  let walled: boolean | undefined;
  const was = pen(from) + 1e-4, ok = (p: V3) => pen(p) <= was && (!wall(p) || (walled ??= wall(from)));
  const slides = (p: V3) => [{ x: p.x, y: p.y, z: from.z }, { x: from.x, y: p.y, z: p.z }];
  const pick = ok(c) ? c : [...slides(c), base, ...slides(base)].find(ok) ?? (pen(base) <= was && wall(way) ? base : { ...from });
  return [pick, Math.hypot(pick.x - plain.x, pick.z - plain.z) > 0.005];
}

/** The nearest point to p on the way from a to b. */
function onWay(a: V3, b: V3, p: V3): V3 {
  const dx = b.x - a.x, dz = b.z - a.z, L = dx * dx + dz * dz, f = L > 1e-9 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / L)) : 0;
  return { x: a.x + dx * f, y: p.y, z: a.z + dz * f };
}

/** A tick's keeping apart for a unit on a trip that was at `from` and has stepped to its trip's pos; `step` is how far
 *  up or down it steps. */
export function keepApart(s: SimState, w: World, u: Unit, from: V3, step: number) {
  const t = u.trip!, base = { ...t.pos }, end = t.path[t.path.length - 1], q = t.path[t.i];
  // (Weaving, not on its last two metres. Put off its way, until it's at the next point on it, where its way has it is
  // the nearest place to it on the way there.)
  const weave = !!end && Math.hypot(end.x - base.x, end.z - base.z) > 2, off = !!q && t.off === q;
  const [pick, pushed] = apart(s, w, u, from, base, step, t.yaw, weave, off ? onWay(t.path[t.i - 1] ?? q, q, base) : base);
  t.pos = pick;
  // Kept off the point it was making for, near it: that'll do (on to the next, or there), facing it. (Still off its
  // way, making for the next.)
  if (q && Math.hypot(pick.x - base.x, pick.z - base.z) > 0.02 && Math.hypot(q.x - pick.x, q.z - pick.z) < BODY[u.kind][2] + 0.9) { t.yaw = Math.atan2(q.x - pick.x, q.z - pick.z); t.i++; t.stall = 0; }
  // (Held off it further out, how long it's got next to nowhere: what it does then is sim/alert.ts walk's.)
  else if (q) {
    const d = (p: V3) => Math.hypot(q.x - p.x, q.z - p.z), want = d(from) - d(base);
    t.stall = want > 1e-3 && d(from) - d(pick) < want * 0.2 ? (t.stall ?? 0) + DT : 0;
  }
  if (pushed || off) t.off = t.path[t.i];
}

/** A tick's giving way for the machines on their beats near him: each from where it was a tick ago to where its beat
 *  has it now (drifting back toward it), kept apart; and one aside of its beat out of his way straight back on it. */
export function stepAside(s: SimState, w: World, step: (u: Unit) => number) {
  const list = crowd(s, w);
  for (const b of list) {
    const u = b.u;
    if (u.trip || u.stop || u.reserve || u.kind === 'heli' || isOff(s, u)) continue;
    const now = unitPose(w, u, s.time);
    if (now.docked || !now.active) continue;
    const o = u.aside ?? { x: 0, z: 0 }, raw = { x: now.x - o.x, y: now.y, z: now.z - o.z }, was = unitPose(w, u, s.time - GAME_PER_TICK);
    const n = Math.hypot(o.x, o.z), f = n > 0 ? Math.max(0, n - SPACE.back * DT) / n : 0;
    const base = { x: raw.x + o.x * f, y: raw.y, z: raw.z + o.z * f };
    const [p] = apart(s, w, u, { x: was.x, y: was.y, z: was.z }, base, step(u), now.yaw, false, raw);
    u.aside = Math.hypot(p.x - raw.x, p.z - raw.z) > 1e-3 ? { x: p.x - raw.x, z: p.z - raw.z } : undefined;
    b.x = p.x; b.z = p.z;
  }
  for (const u of moversOf(s.units, w).list) if (u.aside && !list.some(b => b.u === u)) u.aside = undefined;
}

/** He doesn't walk into a machine's body (M10-45): moved from (x0, z0) into one, he's put just clear of it (so he
 *  slides round it), where that's not into a wall; else back where he was. */
export function blockHim(s: SimState, w: World, x0: number, z0: number, h: number) {
  const p = s.player, P = p.pos, hw = M.width / 2, x1 = P.x, z1 = P.z;
  const near = crowd(s, w).filter(b => { const q = where(b), B = BODY[b.u.kind]; return Math.abs(q.x - P.x) < 5 && Math.abs(q.z - P.z) < 5 && q.y + B[1] > P.y + 0.05 && q.y + B[0] < P.y + h; });
  if (!near.length) return;
  for (let k = 0; k < 3; k++) for (const b of near) {
    const q = where(b), r = BODY[b.u.kind][2], cx = Math.max(P.x - hw, Math.min(P.x + hw, q.x)), cz = Math.max(P.z - hw, Math.min(P.z + hw, q.z));
    let dx = cx - q.x, dz = cz - q.z, d = Math.hypot(dx, dz);
    if (d >= r) continue;
    // (Its middle inside his box: out the way he came.)
    if (d < 1e-6) { dx = x0 - x1; dz = z0 - z1; d = Math.hypot(dx, dz); if (d < 1e-6) continue; P.x += (dx / d) * (r + hw); P.z += (dz / d) * (r + hw); continue; }
    const nx = dx / d, nz = dz / d, into = p.vel.x * nx + p.vel.z * nz;
    P.x += nx * (r - d + 1e-3); P.z += nz * (r - d + 1e-3);
    if (into < 0) { p.vel.x -= into * nx; p.vel.z -= into * nz; }
  }
  if (!free(w.index, P.x, P.y, P.z, h)) { P.x = x0; P.z = z0; p.vel.x = p.vel.z = 0; }
}
