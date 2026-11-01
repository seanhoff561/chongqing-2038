// Wrecks (M4-87, U-065, U-089): where a machine came down, what's left of it can be searched for what's still good in
// it, by its kind: a drone's rotors, radio and camera, a walker's servos and battery, a delivery robot's parcels too.
import type { SimState } from './types';
import type { UnitKind } from '../data/units';
import { UNITS } from '../data/units';
import { extraInters } from './interact';

/** What each kind's wreck gives up (the fixed sensors, up on their posts, none). */
export const SCRAP: Partial<Record<UnitKind, [string, number][]>> = {
  drone: [['rotor', 2], ['radiomod', 1], ['cammod', 1], ['battpack', 1]],
  hunter: [['rotor', 2], ['radiomod', 1], ['cammod', 1], ['battpack', 1]],
  fpv: [['rotor', 1], ['battpack', 1]],
  bomber: [['rotor', 2], ['battpack', 1], ['board', 1]],
  quadruped: [['servo', 2], ['battpack', 1], ['cammod', 1], ['board', 1]],
  humanoid: [['servo', 2], ['battpack', 1], ['thermalmod', 1], ['radiomod', 1]],
  heavy: [['servo', 3], ['carbattery', 1], ['thermalmod', 1], ['board', 1]],
  crawler: [['servo', 1], ['board', 1], ['cammod', 1]],
  delivery: [['battpack', 1], ['board', 1], ['noodles', 2], ['water', 1]],
  carrier: [['battpack', 1], ['servo', 2], ['board', 1]],
  spider: [['servo', 4], ['battpack', 2], ['thermalmod', 1], ['coil', 2]],
  colossus: [['servo', 4], ['carbattery', 1], ['thermalmod', 1], ['coil', 2]],
  heli: [['radiomod', 1], ['battpack', 2], ['board', 2], ['rfamp', 1]],
  turret: [['board', 1], ['cammod', 1]],
};

extraInters.push((s: SimState) => s.units.filter(u => u.dead && u.stop && SCRAP[u.kind]).map(u => ({
  id: `wreck:${u.id}`, kind: 'container', x: u.stop!.x, y: u.stop!.y + 0.3, z: u.stop!.z, r: u.kind === 'spider' || u.kind === 'colossus' || u.kind === 'heli' ? 2 : 0.9,
  zh: `${UNITS[u.kind].zh}残骸`, en: `${UNITS[u.kind].en} wreck`, data: { type: 'crate', items: SCRAP[u.kind] },
})));
