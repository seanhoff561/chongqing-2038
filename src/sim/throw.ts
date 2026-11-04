// Throwing (M5-19, DESIGN section 6): what's thrown leaves his hand along his look, a little up, and flies its arc
// (the game draws it while he aims, right mouse) to the first thing it meets. A grenade bursts 3 s after the throw: 6 m
// round, machines wrecked by how near, him hurt and thrown if he's close, weak doors within 3 m blown open, heard far.
// The fire extinguisher bursts into a powder cloud 4 m round that nothing sees through, by eye or by heat, for 20 s.
// Firecrackers crackle where they land for 8 s, heard 120 m round: a decoy. A bottle smashes and a stone clatters,
// heard close by; the stone can be picked up again.
import type { SimState } from './types';
import type { World } from '../world/world';
import { DT } from './types';
import { UNITS } from '../data/units';
import { onUseId } from './use';
import { eyeOf } from './player';
import { unitPose } from './units';
import { raycast } from '../world/geom';
import { rayGround } from '../world/heightfield';
import { takeStack, type Stack } from './inventory';
import { blast } from './strike';
import { doorSolid } from './doors';
import { SCALE } from './clock';

type V3 = { x: number; y: number; z: number };
/** Each throwable: how fast it leaves his hand (m/s); the grenade's fuse and burst, the cloud's size and time, the
 *  firecrackers' reach and time, and the small noises. */
export const THROW = {
  speed: { grenade: 15, firecrackers: 15, extinguisher: 9, bottle: 14, stone: 16 } as Record<string, number>,
  up: 0.25, gravity: 9.8,
  grenade: { fuse: 3, reach: 6, damage: 85, machine: 200, noise: 300, doors: 3 },
  smoke: { r: 4, secs: 20 }, crackers: { r: 120, secs: 8, every: 0.6 }, bottle: 20, stone: 12, /** coughing in a cloud */ cough: { every: 2, r: 12 },
};
export const THROWN = new Set(Object.keys(THROW.speed));

/** Where a throw from his eye along his look goes: its start and velocity. */
export function launch(s: SimState, id: string) {
  const p = s.player, e = eyeOf(p), c = Math.cos(p.pitch + THROW.up), v = THROW.speed[id];
  return { x: e.x, y: e.y - 0.1, z: e.z, vx: -Math.sin(p.yaw) * c * v, vy: Math.sin(p.pitch + THROW.up) * v, vz: -Math.cos(p.yaw) * c * v };
}

/** A thing in flight, a tick on: moved, or landed where it meets something (returns where). */
export function fly(w: World, o: { x: number; y: number; z: number; vx: number; vy: number; vz: number }): V3 | null {
  o.vy -= THROW.gravity * DT;
  const dx = o.vx * DT, dy = o.vy * DT, dz = o.vz * DT, L = Math.hypot(dx, dy, dz);
  if (L < 1e-6) return null;
  const a = raycast(w.index, o.x, o.y, o.z, dx / L, dy / L, dz / L, L), g = w.ground ? rayGround(w.ground, o.x, o.y, o.z, dx / L, dy / L, dz / L, L) : null, t = Math.min(a?.t ?? Infinity, g?.t ?? Infinity);
  if (t <= L) return { x: o.x + (dx / L) * (t - 0.05), y: o.y + (dy / L) * (t - 0.05), z: o.z + (dz / L) * (t - 0.05) };
  o.x += dx; o.y += dy; o.z += dz;
  return null;
}

/** One of a stack thrown from his hand. */
export function throwIt(s: SimState, id: string, st: Stack) {
  const p = s.player;
  if (p.swing > 0 || s.task) return;
  p.swing = 0.6;
  const thrown = { ...st, n: 1 };
  if (--st.n <= 0) { takeStack(s.inv.pack, st.uid); s.inv.held = 0; }
  (s.thrown ??= []).push({ id, stack: thrown, t: s.time, ...launch(s, id) });
  s.events.push({ t: 'sfx', id: 'whoosh' });
}
// (An empty bottle's use is water.ts's: filled at the river, else thrown.)
for (const id of THROWN) if (id !== 'bottle') onUseId(id, (s, _w, st) => throwIt(s, id, st));

/** A grenade's burst: machines by how near, him by how near, weak doors blown open. */
function burst(s: SimState, w: World, at: V3) {
  const G = THROW.grenade;
  blast(s, at, G);
  s.events.push({ t: 'noise', x: at.x, y: at.y, z: at.z, r: G.noise, kind: 'grenade' });
  for (const u of s.units) {
    if (u.dead || (u.reserve && !u.trip)) continue;
    const q = unitPose(w, u, s.time), d = Math.hypot(q.x - at.x, q.y + 0.8 - at.y, q.z - at.z);
    if (!q.active || d > G.reach) continue;
    const dmg = G.machine * (1 - d / G.reach);
    u.hp = (u.hp ?? UNITS[u.kind].hp) - dmg; u.hurtAt = s.time;
    if (u.hp <= 0) u.dead = true;
    s.events.push({ t: 'hit', id: u.id, zone: 'blast', dmg });
  }
  // (A door with a keycard reader is no weak door.)
  for (const it of w.inter) {
    if (it.kind !== 'door' || s.wstate.open[it.id] || it.data?.key || it.data?.lock === 'collapsed' || Math.hypot(it.x - at.x, it.y - at.y, it.z - at.z) > G.doors) continue;
    s.wstate.open[it.id] = true;
    (s.wstate.unlocked ??= {})[it.id] = true;
    if (s.wstate.pinned) delete s.wstate.pinned[it.id];
    if (doorSolid(it) >= 0) w.index.off[doorSolid(it)] = 1;
  }
}

/** Every tick: what's in the air flying on; a grenade's fuse; landings; the clouds and the crackling. */
export function stepThrown(s: SimState, w: World) {
  if (s.thrown?.length) s.thrown = s.thrown.filter(o => {
    const land = fly(w, o), fused = o.id === 'grenade' && (s.time - o.t) / SCALE >= THROW.grenade.fuse;
    if (o.id === 'grenade') { if (land) { o.vx = o.vy = o.vz = 0; Object.assign(o, land); } if (!fused) return true; burst(s, w, o); return false; }
    if (!land) return true;
    if (o.id === 'extinguisher') { (s.smoke ??= []).push({ ...land, until: s.time + THROW.smoke.secs * SCALE }); s.events.push({ t: 'sfx', id: 'hiss' }); }
    else if (o.id === 'firecrackers') (s.crackers ??= []).push({ ...land, until: s.time + THROW.crackers.secs * SCALE, next: s.time });
    else if (o.id === 'bottle') s.events.push({ t: 'noise', ...land, r: THROW.bottle, kind: 'glass' }, { t: 'sfx', id: 'glass' });
    else { s.events.push({ t: 'noise', ...land, r: THROW.stone, kind: 'clatter' }); s.dropped.push({ stack: o.stack, ...land }); }
    return false;
  });
  if (s.smoke?.length) s.smoke = s.smoke.filter(c => c.until > s.time);
  // In a cloud he coughs, heard round him, every couple of seconds, unless he's breathing off the oxygen kit (M5-36).
  const p = s.player.pos;
  if (s.smoke?.some(c => Math.hypot(p.x - c.x, p.y + 1.5 - c.y - 1, p.z - c.z) < THROW.smoke.r)) {
    const o2 = s.inv.pack.items.find(i => i.id === 'oxygen' && (i.charge ?? 100) > 0);
    if (o2) o2.charge = Math.max(0, (o2.charge ?? 100) - (100 * DT) / 90);
    else if (s.time >= (s.coughAt ?? 0)) { s.coughAt = s.time + THROW.cough.every * SCALE; s.events.push({ t: 'noise', x: p.x, y: p.y + 1.5, z: p.z, r: THROW.cough.r, kind: 'cough' }); }
  }
  if (s.crackers?.length) s.crackers = s.crackers.filter(c => {
    if (s.time >= c.next) { c.next = s.time + THROW.crackers.every * SCALE; s.events.push({ t: 'noise', x: c.x, y: c.y, z: c.z, r: THROW.crackers.r, kind: 'firecrackers' }, { t: 'sfx', id: 'crack' }); }
    return c.until > s.time;
  });
}

/** Whether a powder cloud lies across the line from a to b. */
export function smoked(s: SimState, a: V3, b: V3) {
  if (!s.smoke?.length) return false;
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L2 = dx * dx + dy * dy + dz * dz || 1;
  return s.smoke.some(c => {
    const k = Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.y - a.y) * dy + (c.z - a.z) * dz) / L2));
    return Math.hypot(a.x + dx * k - c.x, a.y + dy * k - c.y, a.z + dz * k - c.z) < THROW.smoke.r;
  });
}
