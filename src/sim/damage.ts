// Machines hurt (M4-19, DESIGN section 6). A hit to a place on a machine takes that place's share of its damage off
// the machine's HP: a humanoid's armour a tenth, its back battery double. Enough to its sensor head blinds it (it sees
// nothing, though it still hears); a knee broken slows a humanoid, both immobilise it (it stands, and still shoots);
// its battery gone shuts it down for good; its HP gone, it's destroyed, a wreck (a drone falls). Hit, a machine knows
// he's about: at least Suspicious, looking his way.
import type { SimState } from './types';
import type { World } from '../world/world';
import { UNITS, ZONES, BREAKS } from '../data/units';
import { eyeOf } from './player';
import { unitPose, isOff, type Unit } from './units';
import type { UnitKind } from '../data/units';
import { raycast } from '../world/geom';
import { rayGround } from '../world/heightfield';
import { MAT } from '../world/mats';

/** What a surface is made of, for the sound of a blow and the mark a round leaves (M4-60, M4-61). */
export const METAL: Set<number> = new Set([MAT.metal, MAT.tealMetal, MAT.facadeWorks, MAT.screen, MAT.lamp, MAT.cable]);
export const SOFT: Set<number> = new Set([MAT.wood, MAT.crate, MAT.soft, MAT.cloth, MAT.leaves, MAT.moss, MAT.grass, MAT.blossom]);

export function hurtUnit(s: SimState, w: World, u: Unit, zone: string, dmg: number) {
  if (u.dead) return;
  const Z = ZONES[u.kind], B = BREAKS[u.kind] ?? {}, d = dmg * (Z[zone] ?? Z.body), hits = (u.hits ??= {});
  hits[zone] = (hits[zone] ?? 0) + d;
  u.hp = (u.hp ?? UNITS[u.kind].hp) - d;
  if (B.head && (hits.head ?? 0) >= B.head) u.blind = true;
  if (B.knee) { const broken = +((hits.kneeL ?? 0) >= B.knee) + +((hits.kneeR ?? 0) >= B.knee); if (broken) u.limp = true; if (broken === 2) u.lame = true; }
  if (B.battery && (hits.battery ?? 0) >= B.battery) u.shut = true;
  // Its weapon out of action; a drone brought down, spinning out to crash (M4-62).
  if (B.weapon && (hits.rifle ?? hits.launcher ?? hits.barrels ?? 0) >= B.weapon) { u.disarmed = true; u.aim = false; }
  if (B.rotors && (hits.rotors ?? 0) >= B.rotors && !u.crash) crash(s, w, u);
  if (u.hp <= 0) {
    u.dead = true;
    // A camera or sensor shot out (U-093): its glass goes and it sparks.
    if (u.cam !== undefined) { const c = w.cameras[u.cam]; s.events.push({ t: 'sfx', id: 'blow-glass' }, { t: 'mark', x: c.x, y: c.y, z: c.z, nx: 0, ny: -1, nz: 0, kind: 'bullet', on: 'metal' }); }
  }
  s.events.push({ t: 'hit', id: u.id, zone, dmg: d });
  u.hurtAt = s.time;
  if (isOff(s, u)) return;
  // Immobilised, it stands where it is.
  if (u.lame && !u.stop) { const p = unitPose(w, u, s.time); u.stop = { x: p.x, y: p.y, z: p.z, yaw: p.yaw, t: s.time }; }
  u.aware = Math.max(u.aware ?? 0, 0.35);
  u.seen = { ...s.player.pos };
}

/** Each kind's body as a standing cylinder about where it is: its bottom and top (from its pose) and radius. */
export const BODY: Record<UnitKind, [number, number, number]> = {
  quadruped: [0, 1, 0.5], humanoid: [0, 1.9, 0.35], heavy: [0, 3.1, 0.9], drone: [-0.15, 0.15, 0.45], hunter: [-0.2, 0.2, 0.55], fpv: [-0.1, 0.1, 0.3], bomber: [-0.2, 0.2, 0.55], spider: [17, 26, 2.5], colossus: [0, 9.2, 1.4], heli: [-1.2, 1.4, 3], crawler: [0, 0.35, 0.45], delivery: [0, 0.7, 0.45], carrier: [0, 1.8, 1],
  camera: [-0.2, 0.2, 0.25], sweeper: [-0.2, 0.2, 0.25], lamppost: [-0.2, 0.2, 0.25], turret: [-0.5, 0.4, 0.5], pir: [-0.1, 0.1, 0.15], tripwire: [0, 0, 0], acoustic: [-0.2, 0.2, 0.2],
};

/** The machine his look ray (from his eye, along his yaw and pitch, turned by `spread`) meets first within reach,
 *  where on it, and which place that is; none if a wall's in the way. */
export type Aim = { u: Unit; t: number; zone: string; at: { x: number; y: number; z: number } };
export function aimAt(s: SimState, w: World, reach: number, spread = { yaw: 0, pitch: 0 }): Aim | null {
  const p = s.player, yaw = p.yaw + spread.yaw, pitch = p.pitch + spread.pitch, e = eyeOf(p);
  const d = { x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) }, h2 = d.x * d.x + d.z * d.z;
  let best = null as Aim | null;
  if (h2 < 1e-6) return null;
  for (const u of s.units) {
    if (u.dead || u.kind === 'tripwire' || (u.reserve && !u.trip)) continue;
    const q = unitPose(w, u, s.time), [y0, y1, r] = BODY[u.kind];
    if (!q.active && !u.stop) continue;
    // Where the ray enters its body's cylinder: within its radius of its axis (a quadratic along the ray's level run),
    // and between its bottom and top (straight up or down at it too: a drone overhead, U-089).
    const ox = e.x - q.x, oz = e.z - q.z, b = ox * d.x + oz * d.z, c = ox * ox + oz * oz - r * r, disc = b * b - h2 * c;
    if (disc < 0) continue;
    const sq = Math.sqrt(disc), lo = Math.abs(d.y) > 1e-9 ? [(q.y + y0 - e.y) / d.y, (q.y + y1 - e.y) / d.y].sort((m, n) => m - n) : (e.y >= q.y + y0 && e.y <= q.y + y1 ? [-Infinity, Infinity] : [1, 0]);
    const t = Math.max((-b - sq) / h2, lo[0], 0), out = Math.min((-b + sq) / h2, lo[1]);
    if (t > out || t > reach + r || (best && t >= best.t)) continue;
    // (Which place it meets judged halfway through the body, where the machine itself is; the mark where it went in.)
    const m = (t + out) / 2, at = { x: e.x + d.x * t, y: e.y + d.y * t, z: e.z + d.z * t };
    best = { u, t, zone: zoneOf(u.kind, q, { x: e.x + d.x * m, y: e.y + d.y * m, z: e.z + d.z * m }, d), at };
  }
  if (best && raycast(w.index, e.x, e.y, e.z, d.x, d.y, d.z, Math.max(0, best.t - 0.4))) return null;
  return best;
}

/** Which place on a machine a blow or round along d meets at a point. */
export function zoneOf(kind: UnitKind, q: { x: number; y: number; z: number; yaw: number }, at: { x: number; y: number; z: number }, d: { x: number; y: number; z: number }) {
  const fx = Math.sin(q.yaw), fz = Math.cos(q.yaw), ly = at.y - q.y, lx = (at.x - q.x) * fz - (at.z - q.z) * fx, from = d.x * fx + d.z * fz;
  switch (kind) {
    case 'drone': case 'hunter': case 'bomber': return ly > 0.03 || Math.hypot(at.x - q.x, at.z - q.z) > 0.25 ? 'rotors' : 'body';
    case 'quadruped': return d.y > 0.5 && ly < 0.6 ? 'battery' : ly < 0.5 ? 'legs' : from < -0.3 && ly > 0.6 ? 'head' : ly > 0.85 && Math.abs(lx) < 0.15 ? 'launcher' : 'body';
    case 'humanoid': return ly > 1.62 ? 'head' : ly < 0.65 ? (lx < 0 ? 'kneeL' : 'kneeR') : from > 0.3 && ly > 1 && ly < 1.5 ? 'battery' : from < -0.3 && ly > 1.0 && ly < 1.45 && Math.abs(lx) < 0.2 ? 'rifle' : 'body';
    case 'heavy': return ly > 2.6 ? 'head' : ly < 1.3 ? (lx < 0 ? 'kneeL' : 'kneeR') : from > 0.3 && ly > 1.7 && ly < 2.5 ? 'battery' : 'body';
    case 'turret': return from < -0.3 ? (lx > 0.12 ? 'barrels' : 'head') : 'body';
    // The giants' weak spots (U-089): the spider's sensor cluster on top of its small body, the colossus's head; the
    // helicopter's rotors over it.
    case 'spider': return ly > 24.5 ? 'head' : 'body';
    case 'colossus': return ly > 8 ? 'head' : 'body';
    case 'heli': return ly > 0.7 ? 'rotors' : 'body';
    default: return 'body';
  }
}

/** Where a round along his look (thrown off by `spread`) meets the world, there being no machine in its way: the point,
 *  the surface's normal and what it's made of (M4-61). */
export function surfaceAt(s: SimState, w: World, reach: number, spread = { yaw: 0, pitch: 0 }) {
  const p = s.player, yaw = p.yaw + spread.yaw, pitch = p.pitch + spread.pitch, e = eyeOf(p);
  const d = { x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) };
  const a = raycast(w.index, e.x, e.y, e.z, d.x, d.y, d.z, reach), g = w.ground ? rayGround(w.ground, e.x, e.y, e.z, d.x, d.y, d.z, reach) : null;
  const h = a && (!g || a.t <= g.t) ? a : g;
  if (!h) return null;
  const mat = h === a ? w.index.solids[a.id]?.mat ?? MAT.concrete : MAT.asphalt;
  return { x: e.x + d.x * h.t, y: e.y + d.y * h.t, z: e.z + d.z * h.t, nx: h.nx, ny: h.ny, nz: h.nz, on: (METAL.has(mat) ? 'metal' : SOFT.has(mat) ? 'soft' : 'hard') as 'metal' | 'hard' | 'soft' };
}

/** A drone hit in a rotor (M4-62): it loses lift and drops, spinning, drifting on the way it was going, to the first
 *  thing under it; it can't see or act on the way down (sim/breaks.ts blows it up when it lands). */
export function crash(s: SimState, w: World, u: Unit) {
  const p = unitPose(w, u, s.time), down = raycast(w.index, p.x, p.y - 0.3, p.z, 0, -1, 0, 300), g = w.ground ? rayGround(w.ground, p.x, p.y - 0.3, p.z, 0, -1, 0, 300) : null;
  const t = Math.min(down?.t ?? 300, g?.t ?? 300);
  u.crash = { t: s.time, x: p.x, y: p.y, z: p.z, yaw: p.yaw, gy: p.y - 0.3 - (t >= 300 ? 0 : t) };
  u.trip = undefined; u.aware = 0;
}
