// The substation's live busbars (M6-15, DESIGN section 10): 10 kV across its transformer hall. Within a metre of one
// an arc jumps to him and he's dead; within a few metres they hum, loud and low, a warning. Nothing he wears saves
// him; under them, keeping low, he passes.
import type { SimState } from './types';
import type { World } from '../world/world';
import { die } from './body';

/** How close an arc reaches (m); how far the hum's heard (m), and how often it's played (ticks). */
export const HV = { arc: 1, hum: 4, every: 90 };

/** Metres from his body (hips to head, as low as he's keeping) to a busbar's line. */
const BODY = { stand: [0.9, 1.3, 1.7], crouch: [0.5, 0.8, 1.05], crawl: [0.15, 0.3, 0.4], hidden: [0.3, 0.5, 0.6] } as const;
function off(s: SimState, b: { a: { x: number; y: number; z: number }; b: { x: number; y: number; z: number } }) {
  const p = s.player.pos, vx = b.b.x - b.a.x, vy = b.b.y - b.a.y, vz = b.b.z - b.a.z, L = vx * vx + vy * vy + vz * vz || 1;
  let best = Infinity;
  for (const h of BODY[s.player.posture] ?? BODY.stand) {
    const t = Math.max(0, Math.min(1, ((p.x - b.a.x) * vx + (p.y + h - b.a.y) * vy + (p.z - b.a.z) * vz) / L));
    best = Math.min(best, Math.hypot(b.a.x + vx * t - p.x, b.a.y + vy * t - (p.y + h), b.a.z + vz * t - p.z));
  }
  return best;
}

export function stepHv(s: SimState, w: World) {
  if (!w.hv?.length || s.dead) return;
  let near = Infinity;
  for (const b of w.hv) near = Math.min(near, off(s, b));
  if (near < HV.arc) { s.events.push({ t: 'sfx', id: 'zap' }, { t: 'noise', x: s.player.pos.x, y: s.player.pos.y + 1, z: s.player.pos.z, r: 30, kind: 'arc' }); die(s, 'shock'); return; }
  if (near < HV.hum && s.tick % HV.every === 0) s.events.push({ t: 'sfx', id: 'hum' });
}
