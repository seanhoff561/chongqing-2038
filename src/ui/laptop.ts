// The laptop's screen (U-104, DESIGN section 11): the page lies on the glass of the laptop he holds up in both hands
// (render/laptop3d.ts), the game going on round it. Ice blue on near-black, minimal. The corner: the battery, the date
// and time, a skull and his deaths. Standing, the lean keys turn Map, Status, Scan and Notes; nothing says how. Sat
// down at it (Q, M10-13) the mouse is a cursor on the screen and the nine dots open a launcher of every tab; a tab he
// can't use yet says what it needs.
import * as THREE from 'three';
import type { Game } from '../game';
import { dateText } from '../sim/clock';
import { night } from '../render/materials';
import { MapTools } from './maptools';
import { Feed } from './feeds';
import { FLIGHT } from '../sim/flight';
import { heightAt } from '../world/heightfield';
import { PAGES, camList } from './lappages';

/** The page's own size (CSS pixels), scaled onto the screen's glass. */
export const SCREEN = { w: 640, h: 408 };
/** The pages he turns through standing. */
const STANDING = PAGES.filter(p => p.standing);

export class LaptopUI {
  readonly root: HTMLDivElement;
  /** its top bar (the page's name; the corner) and the page, each redrawn only when it changes */
  private bar = document.createElement('div');
  private body = document.createElement('div');
  private shown = '';
  private barShown = '';
  /** which page: an index into PAGES */
  page = 0;
  /** The screen's glow on what's round him, after dark: ice blue (U-104). */
  private glow = new THREE.PointLight(0xbfe6f5, 0, 3, 2);
  /** The Map page's canvas and its tools (M10-14), kept across redraws of the page. */
  readonly map: MapTools;
  private frame = 0;
  /** The Cams page's feed, and which tapped camera it shows. */
  private feed = new Feed();
  cam = 0;
  /** Sitting: the launcher's up; and whether he was sat down last frame. */
  launcher = false;
  private sat = false;

  constructor(private game: Game) {
    this.root = document.createElement('div');
    this.root.id = 'laptop';
    this.root.style.display = 'none';
    this.root.style.width = `${SCREEN.w}px`; this.root.style.height = `${SCREEN.h}px`;
    this.bar.className = 'lt-bar'; this.body.className = 'lt-body';
    this.root.append(this.bar, this.body);
    document.body.appendChild(this.root);
    this.map = new MapTools(game);
    this.flying.id = 'dronehud'; this.flying.style.display = 'none'; document.body.appendChild(this.flying);
    this.glow.position.set(0, -0.25, -0.45);
    game.view.fp.cam.add(this.glow);
    // (Sitting, the cursor: the nine dots, and a tab in the launcher.)
    this.root.addEventListener('click', e => {
      const t = (e.target as Element).closest<HTMLElement>('.lt-dots, [data-tab], [data-tool]');
      if (!t) return;
      if (t.dataset.tool) this.map.tool = t.dataset.tool;
      else if (t.dataset.tab) { this.page = PAGES.findIndex(q => q.id === t.dataset.tab); this.launcher = false; }
      else this.launcher = !this.launcher;
    });
  }

  /** Sat down or up (M10-13): the mouse let go to be a cursor on the screen, or taken back to look round; standing,
   *  only the four pages. */
  private seat(sit: boolean) {
    this.sat = sit; this.launcher = false; this.map.seat(sit);
    if (sit) document.exitPointerLock?.();
    else { this.game.input.capture(); if (!PAGES[this.page].standing) this.page = 0; }
  }

  /** Her Scan page, when a scan's done. */
  showScan() { this.page = PAGES.findIndex(q => q.id === 'scan'); }

  /** ↑ ↓ and Enter on a page: on the Cams page the next tapped camera (+1) or the last (-1), and Enter (0) loops the
   *  one shown; on the Drone page Enter launches it (M5-11). */
  pageKey(by: number) {
    const id = PAGES[this.page].id, taps = camList(this.game);
    if (id === 'drone' && !by && !PAGES[this.page].needs?.(this.game)) { this.game.input.cmds.push({ c: 'act', name: 'launch' }); return; }
    if (id !== 'cams' || !taps.length) return;
    this.cam = Math.min(this.cam, taps.length - 1);
    if (by) this.cam = (this.cam + by + taps.length) % taps.length;
    else this.game.input.cmds.push({ c: 'act', name: 'loop', arg: taps[this.cam] });
  }

  /** Standing, the next page of the four (+1) or the last (-1), round. */
  turn(by: number) {
    const i = STANDING.indexOf(PAGES[this.page]), n = STANDING.length;
    this.page = PAGES.indexOf(STANDING[(((i < 0 ? 0 : i) + by) % n + n) % n]);
  }

  /** Flying the drone (M5-11): its battery, its height, whether it's being watched. */
  private flying = document.createElement('div');
  private flyShown = '';
  private flyHud() {
    const g = this.game, f = g.state.flight;
    const d = g.state.inv.pack.items.find(i => i.id === 'drone'), gy = f && g.world.ground ? heightAt(g.world.ground, f.x, f.z) : null;
    const html = f ? `无人机 DRONE · 电量 ${Math.round(d?.charge ?? 0)}% · 高 ${Math.round(f.y - (gy ?? g.state.player.pos.y))} m${f.seen > 0 ? ' · <b>被盯上 SPOTTED</b>' : ''} · ${Math.round((d?.charge ?? 0) / 100 * FLIGHT.battery / 60)} min` : '';
    if (html === this.flyShown) return;
    this.flyShown = html; this.flying.innerHTML = html; this.flying.style.display = f ? 'block' : 'none';
  }

  /** Every frame: on the glass while it's out, its corner and page kept up to date. */
  update() {
    this.flyHud();
    const g = this.game, L = g.state.laptop, open = !!L?.open && !g.state.flight, sit = open && !!L?.sit;
    if (sit !== this.sat) this.seat(sit);
    this.root.classList.toggle('sit', sit);
    this.glow.intensity = open ? 1.4 * night.k : 0;
    const r = open ? g.laptop3d.rect(g.view.fp.cam, innerWidth, innerHeight) : null;
    if (!r) { if (this.root.style.display !== 'none') { this.root.style.display = 'none'; this.shown = this.barShown = ''; } return; }
    this.root.style.display = 'block';
    // (The page scaled onto the glass, wherever his hands hold it.)
    this.root.style.transform = `translate(${r.x.toFixed(1)}px, ${r.y.toFixed(1)}px) scale(${(r.w / SCREEN.w).toFixed(4)}, ${(r.h / SCREEN.h).toFixed(4)})`;
    const P = PAGES[this.page], pct = Math.round(L!.charge * 100), locked = P.needs?.(g);
    const dots = sit ? `<button class="lt-dots">${'<i></i>'.repeat(9)}</button>` : '';
    const on = sit && this.launcher ? 'launcher' : P.id;
    const html = on === 'launcher' ? `<div class="lt-launch">${PAGES.map(q => `<button data-tab="${q.id}">${q.zh}<br><span>${q.en}</span></button>`).join('')}</div>`
      : locked ? `<div class="lt-locked">${locked[0]}<br><span>${locked[1]}</span></div>` : (on === 'map' && sit ? this.map.tools() : '') + P.draw(g);
    const bar = `<span>${dots}${P.zh} ${P.en}</span><span class="lt-corner">▮ ${pct}% · ${dateText(g.state.time)} · ☠ ${g.state.deaths ?? 0}</span>`;
    if (bar !== this.barShown) { this.bar.innerHTML = bar; this.barShown = bar; }
    const fresh = html !== this.shown;
    if (fresh) { this.body.innerHTML = html; this.body.dataset.on = on; this.shown = html; }
    // The map, drawn into its place on the page a few times a second.
    if (on === 'map') {
      const slot = this.body.querySelector('.lt-map');
      if (slot) this.map.place(slot);
      if (fresh || ++this.frame % 6 === 0) this.map.draw();
    }
    // The feed, a few times a second.
    if (on === 'cams' && g.state.taps?.length && !locked) {
      const slot = this.body.querySelector('.lt-feed'), taps = camList(g);
      if (slot && this.feed.canvas.parentElement !== slot) slot.appendChild(this.feed.canvas);
      if (fresh || ++this.frame % 12 === 0) this.feed.draw(g, taps[Math.min(this.cam, taps.length - 1)]);
    }
  }
}
