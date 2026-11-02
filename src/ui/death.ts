// Death: the save is gone. A short black screen with the run summary, then a fresh run in place: the city as it
// stands, no reload (U-048). An ending (M7-01) the same: its name, the summary, the save gone.
import type { Game } from '../game';
import { deleteSave, readSave } from '../sim/save';
import { bootMenu } from './boot-menu';
import { clockText } from '../sim/clock';
import { ENDINGS, summary } from '../sim/escape';

const CAUSES: Record<string, [string, string]> = {
  fall: ['坠落', 'Fell'], bleeding: ['失血', 'Bled out'], drown: ['溺水', 'Drowned'], starvation: ['饥饿', 'Starved'],
  thirst: ['脱水', 'Died of thirst'], shot: ['中弹', 'Shot'], raid: ['藏身处被突袭', 'Killed in the raid on his hideout'],
  found: ['藏身处暴露 睡梦中被杀', 'Found in his sleep: the hideout gave itself away'], test: ['测试', 'Test'],
  turret: ['被炮塔击毙', 'Cut down by a turret'], rifle: ['被步枪击毙', "Shot by a humanoid's rifle"], smg: ['被冲锋枪击毙', 'Shot by a hunter drone'],
  prod: ['被电击棍击倒', 'Shocked by a prod'], river: ['被无人艇截杀', 'Run down by drone boats on the river'], cannon: ['被重型机甲击毙', 'Cut down by a heavy walker'], shock: ['触电', 'Electrocuted'], gas: ['在机房被灭火气体窒息', 'Suffocated by the server hall\'s gas'],
};

export class DeathScreen {
  shown = false;
  constructor(private game: Game) {}

  show() {
    if (this.shown) return;
    this.shown = true;
    const s = this.game.state;
    if (this.game.scenario.run) deleteSave(localStorage);
    // (Or out: the run ended on a route, M7-01.)
    const end = s.ended ? ENDINGS[s.ended.route] : null, [zh, en] = end ? [end.zh, end.en] : CAUSES[s.dead ?? ''] ?? [s.dead ?? '', s.dead ?? ''], sum = summary(s);
    const el = document.createElement('div');
    el.id = 'death';
    el.innerHTML = `<div class="d-title${end ? ' out' : ''}">${end ? '逃出去了' : '你死了'}</div><div class="d-sub">${zh} · ${en}</div>
      <div class="d-sum">${clockText(s.time)} · survived ${sum.days} nights · got into ${sum.sites} site${sum.sites === 1 ? '' : 's'} · seen ${sum.seen} time${sum.seen === 1 ? '' : 's'}</div>
      <div class="d-new">Esc · 主菜单 Main menu</div>`;
    document.body.appendChild(el);
    this.game.input.uiOpen = true;
    // Black at once and every sound stopped (U-077); Esc for the main menu (U-098).
    this.game.audio.mute(true);
    document.exitPointerLock?.();
    const key = (e: KeyboardEvent) => {
      if (e.code !== 'Escape' || e.repeat) return;
      e.preventDefault(); e.stopImmediatePropagation();
      removeEventListener('keydown', key, true);
      this.game.switchTo(this.game.scenario.run ? '' : this.game.scenario.name);
      el.remove();
      this.shown = false;
      this.game.audio.mute(false);
      this.game.input.uiOpen = false;
      // A run's death: back to the main menu, the fresh run waiting under it (U-098); a test scene starts over.
      if (this.game.scenario.run) bootMenu(this.game, readSave(localStorage));
      else this.game.input.capture();
    };
    addEventListener('keydown', key, true);
  }
}
