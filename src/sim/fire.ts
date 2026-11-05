// Machines firing at him (DESIGN section 6: M4-11 the turrets, M4-18 the rest). An armed machine that's Engaged, or
// whose district is, fires while it has him in sight and reach: a turret six rounds a second, 70% hitting within 40 m
// and fewer on to 60; a humanoid's rifle bursts of three every 1 s, each hitting 0.75 x how well it sees him (twice
// its visibility, at most 1) x (1 - 0.11 x his speed, M4-54) x (1 - d/80) (30 a round, every 1 s since M4-54), a street heavy's cannon (M4-26b) six every 2 s, 0.45 the same way to 100 m;
// a hunter drone's SMG bursts of two every 0.8 s, 40%; a quadruped's prod at
// arm's length every 1.5 s, stunning him a second. In its attack (M10-46, sim/combat.ts) a machine fires only as it
// strikes, its bursts in a volley 0.25 s apart, as many as that cadence gives over its cycle. A hit hurts: its damage, then 30% a heavy bleed or else a light
// one, and 15% a limb (a sprained leg, or a graze to an arm that only bleeds).
import type { SimState } from './types';
import type { World } from '../world/world';
import { UNITS, WEAPONS, SIGHT, TAG } from '../data/units';
import { sprainLeg } from './body';
import { rand } from './rng';
import { unitPose, isOff } from './units';
import { visibility, farFromBeat } from './perception';
import { districtOf } from './district';
import { DT } from './types';
import { launcher } from './tag';
import { FIGHT } from './combat';

/** A hit: its damage (taken as the tick's body step reads the 'hurt'), a bleed, maybe a limb. */
export function hitHim(s: SimState, dmg: number, cause: string) {
  const b = s.body;
  if (rand(s.rng) < 0.3) b.heavyBleed = true;
  else if (b.lightBleed < 0) b.lightBleed = 0;
  if (rand(s.rng) < 0.15 && rand(s.rng) < 0.5) sprainLeg(s);
  s.events.push({ t: 'hurt', dmg, cause });
}

/** Every tick. */
export function stepFire(s: SimState, w: World) {
  const p = s.player, hot = new Set(Object.keys(s.hive.districts).filter(k => s.hive.districts[k].state === 'engaged'));
  for (const u of s.units) {
    const wpn = UNITS[u.kind].weapon;
    if (!wpn) continue;
    // (Neither it nor any district engaged, it holds fire without being placed: M9-12, most of them most ticks.)
    const calm = u.state !== 'engaged' && !hot.size, W0 = WEAPONS[wpn];
    const at = calm || farFromBeat(w, u, p.pos.x, p.pos.z, Math.max(W0.reach, u.kind === 'quadruped' ? TAG.reach : 0) + 3) || isOff(s, u) || (u.reserve && !u.trip) ? null : unitPose(w, u, s.time);
    if (!at || !at.active || at.docked || (u.state !== 'engaged' && !(hot.size && hot.has(districtOf(at.x, at.z))))) { u.aim = false; u.fire = undefined; u.left = undefined; continue; }
    // (A prod's reach from its body to his middle: not up through a ledge he's on.)
    const W = WEAPONS[wpn], d = wpn === 'prod' ? Math.hypot(p.pos.x - at.x, p.pos.y + 0.9 - at.y - 0.6, p.pos.z - at.z) : Math.hypot(p.pos.x - at.x, p.pos.y + 1 - at.y, p.pos.z - at.z);
    if (u.kind === 'quadruped') launcher(s, w, u, at, d);
    // It looks for him along its gun ten times a second, as it sees (every tick of a lunge with its prod).
    const A = u.atk;
    if ((u.id + s.tick) % 6 === 0 || (A?.ph === 'strike' && wpn === 'prod')) u.aim = !u.blind && !u.disarmed && d <= W.reach && visibility(s, w, u.kind, at) >= SIGHT.min;
    if (!u.aim) { u.fire = Math.max(0, (u.fire ?? 0) - DT); continue; }
    // In its attack (M10-46) it fires only in its strike: its volley, the bursts close together.
    if (A && (A.ph !== 'strike' || A.n <= 0)) { u.fire = 0; u.left = undefined; continue; }
    u.fire = (u.fire ?? 0) - DT;
    while (u.fire <= 0 && (!A || A.n > 0)) {
      const speed = Math.hypot(p.vel.x, p.vel.z);
      const hit = wpn === 'rifle' || wpn === 'cannon' ? W.accuracy * Math.min(1, 2 * visibility(s, w, u.kind, at)) * Math.max(0, 1 - 0.11 * speed) * Math.max(0, 1 - d / W.reach)
        : W.accuracy * (d <= W.sure ? 1 : Math.max(0, 1 - (d - W.sure) / (W.reach - W.sure)));
      // (A round at him arrives at once; one that misses cracks past him, the rifles' and the cannon's: M4-54.)
      const struck = rand(s.rng) < hit;
      if (W.noise) s.events.push({ t: 'noise', x: at.x, y: at.y, z: at.z, r: W.noise, kind: 'gunfire' }, { t: 'shot', x: at.x, y: at.y, z: at.z, crack: !struck && W.crack });
      if (struck) { hitHim(s, W.damage, wpn); if (W.stun) p.stun = Math.max(p.stun, W.stun); }
      u.left = (u.left ?? W.burst) - 1;
      if (u.left > 0) u.fire += 0.1;
      else if (A) { u.left = W.burst; A.n--; u.fire += FIGHT.gap; }
      else { u.left = W.burst; u.fire += W.every - 0.1 * (W.burst - 1); }
    }
  }
}
