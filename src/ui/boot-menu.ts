// The main menu (M8-11), on a boot into the game itself (a ?scenario= test load goes straight in): Continue (with an
// ironman save), New Run, Settings and Credits, in the game's dim style over the city.
import type { Game } from '../game';
import type { SaveFile } from '../sim/save';
import { clockText } from '../sim/clock';

/** What's credited (CREDITS.md in full). */
const CREDITS = `<div class="bt-h">鸣谢 Credits</div>
  <p>Made in code: geometry, canvas textures and Web Audio synthesis.</p>
  <p>Hand models: WebXR Input Profiles generic-hand (MIT).</p>
  <p>Street speakers' voice: Kokoro-82M-v1.1-zh (Apache-2.0).</p>
  <p>Map data © OpenStreetMap contributors (ODbL). Elevation: SRTM via Terrain Tiles.</p>
  <p>three.js (MIT).</p>`;

export function bootMenu(game: Game, save: SaveFile | null) {
  const el = document.createElement('div');
  el.id = 'boot';
  document.body.appendChild(el);
  game.input.uiOpen = true;
  const close = () => { el.remove(); game.input.uiOpen = false; };
  const back = '<button class="back">返回 Back</button>';
  const menu = () => {
    el.innerHTML = `<div class="bt-title">重庆 2038</div>` +
      (save ? `<button class="cont">继续 Continue · ${clockText(save.savedAt)}</button>` : '') +
      `<button class="new">新的开始 New Run</button><button class="set">设置 Settings</button><button class="cred">鸣谢 Credits</button>`;
    el.querySelector<HTMLButtonElement>('.cont')?.addEventListener('click', () => { game.loadSave(save!); close(); });
    el.querySelector<HTMLButtonElement>('.new')!.onclick = () => { game.newRun(); close(); };
    el.querySelector<HTMLButtonElement>('.set')!.onclick = () => settings();
    el.querySelector<HTMLButtonElement>('.cred')!.onclick = () => { el.innerHTML = `<div class="bt-panel">${CREDITS}</div>${back}`; el.querySelector<HTMLButtonElement>('.back')!.onclick = menu; };
  };
  // (The same panel as Esc in play: U-104.)
  const settings = () => game.settings.show();
  menu();
}
