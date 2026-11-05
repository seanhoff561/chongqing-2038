// Strike drones (M4-47, U-050). Once a district's had him Engaged 25 s, the nearest dock within 600 m sends a kamikaze
// FPV every 15 s, and after 40 s its bomb dropper. A kamikaze flies at him fast, locks on 8 m out and dives where he
// was, blowing up there: a step aside at the last moment and it misses. A bomb dropper hangs 12 m over him and drops a
// grenade every 4 s that bursts where it lands. A blast hurts by how near; shot, either falls dead and harmless.
import type { SimState } from './types';
import type { World } from '../world/world';
import { isOff, type Unit } from './units';
import { leave } from './alert';
import { districtOf } from './district';
import { damage } from './body';
import { knock } from './knock';
import { raycast } from '../world/geom';
import { rayGround } from '../world/heightfield';
import { STRIKE } from '../data/units';
import { SCALE } from './clock';

type V3 = { x: number; y: number; z: number };

/** A blast at a point (a kamikaze's, a bomb's, a rocket's, a grenade's, a hunter drone's crash): heard `noise` m
 *  round, seen (M10-65), sparks, and him hurt by how near (within its reach) and thrown (within half as far again),
 *  unless a wall or the ground stands between (M10-65). */
export function blast(s: SimState, w: World, at: V3, B: { reach: number; damage: number }, noise: number = STRIKE.noise) {
  s.events.push({ t: 'noise', x: at.x, y: at.y, z: at.z, r: noise, kind: 'explosion' }, { t: 'blast', x: at.x, y: at.y, z: at.z, r: B.reach }, { t: 'mark', x: at.x, y: at.y, z: at.z, nx: 0, ny: 1, nz: 0, kind: 'bullet', on: 'machine' });
  const me = { x: s.player.pos.x, y: s.player.pos.y + 1, z: s.player.pos.z };
  const d = Math.hypot(me.x - at.x, me.y - at.y, me.z - at.z);
  if (d >= B.reach * 1.5 || sheltered(w, at, me, d)) return;
  if (d < B.reach) { const dmg = B.damage * (1 - d / B.reach); damage(s, dmg, 'blast'); s.events.push({ t: 'hurt', dmg, cause: 'blast' }); }
  // Its force throws him, hard, off his feet if close (M4-64, M10-65).
  knock(s, at, d, B.reach * 1.5);
}

/** Whether something solid stands between a blast and him (from a little off its centre: a rocket bursts on a face). */
function sheltered(w: World, at: V3, me: V3, d: number) {
  if (d < 0.6) return false;
  const ux = (me.x - at.x) / d, uy = (me.y - at.y) / d, uz = (me.z - at.z) / d, o = 0.25;
  const x = at.x + ux * o, y = at.y + uy * o, z = at.z + uz * o, L = d - o - 0.35;
  return !!raycast(w.index, x, y, z, ux, uy, uz, L) || !!(w.ground && rayGround(w.ground, x, y, z, ux, uy, uz, L));
}

/** The first thing under a point. */
function groundUnder(w: World, x: number, y: number, z: number) {
  const a = raycast(w.index, x, y, z, 0, -1, 0, 300), g = w.ground ? rayGround(w.ground, x, y, z, 0, -1, 0, 300) : null;
  return y - Math.min(a?.t ?? 300, g?.t ?? 300);
}

export function stepStrike(s: SimState, w: World) {
  const me = s.player.pos, eye = { x: me.x, y: me.y + 1, z: me.z };
  // Sending them: from the nearest dock to where the network has him.
  const k = s.hive.lkp, D = k ? s.hive.districts[districtOf(k.x, k.z)] : undefined;
  if (k && D?.state === 'engaged' && s.tick % 6 === 0) {
    const long = (s.time - D.since) / SCALE;
    let dock = -1, bd: number = STRIKE.dock;
    w.docks.forEach((q, i) => { const d = Math.hypot(q.x - k.x, q.z - k.z); if (d < bd) { bd = d; dock = i; } });
    const all = dock < 0 ? [] : s.units.filter(u => u.reserve?.dock === dock), mine = all.filter(u => !isOff(s, u));
    // (Those sent count, shot down or not.)
    const sent = (kind: string) => all.filter(u => u.kind === kind && u.sent !== undefined && u.sent >= D.since);
    const send = (u: Unit | undefined) => { if (u) { leave(s, w, u, 'hunt', { x: k.x, y: k.y, z: k.z }); u.sent = s.time; u.aware = 1.5; u.state = 'engaged'; u.seen = { x: k.x, y: k.y, z: k.z }; } };
    const lastFpv = Math.max(-Infinity, ...sent('fpv').map(u => u.sent!));
    if (long >= STRIKE.after && (s.time - lastFpv) / SCALE >= STRIKE.every) send(mine.find(u => u.kind === 'fpv' && !u.trip));
    if (long >= STRIKE.bomberAfter && !sent('bomber').length) send(mine.find(u => u.kind === 'bomber' && !u.trip));
  }
  for (const u of s.units) {
    if ((u.kind !== 'fpv' && u.kind !== 'bomber') || u.sent === undefined || !u.trip || u.trip.back || isOff(s, u)) continue;
    const t = u.trip;
    if (u.kind === 'fpv') {
      // At him, then committed: the dive to where he was.
      const d = Math.hypot(eye.x - t.pos.x, eye.y - t.pos.y, eye.z - t.pos.z);
      if (!u.lock && d < STRIKE.commit) u.lock = { ...eye };
      const to = u.lock ?? eye;
      t.path = [to]; t.i = 0;
      if (u.lock && Math.hypot(to.x - t.pos.x, to.y - t.pos.y, to.z - t.pos.z) < 0.8) { u.dead = true; u.stop = { ...t.pos, yaw: t.yaw, t: s.time }; u.trip = undefined; blast(s, w, to, STRIKE.fpvBlast); }
    } else {
      // Over him, dropping.
      t.path = [{ x: me.x, y: me.y + STRIKE.bombH, z: me.z }]; t.i = 0;
      const over = Math.hypot(t.pos.x - me.x, t.pos.z - me.z) < 4;
      if (over && (u.fire ?? 0) <= s.time) { u.fire = s.time + STRIKE.bombEvery * SCALE; (s.bombs ??= []).push({ ...t.pos, gy: groundUnder(w, t.pos.x, t.pos.y - 0.3, t.pos.z), t: s.time }); s.events.push({ t: 'sfx', id: 'drop' }); }
    }
  }
  // The grenades falling, bursting where they land.
  if (s.bombs?.length) s.bombs = s.bombs.filter(b => {
    const f = (s.time - b.t) / SCALE;
    if (b.y - 4.9 * f * f > b.gy) return true;
    blast(s, w, { x: b.x, y: b.gy + 0.3, z: b.z }, STRIKE.bomb);
    return false;
  });
}
