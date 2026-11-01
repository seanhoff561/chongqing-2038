// Suspicion and investigation (M4-04, DESIGN section 5). A unit 0.3 aware of him is Suspicious: it leaves its beat
// and walks to where it last saw him (on the nav graph; a drone flies), looks about there for 8 s, and walks back to
// where it left its beat, picking it up there (its loop shifted by the time it was away, so its place stays a pure
// function of the time). Fully aware it's Engaged (what the hive does then is M4-12 on), still going to where it last
// saw him. And for a day after the hive has seen him somewhere, units whose beats pass within 200 m of the place go
// to check it as they pass, once a loop. (The columns keep marching: their members only notice. A camera that sees
// him sends the nearest unit on foot.)
import type { SimState } from './types';
import type { World } from '../world/world';
import { UNITS, SIGHT, STATIC, BROADCAST, type UnitKind } from '../data/units';
import { navPath } from './nav';
import { raycast } from '../world/geom';
import { heightAt } from '../world/heightfield';
import { unitPose, loopOf, isOff, type Unit, type Trip } from './units';
import { callOut, flankPoint, searchSpots, coverNear, SQUAD } from './squad';
import { orbitPoint, bounding, strafePoint } from './combat';
import { SCALE } from './clock';
import { DT } from './types';

type V3 = { x: number; y: number; z: number };
/** How far up or down each kind steps without a stair: a quadruped's jump, a humanoid over a low wall (M4-46, a
 *  person's agility); nothing climbs (M4-09). */
const STEP: Record<UnitKind, number> = { quadruped: 1.5, humanoid: 1.1, heavy: 0.4, drone: 99, hunter: 99, fpv: 99, bomber: 99, spider: 0.6, colossus: 1, delivery: 0.2, carrier: 0.3, camera: 0, sweeper: 0, lamppost: 0, turret: 0, pir: 0, tripwire: 0, acoustic: 0 };
export const ALERT = { suspicious: 0.3, engaged: 1, scan: 8, checkFor: 24 * 3600, checkWithin: 200, /** a changeover's handing over, s (M4-58) */ swap: 3 };

/** The way from a to b for a kind: its nav path on the ground, then on toward the point itself if that's within its
 *  step up or down (a quadruped's metre's jump, half a metre for the rest: none climbs), as far as nothing's in the
 *  way; straight for a drone (8 m over the point) or without a nav graph. */
export function way(w: World, kind: UnitKind, a: V3, b: V3): V3[] {
  if (UNITS[kind].fly) {
    // Straight to 8 m over it if the air's clear; under cover or below ground, along the way a walker would go, low
    // over it (M4-46: through alleys and tunnels after him).
    const top = { x: b.x, y: b.y + 8, z: b.z }, d = Math.hypot(top.x - a.x, top.y - a.y, top.z - a.z);
    if (!w.nav || d < 0.1 || !raycast(w.index, a.x, a.y, a.z, (top.x - a.x) / d, (top.y - a.y) / d, (top.z - a.z) / d, d)) return [top];
    const p = navPath(w.nav, a, b, 'street');
    return p ? [...p.pts.slice(1).map(q => ({ x: q.x, y: q.y + 2.5, z: q.z })), { x: b.x, y: b.y + 2, z: b.z }] : [top];
  }
  if (open(w, kind, a, b)) return [b];
  const p = w.nav ? navPath(w.nav, a, b, kind) : null;
  if (!p) return Math.abs(b.y - a.y) <= STEP[kind] ? [b] : [];
  const end = p.pts[p.pts.length - 1], d = Math.hypot(b.x - end.x, b.y - end.y, b.z - end.z);
  if (Math.abs(b.y - end.y) > STEP[kind] || d < 0.1) return [...p.pts.slice(1), ...(d < 0.1 ? [b] : [])];
  // On to the point, or as near it as it gets (up to a crate a hiding place is in: M4-15).
  const hit = raycast(w.index, end.x, end.y + 0.5, end.z, (b.x - end.x) / d, (b.y - end.y) / d, (b.z - end.z) / d, d), f = hit ? (hit.t - 0.3) / d : 1;
  return [...p.pts.slice(1), ...(f > 0 ? [{ x: end.x + (b.x - end.x) * f, y: end.y + (b.y - end.y) * f, z: end.z + (b.z - end.z) * f }] : [])];
}

/** Close by over open ground (across a divided road, a square): nothing in the way at body height and no step up or
 *  down on the ground between bigger than the kind takes, so it goes straight there and not round by the streets. */
function open(w: World, kind: UnitKind, a: V3, b: V3): boolean {
  const d = Math.hypot(b.x - a.x, b.z - a.z), g = w.ground;
  if (!g || d > 30 || d < 0.1) return false;
  const L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  if (raycast(w.index, a.x, a.y + 1, a.z, (b.x - a.x) / L, (b.y - a.y) / L, (b.z - a.z) / L, L)) return false;
  let y = heightAt(g, a.x, a.z);
  if (y === null || Math.abs(y - a.y) > 0.3) return false;
  for (let k = 1, n = Math.ceil(d / 1.5); k <= n; k++) {
    const q = heightAt(g, a.x + ((b.x - a.x) * k) / n, a.z + ((b.z - a.z) * k) / n);
    if (q === null || Math.abs(q - y) > STEP[kind]) return false;
    y = q;
  }
  return Math.abs(y - b.y) < 0.3;
}

export function leave(s: SimState, w: World, u: Unit, kind: Trip['kind'], to: V3) {
  const at = unitPose(w, u, s.time);
  // A humanoid coming to a place others are already making for comes round it from a side (M4-10).
  const side = u.kind === 'humanoid' ? flankPoint(s, w, u, at, to) : null, path = side ? [...way(w, u.kind, at, side), ...way(w, u.kind, side, to)] : way(w, u.kind, at, to);
  u.trip = { kind, path, i: 0, pos: { x: at.x, y: at.y, z: at.z }, yaw: at.yaw, scan: 0, back: false, left: { x: at.x, y: at.y, z: at.z }, leftAt: s.time };
}

/** A tick along the trip: walking (running when Engaged, or hunting him for the network), looking about at the far
 *  end, back, and onto the beat. */
function walk(s: SimState, w: World, u: Unit) {
  const t = u.trip!, speed = (u.state === 'engaged' || (t.kind === 'hunt' && !t.back) ? UNITS[u.kind].chase : UNITS[u.kind].patrol) * (u.limp ? 0.5 : 1);
  // Immobilised (M4-19): it stands where it is.
  if (u.lame) return;
  // A humanoid with him in its sights stands and shoots (M4-18), unless it's making for cover.
  if ((u.kind === 'humanoid' || u.kind === 'heavy') && u.aim && !t.cover && !t.back && !t.strafe) return;
  if (t.i >= t.path.length) {
    if (!t.back) {
      // Holding its cover while it can see him (M4-10); strafing, it's done its step aside.
      if (t.cover || t.strafe) return;
      // Lost him here: on the way he was going (M4-46), once each time it sees him.
      const g = u.went, gs = g ? Math.hypot(g.x, g.z) : 0;
      if (g && gs > 1 && !t.followed && t.kind !== 'check' && t.kind !== 'swap' && u.state !== 'unaware') {
        t.followed = true;
        t.path = way(w, u.kind, t.pos, { x: t.pos.x + g.x * 4, y: t.pos.y, z: t.pos.z + g.z * 4 }); t.i = 0; t.scan = 0;
        return;
      }
      // Looking about, a slow sweep either way, 8 s (M4-04); then a humanoid goes through the hiding places near the
      // place one by one, looking briefly at each (M4-10).
      const look = t.kind === 'swap' ? ALERT.swap : t.visits ? SQUAD.look : ALERT.scan;
      t.scan += DT;
      t.yaw += Math.sin((t.scan / look) * Math.PI * 4) * 0.03;
      if (t.scan >= look) {
        // Changed over with a column's walker (M4-58): the one going back to the beat knows nothing of him.
        if (t.kind === 'swap') { u.aware = 0; u.seen = undefined; u.saw = undefined; u.state = 'unaware'; t.back = true; t.path = way(w, u.kind, t.pos, t.left); t.i = 0; return; }
        if (u.kind === 'humanoid' && !t.visits) t.visits = searchSpots(w, t.pos);
        const next = t.visits?.shift();
        if (next) { t.path = way(w, u.kind, t.pos, next); t.i = 0; t.scan = 0; return; }
        t.back = true; t.path = way(w, u.kind, t.pos, t.left); t.i = 0;
      }
      return;
    }
    // Back where it left: on with the beat, its loop shifted by the time away.
    u.phase -= (s.time - t.leftAt) / SCALE;
    u.trip = undefined;
    return;
  }
  let step = speed * DT;
  while (step > 0 && t.i < t.path.length) {
    const q = t.path[t.i], dx = q.x - t.pos.x, dy = q.y - t.pos.y, dz = q.z - t.pos.z, d = Math.hypot(dx, dy, dz);
    if (d > 0.01) t.yaw = Math.atan2(dx, dz);
    if (d <= step) { t.pos = { ...q }; t.i++; step -= d; } else { t.pos = { x: t.pos.x + (dx / d) * step, y: t.pos.y + (dy / d) * step, z: t.pos.z + (dz / d) * step }; step = 0; }
  }
  // A drone circling him in a fight keeps its eye on him (M4-45).
  if ((u.kind === 'drone' || u.kind === 'hunter') && u.state === 'engaged' && u.seen && !t.back) t.yaw = Math.atan2(u.seen.x - t.pos.x, u.seen.z - t.pos.z);
}

export function stepAlert(s: SimState, w: World) {
  const think = s.tick % 6;
  for (const u of s.units) {
    // (A reserve waits on its dock or in its garage until it's sent: M4-14, M4-47.)
    if (isOff(s, u) || (u.reserve && !u.trip)) continue;
    const a = u.aware ?? 0;
    const was = u.state;
    // Engaged, it tells the network after its delay (M4-13, sim/district.ts).
    if (a >= ALERT.engaged && u.state !== 'engaged') { u.state = 'engaged'; u.cast = s.time + BROADCAST[u.kind] * SCALE; }
    else if (a >= ALERT.suspicious && u.state === 'unaware') u.state = 'suspicious';
    // A humanoid that's just noticed him calls the others near it (M4-10).
    if (was === 'unaware' && u.state !== 'unaware' && u.kind === 'humanoid' && !u.convoy && u.seen) callOut(s, w, u);
    if (u.convoy) { if (a < ALERT.suspicious) u.state = 'unaware'; continue; }
    if (STATIC.has(u.kind)) {
      // A camera that's caught sight of him sends the nearest unit on foot within 150 m to look (M4-07).
      if (a < ALERT.suspicious) u.state = 'unaware';
      else if (u.seen && u.checked === undefined) { u.checked = s.time; sendNearest(s, w, u, u.seen); }
      if (a < SIGHT.min) u.checked = undefined;
      continue;
    }
    if (u.trip) {
      // Still seeing him while it goes: on to where he is now; a humanoid fighting him makes for cover where it can
      // still see him, and holds it while it can (M4-10).
      const t = u.trip;
      if (!t.back && t.kind !== 'check' && u.seen && (u.id + s.tick) % 6 === 0 && a >= SIGHT.min) {
        const seesNow = Math.hypot(u.seen.x - s.player.pos.x, u.seen.z - s.player.pos.z) < 0.5, him = s.player.pos;
        if (seesNow) t.followed = false;
        // A drone in the fight circles him at a stand-off (M4-45).
        if ((u.kind === 'drone' || u.kind === 'hunter') && u.state === 'engaged') {
          // (Not through a wall: with something in the way, the way round to him, M4-46.)
          const o = orbitPoint(s, u, t.pos, him), d = Math.hypot(o.x - t.pos.x, o.y - t.pos.y, o.z - t.pos.z);
          t.path = d > 0.1 && raycast(w.index, t.pos.x, t.pos.y, t.pos.z, (o.x - t.pos.x) / d, (o.y - t.pos.y) / d, (o.z - t.pos.z) / d, d) ? way(w, u.kind, t.pos, him) : [o];
          t.i = 0; t.scan = 0; t.visits = undefined; walk(s, w, u); continue;
        }
        if (u.kind === 'humanoid' && u.state === 'engaged' && seesNow) {
          // By turns one bounds to cover nearer him while the rest hold theirs; with none to go to, it strafes (M4-45).
          const adv = bounding(s, u);
          // (It holds where it got to until its turn changes; strafing, it steps aside again every couple of seconds.)
          if (adv !== t.advancing || (!t.cover && !t.strafe) || (t.strafe && (u.id + s.tick) % 120 === 0)) {
            t.advancing = adv;
            const c = coverNear(s, w, adv ? { x: t.pos.x + (him.x - t.pos.x) * 0.35, y: t.pos.y, z: t.pos.z + (him.z - t.pos.z) * 0.35 } : t.pos);
            if (c) { t.cover = c; t.strafe = false; t.path = way(w, u.kind, t.pos, c); }
            else { t.cover = undefined; t.strafe = true; t.path = [strafePoint(s, u, t.pos, him)]; }
            t.i = 0; t.scan = 0;
          }
          walk(s, w, u);
          continue;
        } else { t.cover = undefined; t.strafe = false; }
        const end = t.path[t.path.length - 1];
        if (!t.cover && (!end || Math.hypot(end.x - u.seen.x, end.z - u.seen.z) > 2)) { t.path = way(w, u.kind, t.pos, u.seen); t.i = 0; t.scan = 0; t.visits = undefined; }
      } else if (t.cover && a < SIGHT.min) t.cover = undefined;
      walk(s, w, u);
      continue;
    }
    if (u.state !== 'unaware') {
      if (a < ALERT.suspicious) u.state = 'unaware';
      else if (u.seen) { leave(s, w, u, 'look', u.seen); continue; }
    }
    // Checking where the hive saw him, as it passes nearest the place on its beat (each unit in turn).
    if ((u.id + think) % 6 || u.state !== 'unaware' || u.reserve) continue;
    const at = unitPose(w, u, s.time);
    if (!at.active || (u.checked !== undefined && s.time - u.checked < loopOf(w, u) * SCALE)) continue;
    for (const h of s.hive.seen) {
      if (s.time - h.t > ALERT.checkFor || Math.hypot(h.x - at.x, h.z - at.z) > ALERT.checkWithin) continue;
      if (nearestOnBeat(w, u, h) > Math.hypot(h.x - at.x, h.z - at.z) - 3) { u.checked = s.time; leave(s, w, u, 'check', h); break; }
    }
  }
}

/** The nearest unit on its beat within 150 m of a camera: sent to look at where the camera saw him. */
function sendNearest(s: SimState, w: World, cam: Unit, to: V3) {
  const c = unitPose(w, cam, s.time);
  let best: Unit | null = null, bd = 150;
  for (const u of s.units) {
    if (u === cam || u.convoy || u.reserve || STATIC.has(u.kind) || u.trip || u.state !== 'unaware' || isOff(s, u)) continue;
    const p = unitPose(w, u, s.time), d = Math.hypot(p.x - c.x, p.z - c.z);
    if (p.active && d < bd) { bd = d; best = u; }
  }
  if (best) { best.aware = Math.max(best.aware ?? 0, ALERT.suspicious + 0.05); best.seen = { ...to }; }
}

/** How near its beat comes to a place. */
function nearestOnBeat(w: World, u: Unit, h: V3) {
  return Math.min(...w.patrols[u.patrol].pts.map(q => Math.hypot(q.x - h.x, q.z - h.z)));
}
