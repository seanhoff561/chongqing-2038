// Wrecks (M4-87, U-065, U-089): where a machine came down, what's left of it, by its kind: a drone's rotors, radio and
// camera, a walker's servos and battery, a delivery robot's parcels too. Salvage (M5-16, DESIGN section 8): a wreck, or a
// machine shut down where it stands, is taken apart with a tool (hold E: a knife or crowbar slowly, a toolbox quicker,
// the grinder quickest and loudest) before what's good in it can be taken.
import type { SimState } from './types';
import type { UnitKind } from '../data/units';
import { UNITS } from '../data/units';
import { extraInters, onInteract } from './interact';
import { openContainer } from './containers';

/** What each kind's wreck gives up (the fixed sensors, up on their posts, none). */
export const SCRAP: Partial<Record<UnitKind, [string, number][]>> = {
  drone: [['rotor', 2], ['radiomod', 1], ['cammod', 1], ['battpack', 1]],
  hunter: [['rotor', 2], ['radiomod', 1], ['cammod', 1], ['battpack', 1]],
  fpv: [['rotor', 1], ['battpack', 1]],
  bomber: [['rotor', 2], ['battpack', 1], ['board', 1]],
  quadruped: [['servo', 2], ['sensorhead', 1], ['powercell', 1]],
  humanoid: [['armour', 1], ['powercell', 1], ['mrifle', 1], ['servo', 1]],
  heavy: [['servo', 3], ['carbattery', 1], ['thermalmod', 1], ['board', 1]],
  crawler: [['servo', 1], ['board', 1], ['cammod', 1]],
  delivery: [['battpack', 1], ['board', 1], ['noodles', 2], ['water', 1]],
  carrier: [['battpack', 1], ['servo', 2], ['board', 1]],
  spider: [['servo', 4], ['battpack', 2], ['thermalmod', 1], ['coil', 2]],
  colossus: [['servo', 4], ['carbattery', 1], ['thermalmod', 1], ['coil', 2]],
  heli: [['radiomod', 1], ['battpack', 2], ['board', 2], ['rfamp', 1]],
  turret: [['board', 1], ['cammod', 1]],
};

/** The tools that take a machine apart, each how fast (1 the slowest) and how loud (m); the seconds it takes by size. */
export const SALVAGE = { tools: { grinder: [3, 40], toolbox: [2, 10], crowbar: [1, 15], knife: [1, 6] } as Record<string, [number, number]>, secs: { small: 6, walker: 14, giant: 30 } };
const GIANT = new Set<UnitKind>(['spider', 'colossus', 'heli', 'heavy']), SMALL = new Set<UnitKind>(['drone', 'hunter', 'fpv', 'bomber', 'crawler', 'turret']);
/** His best tool for it, if any. */
const toolOf = (s: SimState) => Object.keys(SALVAGE.tools).find(id => s.inv.pack.items.some(i => i.id === id));
const wreckOf = (s: SimState, id: string) => s.units.find(u => `wreck:${u.id}` === id);

extraInters.push((s: SimState) => s.units.filter(u => (u.dead || u.shut) && u.stop && SCRAP[u.kind]).map(u => ({
  id: `wreck:${u.id}`, kind: s.wstate.salvaged?.[`wreck:${u.id}`] ? 'container' : 'wreck', x: u.stop!.x, y: u.stop!.y + 0.3, z: u.stop!.z, r: GIANT.has(u.kind) && u.kind !== 'heavy' ? 2 : 0.9,
  zh: `${UNITS[u.kind].zh}残骸`, en: `${UNITS[u.kind].en} wreck`, data: { type: 'crate', items: SCRAP[u.kind] },
})));

onInteract('wreck', {
  can: s => (toolOf(s) ? null : 'needs a tool to take it apart: a knife, a crowbar, a toolbox'),
  dur: (s, it) => { const u = wreckOf(s, it.id), size = !u ? 'walker' : GIANT.has(u.kind) ? 'giant' : SMALL.has(u.kind) ? 'small' : 'walker'; return SALVAGE.secs[size] / SALVAGE.tools[toolOf(s) ?? 'knife'][0]; },
  done: (s, _w, it) => {
    const tool = toolOf(s);
    if (!tool) return;
    (s.wstate.salvaged ??= {})[it.id] = true;
    s.events.push({ t: 'noise', x: it.x, y: it.y, z: it.z, r: SALVAGE.tools[tool][1], kind: 'search' });
    openContainer(s, { ...it, kind: 'container' });
  },
});
