// World builders by name, cached. The city's buildings are what they were for a run (M5-35): it's built for the run's
// seed (only the one kept: a new run's city replaces the last); the test scenes are the same every run.
import type { World } from './world';
import { buildHideoutScene } from './sets/hideout-scene';
import { buildReference } from './sets/reference';
import { buildYuzhong } from './yuzhong';
import { buildLineup } from './sets/lineup';
import { BUILD } from './city/types';
import { buildMap, emptyMap, type MapDoc } from './sets/usermap';
import { raycast } from './geom';
import { heightAt } from './heightfield';
import { sin, cos } from './trig';
import { free } from '../sim/physics';
import { movement as M } from '../data/movement';

/** The editor's map, built as 'map' (M10-32): an empty one until a map is played or edited. */
let mapDoc: MapDoc = emptyMap();
const builders: Record<string, () => World> = { hideout: buildHideoutScene, reference: buildReference, yuzhong: buildYuzhong, lineup: buildLineup, map: () => buildMap(mapDoc) };
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
    clearTeleports(w);
  }
  return w;
}

/** Each teleport whose body would stand in something solid (a landmark's point inside what's built over it, a
 *  fitting's in its fitting), moved to the nearest spot round it he fits standing, with a floor under him within
 *  3 m and a way to step off it: else he'd stand there walled in, unable to move. */
function clearTeleports(w: World) {
  const H = M.height.stand, fits = (x: number, y: number, z: number) => free(w.index, x, y, z, H);
  const floor = (x: number, y: number, z: number) => Math.min(raycast(w.index, x, y + 0.05, z, 0, -1, 0, 3)?.t ?? 9, w.ground ? y - (heightAt(w.ground, x, z) ?? -1e9) : 9) < 3;
  const way = (x: number, y: number, z: number) => [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]].some(([dx, dz]) => fits(x + dx, y + 0.35, z + dz));
  for (const t of w.teleports) {
    if (fits(t.x, t.y, t.z)) continue;
    search: for (let r = 0.25; r <= 15; r += 0.25)
      for (let k = 0, n = Math.ceil(r * 8); k < n; k++)
        for (const dy of [0, 0.5, 1, 1.5, 2, -0.5, -1, -1.5]) {
          const a = (k / n) * Math.PI * 2, x = t.x + cos(a) * r, y = t.y + dy, z = t.z + sin(a) * r;
          if (fits(x, y, z) && floor(x, y, z) && way(x, y, z)) { Object.assign(t, { x, y, z }); break search; }
        }
  }
}

/** The map built as 'map' from now on (a copy of it: the editor goes on changing its own). */
export function setMap(doc: MapDoc) {
  mapDoc = JSON.parse(JSON.stringify(doc));
  cache.delete('map');
}
