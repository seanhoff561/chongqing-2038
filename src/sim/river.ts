// The river border (M6-27, DESIGN section 11): swimming more than 60 m out from either bank, anywhere, the machines'
// sonar has him in ten seconds; the drone boats come for him then, and twenty seconds later they're on him and it's
// over, unless he's ready for them: his jammer running (they come in blind), or fog and night with him lying still in
// the water (drifting, nothing for sonar or heat to find). Back within 60 m of the bank, they lose him.
import type { SimState } from './types';
import type { World } from '../world/world';
import { SCALE, daylight } from './clock';
import { heightAt } from '../world/heightfield';
import { die } from './body';
import { surfaceAt } from './swim';

/** How far out is too far (m); real seconds before sonar has him, and before the boats are on him; the fog that
 *  hides a still swimmer at night; how slow is still (m/s). */
export const RIVER = { far: 60, sonar: 10, boats: 20, fog: 0.6, still: 0.3, /** how near a sonar buoy hears him (M6-20) */ buoy: 30 };

/** Whether there's no bank within 60 m of (x, z): no ground above the water's surface along any of 16 bearings. */
export function farOut(w: World, x: number, z: number, surface: number) {
  if (!w.ground) return false;
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a);
    for (let d = 4; d <= RIVER.far; d += 4) if ((heightAt(w.ground, x + dx * d, z + dz * d) ?? -Infinity) > surface) return false;
  }
  return true;
}

/** Twice a second: out too far, sonar, the boats; hidden, or back near the bank, it all stops. */
export function stepRiver(s: SimState, w: World) {
  if (s.tick % 30) return;
  const p = s.player, surface = surfaceAt(w, p);
  // (Or near the river police's sonar buoys, anywhere: M6-20.)
  const buoyed = w.features.some(f => f.kind === 'pier:buoy' && Math.hypot(f.x - p.pos.x, f.z - p.pos.z) < RIVER.buoy);
  const out = p.mode === 'swim' && surface > -Infinity && (buoyed || farOut(w, p.pos.x, p.pos.z, surface));
  const hidden = !!s.jam || (daylight(s.time) < 0.3 && s.weather.fog >= RIVER.fog && Math.hypot(p.vel.x, p.vel.z) < RIVER.still);
  if (!out) { if (s.river) s.river = undefined; return; }
  const R = (s.river ??= { since: s.time });
  if (hidden) { R.since = s.time; R.boats = undefined; return; }
  const t = (s.time - R.since) / SCALE;
  if (t >= RIVER.sonar && R.boats === undefined) { R.boats = s.time; s.events.push({ t: 'sfx', id: 'boats' }); }
  if (R.boats !== undefined && (s.time - R.boats) / SCALE >= RIVER.boats) die(s, 'river');
}
