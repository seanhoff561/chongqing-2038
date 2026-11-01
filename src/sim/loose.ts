// Things lying loose on rooms' floors (U-085): of the spots the rooms keep for them (world features 'loose:<table>'), each is
// rolled once for the run (its own stream: run seed and spot) as he comes near it; what's there lies about like
// anything dropped, to be picked up.
import type { SimState } from './types';
import type { World, Feature } from '../world/world';
import { loot, LOOSE } from '../data/loot';
import { makeRng, rand, hashString } from './rng';
import { newUid } from './inventory';
import { rollOne } from './loot';

/** The spots in 32 m cells, once a world. */
const CELL = 32, grids = new WeakMap<World, Map<string, Feature[]>>();
function grid(w: World) {
  let g = grids.get(w);
  if (g) return g;
  g = new Map();
  for (const f of w.features) if (f.kind.startsWith('loose:')) { const k = `${Math.floor(f.x / CELL)},${Math.floor(f.z / CELL)}`; (g.get(k) ?? g.set(k, []).get(k)!).push(f); }
  grids.set(w, g);
  return g;
}

/** Twice a second: the spots near him not yet rolled, rolled. */
export function stepLoose(s: SimState, w: World) {
  if (s.tick % 30) return;
  const p = s.player.pos, g = grid(w), done = (s.wstate.loose ??= {}), cx = Math.floor(p.x / CELL), cz = Math.floor(p.z / CELL);
  for (let i = cx - 1; i <= cx + 1; i++) for (let j = cz - 1; j <= cz + 1; j++) for (const f of g.get(`${i},${j}`) ?? []) {
    const id = `${f.x.toFixed(1)},${f.y.toFixed(1)},${f.z.toFixed(1)}`;
    if (done[id] || Math.hypot(f.x - p.x, f.z - p.z) > LOOSE.near) continue;
    done[id] = true;
    const r = makeRng(hashString(`${s.seed}:loose:${id}`)), t = loot[f.kind.slice(6)];
    if (!t || rand(r) >= LOOSE.chance) continue;
    const [item, n, extra] = rollOne(s, r, t);
    s.dropped.push({ stack: { uid: newUid(s), id: item, n, x: 0, y: 0, rot: false, ...extra }, x: f.x, y: f.y, z: f.z, loose: true });
  }
}
