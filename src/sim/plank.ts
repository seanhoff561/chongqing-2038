// A ladder laid across a gap (M5-22, ladder.ts), as movement sees it: whether he's on one (his pace held to a crouch's).
// (Apart from ladder.ts so movement needn't load the interactions.)
import type { SimState } from './types';

/** The ladder's width (m). */
export const PLANK_W = 0.45;

export function onPlank(s: SimState) {
  const p = s.player;
  return (s.planks ?? []).some(q => {
    const dx = p.pos.x - q.x, dz = p.pos.z - q.z, along = -(dx * Math.sin(q.yaw) + dz * Math.cos(q.yaw)), side = dx * Math.cos(q.yaw) - dz * Math.sin(q.yaw);
    return along >= q.a && along <= q.b && Math.abs(side) <= PLANK_W && Math.abs(p.pos.y - q.y) < 0.2;
  });
}
