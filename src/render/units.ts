// The machines, drawn (M4-01, M4-01b, M4-26): each unit where the sim says it is at the moment drawn, within sight of
// the camera: the beats' walkers, the columns marching out of the factory, the cameras and sensors. Their models are
// rigs (render/machines.ts) posed from how each moves: its speed and stride from where it was last frame, its gun up
// while it has him in its sights, crouched holding cover.
import * as THREE from 'three';
import { unitPose, type Unit } from '../sim/units';
import type { World } from '../world/world';
import type { UnitKind } from '../data/units';
import { SCALE } from '../sim/clock';
import { RIGS, type Anim } from './machines';

/** How near a unit must be to be drawn. */
const NEAR = 220;
const KINDS = Object.keys(RIGS) as UnitKind[];
/** Metres of ground a stride's half covers, by kind (its phase advances with the ground it covers). */
const STRIDE: Partial<Record<UnitKind, number>> = { humanoid: 0.75, heavy: 1.2, quadruped: 0.45, carrier: 1.1, delivery: 0.11 };

/** Every unit in one batch, each part of it an instance: one draw call for all the machines near him. */
export class UnitView {
  readonly group = new THREE.Group();
  private batch: THREE.BatchedMesh;
  /** each unit's instances (one a part), and whether it's drawn */
  private ids: number[][] = [];
  private on: boolean[] = [];
  /** each unit as last drawn: where and when (real seconds), its speed eased, its stride's phase, gun up, crouched */
  private last: { x: number; z: number; t: number; speed: number; phase: number; aim: number; crouch: number }[] = [];
  private m = new THREE.Matrix4();
  private s = new THREE.Matrix4();
  private part = new THREE.Matrix4();
  private parts = Array.from({ length: 16 }, () => new THREE.Matrix4());
  private anim: Anim = { speed: 0, phase: 0, aim: 0, crouch: 0, t: 0 };

  constructor(units: Unit[]) {
    const verts = KINDS.reduce((a, k) => a + RIGS[k].parts.reduce((b, g) => b + g.attributes.position.count, 0), 0);
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    mat.onBeforeCompile = sh => {
      sh.vertexShader = 'attribute float glow;\nvarying float vGlow;\n' + sh.vertexShader.replace('#include <color_vertex>', '#include <color_vertex>\nvGlow = glow;');
      sh.fragmentShader = 'varying float vGlow;\n' + sh.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive + vColor.rgb * vGlow;');
    };
    mat.customProgramCacheKey = () => 'units';
    this.batch = new THREE.BatchedMesh(Math.max(1, units.reduce((a, u) => a + RIGS[u.kind].parts.length, 0)), verts, 0, mat);
    const geo = Object.fromEntries(KINDS.map(k => [k, RIGS[k].parts.map(g => this.batch.addGeometry(g))])) as Record<UnitKind, number[]>;
    for (const u of units) {
      this.ids.push(geo[u.kind].map(g => { const id = this.batch.addInstance(g); this.batch.setVisibleAt(id, false); return id; }));
      this.on.push(false);
      this.last.push({ x: 0, z: 0, t: -1, speed: 0, phase: u.id, aim: 0, crouch: 0 });
    }
    this.batch.frustumCulled = false;
    this.group.add(this.batch);
  }

  update(w: World, units: Unit[], time: number, cam: THREE.Vector3) {
    let shown = 0;
    const t = time / SCALE, a = this.anim;
    units.forEach((u, i) => {
      // (An idle camera's housing still shows, M4-16, and a machine that's out where it stopped, M4-17.)
      const p = unitPose(w, u, time), on = (p.active || u.cam !== undefined || !!u.stop) && u.kind !== 'lamppost' && Math.hypot(p.x - cam.x, p.z - cam.z) <= NEAR;
      if (on !== this.on[i]) { for (const id of this.ids[i]) this.batch.setVisibleAt(id, on); this.on[i] = on; }
      if (!on) return;
      // How it moves: its speed and stride from where it was (not across a jump: first drawn, or put somewhere), its
      // rifle up while it has him in its sights, crouched at the cover it holds.
      const L = this.last[i], dt = t - L.t, d = Math.hypot(p.x - L.x, p.z - L.z), k = Math.min(1, Math.max(0, dt) * 6);
      if (dt > 0 && dt < 1 && d < 25 * dt + 0.2) { L.speed += (d / dt - L.speed) * k; L.phase += (d / (STRIDE[u.kind] ?? 1)) * Math.PI; }
      const cover = u.trip?.cover, crouch = cover && Math.hypot(cover.x - p.x, cover.z - p.z) < 0.8 ? 1 : 0;
      L.aim += ((u.aim ? 1 : 0) - L.aim) * k; L.crouch += (crouch - L.crouch) * k;
      L.x = p.x; L.z = p.z; L.t = t;
      Object.assign(a, { speed: u.dead || u.shut ? 0 : L.speed, phase: L.phase, aim: L.aim, crouch: L.crouch, t: u.dead || u.shut ? 0 : t + u.id });
      this.m.makeRotationY(p.yaw).setPosition(p.x, p.y, p.z);
      // A tripwire's beam stretched to its far end.
      const to = u.cam !== undefined ? w.cameras[u.cam].to : undefined;
      if (to) this.m.multiply(this.s.makeScale(1, 1, Math.hypot(to.x - p.x, to.y - p.y, to.z - p.z)));
      RIGS[u.kind].pose(a, this.parts);
      this.ids[i].forEach((id, j) => this.batch.setMatrixAt(id, this.part.multiplyMatrices(this.m, this.parts[j])));
      shown++;
    });
    this.batch.visible = shown > 0;
  }

  dispose() { this.batch.dispose(); this.group.removeFromParent(); }
}
