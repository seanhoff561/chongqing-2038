// The laptop's screen (U-104, U-105, DESIGN section 11): it lies on the glass of the laptop he holds out in front of him
// (render/laptop3d.ts), the game going on round it: Anna's OS (ui/lapos.ts), a desktop and a taskbar. Standing, the
// lean keys turn Map, Status, Scan and Notes, each filling the desktop; nothing says how. Sat down at it (Q, M10-13)
// the mouse is a cursor on the screen: the taskbar opens any app in a window. An app he can't use yet says what it
// needs. Over it all, the glass (M10-57).
import * as THREE from 'three';
import type { Game } from '../game';
import { night } from '../render/materials';
import { quadMatrix } from '../render/laptop3d';
import { MapTools } from './maptools';
import { Feed } from './feeds';
import { FLIGHT } from '../sim/flight';
import { heightAt } from '../world/heightfield';
import { PAGES, camList } from './lappages';
import { Desk } from './lapos';
import { Anna } from './anna';
import { enterTraining } from './training';

/** The page's own size (CSS pixels), scaled onto the screen's glass. */
export const SCREEN = { w: 640, h: 408 };
/** The pages he turns through standing. */
const STANDING = PAGES.filter(p => p.standing);

export class LaptopUI {
  readonly root: HTMLDivElement;
  /** the desktop, its windows and the taskbar (M10-58) */
  readonly desk: Desk;
  /** the glass over the page: glare, pixel grain, darker edges (M10-57) */
  private glass = document.createElement('div');
  /** which app he's turned to standing: an index into PAGES */
  page = 0;
  /** The screen's glow on what's round him, after dark: ice blue (U-104). */
  private glow = new THREE.PointLight(0xbfe6f5, 0, 3, 2);
  /** The Map page's canvas and its tools (M10-14), kept across redraws of the page. */
  readonly map: MapTools;
  private frame = 0;
  /** The Cams page's feed, and which tapped camera it shows. */
  private feed = new Feed();
  cam = 0;
  /** Notes' writing box (M10-15), kept across redraws so typing isn't lost */
  private notes = document.createElement('textarea');
  /** Anna in the screen's corner (M10-18) */
  readonly anna = new Anna();
  private wasOpen = false;
  private toldFlat = false;
  /** whether he was sat down last frame */
  private sat = false;

  constructor(private game: Game) {
    this.root = document.createElement('div');
    this.root.id = 'laptop';
    this.root.style.display = 'none';
    this.root.style.width = `${SCREEN.w}px`; this.root.style.height = `${SCREEN.h}px`;
    this.map = new MapTools(game);
    this.desk = new Desk(game);
    // (Over it all, the glass: M10-57.)
    this.glass.className = 'lt-glass';
    this.root.append(this.desk.el, this.anna.el, this.desk.bar, this.glass);
    document.body.appendChild(this.root);
    this.flying.id = 'dronehud'; this.flying.style.display = 'none'; document.body.appendChild(this.flying);
    // (The light off the glass, on his face and round him, the keys only glancing.)
    this.glow.position.set(0, 0.06, 0.4);
    game.laptop3d.group.add(this.glow);
    // (Sitting, the cursor: the taskbar, a window's buttons, the map's tools.)
    this.root.addEventListener('click', e => {
      const t = e.target as Element;
      // (The Songs app opened: the desktop game's songs folder read again.)
      if (t.closest('[data-app="songs"]')) game.songs.load();
      if (this.desk.click(t)) return;
      const b = t.closest<HTMLElement>('[data-tool], [data-scan], [data-act], [data-cam], [data-sight]'), d = b?.dataset;
      if (!d) return;
      if (d.tool) this.map.tool = d.tool;
      else if (d.scan) game.input.cmds.push({ c: 'act', name: 'scanpack', arg: Number(d.scan) });
      // (M10-16: the drone launched; a camera picked and looped; a sighting shown on the map.)
      else if (d.act === 'launch') game.input.cmds.push({ c: 'act', name: 'launch' });
      // (M10-17: his songs.)
      else if (d.act === 'play') game.songs.play();
      else if (d.act === 'pause') game.songs.pause();
      else if (d.act === 'skip') game.songs.skip();
      else if (d.act === 'songfolder') window.desktop?.folder('songs');
      // (M10-34: the VR goggles on.)
      else if (d.act === 'train') enterTraining(game);
      else if (d.act === 'loop') { const taps = camList(game); if (taps.length) game.input.cmds.push({ c: 'act', name: 'loop', arg: taps[Math.min(this.cam, taps.length - 1)] }); }
      else if (d.cam) this.cam = Number(d.cam);
      else if (d.sight) { const x = game.state.sightings?.[Number(d.sight)]; if (x) { this.desk.open('map'); this.map.show(x.x, x.z); } }
    });
    // (A folder of songs picked in the browser: M10-17.)
    this.root.addEventListener('change', e => { const t = e.target as HTMLInputElement; if (t.matches('[data-songs]') && t.files) game.songs.pick(t.files); });
    this.notes.className = 'lt-notesbox'; this.notes.maxLength = 4000; this.notes.spellcheck = false;
    this.notes.addEventListener('input', () => game.input.cmds.push({ c: 'act', name: 'notes', arg: this.notes.value }));
  }

  /** Sat down or up (M10-13): the mouse let go to be a cursor on the screen (the app he was on open, the first time),
   *  or taken back to look round, on the app in front if it's one of the four. */
  private seat(sit: boolean) {
    this.sat = sit; this.map.seat(sit);
    if (sit) { document.exitPointerLock?.(); this.notes.value = this.game.state.notes ?? ''; if (!this.desk.wins.length) this.desk.open(PAGES[this.page].id, true); return; }
    const f = this.desk.front(), i = f ? PAGES.findIndex(q => q.id === f.app) : -1;
    if (i >= 0 && PAGES[i].standing) this.page = i;
    else if (!PAGES[this.page].standing) this.page = 0;
  }

  /** The app in front: sitting, the window in front; standing, the one he's turned to. */
  private current() { return this.sat ? this.desk.front()?.app ?? '' : PAGES[this.page].id; }

  /** Her Scan page, when a scan's done. */
  showScan() { this.page = PAGES.findIndex(q => q.id === 'scan'); if (this.sat) this.desk.open('scan'); }

  /** ↑ ↓ and Enter on a page: on the Cams page the next tapped camera (+1) or the last (-1), and Enter (0) loops the
   *  one shown; on the Drone page Enter launches it (M5-11). */
  pageKey(by: number) {
    const id = this.current(), taps = camList(this.game);
    if (id === 'drone' && !by && !PAGES.find(q => q.id === 'drone')!.needs?.(this.game)) { this.game.input.cmds.push({ c: 'act', name: 'launch' }); return; }
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

  /** An app's page: what it shows, or what it needs if he can't use it yet. */
  private html(app: string, sit: boolean) {
    const P = PAGES.find(q => q.id === app)!, locked = P.needs?.(this.game);
    return locked ? `<div class="lt-locked">${locked[0]}<br><span>${locked[1]}</span></div>` : (app === 'map' && sit ? this.map.tools() : '') + P.draw(this.game);
  }

  /** As the world loads: the page built and laid out once, unseen, and its map drawn (the city's plots gathered), so
   *  the first time he takes it out has nothing to build (M10-64). */
  warm() {
    const st = this.root.style;
    st.visibility = 'hidden'; st.display = 'block';
    this.desk.render(false, PAGES[this.page].id, app => this.html(app, false));
    const slot = this.desk.win('map', false)?.content.querySelector('.lt-map');
    if (slot) this.map.place(slot);
    this.map.draw();
    this.root.getBoundingClientRect();
    st.display = 'none'; st.visibility = '';
  }

  /** Every frame: on the glass while it's out, its corner and page kept up to date. */
  update(dt: number) {
    this.flyHud();
    const g = this.game, L = g.state.laptop, open = !!L?.open && !g.state.flight, sit = open && !!L?.sit;
    if (sit !== this.sat) this.seat(sit);
    // (Taken out, Anna waves.)
    if (open && !this.wasOpen) this.anna.set('wave', 1.6);
    this.wasOpen = open;
    if (open) this.anna.update(dt);
    // (Sat down, he looks straight ahead at it: U-105.)
    if (sit) g.input.pitch *= Math.exp(-8 * dt);
    this.root.classList.toggle('sit', sit);
    this.glow.intensity = open ? 1.4 * night.k : 0;
    const r = open ? g.laptop3d.corners(g.view.fp.cam, innerWidth, innerHeight) : null;
    if (!r) { if (this.root.style.display !== 'none') this.root.style.display = 'none'; return; }
    this.root.style.display = 'block';
    // (The page laid onto the glass in perspective, wherever it's held.)
    this.root.style.transform = quadMatrix(SCREEN.w, SCREEN.h, r);
    // The glass (M10-57): the room's light glancing off it, sliding as his eyes move over it (less in the dark); the
    // pixels' grain, seen close; the backlight's bloom, stronger at night.
    const cx = (r[0][0] + r[1][0] + r[2][0] + r[3][0]) / 4 / innerWidth, cy = (r[0][1] + r[1][1] + r[2][1] + r[3][1]) / 4 / innerHeight, st = this.root.style;
    st.setProperty('--gx', `${(50 + (0.5 - cx) * 120).toFixed(1)}%`); st.setProperty('--gy', `${(15 + (0.5 - cy) * 140).toFixed(1)}%`);
    st.setProperty('--sx', `${(44 + (cy - 0.5) * 60).toFixed(1)}%`);
    st.setProperty('--glare', (0.02 + 0.07 * (1 - night.k)).toFixed(3));
    st.setProperty('--grain', (0.012 + 0.05 * g.laptop3d.focus).toFixed(3));
    st.setProperty('--bloom', (0.08 + 0.22 * night.k).toFixed(3));
    // The desktop: each app's page in its window, redrawn only when it changes.
    const { shown } = this.desk.render(sit, PAGES[this.page].id, app => this.html(app, sit));
    this.frame++;
    // The map, drawn into its place a few times a second; the feed likewise.
    const mw = this.desk.win('map', sit), slot = mw && shown.includes(mw) ? mw.content.querySelector('.lt-map') : null;
    // (The first time he sees the map, his family's flat on it: U-104; Anna's line about it is M10-53's.)
    if (slot && !g.state.known?.liflat && !this.toldFlat) { this.toldFlat = true; g.input.cmds.push({ c: 'act', name: 'know', arg: 'liflat' }); }
    if (slot) { const fresh = this.map.canvas.parentElement !== slot; this.map.place(slot); if (fresh || this.frame % 6 === 0) this.map.draw(); }
    const nw = sit ? this.desk.win('notes', sit) : null, write = nw && shown.includes(nw) ? nw.content.querySelector('.lt-write') : null;
    if (write && this.notes.parentElement !== write) { const f = document.activeElement === this.notes; write.appendChild(this.notes); if (f) this.notes.focus(); }
    const cw = this.desk.win('cams', sit), feed = cw && shown.includes(cw) && g.state.taps?.length ? cw.content.querySelector('.lt-feed') : null;
    if (feed) {
      const taps = camList(g), fresh = this.feed.canvas.parentElement !== feed;
      if (fresh) feed.appendChild(this.feed.canvas);
      if (fresh || this.frame % 12 === 0) this.feed.draw(g, taps[Math.min(this.cam, taps.length - 1)]);
    }
  }
}
