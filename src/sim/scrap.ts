// Scrap from a downed drone (M4-87, U-065): where a patrol drone or a hunter came down, its wreck can be searched for
// what's still good in it: two rotors, its radio and camera modules, its battery pack.
import type { SimState } from './types';
import { extraInters } from './interact';

const FLYERS = new Set(['drone', 'hunter']);
/** What a wreck gives up. */
export const SCRAP: [string, number][] = [['rotor', 2], ['radiomod', 1], ['cammod', 1], ['battpack', 1]];

extraInters.push((s: SimState) => s.units.filter(u => u.dead && u.stop && FLYERS.has(u.kind)).map(u => ({
  id: `wreck:${u.id}`, kind: 'container', x: u.stop!.x, y: u.stop!.y + 0.2, z: u.stop!.z, r: 0.8, zh: '无人机残骸', en: 'Drone wreck', data: { type: 'crate', items: SCRAP },
})));
