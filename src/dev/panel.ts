// ?dev=1 panel: noclip, god mode, teleports, scenario switch, fps, frame time and draw-call readout, a GPU bench;
// for playtests, a few things to hand, a tag on him, and a raid on the nearest hideout in 5 s (M4-24).
import type { Game } from '../game';
import { scenarios } from '../data/scenarios';
import { clockText } from '../sim/clock';
import { teleport } from '../sim/player';
import { addItem, newUid } from '../sim/inventory';
import { createBody } from '../sim/body';
import { items } from '../data/items';
import { MAGS } from '../data/units';
import { SCALE } from '../sim/clock';
import { PerceptionOverlay } from './perception';

/** The creative picker's kinds, in order (U-088). */
const CATS: Record<string, string> = { weapon: 'Weapons', ammo: 'Ammo', part: 'Attachments & parts', tool: 'Tools', device: 'Devices', throw: 'Throwables', med: 'Medical', food: 'Food', drink: 'Drink', wear: 'Wearables', key: 'Keys', misc: 'Misc' };

export class DevPanel {
  readonly el: HTMLDivElement;
  private stats: HTMLDivElement;
  private extra: HTMLDivElement;
  private lastFrames = 0;
  private lastTime = performance.now();
  readonly sight: PerceptionOverlay;

  constructor(private game: Game) {
    this.sight = new PerceptionOverlay(game);
    const el = (this.el = document.createElement('div'));
    el.id = 'dev';
    el.innerHTML = `<div><b>DEV</b> <span class="seed"></span></div>
      <div class="row stats"></div>
      <div class="row"><button class="bench">bench</button> <span class="benchout"></span></div>
      <div class="row"><label><input type="checkbox" class="noclip"> noclip</label> <label><input type="checkbox" class="god"> god</label> <label><input type="checkbox" class="sight"> perception</label></div>
      <div class="row">teleport <select class="tp"></select></div>
      <div class="row">scenario <select class="sc">${scenarios.map(s => `<option>${s.name}</option>`).join('')}</select></div>
      <div class="row">time <input type="range" class="time" min="0" max="24" step="0.25" style="width:110px"> <span class="clock"></span></div>
      <div class="row">give <button data-give="crowbar">crowbar</button> <button data-give="emp">EMP</button> <button data-give="pistol">pistol</button> <button class="tag">tag me</button> <button class="raid">raid now</button> <button class="heal">heal</button></div>
      <div class="row">item <input class="itemsearch" placeholder="search" style="width:80px"> <select class="anyitem"></select> <button class="giveany">give</button> <button class="giveall">one of each</button></div>
      <div class="row extra"></div>`;
    document.body.appendChild(el);
    this.stats = el.querySelector('.stats')!;
    this.extra = el.querySelector('.extra')!;
    const nc = el.querySelector<HTMLInputElement>('.noclip')!, god = el.querySelector<HTMLInputElement>('.god')!;
    nc.onchange = () => { game.state.flags.noclip = nc.checked; };
    god.onchange = () => { game.state.flags.god = god.checked; };
    // The machines' sight, awareness and alert (M4-30).
    const sight = el.querySelector<HTMLInputElement>('.sight')!;
    sight.onchange = () => this.sight.toggle(sight.checked);
    const sc = el.querySelector<HTMLSelectElement>('.sc')!;
    sc.value = game.scenario.name;
    sc.onchange = () => { location.search = `?dev=1&scenario=${sc.value}&seed=${game.state.seed}`; };
    const time = el.querySelector<HTMLInputElement>('.time')!;
    time.oninput = () => {
      const t = game.state.time;
      game.state.time = Math.floor(t / 86400) * 86400 + Number(time.value) * 3600;
    };
    el.querySelectorAll<HTMLButtonElement>('[data-give]').forEach(b => { b.onclick = () => { const id = b.dataset.give!; addItem(game.state, game.state.inv.pack, id, 1, id === 'pistol' ? { charge: 15 } : {}); b.blur(); }; });
    el.querySelector<HTMLButtonElement>('.tag')!.onclick = () => { game.state.player.tag = true; };
    // Healed at once (U-087): full health, no bleeding, breaks, sickness or tag, fed, watered and rested.
    el.querySelector<HTMLButtonElement>('.heal')!.onclick = e => { Object.assign(game.state.body, createBody(), { satiety: 100, hydration: 100, energy: 100 }); game.state.player.tag = false; (e.target as HTMLButtonElement).blur(); };
    // Creative (U-080): any item in the game into his backpack (a pistol or magazine loaded), or one of each; what
    // doesn't fit lands at his feet.
    // (Sorted by kind, and narrowed as he types in the search box: U-088.)
    const any = el.querySelector<HTMLSelectElement>('.anyitem')!, search = el.querySelector<HTMLInputElement>('.itemsearch')!;
    const list = (q: string) => {
      const m = items.filter(i => !q || `${i.en} ${i.zh} ${i.id}`.toLowerCase().includes(q.toLowerCase()));
      any.innerHTML = Object.entries(CATS).map(([c, label]) => { const of = m.filter(i => i.cat === c); return of.length ? `<optgroup label="${label}">${of.map(i => `<option value="${i.id}">${i.en} · ${i.zh}</option>`).join('')}</optgroup>` : ''; }).join('');
    };
    list('');
    search.oninput = () => list(search.value);
    const give = (id: string) => {
      const extra = id === 'pistol' ? { charge: 15 } : MAGS[id] ? { charge: MAGS[id] } : {};
      if (addItem(game.state, game.state.inv.pack, id, 1, extra) > 0) game.state.dropped.push({ stack: { uid: newUid(game.state), id, n: 1, x: 0, y: 0, rot: false, ...extra }, x: game.state.player.pos.x, y: game.state.player.pos.y, z: game.state.player.pos.z });
    };
    el.querySelector<HTMLButtonElement>('.giveany')!.onclick = e => { give(any.value); (e.target as HTMLButtonElement).blur(); };
    el.querySelector<HTMLButtonElement>('.giveall')!.onclick = e => { for (const i of items) give(i.id); (e.target as HTMLButtonElement).blur(); };
    el.querySelector<HTMLButtonElement>('.raid')!.onclick = () => {
      const p = game.state.player.pos, h = [...game.state.shelters].sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
      if (h) Object.assign(h, { compromised: true, raid: game.state.time + 5 * SCALE, raided: false });
    };
    const bench = el.querySelector<HTMLButtonElement>('.bench')!;
    bench.onclick = () => { bench.blur(); el.querySelector('.benchout')!.textContent = this.bench(); };
    this.fillTeleports();
    setInterval(() => { this.update(); this.sight.update(); }, 500);
    el.addEventListener('keydown', e => e.stopPropagation());
  }

  /** A container other dev tools add rows to. */
  section(): HTMLDivElement { const d = document.createElement('div'); d.className = 'row'; this.extra.appendChild(d); return d; }

  fillTeleports() {
    const tp = this.el.querySelector<HTMLSelectElement>('.tp')!;
    tp.innerHTML = `<option value="">-</option>` + this.game.world.teleports.map((t, i) => `<option value="${i}">${t.name}</option>`).join('');
    tp.onchange = () => {
      const t = this.game.world.teleports[Number(tp.value)];
      if (!t) return;
      teleport(this.game.state.player, t.x, t.y + 0.05, t.z);
      this.game.input.yaw = t.yaw;
      tp.blur();
    };
  }

  /** What this machine can draw, past the display's refresh cap: 60 frames back to back, waiting for the GPU
   *  to finish them (a one-pixel read), as milliseconds a frame and the frame rate that makes. */
  private bench(): string {
    const v = this.game.view, gl = v.renderer.getContext(), px = new Uint8Array(4);
    v.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const t0 = performance.now();
    for (let i = 0; i < 60; i++) v.render(this.game.state.tick / 60, this.game.state.wstate.open);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const ms = (performance.now() - t0) / 60;
    return `${ms.toFixed(1)} ms = ${(1000 / ms).toFixed(0)} fps`;
  }

  private update() {
    const now = performance.now();
    const fps = ((this.game.frames - this.lastFrames) * 1000) / (now - this.lastTime);
    this.lastFrames = this.game.frames; this.lastTime = now;
    const info = this.game.view.renderer.info.render;
    const p = this.game.state.player;
    this.el.querySelector('.seed')!.textContent = `seed ${this.game.state.seed}`;
    this.el.querySelector('.clock')!.textContent = clockText(this.game.state.time);
    const f = this.game.perf;
    this.stats.innerHTML = `${fps.toFixed(0)} fps (${f.frame.toFixed(1)} ms) | sim ${f.sim.toFixed(1)} ms | render ${f.render.toFixed(1)} ms<br>${info.calls} calls | ${(info.triangles / 1000).toFixed(0)}k tris<br>` +
      `pos ${p.pos.x.toFixed(1)} ${p.pos.y.toFixed(1)} ${p.pos.z.toFixed(1)} | ${p.mode}/${p.posture} | grip ${p.endurance.toFixed(0)}`;
  }
}
