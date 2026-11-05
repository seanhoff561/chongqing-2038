// The river border (M6-27, DESIGN section 11): swimming more than 60 m out from either bank, anywhere, the machines'
// sonar has him in ten seconds; the drone boats come for him then, and twenty seconds later they're on him and it's
// over, unless he's ready for them: his jammer running (they come in blind), or fog and night with him lying still in
// the water (drifting, nothing for sonar or heat to find). Back within 60 m of the bank, they lose him. The patrol
// boat has its own rules (M7-09, below).
import type { SimState } from './types';
import type { World } from '../world/world';
import { SCALE, daylight } from './clock';
import { heightAt } from '../world/heightfield';
import { die } from './body';
import { surfaceAt } from './swim';

/** How far out is too far (m); real seconds before sonar has him, and before the boats are on him; the fog that
 *  hides a still swimmer at night; how slow is still (m/s). */
export const RIVER = { far: 60, sonar: 10, boats: 20, fog: 0.6, still: 0.3, /** how near a sonar buoy hears him (M6-20), and the boat's engine (M7-09) */ buoy: 30, engine: 50 };

/** Whether there's no bank within 60 m of (x, z): no ground above the water's surface along any of 16 bearings. */
export function farOut(w: World, x: number, z: number, surface: number) {
  if (!w.ground) return false;
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a);
    for (let d = 4; d <= RIVER.far; d += 4) if ((heightAt(w.ground, x + dx * d, z + dz * d) ?? -Infinity) > surface) return false;
  }
  return true;
}

/** A sonar buoy within `r` of (x, z), not deafened by an EMP. */
const buoyNear = (s: SimState, w: World, x: number, z: number, r: number) => w.features.some((f, i) => f.kind === 'pier:buoy' && !((s.deaf?.[i] ?? 0) > s.time) && Math.hypot(f.x - x, f.z - z) < r);

/** Twice a second: out too far, sonar, the boats; hidden, or back near the bank, it all stops. In the patrol boat
 *  (M7-09): a buoy within 50 m hears its engine and the drone boats set out at once; out on the open river their own
 *  sonar hears it, and by day or in clear air they see it even drifting; once they're coming, the bank's no help. With
 *  the engine off in fog at night, or the jammer running, they've nothing to go on. */
export function stepRiver(s: SimState, w: World) {
  if (s.tick % 30) return;
  const p = s.player, b = p.mode === 'boat' ? s.boat : undefined, dark = daylight(s.time) < 0.3 && s.weather.fog >= RIVER.fog;
  let out: boolean, hidden: boolean, heard = false;
  if (b) {
    heard = !!b.on && buoyNear(s, w, b.x, b.z, RIVER.engine);
    out = heard || s.river?.boats !== undefined || farOut(w, b.x, b.z, b.y);
    hidden = !!s.jam || (!b.on && dark);
  } else {
    // (Or near the river police's sonar buoys, anywhere: M6-20.)
    const surface = surfaceAt(w, p);
    out = p.mode === 'swim' && surface > -Infinity && (buoyNear(s, w, p.pos.x, p.pos.z, RIVER.buoy) || farOut(w, p.pos.x, p.pos.z, surface));
    hidden = !!s.jam || (dark && Math.hypot(p.vel.x, p.vel.z) < RIVER.still);
  }
  if (!out) { if (s.river) s.river = undefined; return; }
  const R = (s.river ??= { since: s.time });
  if (hidden) { R.since = s.time; R.boats = undefined; return; }
  const t = (s.time - R.since) / SCALE;
  if ((heard || t >= RIVER.sonar) && R.boats === undefined) { R.boats = s.time; s.events.push({ t: 'sfx', id: 'boats' }); }
  if (R.boats !== undefined && (s.time - R.boats) / SCALE >= RIVER.boats) die(s, 'river');
}
