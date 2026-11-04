// The sleep menu (U-104): each choice says how long he'll sleep and the time he'll wake; the key that opened it
// (Interact at a bed, Sleep Rough on the ground) or Esc leaves it. Sleeping skips time; waking saves the run.
import type { Game } from '../game';
import { binds } from '../input/input';
import { nextHour } from '../sim/clock';

/** The hours he can wake at. */
const TIMES = [6, 8, 12, 15, 18, 21, 0, 3];

/** How long he'll sleep (game seconds) waking at hour h from game time t: until its next turn (as the sim does). */
const sleepFor = (t: number, h: number) => nextHour(t, h) - t;

export class SleepUI {
  readonly el: HTMLDivElement;
  open = false;
  /** the action whose key opened it, and whether that key's been let go since */
  private by = 'interact';
  private released = true;
  private down = new Set<string>();

  constructor(private game: Game) {
    this.el = document.createElement('div');
    this.el.id = 'sleep';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);
    // (Capture phase, so its keys don't also reach the game. The key that opened it, held for a rough sleep, closes it
    // only once it's been let go: U-021.)
    addEventListener('keyup', e => { this.down.delete(e.code); if (binds[this.by]?.includes(e.code)) this.released = true; }, true);
    addEventListener('keydown', e => {
      if (!this.open) { this.down.add(e.code); return; }
      const m = /^Digit([1-8])$/.exec(e.code), mine = binds[this.by]?.includes(e.code);
      if (m) this.choose(TIMES[Number(m[1]) - 1]);
      else if (mine && (e.repeat || !this.released)) { /* still the opening press */ }
      else if (mine) this.toggle(false);
      else return;
      e.preventDefault();
      e.stopImmediatePropagation();
    }, true);
  }

  toggle(on: boolean, rough = false) {
    if (on && !this.open) { this.by = rough ? 'sleep' : 'interact'; this.released = !binds[this.by].some(k => this.down.has(k)); }
    this.open = on;
    this.game.input.uiOpen = on;
    if (on) document.exitPointerLock?.();
    this.el.style.display = on ? 'block' : 'none';
    if (!on) return;
    const t = this.game.state.time;
    const rows = TIMES.map((h, i) => ({ h, i, s: sleepFor(t, h) })).sort((a, b) => a.s - b.s);
    this.el.innerHTML = `<div class="sl-title">${rough ? '露宿 SLEEP ROUGH' : '睡觉 SLEEP'}</div>` +
      rows.map(({ h, i, s }) => {
        const H = Math.floor(s / 3600), M = Math.round((s % 3600) / 60);
        return `<button data-h="${h}">${i + 1}  ${H} h${M ? ` ${M} min` : ''} · ${String(h).padStart(2, '0')}:00</button>`;
      }).join('');
    this.el.querySelectorAll<HTMLButtonElement>('button[data-h]').forEach(b => { b.onclick = () => this.choose(Number(b.dataset.h)); });
  }

  private choose(h: number) {
    this.game.input.cmds.push({ c: 'act', name: 'sleep', arg: h });
    this.toggle(false);
  }
}
