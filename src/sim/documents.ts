// Found documents (M10-37, U-104): placed once as a run starts, by the run's seed. Each worldbuilding document goes
// into one container, picked at random from those in the kind of building it belongs in (and in a building with a
// basement drain grate, or in its district, if it says so), never two in one; it's in there when the container is
// first searched (sim/loot.ts). Each story document goes into a container of its high-security site, or lies on the
// floor at its other key place.
import type { SimState } from './types';
import type { World, Inter } from '../world/world';
import { DOCS, type Doc, type DocWhere } from '../data/documents';
import { districtName } from '../world/yuzhong/lots';
import { raycast } from '../world/geom';
import { makeRng, randInt, hashString } from './rng';
import { newUid } from './inventory';

/** Where each key place's story document lies, if not in one of its site's containers: the spot he'd be put at
 *  there (a teleport's name). */
export const DOC_SPOT: Record<string, string> = {
  site: 'Construction site', pier: 'River-police pier: gangway', tunnel: 'Grand Tunnel entrance', shelter: 'Air-raid shelter',
  metro: 'Metro station Jiefangbei', cableway: 'cablewayNorth',
};

/** The building a container belongs to: its interactables' id prefix. */
const owner = (id: string) => id.split('-')[0];

interface Spot { it: Inter; kind: DocWhere; grate: boolean; district: string }
const spotsOf = new WeakMap<World, Spot[]>();

/** Every container in the city's ordinary buildings with what kind of place it's in (none in the high-security
 *  sites or outside a building): a shop's or restaurant's room is a shop wherever it is, a workshop's room a
 *  workshop; otherwise by the building's type (a mall's every room a shop). */
export function docSpots(w: World): Spot[] {
  let v = spotsOf.get(w);
  if (v) return v;
  const types = new Map(w.plots.filter(p => p.prefix && p.type).map(p => [p.prefix!, p.type!]));
  for (const q of w.secure ?? []) types.delete(q.prefix);
  const grates = new Set(w.inter.filter(i => i.kind === 'grate' && i.data?.manhole).map(i => owner(i.id)));
  const KIND = { residential: 'home', office: 'office', clinic: 'clinic', workshop: 'workshop', military: 'military', mall: 'shop' } as const;
  v = [];
  for (const it of w.inter) {
    if (it.kind !== 'container') continue;
    const t = types.get(owner(it.id)), room = it.data?.room as string | undefined;
    if (!t) continue;
    const kind: DocWhere = room === 'shop' || room === 'restaurant' ? 'shop' : room === 'workshop' ? 'workshop' : KIND[t];
    v.push({ it, kind, grate: grates.has(owner(it.id)), district: districtName(it.x, it.z) });
  }
  spotsOf.set(w, v);
  return v;
}

/** Whether a worldbuilding document may be found in a container there. */
export const docFits = (d: Doc, q: Spot) => q.kind === d.where && (!d.needs || q.grate) && (!d.district || q.district === d.district);

/** Puts each document in its place for the run: s.docs, by container, for those in containers; the rest dropped. */
export function placeDocuments(s: SimState, w: World) {
  const inside: Record<string, string> = (s.docs = {}), r = makeRng(hashString(`${s.seed}:docs`)), spots = docSpots(w);
  for (const d of DOCS) {
    const site = w.secure?.find(q => q.id === d.where);
    const pool = (site ? w.inter.filter(i => i.kind === 'container' && owner(i.id) === site.prefix) : DOC_SPOT[d.where] ? [] : spots.filter(q => docFits(d, q)).map(q => q.it))
      .filter(i => !inside[i.id]);
    if (pool.length) { inside[pool[randInt(r, pool.length)].id] = d.id; continue; }
    const t = DOC_SPOT[d.where] && w.teleports.find(q => q.name === DOC_SPOT[d.where]);
    if (!t) continue;
    // On the floor under the spot (loose: not a trace of him).
    const hit = raycast(w.index, t.x, t.y + 0.2, t.z, 0, -1, 0, 60);
    s.dropped.push({ stack: { uid: newUid(s), id: d.id, n: 1, x: 0, y: 0, rot: false }, x: t.x, y: hit ? t.y + 0.2 - hit.t : t.y, z: t.z, loose: true });
  }
}
