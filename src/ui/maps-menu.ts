// The main menu's Maps (M10-33, U-104): the built-in tutorial first, then the maps in the maps folder (the desktop
// game's; in the browser, its saved maps). A click selects one to edit, copy or delete (twice, to be sure); a double
// click plays it; New makes one in the editor. The tutorial is played and copied, never edited in place or deleted.
import type { Game } from '../game';
import { emptyMap } from '../world/sets/usermap';
import { openEditor, playMap } from './editor';
import { TUTORIAL, tutorialMap, listMaps, readMap, writeMap, removeMap } from './mapfiles';

const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** The list in the menu's own element; close() takes the menu down, back() returns to its first page. */
export async function mapsMenu(game: Game, el: HTMLElement, close: () => void, back: () => void, sel = TUTORIAL) {
  const names = await listMaps();
  if (!el.isConnected) return;
  if (sel !== TUTORIAL && !names.includes(sel)) sel = TUTORIAL;
  el.innerHTML = `<div class="bt-title">地图 MAPS</div><div class="bt-panel bt-maps">` +
    [TUTORIAL, ...names].map((n, i) => `<div class="bt-map${n === sel ? ' sel' : ''}" data-i="${i}">${esc(n)}${i ? '' : '<span>内置 built in</span>'}</div>`).join('') +
    `</div><div class="bt-hint">单击选择 click: select · 双击试玩 double click: play</div><div class="bt-row">` +
    `<button data-a="new">新建 New</button><button data-a="edit">编辑 Edit</button><button data-a="copy">复制 Copy</button><button data-a="delete">删除 Delete</button>` +
    `</div>${window.desktop ? '<button data-a="folder">打开文件夹 Open the maps folder</button>' : ''}<button data-a="back">返回 Back</button>`;
  const all = [TUTORIAL, ...names];
  const btn = (a: string) => el.querySelector<HTMLButtonElement>(`[data-a="${a}"]`)!;
  const read = (n: string) => (n === TUTORIAL ? Promise.resolve(tutorialMap()) : readMap(n));
  const pick = (n: string) => {
    sel = n;
    el.querySelectorAll('.bt-map').forEach(r => r.classList.toggle('sel', all[Number((r as HTMLElement).dataset.i)] === n));
    btn('edit').disabled = btn('delete').disabled = n === TUTORIAL;
    btn('delete').classList.remove('sure'); btn('delete').textContent = '删除 Delete';
  };
  pick(sel);
  el.querySelectorAll<HTMLElement>('.bt-map').forEach(r => {
    const n = all[Number(r.dataset.i)];
    r.onclick = () => pick(n);
    r.ondblclick = async () => { const m = await read(n); if (m) { close(); playMap(game, m); } };
  });
  btn('new').onclick = () => { close(); openEditor(game, emptyMap()); };
  btn('edit').onclick = async () => { const m = await readMap(sel); if (m) { close(); openEditor(game, m); } };
  btn('copy').onclick = async () => {
    const m = await read(sel);
    if (!m) return;
    const base = `${sel.replace(/^教程 /, '')} copy`;
    let name = base;
    for (let k = 2; all.includes(name); k++) name = `${base} ${k}`;
    await writeMap({ ...m, name });
    mapsMenu(game, el, close, back, name);
  };
  // (Deleting asks once more: a second click on it.)
  btn('delete').onclick = async () => {
    const b = btn('delete');
    if (!b.classList.contains('sure')) { b.classList.add('sure'); b.textContent = '确定删除？ Sure? Click again'; return; }
    await removeMap(sel);
    mapsMenu(game, el, close, back);
  };
  el.querySelector<HTMLButtonElement>('[data-a="folder"]')?.addEventListener('click', () => window.desktop?.folder('maps'));
  btn('back').onclick = back;
}
