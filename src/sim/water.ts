// Water (M5-29, DESIGN section 4): bottles fill clean at a running tap (sinks.ts) or from the river: an empty bottle
// used at the water's edge (the surface within reach in front of him, or standing in it) fills every empty one he
// carries with river water, which makes him sick one time in two unless a purification tablet is dropped in (a tablet
// a bottle). Used anywhere else, it's thrown (throw.ts).
import type { SimState } from './types';
import type { World } from '../world/world';
import { onUseId } from './use';
import { eyeOf } from './player';
import { addItem, takeStack } from './inventory';
import { throwIt } from './throw';

/** How far in front of him and how far below his eyes the water's surface can be (m). */
export const RIVER = { ahead: 1.4, below: 2.6 };

/** Whether there's water to dip a bottle in: in front of him, below, within reach, or round his feet. */
export function waterInReach(s: SimState, w: World) {
  const p = s.player, e = eyeOf(p), fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
  return w.water.some(b => [0, 0.7, RIVER.ahead].some(k => {
    const x = e.x + fx * k, z = e.z + fz * k;
    return x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && e.y - b.y1 <= RIVER.below && e.y > b.y1 - 0.5;
  }));
}

onUseId('bottle', (s, w, st) => {
  // (Nowhere to fill it: thrown, for a noise where it smashes, M5-19.)
  if (!waterInReach(s, w)) { throwIt(s, 'bottle', st); return; }
  let n = 0;
  for (const b of s.inv.pack.items.filter(i => i.id === 'bottle')) { n += b.n; Object.assign(b, { id: 'riverwater', made: s.time }); }
  s.events.push({ t: 'sfx', id: 'water-run' }, { t: 'msg', text: `filled ${n} bottle${n > 1 ? 's' : ''} from the river: purify it before you drink` });
});

onUseId('tablets', (s, _w, st) => {
  const b = s.inv.pack.items.find(i => i.id === 'riverwater');
  if (!b) { s.events.push({ t: 'msg', text: 'no river water to treat' }); return; }
  if (b.n > 1) { b.n--; addItem(s, s.inv.pack, 'water', 1); } else Object.assign(b, { id: 'water', made: s.time });
  if (--st.n <= 0) takeStack(s.inv.pack, st.uid);
  s.events.push({ t: 'msg', text: 'a tablet in: safe to drink in half an hour' });
});
