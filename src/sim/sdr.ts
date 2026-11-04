// The SDR dongle on Anna (M5-08, DESIGN section 12): carried, with the laptop open she listens to the machines' radio.
// Thirty seconds in a district and she's worked out its drones' routes and when each is home on its dock, for her
// map.
import type { SimState } from './types';
import type { World } from '../world/world';
import { DT } from './types';
import { districtOf } from './district';
import { DISTRICT_NAMES } from '../world/yuzhong/lots';

/** Real seconds she listens in a district to have its drones. */
export const SDR = { listen: 30 };

const carried = (s: SimState) => s.inv.pack.items.some(i => i.id === 'sdr');

/** A district's drone beats (the patrols' indices): those that start in it. */
export const droneBeats = (w: World, d: string) => w.patrols.flatMap((p, i) => (p.kind === 'drone' && districtOf(p.pts[0].x, p.pts[0].z) === d ? [i] : []));

export function stepSdr(s: SimState) {
  if (!s.laptop?.open || !carried(s)) return;
  const R = (s.sdr ??= { heard: {}, t: {} }), p = s.player.pos, d = districtOf(p.x, p.z);
  if (R.heard[d]) return;
  R.t[d] = (R.t[d] ?? 0) + DT;
  if (R.t[d] < SDR.listen) return;
  R.heard[d] = true;
  s.events.push({ t: 'msg', text: `Anna: ${DISTRICT_NAMES[d]?.[1] ?? d}'s drone routes and dock times are on the map` });
}
