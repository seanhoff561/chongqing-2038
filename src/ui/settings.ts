// Settings (U-104, word for word): Esc in play, or Settings on the main menu, opens one centred panel, and nothing else
// is in it: Menu (last sleep saved), Volume, Sensitivity and the twelve keys (with ?dev=1, the dev UI and crosshair
// toggles too, for filming). Volume, sensitivity and keys are kept in this browser and put back each time.
import type { Game } from '../game';
import { ACTIONS, binds, bindKey, mouseCode } from '../input/input';
import { readSave } from '../sim/save';
import { bootMenu } from './boot-menu';

const KEY = 'cq2038.settings';
/** The mouse's sensitivity, its least and most (radians a pixel). */
const SENS = { min: 0.0004, max: 0.004 };

interface Saved { volume?: number; sensitivity?: number; keys?: Record<string, string[]> }
function load(): Saved { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Saved; } catch { return {}; } }
function save(g: Game) {
  try { localStorage.setItem(KEY, JSON.stringify({ volume: g.audio.volumes.master, sensitivity: g.input.sensitivity, keys: binds } satisfies Saved)); } catch { /* private mode: not kept */ }
}

/** Put back what was saved, at boot. */
export function applySettings(g: Game) {
  const s = load();
  if (s.volume !== undefined) { g.audio.volumes.master = s.volume; g.audio.applyVolumes(); }
  if (s.sensitivity) g.input.sensitivity = s.sensitivity;
  for (const [id, keys] of Object.entries(s.keys ?? {})) if (binds[id] && keys[0]) bindKey(id, keys[0]);
}

/** A key's name as on the keyboard (one for both of a pair: Shift, Ctrl, Alt). */
const name = (code: string) => code.replace(/^Key|^Digit/, '').replace(/^(Shift|Alt|Meta)(Left|Right)$/, '$1').replace(/^Control(Left|Right)$/, 'Ctrl').replace('Left', ' L').replace('Right', ' R');
const names = (codes: string[]) => [...new Set(codes.map(name))].join(' / ');

/** The panel, over the game or the main menu. */
export class Settings {
  open = false;
  private el: HTMLDivElement;
  private openedAt = 0;
  /** filming (U-104): the dev panel and the crosshair hidden */
  devUi = true;
  crosshair = true;

  constructor(private game: Game, private dev: boolean) {
    this.el = document.createElement('div');
    this.el.id = 'settings';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);
    // Capture phase: decide before other menus close themselves on the same Esc.
    addEventListener('keydown', e => this.key(e), true);
    document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement) this.auto(); });
  }

  private key(e: KeyboardEvent) {
    if (e.repeat || e.code !== 'Escape' || this.binding) return;
    this.escAt = performance.now();
    // (A lost pointer lock can open it just before the key arrives: don't reopen-and-close.)
    // (Esc closes whatever menu's up; with none, it opens these: U-104.)
    if (this.open) { if (!this.byLock || performance.now() - this.openedAt > 400) this.hide(); }
    else if (this.game.closeMenu()) { /* closed it */ }
    else if (!this.game.input.uiOpen && !this.game.state.dead) this.show();
    else return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }

  /** The browser let go of the mouse while he was playing (its Esc, which it keeps): that Esc closes the laptop if
   *  it's out (the mouse taken back), else opens these. */
  private auto() {
    // (The same Esc, already handled as a key: it's done its work.)
    if (performance.now() - this.escAt < 400) return;
    if (this.open || this.game.input.uiOpen || this.game.state.dead || !this.game.ticks) return;
    if (this.game.closeMenu()) { this.game.input.capture(); return; }
    this.show(); this.byLock = true;
  }
  /** when an Esc last came as a key */
  private escAt = -1e9;
  /** opened by the browser letting go of the mouse (its own Esc may follow at once) */
  private byLock = false;

  show() {
    this.open = true;
    this.byLock = false;
    this.openedAt = performance.now();
    document.exitPointerLock?.();
    this.render();
    this.el.style.display = 'flex';
  }

  hide() {
    this.open = false;
    this.binding = false;
    this.el.style.display = 'none';
    if (!document.getElementById('boot')) this.game.input.capture();
  }

  private binding = false;
  private render() {
    const g = this.game;
    const slider = (id: string, label: string, v: number, min: number, max: number, step: number) => `<label class="st-slide">${label}<input type="range" data-set="${id}" min="${min}" max="${max}" step="${step}" value="${v}"></label>`;
    const toggle = (id: string, label: string, on: boolean) => `<button class="st-key" data-dev="${id}">${label}<b>${on ? '开 On' : '关 Off'}</b></button>`;
    this.el.innerHTML = `<div class="st-panel"><div class="st-title">设置 SETTINGS</div>` +
      (document.getElementById('boot') ? '' : `<button class="st-menu" data-a="resume">继续 Resume</button>`) +
      `<button class="st-menu" data-a="menu">主菜单 Menu (last sleep saved)</button>` +
      slider('vol', '音量 Volume', g.audio.volumes.master, 0, 1, 0.01) +
      slider('sens', '灵敏度 Sensitivity', g.input.sensitivity, SENS.min, SENS.max, 0.00005) +
      `<div class="st-h">按键 Keys</div>` +
      ACTIONS.map(a => `<button class="st-key" data-bind="${a.id}">${a.label}<b>${names(binds[a.id])}</b></button>`).join('') +
      (this.dev ? toggle('ui', '开发界面 Dev UI', this.devUi) + toggle('cross', '准星 Crosshair', this.crosshair) : '') + `</div>`;
    // (From the main menu itself, it just closes.)
    // (Back to play, the mouse taken back: U-105.)
    const resume = this.el.querySelector<HTMLButtonElement>('[data-a="resume"]');
    if (resume) resume.onclick = () => this.hide();
    this.el.querySelector<HTMLButtonElement>('[data-a="menu"]')!.onclick = () => { const inMenu = !!document.getElementById('boot'); this.hide(); if (!inMenu) bootMenu(g, readSave(localStorage)); };
    this.el.querySelectorAll<HTMLInputElement>('input[data-set]').forEach(i => {
      i.oninput = () => {
        const v = Number(i.value);
        if (i.dataset.set === 'sens') g.input.sensitivity = v; else { g.audio.volumes.master = v; g.audio.applyVolumes(); }
        save(g);
      };
    });
    this.el.querySelectorAll<HTMLButtonElement>('button[data-bind]').forEach(b => {
      b.onclick = e => {
        e.stopPropagation();
        b.querySelector('b')!.textContent = '…';
        this.binding = true;
        // The next key, or mouse button 4 or 5, is its key; Esc leaves it as it was.
        const done = (code: string | null) => {
          removeEventListener('keydown', key, true); removeEventListener('mousedown', mouse, true);
          if (code) { bindKey(b.dataset.bind!, code); save(g); }
          setTimeout(() => { this.binding = false; }, 0);
          this.render();
        };
        const key = (k: KeyboardEvent) => { k.preventDefault(); k.stopImmediatePropagation(); done(k.code === 'Escape' ? null : k.code); };
        const mouse = (m: MouseEvent) => { const c = mouseCode(m.button); if (!c) return; m.preventDefault(); m.stopImmediatePropagation(); done(c); };
        addEventListener('keydown', key, true); addEventListener('mousedown', mouse, true);
      };
    });
    this.el.querySelectorAll<HTMLButtonElement>('button[data-dev]').forEach(b => {
      b.onclick = () => {
        if (b.dataset.dev === 'ui') { this.devUi = !this.devUi; const d = document.getElementById('dev'); if (d) d.style.display = this.devUi ? '' : 'none'; }
        else { this.crosshair = !this.crosshair; g.hud.setCrosshair(this.crosshair); }
        this.render();
      };
    });
  }
}
