// What he can make at a workbench (M5-15, DESIGN section 8): realistic in spirit, abstract in detail; parts, not
// instructions. Weapons and explosives are found, never made. Each: what it makes, its parts, the real seconds it takes
// at the bench, (picks) the uses it comes with, and whether it's soldered (the bench's hideout needs power: M5-27).
export interface Recipe { id: string; parts: [string, number][]; secs: number; charge?: number; /** electronics: soldered, so the bench needs power (M5-27) */ power?: boolean }

export const RECIPES: Recipe[] = [
  { id: 'bandage', parts: [['cloth', 1], ['alcohol', 1]], secs: 4 },
  { id: 'splint', parts: [['rods', 2], ['tape', 1]], secs: 6 },
  { id: 'picks', parts: [['hairpins', 2]], secs: 4, charge: 3 },
  { id: 'battpack', parts: [['scootercells', 1], ['tape', 1]], secs: 10 },
  { id: 'grapple', parts: [['hook', 1], ['rope', 1]], secs: 10 },
  { id: 'trolley', parts: [['pulley', 1], ['carabiner', 2], ['harness', 1]], secs: 10 },
  { id: 'cameratap', power: true, parts: [['board', 1], ['cable', 1], ['clips', 1]], secs: 15 },
  { id: 'cloner', power: true, parts: [['rfid', 1], ['board', 1], ['battpack', 1]], secs: 20 },
  { id: 'dronectl', power: true, parts: [['board', 1], ['radiomod', 1], ['battpack', 1]], secs: 20 },
  // (A drone rebuilt from what the patrol drones he's brought down give up: D-120.)
  { id: 'drone', power: true, parts: [['rotor', 4], ['radiomod', 1], ['cammod', 1], ['battpack', 1], ['board', 1]], secs: 45 },
  { id: 'jammer', power: true, parts: [['sdr', 1], ['rfamp', 1], ['battpack', 1], ['board', 1]], secs: 30 },
  { id: 'emp', power: true, parts: [['capbank', 1], ['coil', 1], ['battpack', 1], ['trigger', 1]], secs: 30 },
];
export const recipe = (id: string) => RECIPES.find(r => r.id === id);
