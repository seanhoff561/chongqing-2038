// Machines keep out of each other and of him (M10-45, U-104). Each tick a unit off its beat, having stepped along its
// way, is steered off the bodies near it (other machines', his), giving way to one in its way, weaves a little
// as it goes, and then is put just clear of any body it still overlaps. Where that would take its body into a wall it
// slides along it, or stands; a step that would leave it deeper in a body than it was, it doesn't take. The bodies are
// BODY's standing cylinders (sim/damage.ts) and his box. (Machines on their beats are placed by the clock alone, so
// they don't give way: those off their beats give way to them, near him; the columns are left out.)
import type { SimState } from './types';
import type { World } from '../world/world';
import { UNITS } from '../data/units';
import { movement as M } from '../data/movement';
import { BODY } from './damage';
import { unitPose, isOff, type Unit } from './units';
import { farFromBeat } from './perception';
import { overlaps } from '../world/geom';
import { SCALE } from './clock';
import { DT } from './types';

type V3 = { x: number; y: number; z: number };
/** How near (m) bodies are looked at; the room it likes round it (m); how hard it steers off one (m/s, full when
 *  touching); its weave either side of its way (m) and how fast (rad/s); the most it's put aside in a tick (m). */
export const SPACE = { near: 20, room: 0.6, steer: 1.5, weave: 0.3, rate: 1.1, cap: 0.3 };

type Body = { u: Unit; x: number; y: number; z: number };
let memo: { s: SimState | null; tick: number; list: Body[] } = { s: null, tick: -1, list: [] };

/** This tick's bodies: every machine off its beat (or stopped), and those on their beats near him. */
function crowd(s: SimState, w: World): Body[] {
  if (memo.s === s && memo.tick === s.tick) return memo.list;
  const list: Body[] = [], him = s.player.pos;
  for (const u of s.units) {
    if (u.cam !== undefined || u.convoy || (u.crash && !u.dead)) continue;
    if (!u.trip && !u.stop && (isOff(s, u) || farFromBeat(w, u, him.x, him.z, SPACE.near))) continue;
    const p = unitPose(w, u, s.time);
    if (!p.active && !u.stop) continue;
    if (!u.trip && Math.hypot(p.x - him.x, p.z - him.z) > SPACE.near + 5) continue;
    list.push({ u, x: p.x, y: p.y, z: p.z });
  }
  memo = { s, tick: s.tick, list };
  return list;
}

/** Where a body is now (one off its beat may have moved this tick). */
const where = (b: Body): V3 => (b.u.trip && !b.u.stop ? b.u.trip.pos : b);

/** A tick's keeping apart for a unit on a trip that was at `from` and has stepped to its trip's pos; `step` is how far
 *  up or down it steps (its body's walls are what it can't step onto). */
export function keepApart(s: SimState, w: World, u: Unit, from: V3, step: number) {
  const t = u.trip!, base = { ...t.pos }, [y0, y1, r] = BODY[u.kind], fly = UNITS[u.kind].fly > 0;
  const near: { x: number; y: number; z: number; r: number; lo: number; hi: number; him?: boolean }[] = [];
  for (const b of crowd(s, w)) {
    if (b.u === u) continue;
    const q = where(b);
    if (Math.abs(q.x - base.x) > SPACE.near || Math.abs(q.z - base.z) > SPACE.near) continue;
    const B = BODY[b.u.kind];
    near.push({ x: q.x, y: q.y, z: q.z, r: B[2], lo: q.y + B[0], hi: q.y + B[1] });
  }
  const P = s.player.pos;
  if (Math.abs(P.x - base.x) < SPACE.near && Math.abs(P.z - base.z) < SPACE.near) near.push({ x: P.x, y: P.y, z: P.z, r: M.width / 2, lo: P.y, hi: P.y + M.height[s.player.posture], him: true });
  if (!near.length && fly) return;
  // How far its body's edge is from another's (less than 0 inside it), and the way out: his body is a box.
  const gap = (p: V3, b: (typeof near)[number]): [number, number, number] => {
    if (p.y + y1 <= b.lo || p.y + y0 >= b.hi) return [Infinity, 0, 0];
    const cx = b.him ? Math.max(b.x - b.r, Math.min(b.x + b.r, p.x)) : b.x, cz = b.him ? Math.max(b.z - b.r, Math.min(b.z + b.r, p.z)) : b.z;
    let dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
    if (d < 1e-6) { dx = p.x - b.x; dz = p.z - b.z; d = Math.hypot(dx, dz); if (d < 1e-6) { dx = -Math.sin(t.yaw); dz = -Math.cos(t.yaw); d = 1; } return [-r - b.r, dx / d, dz / d]; }
    return [d - r - (b.him ? 0 : b.r), dx / d, dz / d];
  };
  const pen = (p: V3) => near.reduce((a, b) => a - Math.min(0, gap(p, b)[0]), 0);
  // (Its walls: what's higher than it steps, up its body; a flyer's, all of it.)
  const wall = (p: V3) => overlaps(w.index, { x0: p.x - r, z0: p.z - r, x1: p.x + r, z1: p.z + r, y0: fly ? p.y + y0 : p.y + step + 0.05, y1: fly ? p.y + y1 : p.y + Math.max(y1, step + 0.3) });
  const mx = base.x - from.x, mz = base.z - from.z, m = Math.hypot(mx, mz), fx = m > 1e-4 ? mx / m : 0, fz = m > 1e-4 ? mz / m : 0;
  const c = { ...base };
  // Steered off the bodies near it: one in its way it gives way to (slowing) and steps round, on the side it's off
  // to already (its right, square on); one beside or behind, it eases off.
  for (const b of near) {
    const [g, nx, nz] = gap(base, b);
    if (g >= SPACE.room) continue;
    const k = Math.min(1, (SPACE.room - g) / SPACE.room) * SPACE.steer * DT, ahead = m > 1e-4 ? -(nx * fx + nz * fz) : 0;
    if (ahead > 0.3) {
      const side = nz * fx - nx * fz > 0.1 ? -1 : 1, slow = Math.min(m * 0.8, k * ahead);
      c.x += fz * k * side - fx * slow; c.z += -fx * k * side - fz * slow;
    } else { c.x += nx * k * 0.5; c.z += nz * k * 0.5; }
  }
  // Weaving a little either side of its way as it goes (a walker; not on its last two metres).
  const end = t.path[t.path.length - 1];
  if (!fly && m > 1e-4 && end && Math.hypot(end.x - base.x, end.z - base.z) > 2) {
    const ph = (s.time / SCALE) * SPACE.rate + u.id * 1.7, o = SPACE.weave * (Math.sin(ph) - Math.sin(ph - SPACE.rate * DT));
    c.x += fz * o; c.z -= fx * o;
  }
  // Put just clear of any body it's still in, a few times over (one may push it into another).
  for (let k = 0; k < 3; k++) for (const b of near) { const [g, nx, nz] = gap(c, b); if (g < 0) { c.x += nx * (1e-3 - g); c.z += nz * (1e-3 - g); } }
  const ax = c.x - base.x, az = c.z - base.z, a = Math.hypot(ax, az);
  if (a > SPACE.cap) { c.x = base.x + (ax / a) * SPACE.cap; c.z = base.z + (az / a) * SPACE.cap; }
  // No deeper into a body than it was, and not into a wall it wasn't in: else along the wall, or its way, or standing.
  const was = pen(from) + 1e-4, walled = wall(from), ok = (p: V3) => pen(p) <= was && (walled || !wall(p));
  const pick = [c, { x: c.x, y: c.y, z: from.z }, { x: from.x, y: c.y, z: c.z }].find(ok) ?? (pen(base) <= was ? base : { ...from });
  t.pos = pick;
  // Kept off the point it was making for, near it: that'll do (on to the next, or there), facing it.
  const q = t.path[t.i];
  if (q && Math.hypot(pick.x - base.x, pick.z - base.z) > 0.02 && Math.hypot(q.x - pick.x, q.z - pick.z) < r + 0.9) { t.yaw = Math.atan2(q.x - pick.x, q.z - pick.z); t.i++; }
}
