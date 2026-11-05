// One-off finds left where they belong (M10-26): the rail deck's maintenance schedule in a container by the Dongshuimen
// Bridge's bridgehead (its landmark is out over the river), the room's container nearest the place (not a fridge).
// Never rolled, like a site's keys (data/loot). (The cableway's operator key is in its control desk: cableway.ts.)
import type { World } from '../world';
import { GEO } from '../geo';

/** What, by which landmark, and how far from it the container may be (m). */
export const FINDS: [item: string, landmark: string, within: number][] = [['schedule', 'dongshuimenBridge', 400]];

export function placeFinds(w: World) {
  for (const [id, k, within] of FINDS) {
    const L = GEO.landmarks[k];
    if (!L) continue;
    const near = w.inter.filter(i => i.kind === 'container' && i.data?.room && i.data.type !== 'fridge' && !i.data.items && Math.hypot(i.x - L.x, i.z - L.z) < within)
      .sort((a, b) => Math.hypot(a.x - L.x, a.z - L.z) - Math.hypot(b.x - L.x, b.z - L.z))[0];
    if (near) near.data = { ...near.data, items: [[id, 1]] };
  }
}
