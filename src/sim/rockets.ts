// Rockets (M4-65, U-052). A street heavy with him in its sights fires a rocket from its pod every 9 s when he's 20 to
// 120 m off (in its strike, M10-46); he can fire his own from a rocket launcher, one at a time. A rocket flies straight at 45 m/s, seen and
// heard (its trail, its roar), and bursts on the first thing it meets (him, for a heavy's): the blast hurts and throws
// him by how near, and wrecks the machines round it, armour or no.
import { DT, type SimState } from './types';
import type { World } from '../world/world';
import { unitPose, isOff } from './units';
import { raycast } from '../world/geom';
import { rayGround } from '../world/heightfield';
import { blast } from './strike';
import { onUseId } from './use';
import { consume, has } from './inventory';
import { eyeOf } from './player';
import { ROCKET, UNITS } from '../data/units';
import { SCALE } from './clock';

type V3 = { x: number; y: number; z: number };

function fire(s: SimState, from: V3, to: V3, by: 'heavy' | 'him') {
  const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z, d = Math.hypot(dx, dy, dz) || 1;
  (s.rockets ??= []).push({ ...from, dx: dx / d, dy: dy / d, dz: dz / d, t: s.time, by });
  s.events.push({ t: 'sfx', id: 'rocket' }, { t: 'noise', x: from.x, y: from.y, z: from.z, r: by === 'him' ? ROCKET.noise : 150, kind: 'gunfire' });
}

onUseId('rpg', s => {
  const p = s.player;
  if (p.swing > 0 || s.task) return;
  if (!has(s.inv.pack, 'rocket')) { p.swing = 0.4; return; }
  consume(s.inv.pack, 'rocket');
  p.swing = 1.5; p.kick += 0.12;
  const e = eyeOf(p), c = Math.cos(p.pitch);
  fire(s, e, { x: e.x - Math.sin(p.yaw) * c, y: e.y + Math.sin(p.pitch), z: e.z - Math.cos(p.yaw) * c }, 'him');
});

/** A burst: him hurt and thrown, the machines round it wrecked by how near. */
function burst(s: SimState, w: World, at: V3) {
  blast(s, w, at, ROCKET);
  for (const u of s.units) {
    if (u.dead || (u.reserve && !u.trip)) continue;
    const q = unitPose(w, u, s.time), d = Math.hypot(q.x - at.x, q.y + 0.8 - at.y, q.z - at.z);
    if (!q.active || d > ROCKET.reach) continue;
    const dmg = ROCKET.machine * (1 - d / ROCKET.reach);
    u.hp = (u.hp ?? UNITS[u.kind].hp) - dmg; u.hurtAt = s.time;
    if (u.hp <= 0) u.dead = true;
    s.events.push({ t: 'hit', id: u.id, zone: 'blast', dmg });
  }
}

export function stepRockets(s: SimState, w: World) {
  // The heavies with him in their sights, in range.
  const me = s.player.pos;
  if (s.tick % 6 === 0) for (const u of s.units) {
    // (In its attack, as it strikes: M10-46.)
    if (u.kind !== 'heavy' || !u.aim || isOff(s, u) || (u.rocketAt ?? -Infinity) > s.time || (u.atk && u.atk.ph !== 'strike')) continue;
    const q = unitPose(w, u, s.time), d = Math.hypot(me.x - q.x, me.z - q.z);
    if (d < ROCKET.near || d > ROCKET.far) continue;
    u.rocketAt = s.time + ROCKET.every * SCALE;
    fire(s, { x: q.x, y: q.y + 2.9, z: q.z }, { x: me.x, y: me.y + 0.5, z: me.z }, 'heavy');
  }
  if (!s.rockets?.length) return;
  const step = ROCKET.speed * DT;
  s.rockets = s.rockets.filter(r => {
    if ((s.time - r.t) / SCALE > ROCKET.life) return false;
    const a = raycast(w.index, r.x, r.y, r.z, r.dx, r.dy, r.dz, step), g = w.ground ? rayGround(w.ground, r.x, r.y, r.z, r.dx, r.dy, r.dz, step) : null;
    let t = Math.min(a?.t ?? Infinity, g?.t ?? Infinity);
    // A heavy's bursts at him as it reaches him; his on the first machine in its way.
    // (Nearest along this tick's flight, so nothing slips between one tick's and the next's.)
    const near = (p: V3, rad: number) => { const k = Math.max(0, Math.min(step, (p.x - r.x) * r.dx + (p.y - r.y) * r.dy + (p.z - r.z) * r.dz)); return Math.hypot(r.x + r.dx * k - p.x, r.y + r.dy * k - p.y, r.z + r.dz * k - p.z) < rad ? k : Infinity; };
    if (r.by === 'heavy') t = Math.min(t, near({ x: me.x, y: me.y + 1, z: me.z }, 0.8));
    else for (const u of s.units) { if (u.dead || isOff(s, u) || (u.reserve && !u.trip)) continue; const q = unitPose(w, u, s.time); if (q.active) t = Math.min(t, near({ x: q.x, y: q.y + 0.8, z: q.z }, 1)); }
    if (t === Infinity) { r.x += r.dx * step; r.y += r.dy * step; r.z += r.dz * step; return true; }
    burst(s, w, { x: r.x + r.dx * t, y: r.y + r.dy * t, z: r.z + r.dz * t });
    return false;
  });
}
