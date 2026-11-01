// The browser game: fixed-step sim, input, rendering with interpolation.
import * as THREE from 'three';
import { HideView } from './render/hideview';
import { Underwater } from './render/underwater';
import { lineMeshes } from './render/lines';
import { hideNear } from './sim/hide';
import { lineInReach } from './sim/zip';
import { createState, step } from './sim/sim';
import { B, DT, type SimState, type Vec3 } from './sim/types';
import { GAME_PER_TICK, SCALE } from './sim/clock';
import type { World } from './world/world';
import { getWorld } from './world/build';
import { scenarioByName, scenarios, type Scenario } from './data/scenarios';
import { Input } from './input/input';
import { View, PRESETS, type Preset } from './render/view';
import { Hud } from './ui/hud';
import { UnitView } from './render/units';
import { lineById, SPEAKERS } from './data/dialogue';
import { radio } from './audio/moves';
import { Soundscape } from './audio/soundscape';
import { RaidLight } from './render/raidlight';
import { LootMarks } from './render/lootmarks';
import { unitPose } from './sim/units';
import { Sky } from './render/sky';
import { BodyFx } from './render/body-fx';
import { InventoryUI } from './ui/inventory-ui';
import { heldStack } from './sim/use';
import { item } from './data/items';
import { MAGS, UNITS } from './data/units';
import { Audio } from './audio/audio';
import { startRun, furnish } from './sim/run';
import { teleport } from './sim/player';
import { writeSave, readSave, type SaveFile } from './sim/save';
import { syncWorld } from './sim/doors';
import { playMove } from './audio/moves';
import { Hands3D, poseFor, gripPose, heldAt } from './render/hands3d';
import { itemModel, supportPoint } from './render/items3d';
import { GunFeel, zoomOf } from './render/gunfeel';
import { HeldMotion } from './render/viewmodel';
import { windOf } from './sim/move';
import { Marks } from './render/marks';
import { SleepUI } from './ui/sleep-ui';
import { DeathScreen } from './ui/death';
import { Furniture } from './render/furniture';
import { Rain } from './render/rain';
import { StatusIndicator } from './ui/status';
import { lodRadius, alarm } from './render/materials';
import { districtOf } from './sim/district';
import { PauseMenu } from './ui/pause';
import { findGrab } from './sim/grip';
import { allInters, interLabel } from './sim/interact';
import { raycast } from './world/geom';

/** Metres to full haze when the whole city is drawn (U-012). */
const FAR_HAZE = 2800;

export interface GameOpts { scenario: string; seed: number; dev: boolean }

const HIDE_NAMES: Record<string, [string, string]> = {
  crate: ['躲进箱子', 'Hide in the crate'], dumpster: ['躲进垃圾箱', 'Hide in the dumpster'], box: ['躲进箱子', 'Hide in the box'], wardrobe: ['躲进衣柜', 'Hide in the wardrobe'],
  tank: ['躲进水箱', 'Hide in the water tank'], drum: ['躲进水桶', 'Hide in the drum'], kiosk: ['躲进报亭', 'Hide in the kiosk'], boot: ['躲进后备箱', 'Hide in the car boot'], van: ['躲进货车', 'Hide in the van'],
};

/** What he drinks rather than eats, for its sound (U-058). */
const DRINKS = new Set(['water', 'riverwater', 'energy']);

export class Game {
  world!: World;
  state!: SimState;
  readonly view: View;
  readonly input: Input;
  readonly hud = new Hud();
  readonly sky: Sky;
  readonly bodyFx: BodyFx;
  readonly inv: InventoryUI;
  readonly audio = new Audio();
  /** the machines heard where they are (M4-33) */
  readonly sound = new Soundscape(this.audio);
  /** red light flashing round the chamber while a raid breaks in (M4-63) */
  readonly raidLight = new RaidLight();
  /** a mark over what he can loot (M4-90) */
  readonly loot = new LootMarks();
  readonly hands: Hands3D;
  /** The inside of where he's hidden (M3-47). */
  readonly hideView = new HideView();
  /** Murk, silt and dull sound with his head under water (M3-48). */
  readonly underwater: Underwater;
  private readonly rigged = new THREE.Group();
  readonly sleep: SleepUI;
  readonly death = new DeathScreen(this);
  readonly pause: PauseMenu;
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
  private rocketMeshes: THREE.Group[] = [];
  private trailIn = 0;
  private grabAge = 0;
  private smokeIn = 0;
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
    this.view.scene.add(this.raidLight.light, this.loot.group);
    this.view.scene.add(this.hideView.group);
    this.underwater = new Underwater(this.view);
    this.rigged.userData.n = 0;
    this.view.scene.add(this.rigged);
    this.view.scene.add(this.furniture.group);
    this.view.scene.add(this.marks.group);
    // Rockets in flight (M4-65): a body and a burning tail, eight at most.
    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x4a5236 })));
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6).translate(0, 0, -0.4), new THREE.MeshBasicMaterial({ color: 0xffb050 })));
      g.visible = false; this.rocketMeshes.push(g); this.view.scene.add(g);
    }
    this.rain = new Rain(this.view.scene);
    this.bodyFx = new BodyFx(this.view.renderer.domElement);
    this.inv = new InventoryUI(this);
    this.sleep = new SleepUI(this);
    this.pause = new PauseMenu(this);
    this.load(opts.scenario, opts.seed);
  }

  load(name: string, seed: number) {
    const sc = scenarioByName(name);
    if (!sc) throw new Error(`unknown scenario ${name}`);
    this.scenario = sc;
    this.world = getWorld(sc.world);
    this.state = createState(seed, this.world);
    if (sc.hour !== undefined) this.state.time = sc.hour * 3600;
    Object.assign(this.state.flags, sc.flags);
    if (sc.run) startRun(this.state, this.world);
    if (sc.furnished) furnish(this.state, this.world);
    const sp = sc.spawn ?? this.world.teleports.find(t => t.name === sc.at);
    if (sp) teleport(this.state.player, sp.x, sp.y, sp.z);
    this.state.player.yaw = this.input.yaw = sp?.yaw ?? this.world.spawn.yaw;
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
  }

  /** The draw distance: the scenario's, or the graphics preset's. With far stand-ins the whole city shows through
   *  aerial haze and the draw distance is the detail radius. */
  private applyDraw() {
    this.drawDistance = this.scenario.draw ?? PRESETS[this.view.preset].draw;
    lodRadius.value = this.world.far.length ? this.drawDistance : 1e9;
    this.view.fp.cam.far = this.hazeDistance() + 100;
    this.view.fp.cam.updateProjectionMatrix();
  }

  /** Switch graphics preset (M3-17): the world built again if it draws a different share of the props. */
  setPreset(p: Preset) {
    if (this.view.setPreset(p)) this.view.setWorld(this.world);
    this.applyDraw();
  }

  /** Switch scenario in place: '' is the game, resumed from its ironman save if there is one. */
  switchTo(name: string) {
    this.marks.clear();
    const sc = scenarioByName(name) ?? scenarios.find(x => x.run)!;
    const save = sc.run ? readSave(localStorage) : null;
    if (save) this.loadSave(save);
    else this.load(sc.name, Math.floor(Math.random() * 1e9));
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
    for (const k of this.input.uiKeys.splice(0)) {
      if (k === 'Tab') this.inv.toggle();
    }
  }

  /** Resume an ironman save. */
  loadSave(f: SaveFile) {
    this.load(f.scenario, f.state.seed);
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
      else if (e.t === 'sfx') playMove(this.audio, e.id);
      else if (e.t === 'mark') this.marks.add(e);
      // (Peaches are mostly water but they're eaten: a drink is what comes in a bottle or a can.)
      else if (e.t === 'ate') playMove(this.audio, DRINKS.has(e.id) ? 'drink' : 'eat');
      else if (e.t === 'swing') { playMove(this.audio, 'whoosh'); if (e.on !== 'air') playMove(this.audio, `blow-${e.kind}-${e.on === 'machine' ? 'metal' : e.on}`); this.motion.swing(e.kind, e.on !== 'air'); }
      else if (e.t === 'fire') { this.sound.fired(!!e.quiet); this.gun.fired(); }
      else if (e.t === 'open') this.inv.toggle(true);
      else if (e.t === 'sleep-menu') this.sleep.toggle(true, e.id === 'rough');
      else if (e.t === 'slept' && this.scenario.run && !this.state.dead) writeSave(localStorage, this.scenario.name, this.state);
      else if (e.t === 'msg') this.hud.say(e.text, '');
      else if (e.t === 'say') { const l = lineById.get(e.id); if (l) this.hud.say(l.zh, l.en, SPEAKERS[l.speaker]?.[0]); }
      else if (e.t === 'shot') this.sound.shot(e, this.world, this.view.fp.cam.position);
      else if (e.t === 'call') { const d = Math.hypot(e.x - this.state.player.pos.x, e.z - this.state.player.pos.z); if (d < 60) radio(this.audio, 0.25 * (1 - d / 60)); }
    }
    if (this.state.dead) this.death.show();
  }

  render(alpha: number, dt: number) {
    const p = this.state.player;
    const pos = { x: this.prev.x + (p.pos.x - this.prev.x) * alpha, y: this.prev.y + (p.pos.y - this.prev.y) * alpha, z: this.prev.z + (p.pos.z - this.prev.z) * alpha };
    // Guns (M4-21b): aimed down the sights the view narrows; the gun's raised and kicked once the hands are posed.
    const gun = this.heldId === 'pistol' ? this.heldModel : null;
    this.gun.aim(dt, !!gun && (this.input.mouse & B.AIM) !== 0 && !this.input.uiOpen);
    this.view.fp.zoom = this.gun.ads * zoomOf(heldStack(this.state)?.mods);
    this.view.fp.update(p, pos, this.input.yaw, this.input.pitch, dt);
    this.bodyFx.update(this.state, this.view.fp, dt);
    this.updateHands(dt);
    this.gun.update(dt, this.hands.group, gun);
    this.marks.update(dt);
    // Rockets in the air, trailing smoke (M4-65).
    const rs = this.state.rockets ?? [];
    this.rocketMeshes.forEach((m, i) => { const r = rs[i]; m.visible = !!r; if (r) { m.position.set(r.x, r.y, r.z); m.lookAt(r.x + r.dx, r.y + r.dy, r.z + r.dz); } });
    if (rs.length && (this.trailIn -= dt) <= 0) { this.trailIn = 0.04; for (const r of rs) this.marks.puff(r.x - r.dx * 0.5, r.y - r.dy * 0.5, r.z - r.dz * 0.5); }
    // Hurt machines near him smoke and spark (M4-62).
    if ((this.smokeIn -= dt) <= 0) {
      this.smokeIn = 0.25;
      const c = this.view.fp.cam.position;
      for (const u of this.state.units) {
        if (u.patrol < 0 && !u.convoy && !u.reserve) continue;
        const hurt = u.disarmed || u.blind || (u.hp ?? UNITS[u.kind].hp) < UNITS[u.kind].hp * 0.5;
        if (!hurt || (u.dead && this.state.time - (u.stop?.t ?? 0) > 120 * SCALE)) continue;
        const q = unitPose(this.world, u, this.state.time);
        if (Math.hypot(q.x - c.x, q.z - c.z) > 50) continue;
        const h = u.kind === 'humanoid' ? 1.5 : u.kind === 'quadruped' ? 0.8 : 0.1;
        this.marks.puff(q.x, q.y + h, q.z);
        if (Math.random() < 0.3) this.marks.add({ t: 'mark', x: q.x, y: q.y + h, z: q.z, nx: 0, ny: 1, nz: 0, kind: 'bullet', on: 'machine' });
      }
    }
    // Aimed through the 4x scope (U-058): the view through it, the gun out of sight behind it.
    const scoped = !!gun && this.gun.ads > 0.85 && zoomOf(heldStack(this.state)?.mods) > 1;
    this.hud.setScope(scoped);
    if (scoped) this.hands.group.visible = false;
    const task = this.state.task;
    this.motion.update(dt, this.hands.group, this.heldId, { bob: this.view.fp.bob, speed: p.onGround ? Math.hypot(p.vel.x, p.vel.z) : 0, yaw: this.input.yaw, pitch: this.input.pitch, ads: this.gun.ads, reload: task?.id === 'reload' ? task.t / task.dur : -1 });
    this.inv.update();
    this.updatePrompt();
    this.updateHeld();
    this.hud.tick(dt);
    this.furniture.sync(this.state, this.world);
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
    this.view.setLamp(this.state.player.lamp);
    this.raidLight.update(this.state.tick / 60, this.state.raid, cam);
    this.loot.update(this.state, this.world, this.view.fp.cam.position, this.state.tick / 60);
    this.units?.update(this.world, this.state.units, this.state.time + alpha * GAME_PER_TICK, this.view.fp.cam.position);
    // What he hears of the city and its machines (audio/soundscape.ts).
    this.alarmBoards();
    this.sound.update(dt, this.state, this.world, this.view.fp.cam, wet || this.under > 0.5);
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
    const hk = hide >= 0 ? HIDE_NAMES[this.world.hides[hide].kind] ?? ['躲进去', 'Hide'] : null;
    // A line to ride in reach of empty hands (M3-52).
    const line = !it && !hk && s.inv.held === 0 && (s.player.mode === 'ground' || s.player.mode === 'air') && lineInReach(s, this.world).line >= 0;
    const [zh, en] = it ? interLabel(s, it) : ['', ''];
    this.hud.setPrompt(this.input.uiOpen ? '' : it ? `F  ${zh}  ${en}` : hk ? `F  ${hk[0]}  ${hk[1]}` : line ? 'LMB  抓住缆绳  Take the line' : '');
  }

  private updateHands(dt: number) {
    const p = this.state.player, cam = this.view.fp.cam;
    this.hands.group.visible = p.mode !== 'dead' && p.mode !== 'hidden' && !this.input.uiOpen;
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
      if (this.pause.open) this.acc = 0;
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
