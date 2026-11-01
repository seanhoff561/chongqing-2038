// The machines, drawn (M4-01, M4-01b, M4-26): each unit where the sim says it is at the moment drawn, within sight of
// the camera: the beats' walkers, the columns marching out of the factory, the cameras and sensors. Their models are
// rigs (render/machines.ts) posed from how each moves: its speed and stride from where it was last frame, its gun up
// while it has him in its sights, crouched holding cover. Their lights show their state (M4-27): white unaware, amber
// suspicious, red engaged; out, dark.
import * as THREE from 'three';
import { unitPose, type Unit } from '../sim/units';
import type { World } from '../world/world';
import type { UnitKind } from '../data/units';
import { SCALE } from '../sim/clock';
import { RIGS, type Anim } from './machines';
import { night } from './materials';

/** How near a unit must be to be drawn. */
const NEAR = 220;
const KINDS = Object.keys(RIGS) as UnitKind[];
/** Metres of ground a stride's half covers, by kind (its phase advances with the ground it covers). */
const LIGHT = { unaware: new THREE.Color(1, 1, 1), suspicious: new THREE.Color(1, 0.55, 0.08), engaged: new THREE.Color(1, 0.1, 0.06), out: new THREE.Color(0, 0, 0) };
/** Their lights brighter after dark (U-050). */
const BOOST = { value: 1 };
const STRIDE: Partial<Record<UnitKind, number>> = { humanoid: 0.75, heavy: 1.2, spider: 6.3, colossus: 2.6, quadruped: 0.45, carrier: 1.1, delivery: 0.11 };

/** How many of each kind can be drawn at once (M4-83): the nearest within NEAR get an instance set from their kind's
 *  pool, so the batch (and the matrices it uploads each frame) is sized to what's near him, not to the whole city. */
const POOL: Partial<Record<UnitKind, number>> = { humanoid: 110, quadruped: 110, drone: 40, hunter: 30, fpv: 12, bomber: 8, spider: 6, colossus: 4, heavy: 8, carrier: 16, delivery: 16, camera: 160, sweeper: 8, turret: 40, pir: 12, tripwire: 4, acoustic: 8 };
/** Frames between looks at a unit last seen this far past NEAR: none comes 50 m in half a second. */
const RECHECK = 30;

/** Every unit near him in one batch, each part of it an instance: one draw call for all the machines near him. */
export class UnitView {
  readonly group = new THREE.Group();
  private batch: THREE.BatchedMesh;
  /** each kind's instance sets (one instance a part) and which are free */
  private pool = new Map<UnitKind, { sets: number[][]; free: number[] }>();
  /** each unit's instance set from its kind's pool (-1: not drawn), its lights as last set, frames till it's looked at
   *  again if it was far */
  private slot: number[] = [];
  private lit: (keyof typeof LIGHT)[] = [];
  private wait: number[] = [];
  /** each unit as last drawn: where and when (real seconds), its speed eased, its stride's phase, gun up, crouched */
  private last: { x: number; z: number; t: number; speed: number; phase: number; aim: number; crouch: number }[] = [];
  private m = new THREE.Matrix4();
  private s = new THREE.Matrix4();
  private part = new THREE.Matrix4();
  private parts = Array.from({ length: 24 }, () => new THREE.Matrix4());
  private anim: Anim = { speed: 0, phase: 0, aim: 0, crouch: 0, t: 0 };

  constructor(units: Unit[]) {
    const kinds = KINDS.filter(k => POOL[k]), n = (k: UnitKind) => Math.min(POOL[k]!, units.filter(u => u.kind === k).length);
    const verts = kinds.reduce((a, k) => a + RIGS[k].parts.reduce((b, g) => b + g.attributes.position.count, 0), 0);
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    // (Each unit's colour tints its lights only, not its paint.)
    mat.onBeforeCompile = sh => {
      const chunk = THREE.ShaderChunk.color_vertex.replace('vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );', 'vTint = getBatchingColor( getIndirectIndex( gl_DrawID ) ).rgb;');
      sh.vertexShader = 'attribute float glow;\nvarying float vGlow;\nvarying vec3 vTint;\n' + sh.vertexShader.replace('#include <color_vertex>', 'vTint = vec3(1.0);\n' + chunk + '\nvGlow = glow;');
      sh.uniforms.boost = BOOST;
      sh.fragmentShader = 'varying float vGlow;\nvarying vec3 vTint;\nuniform float boost;\n' + sh.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive + vColor.rgb * vGlow * vTint * boost;');
    };
    mat.customProgramCacheKey = () => 'units';
    this.batch = new THREE.BatchedMesh(Math.max(1, kinds.reduce((a, k) => a + n(k) * RIGS[k].parts.length, 0)), Math.max(1, verts), 0, mat);
    for (const k of kinds) {
      const geo = RIGS[k].parts.map(g => this.batch.addGeometry(g)), sets: number[][] = [];
      for (let i = 0; i < n(k); i++) sets.push(geo.map(g => { const id = this.batch.addInstance(g); this.batch.setVisibleAt(id, false); this.batch.setColorAt(id, LIGHT.unaware); return id; }));
      this.pool.set(k, { sets, free: sets.map((_, i) => i).reverse() });
    }
    this.batch.frustumCulled = false;
    this.group.add(this.batch);
  }

  /** Its kind's instance set back in the pool. */
  private release(i: number, kind: UnitKind) {
    const pl = this.pool.get(kind)!;
    for (const id of pl.sets[this.slot[i]]) this.batch.setVisibleAt(id, false);
    pl.free.push(this.slot[i]);
    this.slot[i] = -1;
  }

  update(w: World, units: Unit[], time: number, cam: THREE.Vector3) {
    let shown = 0;
    const t = time / SCALE, a = this.anim;
    BOOST.value = 1 + 1.6 * night.k;
    while (this.slot.length < units.length) { this.slot.push(-1); this.lit.push('unaware'); this.wait.push(0); this.last.push({ x: 0, z: 0, t: -1, speed: 0, phase: this.last.length, aim: 0, crouch: 0 }); }
    units.forEach((u, i) => {
      const pl = this.pool.get(u.kind);
      if (!pl) return;
      // (Far off last time: looked at again only now and then.)
      if (this.wait[i] > 0) { this.wait[i]--; return; }
      // (An idle camera's housing still shows, M4-16, and a machine that's out where it stopped, M4-17.)
      const p = unitPose(w, u, time), d2 = Math.hypot(p.x - cam.x, p.z - cam.z), on = (p.active || u.cam !== undefined || !!u.stop) && d2 <= NEAR;
      if (!on) { if (this.slot[i] >= 0) this.release(i, u.kind); if (d2 > NEAR + 50) this.wait[i] = RECHECK; return; }
      if (this.slot[i] < 0) {
        const k = pl.free.pop();
        if (k === undefined) return;
        this.slot[i] = k;
        for (const id of pl.sets[k]) { this.batch.setVisibleAt(id, true); this.batch.setColorAt(id, LIGHT[this.lit[i]]); }
        this.last[i].t = -1;
      }
      const ids = pl.sets[this.slot[i]];
      // How it moves: its speed and stride from where it was (not across a jump: first drawn, or put somewhere), its
      // rifle up while it has him in its sights, crouched at the cover it holds.
      const L = this.last[i], dt = t - L.t, d = Math.hypot(p.x - L.x, p.z - L.z), k = Math.min(1, Math.max(0, dt) * 6);
      if (dt > 0 && dt < 1 && d < 25 * dt + 0.2) { L.speed += (d / dt - L.speed) * k; L.phase += (d / (STRIDE[u.kind] ?? 1)) * Math.PI; }
      const cover = u.trip?.cover, crouch = cover && Math.hypot(cover.x - p.x, cover.z - p.z) < 0.8 ? 1 : 0;
      L.aim += ((u.aim ? 1 : 0) - L.aim) * k; L.crouch += (crouch - L.crouch) * k;
      L.x = p.x; L.z = p.z; L.t = t;
      const lit = u.dead || u.shut || !p.active ? 'out' : u.state;
      if (lit !== this.lit[i]) { for (const id of ids) this.batch.setColorAt(id, LIGHT[lit]); this.lit[i] = lit; }
      Object.assign(a, { speed: u.dead || u.shut ? 0 : L.speed, phase: L.phase, aim: L.aim, crouch: L.crouch, t: u.dead || u.shut ? 0 : t + u.id });
      this.m.makeRotationY(p.yaw).setPosition(p.x, p.y, p.z);
      // A tripwire's beam stretched to its far end.
      const to = u.cam !== undefined ? w.cameras[u.cam].to : undefined;
      if (to) this.m.multiply(this.s.makeScale(1, 1, Math.hypot(to.x - p.x, to.y - p.y, to.z - p.z)));
      RIGS[u.kind].pose(a, this.parts);
      // Come apart (M4-62): a humanoid's sensor head shot off, its rifle shot out of its hands.
      if (u.kind === 'humanoid') { if (u.blind) this.parts[2].makeScale(0, 0, 0); if (u.disarmed) this.parts[11].makeScale(0, 0, 0); }
      ids.forEach((id, j) => this.batch.setMatrixAt(id, this.part.multiplyMatrices(this.m, this.parts[j])));
      shown++;
    });
    this.batch.visible = shown > 0;
  }

  dispose() { this.batch.dispose(); this.group.removeFromParent(); }
}
