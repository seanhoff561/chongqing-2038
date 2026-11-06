// Anna's auto-map (M5-06, DESIGN section 12): every 10 m cell he's been in, and on which layer of the city: under it
// (tunnels, the underground city, cellars), the street (the ground's own level, give or take a storey), or up (upper
// floors, roofs, walkways). Her Map page draws each layer top-down.
import type { SimState } from './types';
import type { World } from '../world/world';
import { heightAt } from '../world/heightfield';

/** The cell (m), how often (ticks) where he is is noted, how far under the ground (m) is underground and how far over
 *  it is up. */
export const MAP = { cell: 10, every: 15, under: 2.5, up: 6 };
export type Layer = -1 | 0 | 1;
export const LAYERS: { l: Layer; zh: string; en: string }[] = [{ l: 1, zh: '上层', en: 'Up' }, { l: 0, zh: '街道', en: 'Street' }, { l: -1, zh: '地下', en: 'Under' }];

/** The world's underground zones by the 64 m cells they cover (built once a world): a crawler's way asks every metre
 *  along it, so not the whole list of zones each time. */
const UCELL = 64, unders = new WeakMap<World, Map<number, World['zones']>>();
function undersAt(w: World, x: number, z: number) {
  let g = unders.get(w);
  if (!g) {
    g = new Map();
    for (const q of w.zones) if (q.kind === 'under')
      for (let i = Math.floor(q.box.x0 / UCELL); i <= Math.floor(q.box.x1 / UCELL); i++) for (let j = Math.floor(q.box.z0 / UCELL); j <= Math.floor(q.box.z1 / UCELL); j++) {
        const k = i * 65536 + j, a = g.get(k);
        if (a) a.push(q); else g.set(k, [q]);
      }
    unders.set(w, g);
  }
  return g.get(Math.floor(x / UCELL) * 65536 + Math.floor(z / UCELL));
}

/** Which layer (x, y, z) is on. */
export function layerAt(w: World, x: number, y: number, z: number): Layer {
  if (undersAt(w, x, z)?.some(q => x >= q.box.x0 && x <= q.box.x1 && y >= q.box.y0 && y <= q.box.y1 && z >= q.box.z0 && z <= q.box.z1)) return -1;
  const g = w.ground ? heightAt(w.ground, x, z) : null;
  if (g === null) return 0;
  return y < g - MAP.under ? -1 : y > g + MAP.up ? 1 : 0;
}

export const cellKey = (x: number, z: number, l: Layer) => `${Math.floor(x / MAP.cell)},${Math.floor(z / MAP.cell)},${l}`;

/** Each quarter second: the cell he's in, noted. */
export function stepMap(s: SimState, w: World) {
  if (s.tick % MAP.every) return;
  const p = s.player.pos;
  (s.explored ??= {})[cellKey(p.x, p.z, layerAt(w, p.x, p.y, p.z))] = 1;
}
