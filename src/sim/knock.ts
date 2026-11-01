// Knocked down (M4-64, U-052). A blast near him throws him by its force, off his feet and away from it, tumbling; where
// he lands he lies a moment (1.6 s), then gets up crouched. A big fall leaves him down the same way (M4-66).
import { DT, type SimState } from './types';
import type { World } from '../world/world';
import { free } from './physics';
import { movement as M } from '../data/movement';

type V3 = { x: number; y: number; z: number };
export const KNOCK = { down: 1.6, up: 0.45 };

/** Thrown away from a point by a force (m/s). */
export function knock(s: SimState, from: V3, force: number) {
  const p = s.player;
  if (p.mode === 'dead' || p.mode === 'hidden' || force < 1) return;
  const dx = p.pos.x - from.x, dz = p.pos.z - from.z, d = Math.hypot(dx, dz) || 1;
  p.vel.x += (dx / d) * force; p.vel.z += (dz / d) * force; p.vel.y = Math.max(p.vel.y, force * KNOCK.up);
  p.hands.forEach(h => { h.grip = null; });
  p.mode = 'air'; p.onGround = false; p.knock = true; p.fallFrom = p.pos.y;
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
