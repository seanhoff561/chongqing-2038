// Anna's auto-map (M5-06, DESIGN section 12): every 10 m cell he's been in, and on which layer of the city: under it
// (tunnels, the underground city, cellars), the street (the ground's own level, give or take a storey), or up (upper
// floors, roofs, walkways). Her Map page draws each layer top-down.
import type { SimState } from './types';
import type { World } from '../world/world';
import { heightAt } from '../world/heightfield';
import { underZone } from './light';

/** The cell (m), how often (ticks) where he is is noted, how far under the ground (m) is underground and how far over
 *  it is up. */
export const MAP = { cell: 10, every: 15, under: 2.5, up: 6 };
export type Layer = -1 | 0 | 1;
export const LAYERS: { l: Layer; zh: string; en: string }[] = [{ l: 1, zh: '上层', en: 'Up' }, { l: 0, zh: '街道', en: 'Street' }, { l: -1, zh: '地下', en: 'Under' }];

/** Which layer (x, y, z) is on. */
export function layerAt(w: World, x: number, y: number, z: number): Layer {
  if (underZone(w, x, y, z)) return -1;
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
