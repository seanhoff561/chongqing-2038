// A scenario's start (src/data/scenarios.ts): the state for its world as it begins, shared by the game and the tests.
import type { Scenario } from '../data/scenarios';
import type { World } from '../world/world';
import type { SimState } from './types';
import { createState } from './sim';
import { startRun, furnish } from './run';
import { beginOpening } from './opening';
import { teleport } from './player';
import { startPursuit } from './pursuit';
import { endRun } from './escape';

export function startScenario(sc: Scenario, w: World, seed: number, worldSeed = seed): SimState {
  const s = createState(seed, w);
  s.worldSeed = worldSeed;
  if (sc.hour !== undefined) s.time = ((sc.day ?? 1) - 1) * 86400 + sc.hour * 3600;
  if (sc.cover !== undefined) Object.assign(s.weather, { cover: sc.cover, at: s.time });
  Object.assign(s.flags, sc.flags);
  // (A run in the start hideout opens with him waking there: M10-52.)
  if (sc.run) { startRun(s, w); beginOpening(s, w); }
  if (sc.furnished) furnish(s, w);
  const sp = sc.spawn ?? w.teleports.find(t => t.name === sc.at);
  if (sp) teleport(s.player, sp.x, sp.y, sp.z);
  s.player.yaw = sp?.yaw ?? w.spawn.yaw;
  if (sc.pursuit) startPursuit(s, w, sc.pursuit);
  // (An ending scenario ends the run as it starts, to play its sequence: M7-15.)
  if (sc.ending) endRun(s, sc.ending);
  return s;
}
