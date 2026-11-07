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

/** Each teleport that would leave him walled in (its point inside something solid, a landmark's inside what's built
 *  over it; or where he lands, his body from the knees up in a wall: furniture or a kerb he'd step onto is no matter),
 *  moved the least that clears it: to the nearest spot round it
 *  where he fits standing with a way to step off, on the same floor and in sight of it (the same room) within 4 m, or
 *  for a point inside a solid the nearest floor within 15 m. Any other stays where it was put (the places others find
 *  by them, a room's middle, a fitting's foot), and so does one over nothing within 6 m (the water, the air). */
function clearTeleports(w: World) {
  // (Where it's put him: his box clear from a step up off the floor, the ground's slope under it allowed, and clear a
  // step off to one side or another.)
  const H = M.height.stand, S = 0.4, inSolid = (x: number, y: number, z: number) => !free(w.index, x, y, z, 0.05, 0.05);
  const clear = (x: number, f: number, z: number) => free(w.index, x, f + S, z, H - S);
  const stand = (x: number, f: number, z: number) => clear(x, f, z) && [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]].some(([dx, dz]) => clear(x + dx, f, z + dz));
  // (The floor he'd land on dropped from a point: solid or ground, within 6 m.)
  const under = (x: number, y: number, z: number) => {
    const h = raycast(w.index, x, y, z, 0, -1, 0, 6), g = w.ground ? heightAt(w.ground, x, z) : null, f = Math.max(h ? y - h.t : -Infinity, g != null && g <= y && g > y - 6 ? g : -Infinity);
    return f > -Infinity ? f : null;
  };
  for (const t of w.teleports) {
    const walled = inSolid(t.x, t.y, t.z), f0 = walled ? null : under(t.x, t.y, t.z), sight = f0 !== null && !inSolid(t.x, f0 + 1, t.z);
    if (!walled && (f0 === null || free(w.index, t.x, f0 + 1, t.z, H - 1))) continue;
    search: for (let r = 0.25; r <= (walled ? 15 : 4); r += 0.25)
      for (let k = 0, n = Math.ceil(r * 8); k < n; k++)
        for (const dy of walled ? [0, 1, 2, -1, -2] : [0]) {
          const a = (k / n) * Math.PI * 2, x = t.x + cos(a) * r, y = t.y + dy, z = t.z + sin(a) * r;
          if (inSolid(x, y, z)) continue;
          const f = under(x, y, z);
          if (f === null || !stand(x, f, z)) continue;
          if (f0 !== null && (Math.abs(f - f0) > 0.6 || (sight && raycast(w.index, t.x, f0 + 1, t.z, (x - t.x) / r, 0, (z - t.z) / r, r)))) continue;
          Object.assign(t, { x, y: f + (f0 === null ? Math.max(0.05, y - f) : t.y - f0), z });
          break search;
        }
  }
}

/** The map built as 'map' from now on (a copy of it: the editor goes on changing its own). */
export function setMap(doc: MapDoc) {
  mapDoc = JSON.parse(JSON.stringify(doc));
  cache.delete('map');
}
