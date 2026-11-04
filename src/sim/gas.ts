// The telecom exchange's server hall (M6-14, DESIGN section 10): gas suppression. Its motion sensor sees him in the
// hall and the gas comes down: a siren and a hiss, and 8 s to get out before he can't breathe, unless he's breathing
// off the oxygen kit. It clears a minute after; caught in it, he dies.
import type { SimState } from './types';
import type { World } from '../world/world';
import { die } from './body';
import { SCALE } from './clock';
import { SIGHT } from '../data/units';

/** Real seconds to get out; how long it hangs in the hall. */
export const GAS = { secs: 8, hangs: 60 };

const inside = (s: SimState, b: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number }) => {
  const p = s.player.pos;
  return p.x > b.x0 && p.x < b.x1 && p.z > b.z0 && p.z < b.z1 && p.y > b.y0 - 0.5 && p.y < b.y1;
};

export function stepGas(s: SimState, w: World) {
  for (const h of w.gas ?? []) {
    const at = (s.gas ??= {})[h.id];
    if (at === undefined) {
      // Set off by its sensor seeing him in the hall.
      const u = s.units.find(q => q.cam === h.sensor);
      if (!u || (u.aware ?? 0) < 1 - SIGHT.min || !inside(s, h.box)) continue;
      s.gas[h.id] = s.time;
      const c = { x: (h.box.x0 + h.box.x1) / 2, y: h.box.y0 + 1, z: (h.box.z0 + h.box.z1) / 2 };
      s.events.push({ t: 'sfx', id: 'hiss' }, { t: 'noise', ...c, r: 25, kind: 'alarm' });
      continue;
    }
    const t = (s.time - at) / SCALE;
    if (t > GAS.hangs) { delete s.gas[h.id]; continue; }
    if (t < GAS.secs || !inside(s, h.box)) continue;
    const o2 = s.inv.pack.items.find(i => i.id === 'oxygen' && (i.charge ?? 100) > 0);
    if (o2) { o2.charge = Math.max(0, (o2.charge ?? 100) - 100 / (90 * 60)); continue; }
    die(s, 'gas');
  }
}
