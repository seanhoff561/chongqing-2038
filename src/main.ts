import './style.css';
import { Game } from './game';
import { GFX } from './render/view';
import { unitPose } from './sim/units';
import { scenarios, scenarioByName } from './data/scenarios';
import { DevPanel } from './dev/panel';
import { applySettings } from './ui/settings';
import { addItem } from './sim/inventory';
import { readSave, writeSave, setAside } from './sim/save';
import { bootMenu } from './ui/boot-menu';
import { die } from './sim/body';
import { CALIB } from './render/hands3d';
import { playMove, MOVE_SOUNDS } from './audio/moves';
import { playStep, type Surface } from './audio/steps';
import { getWorld } from './world/build';

// The loading screen (U-048): painted before the city is built, each stage named as it starts.
const loading = document.getElementById('loading');
const stage = (text: string) => {
  const el = loading?.querySelector('.ld-step');
  if (el) el.textContent = text;
  return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
};

const q = new URLSearchParams(location.search);
const dev = q.get('dev') === '1';
// (A saved run's city is built for its seed from the start, so Continue doesn't build it twice: M5-35.)
const saved = q.get('scenario') ? null : readSave(localStorage);
const seed = Number(q.get('seed')) || saved?.state.seed || Math.floor(Math.random() * 1e9);
const sc = scenarioByName(q.get('scenario') ?? 'run');
// (Each stage's end, in ms since the page opened, for the boot's budget: tests/e2e/inplace.e2e.mjs.)
const boot = { world: 0, view: 0, ready: 0 };
await stage('建造城市 · Building the city');
if (sc) getWorld(sc.world, seed);
boot.world = performance.now();
await stage('铺设街道 · Raising the streets');
const game = new Game({ scenario: q.get('scenario') ?? 'run', seed, dev });
boot.view = performance.now();
// The player's settings put back: volumes, sensitivity, keys (U-079).
applySettings(game);
if (dev) new DevPanel(game);
// The main menu on a boot into the game itself (M8-11); a test's ?scenario= load goes straight in.
if (!q.get('scenario')) bootMenu(game, saved);
// (A save that couldn't be read, set aside: said so, M9-05.)
if (setAside) game.hud.notice(`your last save couldn't be read (${setAside}): set aside`);
game.start();
// Ctrl+W (crouching forward) would close the tab: while he plays, the browser asks first (U-059: no forced fullscreen).
addEventListener('beforeunload', e => { if (document.pointerLockElement && !game.state.dead) e.preventDefault(); });
// (Gone once the first frame is drawn.)
requestAnimationFrame(() => requestAnimationFrame(() => { loading?.remove(); boot.ready = performance.now(); }));

(window as unknown as { __cq: unknown }).__cq = {
  ready: true,
  game,
  boot,
  scenarios: scenarios.map(s => s.name),
  runFrames: (n: number) => game.runFrames(n),
  player: () => game.state.player,
  calib: CALIB,
  kill: (cause = 'test') => die(game.state, cause),
  cues: () => Object.keys(MOVE_SOUNDS),
  playCue: (id: string, surf?: Surface, wet = false) => (surf ? playStep(game.audio, id, surf, wet) : playMove(game.audio, id)),
  give: (id: string, n = 1) => addItem(game.state, game.state.inv.pack, id, n),
  save: () => writeSave(localStorage, game.scenario.name, game.state),
  unitPose,
  gfx: GFX,
};
