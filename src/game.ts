// The browser game: fixed-step sim, input, rendering with interpolation.
import * as THREE from 'three';
import { HideView } from './render/hideview';
import { Underwater } from './render/underwater';
import { lineMeshes } from './render/lines';
import { hideNear } from './sim/hide';
import { lineInReach } from './sim/zip';
import { createState, step } from './sim/sim';
import { B, DT, type SimState, type Vec3 } from './sim/types';
import { GAME_PER_TICK, daylight } from './sim/clock';
import type { World } from './world/world';
import { getWorld } from './world/build';
import { scenarioByName, scenarios, type Scenario } from './data/scenarios';
import { Input } from './input/input';
import { View, GFX } from './render/view';
import { Hud } from './ui/hud';
import { UnitView } from './render/units';
import { lineById } from './data/dialogue';
import { announce } from './audio/pa';
import { startPursuit } from './sim/pursuit';
import { endRun } from './sim/escape';
import { LaptopUI } from './ui/laptop';
import { Laptop3D } from './render/laptop3d';
import { CraftUI } from './ui/craft-ui';
import { speak } from './audio/voice';
import { EndingSequence } from './ui/ending';
import { WorldFx } from './render/worldfx';
import { setSeason } from './render/season';
import { Snow } from './render/snow';
import { buildTops } from './render/snowcover';
import { buildLeafMap } from './render/leafmap';
import { updateScreens } from './render/edicts';
import { seasonOf } from './sim/season';
import { paKind, boardOf } from './data/announce';
import { radio } from './audio/moves';
import { Soundscape } from './audio/soundscape';
import { MenuMusic } from './audio/menu';
import { Songs } from './audio/songs';
import { playStep, underfoot } from './audio/steps';
import { Sky } from './render/sky';
import { BodyFx } from './render/body-fx';
import { InventoryUI } from './ui/inventory-ui';
import { heldStack } from './sim/use';
import { item } from './data/items';
import { MAGS } from './data/units';
import { Audio } from './audio/audio';
import { startRun, furnish } from './sim/run';
import { teleport } from './sim/player';
import { writeSave, readSave, deleteSave, type SaveFile } from './sim/save';
import { syncWorld } from './sim/doors';
import { playMove } from './audio/moves';
import { Hands3D, poseFor, gripPose, heldAt } from './render/hands3d';
import { itemModel, supportPoint } from './render/items3d';
import { GunFeel, zoomOf } from './render/gunfeel';
import { BINOS } from './sim/binoculars';
import { HeldMotion } from './render/viewmodel';
import { windOf } from './sim/move';
import { Marks } from './render/marks';
import { SleepUI } from './ui/sleep-ui';
import { DeathScreen } from './ui/death';
import { Furniture } from './render/furniture';
import { Rain } from './render/rain';
import { StatusIndicator } from './ui/status';
import { lodRadius, alarm } from './render/materials';
import { board } from './render/signs';
import { districtOf } from './sim/district';
import { Settings } from './ui/settings';
import { findGrab } from './sim/grip';
import { allInters } from './sim/interact';
import { raycast } from './world/geom';

/** Metres to full haze when the whole city is drawn (U-012). */
const FAR_HAZE = 2800;

export interface GameOpts { scenario: string; seed: number; dev: boolean }

const HIDE_NAMES: Record<string, [string, string]> = {
  crate: ['箱子', 'Crate'], dumpster: ['垃圾箱', 'Dumpster'], box: ['箱子', 'Box'], wardrobe: ['衣柜', 'Wardrobe'],
  tank: ['水箱', 'Water tank'], drum: ['水桶', 'Drum'], kiosk: ['报亭', 'Kiosk'], boot: ['后备箱', 'Car boot'], van: ['货车', 'Van'],
};

/** What he drinks rather than eats, for its sound (U-058). */
const DRINKS = new Set(['water', 'riverwater', 'energy']);

export class Game {
  world!: World;
  state!: SimState;
  readonly view: View;
  readonly input: Input;
  readonly hud = new Hud();
  laptop!: LaptopUI;
  /** his laptop held in both hands while it's out (U-104) */
  laptop3d!: Laptop3D;
  /** a menu was up last frame */
  private wasUi = false;
  craft!: CraftUI;
  /** whether he was flying the drone last frame (M5-11) */
  private flew = false;
  readonly sky: Sky;
  readonly bodyFx: BodyFx;
  readonly inv: InventoryUI;
  readonly audio = new Audio();
  /** the main menu's music (M10-60) */
  readonly menuMusic = new MenuMusic(this.audio);
  /** his own songs, from the laptop (M10-17) */
  readonly songs = new Songs(this.audio);
  /** the machines heard where they are (M4-33) */
  readonly sound = new Soundscape(this.audio);
  readonly hands: Hands3D;
  /** The inside of where he's hidden (M3-47). */
  readonly hideView = new HideView();
  /** Murk, silt and dull sound with his head under water (M3-48). */
  readonly underwater: Underwater;
  private readonly rigged = new THREE.Group();
  readonly sleep: SleepUI;
  readonly death = new DeathScreen(this);
  ending!: EndingSequence;
  readonly settings: Settings;
  readonly furniture = new Furniture();
  readonly rain: Rain;
  readonly status = new StatusIndicator();
  drawDistance = 160;
  private units: UnitView | null = null;
  /** The world the view has built: a new run in it (after death, from the menu, a save resumed) keeps it (U-048). */
  private shown: World | null = null;
  scenario!: Scenario;
  private heldId = '';
  private heldKey = '';
  private heldModel: THREE.Object3D | null = null;
  readonly gun = new GunFeel();
  readonly motion = new HeldMotion();
  readonly marks = new Marks();
  private fx!: WorldFx;
  private snow!: Snow;
  private grabAge = 0;
  private readied = false;
  private prev: Vec3 = { x: 0, y: 0, z: 0 };
  private acc = 0;
  private last = 0;
  frames = 0;
  /** milliseconds a frame, smoothed: sim ticks, render CPU, and the whole frame (capped by the display) */
  readonly perf = { sim: 0, render: 0, frame: 16.7 };
  ticks = 0;

  constructor(readonly opts: GameOpts) {
    this.view = new View(document.body);
    this.input = new Input(this.view.renderer.domElement);
    this.sky = new Sky(this.view);
    this.hands = new Hands3D(this.view.fp.cam);
    this.view.scene.add(this.hideView.group);
    this.underwater = new Underwater(this.view);
    this.rigged.userData.n = 0;
    this.view.scene.add(this.rigged);
    this.view.scene.add(this.furniture.group);
    this.view.scene.add(this.marks.group);
    this.fx = new WorldFx(this.view.scene, this.marks);
    this.rain = new Rain(this.view.scene);
    this.snow = new Snow(this.view.scene);
    this.bodyFx = new BodyFx(this.view.renderer.domElement);
    this.inv = new InventoryUI(this);
    this.sleep = new SleepUI(this);
    this.settings = new Settings(this, opts.dev);
    this.laptop3d = new Laptop3D(this.view.scene);
    this.laptop = new LaptopUI(this);
    this.craft = new CraftUI(this);
    this.ending = new EndingSequence(this);
    this.load(opts.scenario, opts.seed);
  }

  load(name: string, seed: number, worldSeed = seed) {
    const sc = scenarioByName(name);
    if (!sc) throw new Error(`unknown scenario ${name}`);
    this.scenario = sc;
    this.world = getWorld(sc.world, worldSeed);
    this.state = createState(seed, this.world);
    this.state.worldSeed = worldSeed;
    if (sc.hour !== undefined) this.state.time = ((sc.day ?? 1) - 1) * 86400 + sc.hour * 3600;
    if (sc.cover !== undefined) Object.assign(this.state.weather, { cover: sc.cover, at: this.state.time });
    Object.assign(this.state.flags, sc.flags);
    if (sc.run) startRun(this.state, this.world);
    if (sc.furnished) furnish(this.state, this.world);
    const sp = sc.spawn ?? this.world.teleports.find(t => t.name === sc.at);
    if (sp) teleport(this.state.player, sp.x, sp.y, sp.z);
    this.state.player.yaw = this.input.yaw = sp?.yaw ?? this.world.spawn.yaw;
    if (sc.pursuit) startPursuit(this.state, this.world, sc.pursuit);
    // (An ending scenario ends the run as it starts, to play its sequence: M7-15.)
    if (sc.ending) endRun(this.state, sc.ending);
    if (this.ending) this.ending.done = false;
    this.input.pitch = 0;
    this.prev = { ...this.state.player.pos };
    this.sky.overcast = sc.overcast ?? 0;
    this.applyDraw();
    if (this.shown !== this.world) { this.view.setWorld(this.world); this.shown = this.world; }
    this.units?.dispose();
    this.units = new UnitView(this.state.units);
    this.view.scene.add(this.units.group);
  }

  /** The alert shown where he is (M4-27): the boards on his district's alert. */
  private alarmBoards() {
    const p = this.state.player.pos, st = this.state.hive.districts[districtOf(p.x, p.z)]?.state;
    alarm.value = st === 'engaged' || st === 'searching' || st === 'heightened' ? 1 : 0;
    // (And the LED boards' strip: by day, the curfew, the alert or the search: M4-28.)
    board.value = boardOf(paKind(st ?? 'unaware', this.state.time / 3600));
  }

  /** The draw distance: the scenario's, or the graphics'. With far stand-ins the whole city shows through
   *  aerial haze and the draw distance is the detail radius. */
  private applyDraw() {
    this.drawDistance = this.scenario.draw ?? GFX.draw;
    lodRadius.value = this.world.far.length ? this.drawDistance : 1e9;
    this.view.fp.cam.far = this.hazeDistance() + 100;
    this.view.fp.cam.updateProjectionMatrix();
  }

  /** Switch scenario in place: '' is the game, resumed from its ironman save if there is one. */
  switchTo(name: string) {
    this.marks.clear();
    this.fx?.blasts.clear();
    const sc = scenarioByName(name) ?? scenarios.find(x => x.run)!;
    const save = sc.run ? readSave(localStorage) : null;
    // (A new run in the city already built keeps it, its building types as rolled: no minute's rebuild, D-123.)
    const seed = Math.floor(Math.random() * 1e9), same = this.scenario && scenarioByName(this.scenario.name)?.world === sc.world;
    if (save) this.loadSave(save);
    else this.load(sc.name, seed, same ? this.state.worldSeed ?? this.state.seed : seed);
    const q = new URLSearchParams(location.search);
    q.delete('seed');
    if (sc.run) q.delete('scenario'); else q.set('scenario', sc.name);
    history.replaceState(null, '', `${location.pathname}${q.size ? `?${q}` : ''}`);
  }

  /** Where the fog closes in: the draw distance, or far haze over a city drawn whole. */
  hazeDistance() { return this.world.far.length ? FAR_HAZE : this.drawDistance; }

  /** Display name of a container grid id. */
  containerName(id: string): string {
    const it = this.world.inter.find(i => i.id === id);
    return it ? `${it.zh} ${it.en.toUpperCase()}` : id;
  }

  private uiKeys() {
    this.input.tabKeys = !!this.state.laptop?.open;
    for (const k of this.input.uiKeys.splice(0)) {
      if (k === 'pack') this.inv.toggle();
      // Anna's laptop, opened and shut without stopping anything (M5-01).
      else if (k === 'laptop') this.input.cmds.push({ c: 'act', name: this.state.flight ? 'land' : 'laptop' });
      // Sitting down at it, and up again (M10-13).
      else if (k === 'focus') this.input.cmds.push({ c: 'act', name: 'focus' });
      // Its pages, one way or the other (M5-02).
      else if ((k === 'ArrowLeft' || k === 'ArrowRight') && this.state.laptop?.open) this.laptop.turn(k === 'ArrowLeft' ? -1 : 1);
      // The Cams page's cameras, and looping one (M5-09); the Drone page's launch (M5-11).
      else if ((k === 'ArrowUp' || k === 'ArrowDown' || k === 'Enter') && this.state.laptop?.open) this.laptop.pageKey(k === 'Enter' ? 0 : k === 'ArrowUp' ? -1 : 1);
    }
  }

  /** Esc on a menu (U-104): the backpack, the crafting, the sleep menu or the laptop closed; false if none was up. */
  closeMenu() {
    if (this.inv.open) this.inv.toggle(false);
    else if (this.craft.open) this.craft.toggle(false);
    else if (this.sleep.open) this.sleep.toggle(false);
    else if (this.state.laptop?.sit && !this.state.flight) this.input.cmds.push({ c: 'act', name: 'focus' });
    else if (this.state.laptop?.open && !this.state.flight) this.input.cmds.push({ c: 'act', name: 'laptop' });
    else return false;
    return true;
  }

  /** A line of the story said: heard, and Anna's read in English (U-104). */
  sayLine(id: string) { const l = lineById.get(id); if (!l) return; if (l.speaker === 'anna') this.hud.say(l.en); speak(this.audio, id); }

  /** The main menu's up: nothing runs under it (U-104). */
  menuUp() { return !!document.getElementById('boot'); }

  /** A new run (U-104): day one in the city already built (D-123), saved as it starts. */
  newRun() {
    deleteSave(localStorage);
    this.load('run', Math.floor(Math.random() * 1e9), this.state.worldSeed ?? this.state.seed);
    writeSave(localStorage, 'run', this.state);
  }

  /** Resume a save. */
  loadSave(f: SaveFile) {
    this.load(f.scenario, f.state.seed, f.state.worldSeed ?? f.state.seed);
    this.state = f.state;
    syncWorld(this.state, this.world);
    this.input.yaw = this.state.player.yaw;
    this.input.pitch = this.state.player.pitch;
    this.prev = { ...this.state.player.pos };
  }

  tick() {
    this.uiKeys();
    this.prev = { ...this.state.player.pos };
    const f = this.input.frame();
    step(this.state, this.world, f);
    this.ticks++;
    for (const e of this.state.events) {
      if (e.t === 'land') this.view.fp.landed(e.h);
      else if (e.t === 'sfx') {
        // (Footsteps and landings by what's underfoot, wet in the rain out from under cover: M8-08.)
        const p = this.state.player.pos;
        if (e.id.startsWith('step-') || e.id.startsWith('land')) {
          // (Out in the open on lying snow, it crunches: U-097.)
          const open = !this.sound.env.covered, surf = underfoot(this.world.index, this.world, p.x, p.y, p.z);
          playStep(this.audio, e.id, open && (this.state.weather.cover ?? 0) > 0.3 && surf !== 'water' ? 'snow' : surf, this.state.weather.rain > 0.3 && open);
        }
        else playMove(this.audio, e.id);
      }
      else if (e.t === 'mark') this.marks.add(e);
      // (A blast seen, heard and felt, by how near: M10-65.)
      else if (e.t === 'blast') { const c = this.view.fp.cam.position; this.fx.blasts.add(e, this.world); this.sound.blast(e, this.world, c); this.view.fp.shake(Math.min(1, (e.r * 2.5) / Math.max(1, Math.hypot(e.x - c.x, e.y - c.y, e.z - c.z)))); }
      // (Peaches are mostly water but they're eaten: a drink is what comes in a bottle or a can.)
      else if (e.t === 'ate') playMove(this.audio, DRINKS.has(e.id) ? 'drink' : 'eat');
      else if (e.t === 'swing') { playMove(this.audio, 'whoosh'); if (e.on !== 'air') playMove(this.audio, `blow-${e.kind}-${e.on === 'machine' ? 'metal' : e.on}`); this.motion.swing(e.kind, e.on !== 'air'); }
      else if (e.t === 'fire') { this.sound.fired(!!e.quiet); this.gun.fired(); }
      else if (e.t === 'open') this.inv.toggle(true);
      else if (e.t === 'sleep-menu') this.sleep.toggle(true, e.id === 'rough');
      else if (e.t === 'slept' && e.where !== 'collapse' && this.scenario.run && !this.state.dead) writeSave(localStorage, this.scenario.name, this.state);
      else if (e.t === 'msg') this.hud.notice(e.text);
      else if (e.t === 'scan') this.laptop.showScan();
      else if (e.t === 'bench') this.craft.toggle(true);
      else if (e.t === 'logged') this.hud.notice('logged');
      // (Spoken; only Anna's story lines are read, in English: U-104.)
      else if (e.t === 'say') this.sayLine(e.id);
      // (The street speakers: heard, not read: U-092.)
      else if (e.t === 'pa') {
        // (From the lampposts' speakers round him, the nearest three: U-094.)
        const p = this.state.player.pos, head = { x: p.x, y: p.y + 1.6, z: p.z };
        const from = this.world.cameras.filter(c => c.kind === 'lamppost' && Math.abs(c.x - p.x) < 90 && Math.abs(c.z - p.z) < 90).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)).slice(0, 3);
        announce(this.audio, e.id, from, head, this.sound.env.where === 'indoors');
      }
      else if (e.t === 'shot') this.sound.shot(e, this.world, this.view.fp.cam.position);
      else if (e.t === 'call') { const d = Math.hypot(e.x - this.state.player.pos.x, e.z - this.state.player.pos.z); if (d < 60) radio(this.audio, 0.25 * (1 - d / 60)); }
    }
    if (this.state.dead) this.death.show();
    // (An ending plays its sequence first, then the summary: M7-15.)
    else if (this.state.ended) this.ending.start(this.state.ended.route);
  }

  render(alpha: number, dt: number) {
    const p = this.state.player;
    // (A menu's up only while one's really showing: never left set by one menu closing over another, which took the
    // prompts, the hands and the mouse away for good.)
    // (Settings stop his own input, the world going on; the main menu stops everything: U-104.)
    this.input.frozen = this.settings.open || this.menuUp();
    this.input.uiOpen = this.inv.open || this.sleep.open || this.settings.open || this.craft.open || this.death.shown || this.ending.active || this.ending.done || !!document.getElementById('boot') || (!!this.state.laptop?.sit && !this.state.flight);
    // (A menu closed, the mouse taken back for looking round: U-105.)
    if (this.wasUi && !this.input.uiOpen) this.input.capture();
    this.wasUi = this.input.uiOpen;
    const pos = { x: this.prev.x + (p.pos.x - this.prev.x) * alpha, y: this.prev.y + (p.pos.y - this.prev.y) * alpha, z: this.prev.z + (p.pos.z - this.prev.z) * alpha };
    // Guns (M4-21b): aimed down the sights the view narrows; the gun's raised and kicked once the hands are posed.
    const gun = this.heldId === 'pistol' ? this.heldModel : null;
    // Binoculars held up (M5-07): ten times closer.
    const binos = this.heldId === 'binoculars';
    this.gun.aim(dt, (!!gun || binos) && (this.input.mouse & B.AIM) !== 0 && !this.input.uiOpen);
    this.view.fp.zoom = this.gun.ads * (binos ? (1 - 1 / BINOS.zoom) / 0.38 : zoomOf(heldStack(this.state)?.mods));
    // Flying the drone (M5-11): the view from it; landed, his own look back.
    const fl = this.state.flight;
    if (!fl && this.flew) { this.input.yaw = p.yaw; this.input.pitch = p.pitch; }
    this.flew = !!fl;
    this.view.fp.update(p, pos, this.input.yaw, this.input.pitch, dt);
    if (fl) { this.view.fp.cam.position.set(fl.x, fl.y, fl.z); this.view.fp.cam.rotation.set(this.input.pitch, this.input.yaw, 0); }
    this.ending.update(dt);
    this.bodyFx.update(this.state, this.view.fp, dt);
    this.updateHands(dt);
    this.gun.update(dt, this.hands.group, gun);
    this.marks.update(dt);
    this.fx.update(this.state, this.world, this.heldId, (this.input.mouse & B.AIM) !== 0 && !this.input.uiOpen, this.view.fp.cam.position, dt);
    // Aimed through the 4x scope (U-058): the view through it, the gun out of sight behind it.
    const scoped = (!!gun && this.gun.ads > 0.85 && zoomOf(heldStack(this.state)?.mods) > 1) || (binos && this.gun.ads > 0.85);
    this.hud.setScope(scoped, binos);
    this.hud.setAiming(!!gun && this.gun.ads > 0.5);
    if (scoped) this.hands.group.visible = false;
    const task = this.state.task;
    this.motion.update(dt, this.hands.group, this.heldId, { bob: this.view.fp.bob, speed: p.onGround ? Math.hypot(p.vel.x, p.vel.z) : 0, yaw: this.input.yaw, pitch: this.input.pitch, ads: this.gun.ads, reload: task?.id === 'reload' ? task.t / task.dur : -1 });
    this.inv.update();
    this.laptop3d.update(!!this.state.laptop?.open && !this.state.flight, !!this.state.laptop?.sit, dt, this.view.fp.cam);
    if (this.heldModel) this.heldModel.visible = !this.state.laptop?.open;
    this.laptop.update(dt);
    this.craft.update();
    this.updatePrompt();
    this.updateHeld();
    this.hud.tick(dt);
    this.furniture.sync(this.state);
    this.status.update(this.state, dt);
    const cam = this.view.fp.cam.position;
    this.sky.update(this.state.time, cam, this.hazeDistance(), this.underAmount(dt), this.state.weather, this.lit);
    const wet = this.underwater.update(this.world, this.state.tick / 60);
    this.sky.dome.mesh.visible = !wet;
    // The lines he has rigged (M3-52).
    const rigged = this.state.lines ?? [];
    if (rigged.length !== this.rigged.userData.n) {
      this.rigged.clear();
      this.rigged.add(...lineMeshes(rigged));
      this.rigged.userData.n = rigged.length;
    }
    this.audio.setUnderwater(wet);
    // The wind in his ears falling (M4-66).
    this.audio.setWind(this.state.player.mode === 'air' ? windOf(this.state.player.vel.y) : 0);
    // Rain stops at a roof, underground or under water.
    const covered = wet || this.under > 0.5 || !!raycast(this.world.index, cam.x, cam.y, cam.z, 0, 1, 0, 40);
    this.rain.update(this.state.tick / 60, cam, this.state.weather.rain, covered);
    setSeason(seasonOf(this.state.time), this.state.weather.cover ?? 0, this.state.weather.rain);
    buildLeafMap(this.world);
    if ((this.state.weather.cover ?? 0) > 0) buildTops(this.world.index);
    updateScreens(this.state, performance.now() / 1000);
    this.snow.update(this.state.tick / 60, cam, this.state.weather.snow ?? 0, covered, 0.12 + 0.88 * daylight(this.state.time), this.view.renderer.domElement.height, this.view.fp.cam.fov);
    this.view.setLamp(this.state.player.lamp);
    this.units?.update(this.world, this.state.units, this.state.time + alpha * GAME_PER_TICK, this.view.fp.cam.position);
    // What he hears of the city and its machines (audio/soundscape.ts; its music silent under his songs or the main
    // menu); the main menu's own music while it's up.
    this.menuMusic.update(this.menuUp());
    this.alarmBoards();
    this.sound.update(dt, this.state, this.world, this.view.fp.cam, wet || this.under > 0.5, this.songs.playing || this.menuUp());
    this.view.render(this.state.tick / 60, this.state.wstate.open);
    this.frames++;
  }

  private under = 0;
  /** How far into a lit underground space (the underground city's lights, M3-58), 0..1. */
  private lit = 0;
  /** Eases toward 1 while the camera is inside an underground zone. */
  private underAmount(dt: number): number {
    const c = this.view.fp.cam.position;
    const zone = this.world.zones.find(z => z.kind === 'under' && c.x > z.box.x0 && c.x < z.box.x1 && c.y > z.box.y0 && c.y < z.box.y1 && c.z > z.box.z0 && c.z < z.box.z1);
    const k = 1 - Math.exp(-3 * dt);
    this.under += ((zone ? 1 : 0) - this.under) * k;
    this.lit += ((zone?.lit ? 1 : 0) - this.lit) * k;
    return this.under;
  }

  private updatePrompt() {
    const s = this.state;
    // At work on something: the ring round the dot fills (U-051).
    if (s.task) { this.hud.setProgress(s.task.t / s.task.dur); this.hud.setPrompt(''); return; }
    this.hud.setProgress(-1);
    const it = s.target ? allInters(s, this.world).find(i => i.id === s.target) : null;
    // Hiding spots get a prompt like everything else he can use (U-021).
    const hide = !it && s.player.mode === 'ground' ? hideNear(this.world, s.player) : -1;
    const hk = hide >= 0 ? HIDE_NAMES[this.world.hides[hide].kind] ?? ['箱子', 'Box'] : null;
    // A line to ride in reach of empty hands (M3-52).
    const line = !it && !hk && s.inv.held === 0 && (s.player.mode === 'ground' || s.player.mode === 'air') && lineInReach(s, this.world).line >= 0;
    // (Just the thing, never its key or what to do with it: U-104.)
    const [zh, en] = it ? [it.zh, it.en] : hk ?? (line ? ['缆绳', 'Line'] : ['', '']);
    this.hud.setPrompt(this.input.uiOpen ? '' : zh || en ? `${zh}  ${en}` : '');
  }

  private updateHands(dt: number) {
    const p = this.state.player, cam = this.view.fp.cam;
    // (No arms while the laptop's out: U-105.)
    this.hands.group.visible = p.mode !== 'dead' && p.mode !== 'hidden' && !this.input.uiOpen && !this.state.flight && !this.state.laptop?.open;
    this.hideView.update(p.mode === 'hidden' && p.hideId >= 0 ? this.world.hides[p.hideId] ?? null : null);
    if (!this.hands.ready || !this.hands.group.visible) return;
    const held = heldStack(this.state), support = held ? supportPoint(held.id) : null;
    // (Whether a hold's in reach, for the hands raised ready: looked for every fourth frame, it costs a millisecond.)
    if (++this.grabAge >= 4) { this.grabAge = 0; this.readied = !held && findGrab(this.world, p) !== null; }
    const readied = !held && this.readied;
    const task = this.state.task, reload = task?.id === 'reload' ? task.t / task.dur : -1;
    // Faster easing while striding so the arm swing keeps up with the steps.
    const k = 1 - Math.exp(-(p.mode === 'ground' && p.onGround ? 26 : 14) * dt);
    // Keep free hands out of a wall right in front of him.
    const d = { x: -Math.sin(p.yaw) * Math.cos(p.pitch), y: Math.sin(p.pitch), z: -Math.cos(p.yaw) * Math.cos(p.pitch) };
    const hit = raycast(this.world.index, cam.position.x, cam.position.y, cam.position.z, d.x, d.y, d.z, 0.6);
    const room = hit ? hit.t : 0.6;
    p.hands.forEach((h, i) => {
      const g = h.grip ? gripPose(cam, h.grip.x, h.grip.y, h.grip.z, h.grip.nx, h.grip.nz, i === 0 ? -1 : 1) : null;
      const pose = poseFor(p, i, readied, held?.id ?? '', g, this.view.fp.bob, support, reload);
      if (!g && -pose.pos.z > room - 0.12) pose.pos.z = -Math.max(0.12, room - 0.12);
      this.hands.setPose(i, pose, k);
    });
  }

  private updateHeld() {
    const st = heldStack(this.state), id = st?.id ?? '';
    // The pistol's rounds, and the rounds in his magazines (M4-21).
    const rounds = id === 'pistol' ? ` ${st!.charge ?? 0} / ${this.state.inv.pack.items.filter(i => MAGS[i.id]).reduce((a, m) => a + m.n * (m.charge ?? MAGS[m.id]), 0)}${this.state.task?.id === 'reload' ? ' reloading' : ''}` : '';
    this.hud.setHeld(id ? `${item(id).zh} ${item(id).en}${rounds}` : '');
    // (Rebuilt when what's held or what's fitted to it changes: U-058.)
    const key = `${id}:${st?.mods?.join() ?? ''}`;
    if (key === this.heldKey || !this.hands.ready) return;
    this.heldId = id; this.heldKey = key;
    const slot = this.hands.heldSlot(1);
    this.heldModel = null;
    if (slot) { slot.clear(); if (id) { const m = itemModel(id, st?.mods); m.position.copy(heldAt(id)); slot.add(m); this.heldModel = m; } }
  }

  start() {
    const loop = (now: number) => {
      const dt = this.last ? Math.min(0.25, (now - this.last) / 1000) : DT;
      this.last = now;
      this.acc += dt;
      if (this.menuUp()) this.acc = 0;
      const t0 = performance.now();
      while (this.acc >= DT) { this.tick(); this.acc -= DT; }
      const t1 = performance.now();
      this.render(this.acc / DT, dt);
      // Frame time (M3-53), smoothed: the sim's ticks and the render's CPU this frame.
      const k = 0.05, f = this.perf;
      f.sim += (t1 - t0 - f.sim) * k; f.render += (performance.now() - t1 - f.render) * k; f.frame += (dt * 1000 - f.frame) * k;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /** Deterministic stepping for tests: n ticks, then one render. */
  runFrames(n: number) {
    for (let i = 0; i < n; i++) this.tick();
    this.render(1, Math.max(1, n) * DT);
  }
}
