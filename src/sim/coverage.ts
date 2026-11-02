// The coverage tool (M6-23): over a game day, when each approach to a high-security site is watched and when it
// isn't. A spot is watched at a moment if any machine out then would see him standing there (the machines' own
// sight: sim/perception.ts visibility, by their beats and the hour, in clear weather); the windows between are when
// he can cross it unseen. Every high-security site has an approach with a window of 10 s or more (DESIGN section 10).
import type { SimState } from './types';
import type { World } from '../world/world';
import { unitPose, isOff, type Unit } from './units';
import { visibility, rangeOf } from './perception';
import { SIGHT } from '../data/units';
import { SCALE } from './clock';

type V3 = { x: number; y: number; z: number };

/** Each unit's ground over the day, as a box (its beat and its dock; a camera where it hangs): to pass over at once
 *  those that can never see a spot. */
function reach(w: World, u: Unit) {
  if (u.cam !== undefined) { const c = w.cameras[u.cam]; return { x0: c.x, z0: c.z, x1: c.x, z1: c.z }; }
  if (u.patrol < 0) return null;
  const P = w.patrols[u.patrol], pts = P.dock !== undefined ? [...P.pts, w.docks[P.dock]] : P.pts;
  return { x0: Math.min(...pts.map(q => q.x)), z0: Math.min(...pts.map(q => q.z)), x1: Math.max(...pts.map(q => q.x)), z1: Math.max(...pts.map(q => q.z)) };
}

/** The unwatched windows (real seconds: from, to) at a spot over a day from `from` (game seconds), looked at every
 *  `step` real seconds. `s` is a state of the run (its units and seed); it's left as it was. */
export function unwatched(s: SimState, w: World, at: V3, from: number, step = 1): [number, number][] {
  const keep = { time: s.time, pos: { ...s.player.pos }, posture: s.player.posture, weather: { ...s.weather }, mode: s.player.mode };
  s.player.pos = { ...at }; s.player.posture = 'stand'; s.player.mode = 'ground'; s.weather = { fog: 0, rain: 0 };
  // (Those that could ever be within sight of it: the farthest any kind sees is under 120 m.)
  const near = s.units.filter(u => { const b = reach(w, u); return b && at.x > b.x0 - 120 && at.x < b.x1 + 120 && at.z > b.z0 - 120 && at.z < b.z1 + 120; });
  const out: [number, number][] = [], day = 86400 / SCALE;
  let open: number | null = null;
  for (let t = 0; t <= day; t += step) {
    s.time = from + t * SCALE;
    let seen = false;
    for (const u of near) {
      if (isOff(s, u) || (u.reserve && !u.trip)) continue;
      const q = unitPose(w, u, s.time);
      if (!q.active || q.docked || Math.hypot(q.x - at.x, q.z - at.z) > rangeOf(s, u.kind) + 2) continue;
      if (visibility(s, w, u.kind, q) >= SIGHT.min) { seen = true; break; }
    }
    if (!seen && open === null) open = t;
    if (seen && open !== null) { out.push([open, t]); open = null; }
  }
  if (open !== null) out.push([open, day]);
  Object.assign(s, { time: keep.time, weather: keep.weather });
  Object.assign(s.player, { pos: keep.pos, posture: keep.posture, mode: keep.mode });
  return out;
}

/** The longest window there. */
export const longest = (ws: [number, number][]) => ws.reduce((a, [p, q]) => Math.max(a, q - p), 0);
