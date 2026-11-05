// The main menu (U-104), on a boot into the game itself (a ?scenario= test load goes straight in), everything paused
// under it: 重庆 2038, Continue (with a save: its date and time), New Run, Settings (the Esc panel), Maps and
// the version, which opens the changelog: the README, then the changes (PROGRESS), then the credits, the repository's
// link and that Claude coded it all.
import type { Game } from '../game';
import type { SaveFile } from '../sim/save';
import { clockText } from '../sim/clock';
import { version } from '../../package.json';
import readme from '../../README.md?raw';
import progress from '../../docs/PROGRESS.md?raw';
import credits from '../../CREDITS.md?raw';
import { openEditor } from './editor';

/** The game's repository. */
export const REPO = 'https://github.com/seanhoff561/chongqing-2038';

/** Markdown as the docs use it, to HTML: headings, lists, tables, links, bold and code, paragraphs and line breaks. */
function md(src: string) {
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (t: string) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  const out: string[] = [];
  for (const block of src.replace(/<!--[\s\S]*?-->/g, '').split(/\n\s*\n/)) {
    const lines = block.split('\n').filter(l => l.trim());
    if (!lines.length) continue;
    const h = /^(#{1,4})\s+(.*)$/.exec(lines[0]);
    if (h) { out.push(`<div class="bt-h${h[1].length}">${inline(h[2])}</div>`); lines.shift(); if (!lines.length) continue; }
    if (lines.every(l => /^\s*[-*] /.test(l))) out.push(`<ul>${lines.map(l => `<li>${inline(l.replace(/^\s*[-*] /, ''))}</li>`).join('')}</ul>`);
    else if (lines.every(l => l.trim().startsWith('|'))) out.push(`<table>${lines.filter(l => !/^\|[-| :]+\|$/.test(l.trim())).map(l => `<tr>${l.trim().slice(1, -1).split('|').map(c => `<td>${inline(c.trim())}</td>`).join('')}</tr>`).join('')}</table>`);
    else out.push(`<p>${lines.map(l => inline(l.replace(/\\$/, ''))).join('<br>')}</p>`);
  }
  return out.join('');
}

export function bootMenu(game: Game, save: SaveFile | null) {
  const el = document.createElement('div');
  el.id = 'boot';
  document.body.appendChild(el);
  game.input.uiOpen = true;
  // (Nothing runs under it, the view included: U-104.)
  document.exitPointerLock?.();
  // (Esc from the changelog goes back to the menu.)
  const esc = (e: KeyboardEvent) => { if (e.code === 'Escape' && el.querySelector('.bt-log') && !game.settings.open) { e.preventDefault(); e.stopImmediatePropagation(); menu(); } };
  addEventListener('keydown', esc, true);
  const close = () => { el.remove(); removeEventListener('keydown', esc, true); game.input.uiOpen = false; };
  const menu = () => {
    el.innerHTML = `<div class="bt-title">重庆 2038</div>` +
      (save ? `<button class="cont">继续 Continue · ${clockText(save.savedAt)}</button>` : '') +
      `<button class="new">新的开始 New Run</button><button class="set">设置 Settings</button><button class="maps">地图 Maps</button>` +
      `<button class="ver">v${version}</button>`;
    el.querySelector<HTMLButtonElement>('.cont')?.addEventListener('click', () => { game.loadSave(save!); close(); });
    el.querySelector<HTMLButtonElement>('.new')!.onclick = () => { game.newRun(); close(); };
    // (The same panel as Esc in play: U-104.)
    el.querySelector<HTMLButtonElement>('.set')!.onclick = () => game.settings.show();
    el.querySelector<HTMLButtonElement>('.ver')!.onclick = changelog;
    // (For now straight into the map editor, on the map last edited: M10-32; the maps' list is M10-33's.)
    el.querySelector<HTMLButtonElement>('.maps')!.onclick = () => { close(); openEditor(game); };
  };
  const changelog = () => {
    el.innerHTML = `<div class="bt-panel bt-log"><div class="bt-h1">重庆 2038 · v${version}</div>${md(readme)}${md(progress)}${md(credits)}` +
      `<p class="bt-claude">This game was coded entirely by Claude (Anthropic): <a href="${REPO}" target="_blank" rel="noopener">${REPO}</a></p></div>` +
      `<button class="back">返回 Back</button>`;
    el.querySelector<HTMLButtonElement>('.back')!.onclick = menu;
  };
  menu();
}
