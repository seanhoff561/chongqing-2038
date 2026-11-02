// Building types (M5-35, U-091): what each enterable building was, rolled for each run from the run's seed, so the
// city's insides differ run to run (homes as they always were). The rarer the type, the better what's left in it:
// homes most of all, then offices, a few clinics and workshops, and now and then a military post, high security.
import { rand, makeRng, hashString } from '../../sim/rng';
import { MAT } from '../mats';
import type { Kind } from './rooms';

export type BuildingType = 'residential' | 'office' | 'clinic' | 'workshop' | 'military' | 'mall';

/** The run's seed the city is built for (the types are its), set by the world's builder. */
export const BUILD = { seed: 0 };

/** Each type's share of the enterable buildings, its rooms (the kinds a floor's rooms are, drawn evenly), how much
 *  bigger or smaller its rooms run, the lining of its walls inside (homes: papered or plastered, as ever), and its
 *  street door's odds (open, shut, locked, jammed, chained, collapsed; U-091: fewer chained and locked than before). */
export const TYPES: Record<BuildingType, { share: number; rooms?: Kind[]; scale: number; inside?: number; door: number[] }> = {
  residential: { share: 0.65, scale: 1, door: [0.06, 0.13, 0.31, 0.13, 0.21, 0.16] },
  office: { share: 0.22, rooms: ['office', 'office', 'office', 'store'], scale: 1.25, inside: MAT.plaster, door: [0.06, 0.15, 0.33, 0.12, 0.17, 0.17] },
  clinic: { share: 0.04, rooms: ['ward', 'ward', 'clinic', 'store'], scale: 0.9, inside: MAT.tile, door: [0.05, 0.14, 0.35, 0.13, 0.17, 0.16] },
  workshop: { share: 0.04, rooms: ['workshop', 'workshop', 'store'], scale: 1.2, inside: MAT.brick, door: [0.05, 0.14, 0.32, 0.14, 0.19, 0.16] },
  // (Not rolled across the city: Jiefangbei's shopping streets' own, by district below: M6-01. Shut up when the city fell:
  // locked, chained or shuttered, a few doors forced.)
  mall: { share: 0, rooms: ['shop', 'shop', 'restaurant', 'store', 'shop', 'lobby'], scale: 1.35, inside: MAT.tile, door: [0.03, 0.08, 0.4, 0.1, 0.24, 0.15] },
  military: { share: 0.05, rooms: ['barracks', 'armory', 'command', 'barracks'], scale: 1.1, inside: MAT.concrete, door: [0, 0.04, 0.52, 0.04, 0.3, 0.1] },
};

/** A building's type for the run: from a stream of its own (its id and the run's seed), so nothing else moves. */
/** How many of Jiefangbei's enterable buildings are malls (M6-01): shop floors, food courts and stockrooms. */
export const MALLS = { district: 'jiefangbei', share: 0.5 };

export function typeOf(id: number, seed = BUILD.seed, district?: string): BuildingType {
  // (A mall from a stream of its own: the city's other rolls come out as they did.)
  if (district === MALLS.district && rand(makeRng(hashString(`mall:${seed}:${id}`))) < MALLS.share) return 'mall';
  let x = rand(makeRng(hashString(`type:${seed}:${id}`)));
  for (const [t, T] of Object.entries(TYPES) as [BuildingType, (typeof TYPES)[BuildingType]][]) if ((x -= T.share) < 0) return t;
  return 'residential';
}
