// The map editor (M10-32, U-104): the map's own world, built by the game as it's edited (the sim paused under it),
// seen from a free camera (ui/editor-view.ts). The palette on the left places a piece where the cursor points (on a
// wall, a wall piece faces out from it); clicking a piece selects it, dragging moves it (along its wall, a wall
// piece), its handles size, lift and turn it; the panel on the right sets its numbers, its material, a sign's text, a
// container's things. R turns, Delete removes, Esc lets go. The bar: the map's name, New, Save (to the maps folder,
// ui/mapfiles.ts; never over the built-in tutorial), Export, Import, Play (the map as a run of its own, from its spawn;
// Esc's Back to the editor returns) and Maps (the main menu's list of them, ui/maps-menu.ts).
import * as THREE from 'three';
import type { Game } from '../game';
import { setMap } from '../world/build';
import { raycast } from '../world/geom';
import { emptyMap, type MapDoc, type Piece } from '../world/sets/usermap';
import { PIECES, GROUPS, MATS, boxOf } from '../world/sets/pieces';
import { items } from '../data/items';
import { loot } from '../data/loot';
import { readSave } from '../sim/save';
import { bootMenu } from './boot-menu';
import { EditView, enterPiece, alongLine, onPlane, toWorld, type Handle, type Ray } from './editor-view';
import { writeMap, exportMap, parseMap, TUTORIAL } from './mapfiles';

/** The map being edited, kept while it's played. */
let current: MapDoc | null = null;
const snap = (v: number, s: number) => Math.round(v / s) * s;
const TURN = Math.PI / 12;
const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Opens the editor on a map: the one given, the one last edited or played, or a new one. */
export function openEditor(game: Game, doc?: MapDoc) { return new Editor(game, doc ?? current ?? emptyMap()); }

/** A map played as a run of its own, from its spawn (Esc's Back to the editor edits it). */
export function playMap(game: Game, doc: MapDoc) {
  current = doc;
  setMap(doc);
  game.load('map', Math.floor(Math.random() * 1e9), game.state.worldSeed ?? game.state.seed);
  // (Keys pressed while editing don't carry into play: the laptop's, a jump.)
  game.input.uiKeys.length = 0;
  game.input.frame();
  game.input.capture();
}

type Drag = { h: Handle | 'move' | 'look'; x: number; y: number; start: Piece; off?: THREE.Vector3; u0?: number; moved?: boolean };

export class Editor {
  readonly el = document.createElement('div');
  private readonly view: EditView;
  private sel = -1;
  private tool = '';
  private placeYaw = 0;
  private ghost: Piece | null = null;
  private drag: Drag | null = null;
  private readonly ws: number;
  private readonly canvas: HTMLCanvasElement;
  private readonly off: (() => void)[] = [];

  constructor(readonly game: Game, public doc: MapDoc) {
    current = doc;
    this.ws = game.state.worldSeed ?? game.state.seed;
    this.canvas = game.view.renderer.domElement;
    this.view = new EditView(game.view.scene);
    this.el.id = 'editor';
    document.body.appendChild(this.el);
    document.body.classList.add('editing');
    document.exitPointerLock?.();
    game.editor = this;
    this.rebuild();
    const sp = this.spawn();
    if (sp) { this.view.pos.set(sp.x, sp.y + 9, sp.z + 16); }
    this.render();
    const on = <K extends keyof WindowEventMap>(t: EventTarget, k: K, f: (e: WindowEventMap[K]) => void, cap = false) => { t.addEventListener(k, f as EventListener, cap); this.off.push(() => t.removeEventListener(k, f as EventListener, cap)); };
    on(this.canvas, 'mousedown', e => this.down(e));
    on(window, 'mousemove', e => this.move(e));
    on(window, 'mouseup', () => this.up());
    on(this.canvas, 'wheel', e => { e.preventDefault(); this.view.dolly(-e.deltaY * 0.02); });
    on(window, 'keydown', e => this.key(e, true));
    on(window, 'keyup', e => this.key(e, false));
  }

  /** Each frame, from the game's render: the camera flown and put on its eye, the ghost and handles drawn. */
  camera(cam: THREE.PerspectiveCamera, dt: number) {
    this.view.fly(cam, dt);
    this.view.show(cam, this.doc.pieces[this.sel] ?? null, this.drag?.moved ? this.doc.pieces[this.sel] : this.ghost, this.spawn());
  }

  private spawn = () => this.doc.pieces.find(p => p.kind === 'spawn');

  /** The map built again as it now stands (the game's world 'map', paused). */
  rebuild() { setMap(this.doc); this.game.load('map', 1, this.ws); }

  close() {
    for (const f of this.off) f();
    this.view.dispose();
    this.el.remove();
    document.body.classList.remove('editing');
    this.game.editor = null;
  }

  play() { this.close(); playMap(this.game, this.doc); }

  // The panels.
  private render() {
    this.el.innerHTML = `<div class="ed-bar"><input class="ed-name" value="${esc(this.doc.name)}" spellcheck="false">` +
      `<button data-a="new">新建 New</button><button data-a="save">保存 Save</button>` +
      `<button data-a="export">导出 Export</button><button data-a="import">导入 Import</button><input type="file" class="ed-file" accept=".json,application/json" hidden>` +
      `<button data-a="play" class="ed-play">试玩 Play</button><button data-a="menu">地图 Maps</button><span class="ed-msg"></span></div>` +
      `<div class="ed-pal">${GROUPS.map(([g, name]) => `<div class="ed-h">${name}</div>` + Object.entries(PIECES).filter(([, d]) => d.group === g).map(([k, d]) => `<button data-k="${k}" title="${d.zh}"${k === this.tool ? ' class="on"' : ''}>${d.en}</button>`).join('')).join('')}</div>` +
      `<div class="ed-insp"></div>` +
      `<div class="ed-help">右键拖动 Right-drag: look · W A S D Q E: fly (Shift fast) · click: place / select · drag: move · handles: size, lift, turn · R: turn · Del: delete · Esc: let go</div>`;
    const q = <T extends HTMLElement>(s: string) => this.el.querySelector<T>(s)!;
    q<HTMLInputElement>('.ed-name').onchange = e => { this.doc.name = (e.target as HTMLInputElement).value.trim() || 'map'; };
    this.el.querySelectorAll<HTMLButtonElement>('.ed-bar button').forEach(b => (b.onclick = () => this.act(b.dataset.a!)));
    this.el.querySelectorAll<HTMLButtonElement>('.ed-pal button').forEach(b => (b.onclick = () => { this.tool = this.tool === b.dataset.k ? '' : b.dataset.k!; this.sel = -1; this.render(); }));
    q<HTMLInputElement>('.ed-file').onchange = async e => {
      const f = (e.target as HTMLInputElement).files?.[0];
      const m = f ? parseMap(await f.text()) : null;
      if (m) this.load(m, 'imported'); else this.say('not a map');
    };
    this.inspector();
  }

  private say(t: string) { this.el.querySelector('.ed-msg')!.textContent = t; }

  private load(m: MapDoc, said: string) { this.doc = current = m; this.sel = -1; this.tool = ''; this.rebuild(); this.render(); this.say(said); }

  private act(a: string) {
    if (a === 'new') this.load(emptyMap(), 'new map');
    else if (a === 'save') {
      if (this.doc.name === TUTORIAL) { this.say('the built-in tutorial stays as it is: rename it to save'); return; }
      writeMap(JSON.parse(JSON.stringify(this.doc))).then(() => this.say('saved'), () => this.say('not saved'));
    }
    else if (a === 'export') exportMap(this.doc);
    else if (a === 'import') this.el.querySelector<HTMLInputElement>('.ed-file')!.click();
    else if (a === 'play') this.play();
    else if (a === 'menu') { this.close(); bootMenu(this.game, readSave(localStorage), true); }
  }

  /** The selected piece's panel: where it is, which way, its sizes; its material, text or things. */
  private inspector() {
    const box = this.el.querySelector<HTMLDivElement>('.ed-insp')!, p = this.doc.pieces[this.sel];
    box.style.display = p ? '' : 'none';
    if (!p) return;
    const d = PIECES[p.kind], axes = d.axes ?? ['宽 W', '高 H', '深 D'];
    const num = (f: string, label: string, v: number, step: number) => `<label>${label}<input type="number" data-f="${f}" step="${step}" value="${+v.toFixed(3)}"></label>`;
    const tables = ['none', ...Object.keys(loot)];
    box.innerHTML = `<div class="ed-h">${d.zh} ${d.en}</div>` + num('x', 'X', p.x, 0.25) + num('y', 'Y', p.y, 0.05) + num('z', 'Z', p.z, 0.25) +
      (d.fixed ? '' : num('yaw', '转 Turn°', (p.yaw * 180) / Math.PI, 15)) +
      (['w', 'h', 'd'] as const).filter(k => d.size?.includes(k)).map(k => num(k, axes['whd'.indexOf(k)], p[k], 0.05)).join('') +
      (d.mat ? `<label>材料 Material<select data-f="mat">${MATS.map(m => `<option${m === (p.mat ?? d.mat) ? ' selected' : ''}>${m}</option>`).join('')}</select></label>` : '') +
      (d.text ? `<label class="ed-text">文字 Text<textarea data-f="text" rows="3">${esc(p.text ?? '')}</textarea></label>` : '') +
      (d.group === 'container' ? `<label>战利品 Loot table<select data-f="loot">${tables.map(t => `<option${t === (p.loot || 'none') ? ' selected' : ''}>${t}</option>`).join('')}</select></label>` +
        `<div class="ed-items">${(p.items ?? []).map(([id, n], i) => `<div>${esc(items.find(it => it.id === id)?.en ?? id)} ×${n}<button data-del="${i}">×</button></div>`).join('')}</div>` +
        `<div class="ed-add"><select class="ed-item">${[...items].sort((a, b) => a.en.localeCompare(b.en)).map(it => `<option value="${it.id}">${esc(it.en)}</option>`).join('')}</select><input type="number" class="ed-n" value="1" min="1"><button data-a="add">+</button></div>` : '') +
      (p.kind === 'spawn' ? '' : `<button data-a="delete" class="ed-del">删除 Delete</button>`);
    box.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[data-f]').forEach(i => (i.onchange = () => {
      const f = i.dataset.f!, v = i.value;
      if (f === 'mat' || f === 'text' || f === 'loot') p[f] = v;
      else if (f === 'yaw') p.yaw = (Number(v) * Math.PI) / 180;
      else if (isFinite(Number(v))) (p as unknown as Record<string, number>)[f] = f === 'w' || f === 'h' || f === 'd' ? Math.max(0.05, Number(v)) : Number(v);
      this.rebuild();
    }));
    box.querySelectorAll<HTMLButtonElement>('[data-del]').forEach(b => (b.onclick = () => { p.items!.splice(Number(b.dataset.del), 1); this.rebuild(); this.inspector(); }));
    const add = box.querySelector<HTMLButtonElement>('[data-a="add"]');
    if (add) add.onclick = () => { (p.items ??= []).push([box.querySelector<HTMLSelectElement>('.ed-item')!.value, Math.max(1, Number(box.querySelector<HTMLInputElement>('.ed-n')!.value) || 1)]); this.rebuild(); this.inspector(); };
    const del = box.querySelector<HTMLButtonElement>('[data-a="delete"]');
    if (del) del.onclick = () => this.remove();
  }

  private select(i: number) { this.sel = i; this.inspector(); }
  private remove() {
    if (this.doc.pieces[this.sel]?.kind === 'spawn' || this.sel < 0) return;
    this.doc.pieces.splice(this.sel, 1);
    this.sel = -1;
    this.rebuild();
    this.inspector();
  }

  // The mouse and keys on the view.
  private ray(e: MouseEvent): Ray { return this.view.rayAt(this.game.view.fp.cam, this.canvas, e.clientX, e.clientY); }

  /** The floor under a point: what's solid below it, or the ground. */
  private floor(x: number, y: number, z: number) { const h = raycast(this.game.world.index, x, y + 0.05, z, 0, -1, 0, 300); return h ? y + 0.05 - h.t : 0; }

  /** A new piece of a kind where the ray points: on what's under the cursor, on a wall facing out from it (a wall
   *  piece), snapped to a quarter-metre grid. */
  private placed(kind: string, r: Ray): Piece | null {
    const d = PIECES[kind], hit = raycast(this.game.world.index, r.o.x, r.o.y, r.o.z, r.d.x, r.d.y, r.d.z, 600);
    const t = hit ? hit.t : r.d.y < -0.01 ? -r.o.y / r.d.y : -1;
    if (t < 0) return null;
    const at = r.o.clone().addScaledVector(r.d, t), n = hit ? new THREE.Vector3(hit.nx, hit.ny, hit.nz) : new THREE.Vector3(0, 1, 0);
    const p: Piece = { kind, x: snap(at.x, 0.25), y: at.y, z: snap(at.z, 0.25), yaw: d.fixed ? 0 : this.placeYaw, w: d.w, h: d.h, d: d.d, ...(d.text ? { text: '注意 Note' } : {}) };
    if (d.on && Math.abs(n.y) < 0.5) {
      Object.assign(p, { x: at.x, z: at.z, yaw: Math.atan2(n.x, n.z), y: snap(at.y, 0.05) });
      if (d.on === 'foot') p.y = this.floor(at.x + n.x * 0.3, at.y, at.z + n.z * 0.3);
    } else if (n.y < 0.5) p.y = this.floor(at.x + n.x * 0.3, at.y, at.z + n.z * 0.3);
    if (kind === 'pool') p.y = 0;
    return p;
  }

  /** The piece under the cursor: of those the ray enters before it meets anything solid, the smallest. */
  private pick(r: Ray): number {
    const hit = raycast(this.game.world.index, r.o.x, r.o.y, r.o.z, r.d.x, r.d.y, r.d.z, 600), far = (hit?.t ?? Infinity) + 0.3;
    let best = -1, bv = Infinity;
    this.doc.pieces.forEach((p, i) => {
      const t = enterPiece(r, p), b = boxOf(p), v = (b[3] - b[0]) * (b[4] - b[1]) * (b[5] - b[2]);
      if (t !== null && t <= far && v < bv) { bv = v; best = i; }
    });
    return best;
  }

  private down(e: MouseEvent) {
    if (e.button === 2) { this.drag = { h: 'look', x: e.clientX, y: e.clientY, start: this.doc.pieces[0] }; return; }
    if (e.button !== 0) return;
    const r = this.ray(e), cam = this.game.view.fp.cam;
    if (this.tool) {
      const p = this.placed(this.tool, r);
      if (!p) return;
      // (One spawn point: placing it moves it.)
      if (p.kind === 'spawn') this.doc.pieces = this.doc.pieces.filter(q => q.kind !== 'spawn');
      this.doc.pieces.push(p);
      if (!e.shiftKey) { this.tool = ''; this.ghost = null; }
      this.rebuild();
      this.render();
      this.select(this.doc.pieces.length - 1);
      return;
    }
    const sel = this.doc.pieces[this.sel], h = sel && this.view.handleAt(cam, r, sel);
    if (sel && h) {
      const a = toWorld(sel, 0, 0, 0), u0 = h === 'lift' ? alongLine(r, a, new THREE.Vector3(0, 1, 0)) : 0;
      this.drag = { h, x: e.clientX, y: e.clientY, start: { ...sel }, u0 };
      return;
    }
    const i = this.pick(r);
    this.select(i);
    if (i < 0) return;
    const p = this.doc.pieces[i], g = this.grabPlane(p), at = onPlane(r, g.a, g.n);
    if (at) this.drag = { h: 'move', x: e.clientX, y: e.clientY, start: { ...p }, off: new THREE.Vector3(p.x, p.y, p.z).sub(at) };
  }

  /** The plane a piece is dragged in: its wall's (a wall piece), or level with its foot. */
  private grabPlane(p: Piece) {
    return { a: new THREE.Vector3(p.x, p.y, p.z), n: PIECES[p.kind].on ? new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw)) : new THREE.Vector3(0, 1, 0) };
  }

  private move(e: MouseEvent) {
    const dr = this.drag;
    if (!dr) {
      if (this.tool && e.target === this.canvas) this.ghost = this.placed(this.tool, this.ray(e));
      return;
    }
    if (dr.h === 'look') {
      this.view.yaw -= (e.clientX - dr.x) * 0.005;
      this.view.pitch = Math.max(-1.5, Math.min(1.5, this.view.pitch - (e.clientY - dr.y) * 0.005));
      dr.x = e.clientX; dr.y = e.clientY;
      return;
    }
    const p = this.doc.pieces[this.sel], s = dr.start, r = this.ray(e);
    if (!p) return;
    dr.moved ||= Math.hypot(e.clientX - dr.x, e.clientY - dr.y) > 3;
    if (!dr.moved) return;
    if (dr.h === 'move') {
      const g = this.grabPlane(s), at = onPlane(r, g.a, g.n);
      if (!at) return;
      at.add(dr.off!);
      if (PIECES[p.kind].on) Object.assign(p, { x: at.x, y: snap(at.y, 0.05), z: at.z });
      else Object.assign(p, { x: snap(at.x, 0.25), z: snap(at.z, 0.25) });
    } else if (dr.h === 'lift') {
      p.y = Math.max(p.kind === 'pool' ? 0 : -3, snap(s.y + alongLine(r, toWorld(s, 0, 0, 0), new THREE.Vector3(0, 1, 0)) - dr.u0!, 0.05));
      if (p.kind === 'pool') p.y = 0;
    } else if (dr.h === 'turn') {
      const at = onPlane(r, new THREE.Vector3(s.x, s.y, s.z), new THREE.Vector3(0, 1, 0));
      if (!at) return;
      const flip = p.kind === 'spawn' ? -1 : 1, yaw = Math.atan2(flip * (at.x - s.x), flip * (at.z - s.z));
      p.yaw = e.altKey ? yaw : snap(yaw, TURN);
    } else {
      // Sizing: the face opposite the handle stays where it was.
      const k = 'whd'.indexOf(dr.h), axis = toWorld(s, k === 0 ? 1 : 0, k === 1 ? 1 : 0, k === 2 ? 1 : 0);
      const a = toWorld(s, 0, 0, 0), e3 = axis.sub(a).normalize(), lo = boxOf(s)[k];
      const size = Math.max(0.05, snap(alongLine(r, a, e3) - lo, 0.05)), key = dr.h as 'w' | 'h' | 'd';
      Object.assign(p, { [key]: size });
      const shift = lo - boxOf(p)[k];
      p.x = s.x + e3.x * shift; p.y = s.y + e3.y * shift; p.z = s.z + e3.z * shift;
    }
  }

  private up() {
    const dr = this.drag;
    this.drag = null;
    if (dr && dr.h !== 'look' && dr.moved) { this.rebuild(); this.inspector(); }
  }

  private key(e: KeyboardEvent, down: boolean) {
    if ((e.target as HTMLElement)?.closest?.('input, textarea, select')) return;
    if (down) this.view.keys.add(e.code); else this.view.keys.delete(e.code);
    if (!down || e.repeat) return;
    const p = this.doc.pieces[this.sel];
    if (e.code === 'Escape') { this.tool = ''; this.ghost = null; this.select(-1); this.render(); }
    else if (e.code === 'KeyR') {
      const by = e.shiftKey ? -TURN : TURN;
      if (this.tool) this.placeYaw += by;
      else if (p && !PIECES[p.kind].fixed) { p.yaw = snap(p.yaw + by, TURN); this.rebuild(); this.inspector(); }
    } else if (e.code === 'Delete' || e.code === 'Backspace') this.remove();
  }
}
