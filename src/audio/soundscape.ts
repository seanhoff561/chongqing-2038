// Everything he hears of the world round him, put together each frame: the empty city's ambience and music for where
// he is (M4-51, M4-86), the machines where they are (M4-33), their dread (M4-52), gunfire as it carries (M4-54), his own breath
// and heartbeat (M4-55), and a raid's siren (M4-63).
import * as THREE from 'three';
import type { Audio } from './audio';
import { MachineVoices } from './machines';
import { Ambience, whereIs, type Where } from './ambience';
import { Dread } from './dread';
import { Breath } from './breath';
import { Music } from './music';
import { machineShot, echo } from './gunfire';
import { gunshot, raidSiren } from './moves';
import { loadSamples, samplesLoaded } from './samples';
import { raycast } from '../world/geom';
import type { World } from '../world/world';
import type { SimEvent, SimState } from '../sim/types';

/** The ways he holds on and climbs, hard work all. */
const CLIMBING = new Set(['grip', 'cling', 'wallclimb', 'wallrun', 'chimney']);

export class Soundscape {
  readonly voices: MachineVoices;
  readonly ambience: Ambience;
  readonly dread: Dread;
  readonly breath: Breath;
  readonly music: Music;
  /** where he is, looked at twice a second, and whether there's cover over him */
  env: { where: Where; covered: boolean; height: number } = { where: 'street', covered: false, height: 0 };
  private envIn = 0;
  private raidIn = 0;
  /** raid sirens sounded (M4-63) */
  raidSirens = 0;
  private fwd = new THREE.Vector3();

  constructor(private a: Audio) {
    this.voices = new MachineVoices(a);
    this.ambience = new Ambience(a);
    this.dread = new Dread(a);
    this.breath = new Breath(a);
    this.music = new Music(a);
  }

  /** Every frame, his head the camera; under the ground or the water. */
  update(dt: number, s: SimState, w: World, cam: THREE.Camera, under: boolean) {
    const head = cam.position;
    loadSamples(this.a);
    if ((this.envIn -= dt) <= 0) { this.envIn = 0.5; this.env = whereIs(w, head, under); }
    this.ambience.update(dt, { ...this.env, hour: (s.time / 3600) % 24, rain: s.weather.rain });
    // The music for where he is (M4-86): high up, in the streets, underground.
    this.music.update(this.env.where, this.env.height);
    this.voices.update(dt, s, w, head, cam.getWorldDirection(this.fwd));
    this.dread.update(dt, s, w, head, this.voices.nearest(head));
    // The raid breaking in on him: its siren, loud, through the 10 s (M4-63).
    if (s.raid && (this.raidIn -= dt) <= 0) { this.raidIn = 0.8; raidSiren(this.a); this.raidSirens++; }
    // His own breath and heart (M4-55): spent, hurt, or frightened by the city's alert.
    const p = s.player;
    this.breath.update(dt, p.endurance, s.body.hp, this.dread.alert, Math.hypot(p.vel.x, p.vel.z), CLIMBING.has(p.mode));
  }

  /** How many recordings have loaded (M4-98). */
  get recorded() { return samplesLoaded(); }

  /** His pistol fired: its report, and unsuppressed, its echoes off what's round him. */
  fired(quiet: boolean) {
    gunshot(this.a, 0.9, quiet);
    if (!quiet && this.a.ready) echo(this.a, this.env.where, 0.25, this.a.ctx!.currentTime);
  }

  /** A machine's round: its crack if it missed him, its report late and dull with distance, muffled through walls. */
  shot(e: Extract<SimEvent, { t: 'shot' }>, w: World, head: THREE.Vector3) {
    const d = Math.hypot(e.x - head.x, e.y - head.y, e.z - head.z);
    if (d > 400 || !this.a.ready) return;
    const walls = d > 0.5 && !!raycast(w.index, e.x, e.y + 1, e.z, (head.x - e.x) / d, (head.y - e.y - 1) / d, (head.z - e.z) / d, d - 0.5);
    machineShot(this.a, e, d, !!e.crack, walls, this.env.where);
  }
}
