// The deterministic simulation: one plain state object advanced at a fixed 60 Hz.
import { makeRng, hashString } from './rng';
import { createPlayer } from './player';
import type { InputFrame, SimState } from './types';
import type { World } from '../world/world';
import { stepPlayer } from './move';
import { GAME_PER_TICK } from './clock';
import { stepLamp } from './headlamp';
import { createBody, stepBody } from './body';
import { checkCollapse } from './sleep';
import { grid } from './inventory';
import { applyCmds } from './commands';
import { stepHeld } from './use';
import { stepInteract, allInters } from './interact';
import { stepWeather } from './weather';
import { stepGas } from './gas';
import { stepHv } from './hv';
import { stepContainers } from './containers';
import './loot';
import { syncWorld } from './doors';
import './food';
import './shelter';
import './drops';
import './grate';
import './sinks';
import './scrap';
import { survival } from '../data/survival';
import { createUnits } from './units';
import { stepSight, stepHearing } from './perception';
import { stepAlert } from './alert';
import { stepFire } from './fire';
import { stepDistricts } from './district';
import { stepConverge } from './converge';
import { stepHeli } from './heli';
import { stepPa } from './announce';
import { stepLoose } from './loose';
import { stepLaptop } from './laptop';
import { stepScan } from './scan';
import { stepMap } from './automap';
import { stepBinos } from './binoculars';
import { stepSdr } from './sdr';
import './camtap';
import './boat';
import './pry';
import './water';
import './backpack';
import './fence';
import { stepFlight, stillWhileFlying } from './flight';
import { stepJam } from './jammer';
import { stepTraps } from './emp';
import { stepCraft } from './craft';
import { stepGuns } from './guns';
import { stepThrown } from './throw';
import { stepRopes } from './grapple';
import { stepRappel } from './rappel';
import { stepPlanks } from './ladder';
import { stepPower } from './power';
import { stepRemarks } from './remarks';
import { stepKitLines } from './zipkit';
import { stepRiver } from './river';
import { stepEscape } from './escape';
import { stepBeats } from './beats';
import { stepSearch } from './search';
import { stepSilent } from './silent';
import { stepMelee } from './melee';
import { stepChangeover } from './changeover';
import { stepBreaks } from './breaks';
import { stepStrike } from './strike';
import { stepRockets } from './rockets';
import { stepGun } from './pistol';
import { stepTag, stepTrack } from './tag';
import { stepRaid } from './raid';
import { stepTreat } from './meds';

/** Saves of another version are dropped: 9 since the hive remembers where it saw him (M4-04); 8 since the machines
 *  walk their beats (M4-01). */
export const STATE_VERSION = 16;

export function createState(seed: number, world: World): SimState {
  const s = world.spawn;
  const state: SimState = {
    version: STATE_VERSION,
    seed,
    rng: makeRng(seed),
    tick: 0,
    time: survival.startHour * 3600,
    player: createPlayer(s.x, s.y, s.z, s.yaw),
    body: createBody(),
    inv: { pack: grid(8, 6), hotbar: [null, null, null, null, null], held: 0 },
    containers: {},
    nextUid: 0,
    shelters: [],
    placed: [],
    dropped: [],
    units: createUnits(seed, world),
    hive: { seen: [], districts: {}, silent: [] },
    openContainer: null,
    target: null,
    task: null,
    wstate: { searched: {}, open: {}, gone: {} },
    dead: null,
    events: [],
    flags: { god: false, noclip: false, rain: 0 },
    weather: { fog: 0, rain: 0 },
  };
  syncWorld(state, world);
  return state;
}

export function step(state: SimState, world: World, raw: InputFrame): void {
  state.events.length = 0;
  // (Flying the drone, M5-11: his body takes none of his input.)
  const input = stillWhileFlying(state, raw);
  applyCmds(state, world, input.cmds);
  stepRopes(state);
  stepRappel(state, input);
  stepPlanks(state, world);
  stepInteract(state, world, input);
  stepPlayer(state, world, input);
  stepSight(state, world);
  stepAlert(state, world);
  stepChangeover(state, world);
  stepBreaks(state, world);
  stepStrike(state, world);
  stepRockets(state, world);
  stepThrown(state, world);
  stepJam(state, world);
  stepTraps(state, world);
  stepGas(state, world);
  stepHv(state, world);
  stepSilent(state, world);
  stepDistricts(state, world);
  stepPa(state, world);
  stepLoose(state, world);
  stepLaptop(state);
  stepPower(state);
  stepScan(state, world);
  stepMap(state, world);
  stepBinos(state, world, input);
  stepSdr(state);
  stepFlight(state, world, raw);
  stepConverge(state, world);
  stepHeli(state, world);
  stepSearch(state, world);
  stepFire(state, world);
  stepHeld(state, world, input);
  stepMelee(state, world, input);
  stepGun(state, input);
  stepGuns(state, input);
  stepTag(state);
  stepCraft(state, world);
  stepTreat(state);
  stepTrack(state);
  stepRaid(state, world);
  stepLamp(state, input);
  if (state.openContainer) stepContainers(state, { inter: allInters(state, world) });
  // (Last of the noisemakers, so the machines hear all this tick's noises: his, a turret's, a dropped tin's.)
  stepHearing(state, world);
  stepWeather(state);
  stepBody(state);
  stepRemarks(state);
  stepKitLines(state, world);
  stepRiver(state, world);
  stepEscape(state, world);
  stepBeats(state, world);
  checkCollapse(state);
  state.tick++;
  state.time += GAME_PER_TICK;
}

/** Hash of the whole state, for determinism checks. */
export function stateHash(state: SimState): number {
  return hashString(JSON.stringify(state));
}
