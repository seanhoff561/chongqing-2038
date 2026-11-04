// World builders by name, cached. The city's buildings are what they were for a run (M5-35): it's built for the run's
// seed (only the one kept: a new run's city replaces the last); the test scenes are the same every run.
import type { World } from './world';
import { buildGym } from './sets/gym';
import { buildHideoutScene } from './sets/hideout-scene';
import { buildReference } from './sets/reference';
import { buildYuzhong } from './yuzhong';
import { buildLineup } from './sets/lineup';
import { BUILD } from './city/types';

const builders: Record<string, () => World> = { gym: buildGym, hideout: buildHideoutScene, reference: buildReference, yuzhong: buildYuzhong, lineup: buildLineup };
/** Which worlds are built for the run's seed. */
const SEEDED = new Set(['yuzhong']);
const cache = new Map<string, World>();

export function getWorld(name: string, seed = 0): World {
  const key = SEEDED.has(name) ? `${name}:${seed}` : name;
  let w = cache.get(key);
  if (!w) {
    const b = builders[name];
    if (!b) throw new Error(`unknown world ${name}`);
    if (SEEDED.has(name)) { for (const k of [...cache.keys()]) if (k.startsWith(`${name}:`)) cache.delete(k); BUILD.seed = seed; }
    cache.set(key, (w = b()));
  }
  return w;
}

