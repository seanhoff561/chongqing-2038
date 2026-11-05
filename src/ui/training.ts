// The Training Room (M10-34, U-104): sat at the laptop, its Training Room app puts the VR goggles on him. The screen
// fades to black and up into the tutorial map: the maps folder's map named "tutorial" if he has made one, else the
// built-in one. His run is kept aside whole, the very state; Esc's Take off the goggles fades back to it, sat where
// he was. The goggles don't stop the world's clock: the time spent in them passes for him too, his needs with it (as
// sleep passes, sim/sleep.ts); nothing else moves while he's away. Dying in there starts the map over.
import type { Game } from '../game';
import type { SimState } from '../sim/types';
import type { MapDoc } from '../world/sets/usermap';
import { setMap } from '../world/build';
import { passTime } from '../sim/body';
import { listMaps, readMap, tutorialMap } from './mapfiles';

/** Seconds the screen takes to go black, and to come back. */
export const FADE = 0.6;
/** His run kept aside while he trains, the map he's in, and the map's clock when he went in (less any time before a
 *  restart). */
export type Training = { scenario: string; state: SimState; doc: MapDoc; t0: number };

/** The tutorial the Training Room plays: a saved map named "tutorial", else the built-in one. */
export async function trainingMap(): Promise<MapDoc> {
  const mine = (await listMaps()).find(n => n.toLowerCase() === 'tutorial');
  return (mine && (await readMap(mine))) || tutorialMap();
}

let busy = false;
const black = document.createElement('div');
black.id = 'fade';
/** Black over everything (a line on it), or gone; resolves when it's there. */
function fade(on: boolean, text = '') {
  if (!black.isConnected) document.body.appendChild(black);
  black.textContent = text;
  black.style.transition = `opacity ${FADE}s`;
  black.getBoundingClientRect();
  black.style.opacity = on ? '1' : '0';
  return new Promise<void>(r => setTimeout(r, FADE * 1000));
}

/** Into the map from the run: the run kept as it is. */
function start(game: Game, t: Omit<Training, 't0'>, spent = 0) {
  setMap(t.doc);
  game.load('map', Math.floor(Math.random() * 1e9), game.state.worldSeed ?? game.state.seed);
  game.training = { ...t, t0: game.state.time - spent };
  game.input.uiKeys.length = 0;
  game.input.frame();
  // (No longer sat at the laptop: the mouse taken for looking round, not let straight go again.)
  game.input.uiOpen = false;
  game.input.capture();
}

/** The goggles on: black, then the tutorial. */
export async function enterTraining(game: Game) {
  if (busy || game.training || !game.state.laptop?.sit) return;
  busy = true;
  try {
    const keep = { scenario: game.scenario.name, state: game.state };
    const [doc] = await Promise.all([trainingMap(), fade(true, '戴上VR眼镜 · putting on the goggles')]);
    start(game, { ...keep, doc });
  } finally {
    await fade(false);
    busy = false;
  }
}

/** Died in there: the map from its start (the time already spent kept). */
export function restartTraining(game: Game) {
  const t = game.training!;
  start(game, t, game.state.time - t.t0);
  black.style.transition = 'none';
  black.style.opacity = '1';
  fade(false);
}

/** The goggles off: black, then back where he sat, the time he spent in them passed. */
export async function leaveTraining(game: Game) {
  const t = game.training;
  if (busy || !t) return;
  busy = true;
  try {
    await fade(true, '摘下眼镜 · taking off the goggles');
    const spent = Math.max(0, game.state.time - t.t0), s = t.state;
    game.loadSave({ version: 0, scenario: t.scenario, savedAt: s.time, state: s });
    passTime(s, spent / 3600, false);
    s.time += spent;
  } finally {
    await fade(false);
    busy = false;
  }
}
