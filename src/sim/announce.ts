// The street speakers (M4-28, U-053): every couple of minutes, and soon after his district's alert changes (or the
// curfew starts), the speakers on the smart lampposts speak the occupier's line for the alert and the hour. He hears
// it from the lamppost nearest him, if one's within earshot and he isn't down under the ground.
import type { SimState } from './types';
import type { World } from '../world/world';
import { ANNOUNCE, PA, paKind } from '../data/announce';
import { districtOf } from './district';
import { heightAt } from '../world/heightfield';
import { SCALE } from './clock';

export function stepPa(s: SimState, w: World) {
  if (s.dead) return;
  const p = s.player.pos, k = paKind(s.hive.districts[districtOf(p.x, p.z)]?.state ?? 'unaware', s.time / 3600);
  const P = (s.pa ??= { at: s.time + PA.every * SCALE * 0.4, kind: k, n: 0 });
  if (k !== P.kind) { P.kind = k; P.at = Math.min(P.at, s.time + PA.react * SCALE); }
  if (s.time < P.at) return;
  P.at = s.time + PA.every * SCALE;
  const g = w.ground ? heightAt(w.ground, p.x, p.z) : null;
  if (g !== null && p.y < g - 2) return;
  let best = PA.hear, at: { x: number; y: number; z: number } | undefined;
  for (const c of w.cameras) {
    if (c.kind !== 'lamppost') continue;
    const d = Math.hypot(c.x - p.x, c.z - p.z);
    if (d < best) { best = d; at = c; }
  }
  if (!at) return;
  const lines = ANNOUNCE[k], l = lines[P.n++ % lines.length];
  s.events.push({ t: 'pa', id: l.id, x: at.x, y: at.y, z: at.z });
}
