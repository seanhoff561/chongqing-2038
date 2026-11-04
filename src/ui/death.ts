// Death (U-104): black at once, every sound stopped, what killed him and the run's death count; then he wakes where he
// last slept (a key or a click sooner). A test scene starts over instead. An ending (M7-01): its name and the run's
// summary, the save gone; Esc for the main menu.
import type { Game } from '../game';
import { afterDeath, deleteSave, readSave } from '../sim/save';
import { bootMenu } from './boot-menu';
import { clockText } from '../sim/clock';
import { ENDINGS, summary } from '../sim/escape';

const CAUSES: Record<string, [string, string]> = {
  fall: ['坠落', 'Fell'], bleeding: ['失血', 'Bled out'], drown: ['溺水', 'Drowned'], starvation: ['饥饿', 'Starved'],
  thirst: ['脱水', 'Died of thirst'], shot: ['中弹', 'Shot'],
  found: ['藏身处暴露 睡梦中被杀', 'Found in his sleep: the hideout gave itself away'], test: ['测试', 'Test'],
  turret: ['被炮塔击毙', 'Cut down by a turret'], rifle: ['被步枪击毙', "Shot by a humanoid's rifle"], smg: ['被冲锋枪击毙', 'Shot by a hunter drone'],
  prod: ['被电击棍击倒', 'Shocked by a prod'], river: ['被无人艇截杀', 'Run down by drone boats on the river'], cannon: ['被重型机甲击毙', 'Cut down by a heavy walker'], shock: ['触电', 'Electrocuted'], gas: ['在机房被灭火气体窒息', 'Suffocated by the server hall\'s gas'],
};
/** Seconds the death screen holds before he wakes; seconds it fades off him. */
export const DEATH = { hold: 3, fade: 1.2 };

export class DeathScreen {
  shown = false;
  constructor(private game: Game) {}

  show() {
    if (this.shown) return;
    this.shown = true;
    const g = this.game, s = g.state, run = g.scenario.run;
    const end = s.ended ? ENDINGS[s.ended.route] : null;
    if (run && end) deleteSave(localStorage);
    // (The save to wake at, its death count already one more: written now, so leaving here doesn't undo it.)
    const wake = run && !end ? afterDeath(localStorage, s) : null;
    const [zh, en] = end ? [end.zh, end.en] : CAUSES[s.dead ?? ''] ?? [s.dead ?? '', s.dead ?? ''], sum = summary(s);
    const el = document.createElement('div');
    el.id = 'death';
    el.innerHTML = end
      ? `<div class="d-title out">逃出去了</div><div class="d-sub">${zh} · ${en}</div><div class="d-sum">${clockText(s.time)} · survived ${sum.days} nights · got into ${sum.sites} site${sum.sites === 1 ? '' : 's'} · seen ${sum.seen} time${sum.seen === 1 ? '' : 's'}</div><div class="d-new">Esc · 主菜单 Main menu</div>`
      : `<div class="d-title">你死了</div><div class="d-sub">${zh} · ${en}</div><div class="d-sum">☠ ${wake?.state.deaths ?? (s.deaths ?? 0) + 1}</div>`;
    document.body.appendChild(el);
    g.input.uiOpen = true;
    g.audio.mute(true);
    document.exitPointerLock?.();
    let gone = false;
    const done = () => {
      if (gone) return;
      gone = true;
      removeEventListener('keydown', key, true);
      removeEventListener('mousedown', key, true);
      g.audio.mute(false);
      this.shown = false;
      if (end) { el.remove(); g.input.uiOpen = false; g.switchTo(''); bootMenu(g, readSave(localStorage)); return; }
      // He wakes where he last slept (a test scene starts over), the black fading off him.
      if (wake) g.loadSave(wake); else if (run) g.newRun(); else g.switchTo(g.scenario.name);
      g.input.uiOpen = false;
      g.input.capture();
      el.style.transition = `opacity ${DEATH.fade}s`;
      el.style.opacity = '0';
      setTimeout(() => el.remove(), DEATH.fade * 1000);
    };
    const key = (e: KeyboardEvent | MouseEvent) => {
      if (e instanceof KeyboardEvent && (e.repeat || (end && e.code !== 'Escape'))) return;
      e.preventDefault(); e.stopImmediatePropagation();
      done();
    };
    addEventListener('keydown', key, true);
    if (!end) { addEventListener('mousedown', key, true); setTimeout(done, DEATH.hold * 1000); }
  }
}
