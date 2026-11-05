// Knocked down (M4-64, U-052, M10-65). A blast near him throws him away from it, hard: 9 m/s across and 4 up within
// 2 m of it, falling off to nothing at the edge of its shove; within 3 m it takes him off his feet, tumbling, and where
// he lands he lies a moment (1.6 s), then gets up crouched. Further out it only shoves him. A big fall leaves him down
// the same way (M4-66).
import { DT, type SimState } from './types';
import type { World } from '../world/world';
import { free } from './physics';
import { movement as M } from '../data/movement';

type V3 = { x: number; y: number; z: number };
export const KNOCK = {
  down: 1.6,
  /** full force within (m); the most it throws him, across and up (m/s); off his feet within (m) */
  near: 2, push: 9, lift: 4, floor: 3,
};

/** A blast's shove at d m from it, out to `reach` m: m/s across and up. */
export function shoveAt(d: number, reach: number) {
  const k = Math.max(0, Math.min(1, (reach - d) / (reach - KNOCK.near)));
  return { push: KNOCK.push * k, lift: KNOCK.lift * k };
}

/** Thrown away from a blast at `from`, d m off, whose shove reaches `reach` m. */
export function knock(s: SimState, from: V3, d: number, reach: number) {
  const p = s.player, { push, lift } = shoveAt(d, reach);
  if (p.mode === 'dead' || p.mode === 'hidden' || push < 0.5) return;
  // (Further out, holding on to something or mid-vault, he rides it out.)
  if (d > KNOCK.floor && p.mode !== 'ground' && p.mode !== 'air') return;
  const dx = p.pos.x - from.x, dz = p.pos.z - from.z, h = Math.hypot(dx, dz);
  // (Right under or over him, it throws him whichever way he's facing from.)
  const ux = h > 0.05 ? dx / h : Math.sin(p.yaw), uz = h > 0.05 ? dz / h : Math.cos(p.yaw);
  p.vel.x += ux * push; p.vel.z += uz * push; p.vel.y = Math.max(p.vel.y, lift);
  p.mode = 'air'; p.onGround = false; p.fallFrom = p.pos.y;
  if (d > KNOCK.floor) return;
  p.hands.forEach(q => { q.grip = null; });
  p.knock = true;
  s.events.push({ t: 'sfx', id: 'land-hard' });
}

/** Every tick lying down: nothing he can do till he's back up (crouched if there's room). */
export function stepDown(s: SimState, w: World) {
  const p = s.player;
  p.vel.x *= 0.8; p.vel.z *= 0.8;
  p.posture = 'crawl';
  p.down = (p.down ?? 0) - DT;
  if (p.down > 0) return;
  p.down = 0; p.mode = 'ground';
  if (free(w.index, p.pos.x, p.pos.y + 1e-3, p.pos.z, M.height.crouch)) p.posture = 'crouch';
}
