// Settings (U-079): the volumes, the mouse's sensitivity and the keys, kept in this browser and put back each time.
// Shown in the pause menu: a slider each, and each action's key, clicked to bind it to the next key pressed.
import type { Game } from '../game';
import type { Bus } from '../audio/audio';
import { ACTIONS, binds, bindKey, resetKeys } from '../input/input';

const KEY = 'cq2038.settings';
const VOLS: ['master' | Bus, string][] = [['master', '总音量 Master'], ['effects', '音效 Effects'], ['ambience', '环境 Ambience'], ['music', '音乐 Music'], ['voice', '人声 Voice']];
/** The mouse's sensitivity, its least and most. */
const SENS = { min: 0.0006, max: 0.006 };

interface Saved { volumes?: Partial<Record<'master' | Bus, number>>; sensitivity?: number; keys?: Record<string, string[]> }

function load(): Saved { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Saved; } catch { return {}; } }
function save(g: Game) {
  try { localStorage.setItem(KEY, JSON.stringify({ volumes: g.audio.volumes, sensitivity: g.input.sensitivity, keys: binds } satisfies Saved)); } catch { /* private mode: not kept */ }
}

/** Put back what was saved, at boot. */
export function applySettings(g: Game) {
  const s = load();
  Object.assign(g.audio.volumes, s.volumes ?? {});
  g.audio.applyVolumes();
  if (s.sensitivity) g.input.sensitivity = s.sensitivity;
  for (const [id, keys] of Object.entries(s.keys ?? {})) if (binds[id] && keys[0]) bindKey(id, keys[0]);
}

const name = (code: string) => code.replace(/^Key|^Digit/, '').replace('Left', ' L').replace('Right', ' R');

/** The settings' part of the pause menu. */
export function settingsHTML(g: Game): string {
  const slider = (id: string, label: string, v: number, min = 0, max = 1, step = 0.05) => `<label class="pz-slide">${label}<input type="range" data-set="${id}" min="${min}" max="${max}" step="${step}" value="${v}"></label>`;
  return `<div class="pz-h">设置 Settings</div>` + VOLS.map(([b, l]) => slider(b, l, g.audio.volumes[b])).join('') +
    slider('sens', '鼠标灵敏度 Mouse sensitivity', g.input.sensitivity, SENS.min, SENS.max, 0.0002) +
    `<div class="pz-h">按键 Keys</div><div class="pz-binds">${ACTIONS.map(a => `<div><span>${a.label}</span><button data-bind="${a.id}">${binds[a.id].map(name).join(' / ')}</button></div>`).join('')}</div>` +
    `<button data-keys="reset">按键复原 Reset keys</button>`;
}

/** Its sliders and key buttons wired up; `redraw` draws the menu again. */
export function wireSettings(g: Game, el: HTMLElement, redraw: () => void) {
  el.querySelectorAll<HTMLInputElement>('input[data-set]').forEach(i => {
    i.oninput = () => {
      const v = Number(i.value), id = i.dataset.set!;
      if (id === 'sens') g.input.sensitivity = v; else { g.audio.volumes[id as 'master' | Bus] = v; g.audio.applyVolumes(); }
      save(g);
    };
  });
  el.querySelectorAll<HTMLButtonElement>('button[data-bind]').forEach(b => {
    b.onclick = e => {
      e.stopPropagation();
      b.textContent = '按下按键 Press a key…';
      const take = (k: KeyboardEvent) => {
        k.preventDefault(); k.stopImmediatePropagation();
        removeEventListener('keydown', take, true);
        if (k.code !== 'Escape') { bindKey(b.dataset.bind!, k.code); save(g); }
        redraw();
      };
      addEventListener('keydown', take, true);
    };
  });
  const reset = el.querySelector<HTMLButtonElement>('button[data-keys="reset"]');
  if (reset) reset.onclick = e => { e.stopPropagation(); resetKeys(); save(g); redraw(); };
}
