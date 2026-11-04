// Anna's OS (M10-58, U-105): the laptop's screen as a desktop he knows how to use. A taskbar along the bottom with an
// icon for every app (a mark under those open, a longer one under the one in front) and the tray at its right: the
// battery, the time over the date, the skull and his deaths. Sitting, an icon opens its app in a window (or brings it
// to the front, or tucks it away if it's already in front); a window has a title bar to drag it by, minimise,
// maximise and X; the one clicked last is in front. Standing, the app he's turned to fills the desktop.
import type { Game } from '../game';
import { PAGES } from './lappages';
import { ICONS, battery } from './lapicons';
import { dateText } from '../sim/clock';

/** The desktop above the taskbar (px), the taskbar's height, a new window's size. */
export const DESK = { w: 640, h: 380, bar: 28, winW: 476, winH: 306 };

type Win = { app: string; x: number; y: number; max: boolean; min: boolean; el: HTMLDivElement; content: HTMLDivElement; shown: string };
const div = (cls: string) => { const d = document.createElement('div'); d.className = cls; return d; };

export class Desk {
  /** the desktop (its wallpaper, the windows on it) and the taskbar */
  readonly el = div('lt-desk');
  readonly bar = div('lt-task');
  private tray = div('lt-tray');
  private trayShown = '';
  private icons: Record<string, HTMLButtonElement> = {};
  /** sitting, his windows, back to front */
  wins: Win[] = [];
  /** standing, the one app shown, full */
  private solo: Win;
  private drag: { w: Win; px: number; py: number } | null = null;
  private opened = 0;

  constructor(private game: Game) {
    const apps = div('lt-apps');
    for (const P of PAGES) {
      const b = document.createElement('button');
      b.dataset.app = P.id; b.title = `${P.zh} ${P.en}`; b.innerHTML = ICONS[P.id];
      this.icons[P.id] = b; apps.appendChild(b);
    }
    this.bar.append(apps, this.tray);
    this.solo = this.make('map');
    this.solo.max = true;
    // Sitting, the cursor: a window clicked comes to the front; its title bar drags it.
    this.el.addEventListener('mousedown', e => {
      const el = (e.target as Element).closest<HTMLElement>('.lt-win'), w = this.wins.find(q => q.el === el);
      if (!w || e.button !== 0) return;
      this.raise(w);
      if ((e.target as Element).closest('.lt-title') && !(e.target as Element).closest('button') && !w.max) this.drag = { w, px: e.clientX, py: e.clientY };
    });
    addEventListener('mousemove', e => {
      const d = this.drag;
      if (!d) return;
      const k = DESK.w / Math.max(1, this.el.getBoundingClientRect().width);
      d.w.x = Math.max(-DESK.winW + 60, Math.min(DESK.w - 60, d.w.x + (e.clientX - d.px) * k));
      d.w.y = Math.max(0, Math.min(DESK.h - 22, d.w.y + (e.clientY - d.py) * k));
      d.px = e.clientX; d.py = e.clientY;
    });
    addEventListener('mouseup', () => { this.drag = null; });
  }

  private make(app: string): Win {
    const el = div('lt-win'), content = div('lt-content'), P = PAGES.find(q => q.id === app)!;
    el.innerHTML = `<div class="lt-title">${ICONS[app]}<span>${P.zh} ${P.en}</span><span class="lt-wbtn"><button data-w="min">&#8211;</button><button data-w="max">&#9633;</button><button data-w="close">&#10005;</button></span></div>`;
    el.dataset.win = app; el.appendChild(content); this.el.appendChild(el);
    return { app, x: 0, y: 0, max: false, min: false, el, content, shown: '' };
  }

  /** The window in front, if any. */
  front() { for (let i = this.wins.length - 1; i >= 0; i--) if (!this.wins[i].min) return this.wins[i]; return null; }
  private raise(w: Win) { w.min = false; this.wins = [...this.wins.filter(q => q !== w), w]; }

  /** An app opened, or brought to the front; maximised if he asks (the first sitting down). */
  open(app: string, max = false) {
    let w = this.wins.find(q => q.app === app);
    if (!w) {
      const k = this.opened++ % 6;
      w = this.make(app); w.x = 26 + k * 22; w.y = 12 + k * 16; w.max = max;
    }
    this.raise(w);
  }

  /** A click on the taskbar or a window's buttons; true if it was one. */
  click(t: Element) {
    const b = t.closest<HTMLElement>('[data-app], [data-w]');
    if (!b) return false;
    if (b.dataset.w) {
      const w = this.wins.find(q => q.el === b.closest('.lt-win'));
      if (!w) return true;
      if (b.dataset.w === 'close') { w.el.remove(); this.wins = this.wins.filter(q => q !== w); }
      else if (b.dataset.w === 'min') w.min = true;
      else w.max = !w.max;
      return true;
    }
    const app = b.dataset.app!, w = this.wins.find(q => q.app === app);
    if (w && !w.min && w === this.front()) w.min = true;
    else this.open(app);
    return true;
  }

  /** Every frame: the windows shown (sitting, his; standing, the one app full), their pages, the taskbar and tray. */
  render(sit: boolean, standing: string, page: (app: string, w: Win) => string) {
    if (!sit && this.solo.app !== standing) { this.solo.el.remove(); this.solo = this.make(standing); this.solo.max = true; }
    const shown = sit ? this.wins.filter(w => !w.min) : [this.solo];
    const front = sit ? this.front() : this.solo;
    for (const w of [...this.wins, this.solo]) {
      const on = shown.includes(w);
      w.el.style.display = on ? '' : 'none';
      if (!on) { w.el.classList.remove('front'); continue; }
      const s = w.el.style;
      s.zIndex = String(shown.indexOf(w) + 1);
      if (w.max) { s.left = '0px'; s.top = '0px'; s.width = `${DESK.w}px`; s.height = `${DESK.h}px`; }
      else { s.left = `${w.x}px`; s.top = `${w.y}px`; s.width = `${DESK.winW}px`; s.height = `${DESK.winH}px`; }
      w.el.classList.toggle('max', w.max);
      w.el.classList.toggle('front', w === front);
      const html = page(w.app, w);
      if (html !== w.shown) { w.content.innerHTML = html; w.shown = html; }
    }
    for (const P of PAGES) {
      const w = sit ? this.wins.find(q => q.app === P.id) : P.id === standing ? this.solo : null;
      this.icons[P.id].classList.toggle('open', !!w);
      this.icons[P.id].classList.toggle('front', !!w && w === front);
    }
    const g = this.game, pct = Math.round((g.state.laptop?.charge ?? 0) * 100), d = dateText(g.state.time), i = d.lastIndexOf(' ');
    const tray = `<span class="lt-batt">${battery(pct / 100)}${pct}%</span><span class="lt-clock"><b>${d.slice(i + 1)}</b>${d.slice(0, i)}</span><span class="lt-skull">☠ ${g.state.deaths ?? 0}</span>`;
    if (tray !== this.trayShown) { this.tray.innerHTML = tray; this.trayShown = tray; }
    return { front, shown };
  }

  /** The window showing an app, if it's shown. */
  win(app: string, sit: boolean) { return sit ? this.wins.find(w => w.app === app && !w.min) ?? null : this.solo.app === app ? this.solo : null; }
}
