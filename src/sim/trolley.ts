// The haul-rope trolley (M7-06, DESIGN section 10): the way across without power. The haul rope leaves the north
// station through its open end 5 m over the platform; up on cabin 2's roof, under it, E held clips the trolley's
// sheaves onto it and its carabiners to his harness (up the cabin's hanger to its carriage), and he's off it, hanging
// two metres under the rope: down the long sag of the line over the old town and the Yangtze on gravity alone, the
// sheaves whining, to the ending over the river some 45 s later. Ctrl lets go (and he falls). From a cabin the line
// drone has had stopped, E with a trolley takes him up through its roof hatch onto the haul rope over it, and on.
import { B, DT, type InputFrame, type SimState } from './types';
import type { World } from '../world/world';
import { onInteract, START_SOUND } from './interact';
import { has } from './inventory';
import { stepDone } from './escape';
import { lineOf, onLine } from './cablecar';
import { SCALE } from './clock';

/** The slide: the trolley's rolling resistance on the haul rope and the air's drag (per m); his hands under the rope
 *  (m); seconds clipping on at the station and climbing out through a cabin's hatch; how far its whine's heard (m). */
export const TROLLEY = { mu: 0.005, drag: 0.0003, hang: 2.05, clip: 4, hatch: 4, noise: 15 };
/** The haul rope's height over the track ropes' (m). */
const HAUL = -0.2;

// The haul rope at the station's open end, reached from cabin 2's roof.
START_SOUND.haulrope = () => 'rustle';
onInteract('haulrope', {
  can: s => (has(s.inv.pack, 'trolley') ? null : 'the haul rope: nothing to ride it with'),
  dur: () => TROLLEY.clip,
  // (Out on the rope where it leaves the station, its fall starting.)
  done: (s, w) => { if (lineOf(w)) clipOn(s, 0.5); },
});

/** On the haul rope `d` m along, hanging from the trolley, still. */
function clipOn(s: SimState, d: number) {
  const C = s.cable, p = s.player;
  s.cable = { by: 'trolley', d, v: 0, ...(C?.by === 'cabin' ? { cabin: C.d, spotted: C.spotted } : {}) };
  p.mode = 'cable'; p.posture = 'stand'; p.act = null; p.hands[0].grip = p.hands[1].grip = null;
  stepDone(s, 'cable', 'trolley');
  s.events.push({ t: 'sfx', id: 'zip' }, { t: 'msg', text: 'clipped onto the haul rope' });
}

/** Every tick: out of a stopped cabin's hatch (E, a trolley in his pack); on the trolley, gravity down the rope's
 *  slope less the sheaves' and the air's drag, him under it; Ctrl lets go. */
export function stepTrolley(s: SimState, w: World, input: InputFrame) {
  const C = s.cable, l = lineOf(w), p = s.player;
  if (!C || !l || s.dead || s.ended || p.mode !== 'cable') return;
  if (C.by === 'cabin') {
    if (C.hatch === undefined && C.v === 0 && C.spotted !== undefined && (input.pressed & B.INTERACT) && has(s.inv.pack, 'trolley')) { C.hatch = s.time; s.events.push({ t: 'sfx', id: 'force' }, { t: 'msg', text: 'up through the roof hatch' }); }
    if (C.hatch !== undefined && (s.time - C.hatch) / SCALE >= TROLLEY.hatch) clipOn(s, C.d);
    return;
  }
  const at = (d: number) => onLine(l, d).y + HAUL, e = 0.5, rise = (at(C.d + e) - at(C.d - e)) / (2 * e), sin = -rise / Math.hypot(1, rise), cos = Math.sqrt(1 - sin * sin);
  C.v = Math.max(0, C.v + (9.81 * (sin - TROLLEY.mu * cos) - TROLLEY.drag * C.v * C.v) * DT);
  C.d = Math.min(l.len - 6, C.d + C.v * DT);
  if (C.d >= l.len - 6) C.v = 0;
  const q = onLine(l, C.d);
  p.pos.x = q.x; p.pos.y = q.y + HAUL - TROLLEY.hang; p.pos.z = q.z;
  p.vel.x = l.dx * C.v; p.vel.y = rise * C.v; p.vel.z = l.dz * C.v; p.onGround = false; p.fallFrom = p.pos.y;
  if (C.v > 3 && s.tick % 30 === 0) s.events.push({ t: 'noise', x: q.x, y: q.y, z: q.z, r: TROLLEY.noise, kind: 'engine' });
  // (Ctrl lets go: he drops, still moving.)
  if (input.pressed & B.CROUCH) p.mode = 'air';
}
