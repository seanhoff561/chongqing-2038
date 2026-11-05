// First-person camera: eye height by posture, head bob, landing dip, wall-run and cling lean, a blast's tumble and shake.
import * as THREE from 'three';
import { LEAN, type Player } from '../sim/player';
import type { Vec3 } from '../sim/types';
import { movement as M } from '../data/movement';

export class FPCamera {
  readonly cam: THREE.PerspectiveCamera;
  baseFov = 75;
  /** 0 none, 0.5 sprain, 1 broken leg: an uneven step */
  limp = 0;
  private eye = M.eye.stand;
  /** a blast's tumble so far (M4-64) */
  private tumble = 0;
  /** a blast's shake, 0..1, dying away (M10-65) */
  private trauma = 0;
  /** stride phase: one step per half turn, so arms swing with sin(bob) */
  bob = 0;
  private dip = 0;
  private roll = 0;
  private fov = 75;
  /** 0..1 eased sprint amount */
  sprint = 0;
  /** 0..1 aimed down the sights (M4-21b): the view narrows */
  zoom = 0;
  private lean = 0;

  constructor(aspect: number) {
    this.cam = new THREE.PerspectiveCamera(75, aspect, 0.05, 400);
    this.cam.rotation.order = 'YXZ';
  }

  landed(h: number) { if (h > 0.8) this.dip = Math.min(0.3, h * 0.045); }

  /** A blast felt, 0..1 by how near (M10-65): the view shakes hard and settles over a second or so. */
  shake(a: number) { this.trauma = Math.min(1, Math.max(this.trauma, a)); }

  update(p: Player, pos: Vec3, yaw: number, pitch: number, dt: number) {
    let target = M.eye[p.posture];
    const k = 1 - Math.exp(-12 * dt);
    this.eye += (target - this.eye) * k;
    const sp = Math.hypot(p.vel.x, p.vel.z);
    const walking = p.onGround && p.mode === 'ground' && sp > 0.3;
    if (walking) this.bob += dt * sp * 2.2;
    const amp = walking ? Math.min(1, sp / 7) : 0;
    this.dip *= Math.exp(-6 * dt);
    // Lean away from the wall on a wall-run, slightly while clinging to it.
    let rollTarget = 0;
    if (p.mode === 'wallrun' || p.mode === 'cling') rollTarget = (p.mode === 'wallrun' ? 0.14 : 0.08) * Math.sign(p.wall.nx * Math.cos(yaw) - p.wall.nz * Math.sin(yaw));
    // Leaning round a corner (U-032): the head out to the side and tipped that way.
    rollTarget -= p.lean * 0.14;
    // Thrown and down (M4-64): the view tumbles with him, then lies on its side till he's up.
    if (p.knock) this.tumble += dt * 9; else this.tumble *= Math.exp(-5 * dt);
    if (p.mode === 'down') rollTarget += 0.7;
    this.roll += (rollTarget - this.roll) * k;
    this.lean += (p.lean - this.lean) * k;
    // Sprinting has to read clearly (U-003): FOV kick, harder bob, a slight lean.
    const sprinting = walking && sp > 5.5;
    this.sprint += ((sprinting ? 1 : 0) - this.sprint) * (1 - Math.exp(-6 * dt));
    // Falling fast (M4-66): the view pulls wider and shakes with the rush.
    const rush = p.mode === 'air' ? Math.max(0, Math.min(1, (-p.vel.y - 8) / 18)) : 0;
    this.fov += (this.baseFov * (1 - 0.38 * this.zoom) + this.sprint * 9 + rush * 5 - this.fov) * k;
    if (Math.abs(this.cam.fov - this.fov) > 0.01) { this.cam.fov = this.fov; this.cam.updateProjectionMatrix(); }
    const limpDip = this.limp * (walking ? Math.max(0, Math.sin(this.bob)) * 0.09 : 0);
    const bobAmp = amp * (1 + this.sprint * 0.8);
    const by = Math.abs(Math.sin(this.bob)) * 0.045 * bobAmp - limpDip, bx = Math.sin(this.bob) * 0.025 * bobAmp;
    const out = bx + this.lean * LEAN.out;
    this.cam.position.set(pos.x + Math.cos(yaw) * out, pos.y + this.eye + by - this.dip - Math.abs(this.lean) * LEAN.dip, pos.z - Math.sin(yaw) * out);
    // (The pistol's kick lifts the view as it lifts his aim: M4-21.)
    // (A blast's shake: by the square of how hard it was felt, so a far one's a tremor and a near one throws the view.)
    const now = performance.now() * 0.001, tr = this.trauma * this.trauma;
    this.trauma = Math.max(0, this.trauma - dt * 0.9);
    const shake = rush * 0.003 * Math.sin(now * 50) + tr * 0.07 * (Math.sin(now * 47) + 0.5 * Math.sin(now * 91 + 1));
    this.cam.rotation.set(pitch + p.kick - this.sprint * 0.04 + Math.sin(this.tumble) * 0.5 * Math.min(1, this.tumble) + shake, yaw + tr * 0.05 * Math.sin(now * 39 + 2), this.roll + tr * 0.08 * Math.sin(now * 33 + 4) + limpDip * 0.4 + Math.sin(this.bob) * 0.006 * this.sprint + Math.sin(this.tumble * 0.7) * 0.6 * Math.min(1, this.tumble));
  }

  eyeHeight() { return this.eye; }
}
