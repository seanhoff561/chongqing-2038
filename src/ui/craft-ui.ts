// The workbench's list (M5-15): every recipe, its parts with what he has of each (what he's short of marked), its time,
// and Make on those he can; a bar while it's being made. Opened at a bench, shut with F or Esc or by walking off.
import { binds } from '../input/input';
import type { Game } from '../game';
import { RECIPES } from '../data/recipes';
import { item } from '../data/items';
import { countOf, missing, benchNear } from '../sim/craft';

export class CraftUI {
  readonly el: HTMLDivElement;
  open = false;
  private sig = '';

  constructor(private game: Game) {
    this.el = document.createElement('div');
    this.el.id = 'craft';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);
    this.el.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-make]');
      if (b) game.input.cmds.push({ c: 'act', name: 'craft', arg: b.dataset.make });
    });
    addEventListener('keydown', e => { if (this.open && binds.interact.includes(e.code) && !e.repeat) { this.toggle(false); e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  }

  toggle(on = !this.open) {
    this.open = on;
    this.el.style.display = on ? 'block' : 'none';
    this.game.input.uiOpen = on;
    if (on) document.exitPointerLock?.();
    this.sig = '';
    this.update();
  }

  update() {
    if (!this.open) return;
    const g = this.game, s = g.state;
    if (!benchNear(s, g.world)) { this.toggle(false); return; }
    const task = s.task?.id.startsWith('craft:') ? s.task : null;
    const rows = RECIPES.map(r => {
      const short = missing(s, r), it = item(r.id);
      const parts = r.parts.map(([id, n]) => { const have = countOf(s, id), ok = have >= n; return `<span class="${ok ? '' : 'short'}">${item(id).zh} ${item(id).en} ${Math.min(have, n)}/${n}</span>`; }).join(' + ');
      const doing = task?.id === `craft:${r.id}` ? `<i class="bar"><b style="width:${Math.round((task.t / task.dur) * 100)}%"></b></i>` : '';
      return `<div class="cr-row${short.length ? ' cant' : ''}"><div class="cr-name">${it.zh} <span>${it.en}</span></div><div class="cr-parts">${parts}</div><div class="cr-time">${r.secs} s</div>` +
        (doing || (short.length || task ? '<div class="cr-make"></div>' : `<div class="cr-make" data-make="${r.id}">制作 Make</div>`)) + `</div>`;
    }).join('');
    const html = `<div class="cr-title">工作台 WORKBENCH <span>F 关 close</span></div>${rows}`;
    if (html !== this.sig) { this.el.innerHTML = html; this.sig = html; }
  }
}
