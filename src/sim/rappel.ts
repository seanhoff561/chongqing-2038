// Rope and rappel (M5-21, DESIGN section 3): rope in hand, standing at an edge looking down over it, he anchors it there
// (carabiners round what's at hand) and it hangs down the face to the ground, 20 m of it at most. Crouched at the edge
// he takes hold of it; holding crouch on any rope (his grappling hook's too) he rappels, sliding down it steadily to the
// ground; he climbs it hand over hand as a pipe. It stays, a fixed line up or down, till he takes it down from either
// end (grapple.ts keeps the ropes and their ends).
import { B, DT, type SimState, type InputFrame } from './types';
import type { World } from '../world/world';
import type { Stack } from './inventory';
import { raycast } from '../world/geom';
import { rayGround } from '../world/heightfield';
import { takeStack } from './inventory';

/** The rope's length (m); how far out in front of him an edge is looked for, and the drop that makes one; how high
 *  over the edge it's tied off (where he takes hold of it to go over). */
export const ROPE = { length: 20, look: 1.5, drop: 2, tied: 0.9, /** m/s down it, rappelling */ slide: 2.5 };

/** Anchored at the edge in front of him, if there's one; false if not (the rope's other uses go on). */
export function anchorRope(s: SimState, w: World, st: Stack): boolean {
  const p = s.player, fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), below = (x: number, z: number) => {
    const a = raycast(w.index, x, p.pos.y + 0.3, z, 0, -1, 0, 200), g = w.ground ? rayGround(w.ground, x, p.pos.y + 0.3, z, 0, -1, 0, 200) : null;
    return p.pos.y + 0.3 - Math.min(a?.t ?? 200, g?.t ?? 200);
  };
  // The edge: where the floor in front of him drops away.
  for (let k = 0.1; k <= ROPE.look; k += 0.02) {
    const x = p.pos.x + fx * k, z = p.pos.z + fz * k, y0 = below(x, z);
    if (p.pos.y - y0 < ROPE.drop) continue;
    if (p.pos.y - y0 > ROPE.length) { return true; }
    takeStack(s.inv.pack, st.uid);
    s.inv.held = 0;
    (s.ropes ??= []).push({ kind: 'rope', x: x + fx * 0.03, z: z + fz * 0.03, y0, y1: p.pos.y + ROPE.tied, nx: fx, nz: fz, item: st.id });
    s.events.push({ t: 'msg', text: 'rope anchored' }, { t: 'sfx', id: 'rig' });
    return true;
  }
  return false;
}

/** Every tick: on a rope with crouch held, his hands slide down it (the body follows them), to just over its foot. */
export function stepRappel(s: SimState, input: InputFrame) {
  const p = s.player;
  if (p.mode !== 'grip' || !(input.buttons & B.CROUCH) || !s.ropes?.length) return;
  const on = p.hands.map(h => h.grip).filter(g => g && s.ropes!.some(q => Math.hypot(q.x + q.nx * 0.08 - g.x, q.z + q.nz * 0.08 - g.z) < 0.05));
  const g0 = on[0], r = g0 && s.ropes.find(q => Math.hypot(q.x + q.nx * 0.08 - g0.x, q.z + q.nz * 0.08 - g0.z) < 0.05);
  if (!g0 || !r) return;
  // Still on the top where it's tied: he swings his legs over the edge first.
  if (p.pos.y > r.y1 - ROPE.tied - 0.3) { p.pos = { x: r.x + r.nx * 0.35, y: r.y1 - ROPE.tied - 1.2, z: r.z + r.nz * 0.35 }; p.vel = { x: 0, y: 0, z: 0 }; }
  // Hands and body down it together.
  const dy = Math.min(ROPE.slide * DT, Math.min(...on.map(g => g!.y)) - (r.y0 + 1.7));
  if (dy <= 0) return;
  for (const g of on) g!.y -= dy;
  p.pos.y -= dy; p.vel.y = Math.min(0, p.vel.y);
}

