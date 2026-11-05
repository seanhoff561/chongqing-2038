// The machines, drawn (M4-01, M4-01b, M4-26): each unit where the sim says it is at the moment drawn, within sight of
// the camera: the beats' walkers, the columns marching out of the factory, the cameras and sensors. Their models are
// rigs (render/machines.ts) posed from how each moves: its speed and stride from where it was last frame, its gun up
// while it has him in its sights, crouched holding cover. Their lights show their state (M4-27): white unaware, amber
// suspicious, red engaged; out, dark. Destroyed (M10-47), one fades to a grey-black wreck over 1.5 s, and one on the
// ground comes down as a ragdoll (render/ragdoll.ts).
import * as THREE from 'three';
import { unitPose, type Unit } from '../sim/units';
import type { World } from '../world/world';
import type { UnitKind } from '../data/units';
import { SCALE } from '../sim/clock';
import { RIGS, lookOf, size, type Anim } from './machines';
import { surface } from './surfaces';
import { night } from './materials';
import { ragdoll, settle, type Ragdoll } from './ragdoll';
import { raycast } from '../world/geom';
import { STATIC, UNITS } from '../data/units';

/** How near a unit must be to be drawn. */
const NEAR = 220;
const KINDS = Object.keys(RIGS) as UnitKind[];
/** Metres of ground a stride's half covers, by kind (its phase advances with the ground it covers). */
const LIGHT = { unaware: new THREE.Color(1, 1, 1), suspicious: new THREE.Color(1, 0.55, 0.08), engaged: new THREE.Color(1, 0.1, 0.06), out: new THREE.Color(0, 0, 0) };
/** Their lights brighter after dark (U-050). */
const BOOST = { value: 1 };
const STRIDE: Partial<Record<UnitKind, number>> = { humanoid: 0.75, heavy: 1.2, spider: 9, colossus: 2.6, crawler: 0.18, quadruped: 0.45, carrier: 1.1, delivery: 0.11 };

/** How many of each kind can be drawn at once (M4-83): the nearest within NEAR get an instance set from their kind's
 *  pool, so the batch (and the matrices it uploads each frame) is sized to what's near him, not to the whole city. */
const POOL: Partial<Record<UnitKind, number>> = { humanoid: 110, quadruped: 110, drone: 70, hunter: 30, fpv: 12, bomber: 8, spider: 6, colossus: 4, heli: 1, crawler: 16, heavy: 8, carrier: 16, delivery: 16, camera: 160, sweeper: 8, turret: 40, pir: 12, tripwire: 4, acoustic: 8 };
/** Frames between looks at a unit last seen this far past NEAR: none comes 50 m in half a second. */
const RECHECK = 30;
/** Seconds a destroyed machine takes to go grey-black. */
const FADE = 1.5;
const C4 = new THREE.Vector4();

/** Every unit near him in one batch, each part of it an instance: one draw call for all the machines near him. */
export class UnitView {
  readonly group = new THREE.Group();
  private batch: THREE.BatchedMesh;
  /** each kind's instance sets (one instance a part), which are free, and its looks' geometries in the batch (a unit's
   *  set given its own look's when it takes it, M10-44) */
  private pool = new Map<UnitKind, { sets: number[][]; free: number[]; looks: number[][] }>();
  /** each unit's instance set from its kind's pool (-1: not drawn), its lights as last set, frames till it's looked at
   *  again if it was far */
  private slot: number[] = [];
  private lit: (keyof typeof LIGHT)[] = [];
  private wait: number[] = [];
  /** each unit as last drawn: where and when (real seconds), its speed eased, its stride's phase, gun up, crouched */
  private last: { x: number; z: number; t: number; speed: number; phase: number; aim: number; crouch: number }[] = [];
  private m = new THREE.Matrix4();
  private s = new THREE.Matrix4();
  private parts = Array.from({ length: 24 }, () => new THREE.Matrix4());
  private anim: Anim = { speed: 0, phase: 0, aim: 0, crouch: 0, t: 0, v: 0 };
  /** each unit's paint as last set (1 its white, 0 a grey-black wreck), when it was seen destroyed (real seconds), and
   *  its parts come down (a machine on the ground) */
  private paint: number[] = [];
  private gone: number[] = [];
  private rag: (Ragdoll | undefined)[] = [];
  private foot = new THREE.Vector3();

  constructor(units: Unit[]) {
    const kinds = KINDS.filter(k => POOL[k]), n = (k: UnitKind) => Math.min(POOL[k]!, units.filter(u => u.kind === k).length);
    const verts = kinds.reduce((a, k) => a + RIGS[k].looks.flat().reduce((b, g) => b + g.attributes.position.count, 0), 0);
    // (Their plates painted with seams, rivets, scuffs and grime low down: M4-99.)
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, map: surface('panel') });
    // (Each unit's colour tints its lights only, not its paint; its alpha is how far its paint is left, M10-47: less, the
    // nearer a grey-black.)
    mat.onBeforeCompile = sh => {
      const chunk = THREE.ShaderChunk.color_vertex.replace('vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );', 'vec4 bc = getBatchingColor( getIndirectIndex( gl_DrawID ) ); vTint = bc.rgb;'
        + ' vColor.rgb = mix( vec3( 0.05 + 0.08 * dot( vColor.rgb, vec3( 0.3, 0.59, 0.11 ) ) ), vColor.rgb, bc.a );');
      sh.vertexShader = 'attribute float glow;\nvarying float vGlow;\nvarying vec3 vTint;\n' + sh.vertexShader.replace('#include <color_vertex>', 'vTint = vec3(1.0);\n' + chunk + '\nvGlow = glow;');
      sh.uniforms.boost = BOOST;
      sh.fragmentShader = 'varying float vGlow;\nvarying vec3 vTint;\nuniform float boost;\n' + sh.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive + vColor.rgb * vGlow * vTint * boost;');
    };
    mat.customProgramCacheKey = () => 'units';
    this.batch = new THREE.BatchedMesh(Math.max(1, kinds.reduce((a, k) => a + n(k) * RIGS[k].parts.length, 0)), Math.max(1, verts), 0, mat);
    for (const k of kinds) {
      const looks = RIGS[k].looks.map(l => l.map(g => this.batch.addGeometry(g))), sets: number[][] = [];
      for (let i = 0; i < n(k); i++) sets.push(looks[0].map(g => { const id = this.batch.addInstance(g); this.batch.setVisibleAt(id, false); this.batch.setColorAt(id, LIGHT.unaware); return id; }));
      this.pool.set(k, { sets, free: sets.map((_, i) => i).reverse(), looks });
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

  /** Its lights and how far its paint is left, on each of its parts. */
  private tint(ids: number[], lit: keyof typeof LIGHT, paint: number) {
    const c = LIGHT[lit];
    for (const id of ids) this.batch.setColorAt(id, C4.set(c.r, c.g, c.b, paint));
  }

  update(w: World, units: Unit[], time: number, cam: THREE.Vector3) {
    let shown = 0;
    const t = time / SCALE;
    BOOST.value = 1 + 1.6 * night.k;
    while (this.slot.length < units.length) { this.slot.push(-1); this.lit.push('unaware'); this.wait.push(0); this.last.push({ x: 0, z: 0, t: -1, speed: 0, phase: this.last.length, aim: 0, crouch: 0 }); this.paint.push(1); this.gone.push(NaN); this.rag.push(undefined); }
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
        const look = pl.looks[u.id % pl.looks.length];
        pl.sets[k].forEach((id, j) => { this.batch.setVisibleAt(id, true); this.batch.setGeometryIdAt(id, look[j]); });
        this.tint(pl.sets[k], this.lit[i], this.paint[i]);
        this.last[i].t = -1;
      }
      const ids = pl.sets[this.slot[i]];
      // (Destroyed just now if it was drawn just now: it falls and fades as he watches; else it was already a wreck.)
      const L = this.last[i], dt = t - L.t;
      if (u.dead && Number.isNaN(this.gone[i])) this.gone[i] = L.t >= 0 && dt < 1 ? t : -Infinity;
      // How it moves: its speed and stride from where it was (not across a jump: first drawn, or put somewhere), its
      // rifle up while it has him in its sights, crouched at the cover it holds.
      const d = Math.hypot(p.x - L.x, p.z - L.z), k = Math.min(1, Math.max(0, dt) * 6);
      if (dt > 0 && dt < 1 && d < 25 * dt + 0.2) { L.speed += (d / dt - L.speed) * k; L.phase += (d / (STRIDE[u.kind] ?? 1)) * Math.PI; }
      const cover = u.trip?.cover, crouch = cover && Math.hypot(cover.x - p.x, cover.z - p.z) < 0.8 ? 1 : 0;
      L.aim += ((u.aim ? 1 : 0) - L.aim) * k; L.crouch += (crouch - L.crouch) * k;
      L.x = p.x; L.z = p.z; L.t = t;
      const lit = u.dead || u.shut || !p.active ? 'out' : u.state, paint = u.dead ? Math.max(0, 1 - (t - this.gone[i]) / FADE) : 1;
      if (lit !== this.lit[i] || paint !== this.paint[i]) { this.tint(ids, lit, paint); this.lit[i] = lit; this.paint[i] = paint; }
      // A machine on the ground destroyed comes down where it fell, its parts lying where they settle (on the ground
      // under each, or its feet's level): let go from how it stands now, already down if it was a wreck before he came.
      if (u.dead && !UNITS[u.kind].fly && !STATIC.has(u.kind)) {
        const ground = (x: number, y: number, z: number) => { const h = raycast(w.index, x, y + 0.1, z, 0, -1, 0, 60); return h ? y + 0.1 - h.t : p.y; };
        if (!this.rag[i]) {
          this.pose(w, u, p, L, t, ids.length);
          this.rag[i] = ragdoll(this.parts.slice(0, ids.length), lookOf(RIGS[u.kind], u.id), this.foot.set(p.x, p.y, p.z), u.id);
          if (this.gone[i] === -Infinity) settle(this.rag[i]!, 4, ground);
        }
        const rag = this.rag[i]!;
        settle(rag, Math.min(0.1, Math.max(0, dt)), ground);
        ids.forEach((id, j) => this.batch.setMatrixAt(id, rag.parts[j].m));
        shown++;
        return;
      }
      this.pose(w, u, p, L, t, ids.length);
      ids.forEach((id, j) => this.batch.setMatrixAt(id, this.parts[j]));
      shown++;
    });
    this.batch.visible = shown > 0;
  }

  /** Its parts' matrices (in the world) as it stands or moves now, into this.parts. */
  private pose(w: World, u: Unit, p: { x: number; y: number; z: number; yaw: number }, L: { speed: number; phase: number; aim: number; crouch: number }, t: number, n: number) {
    Object.assign(this.anim, { speed: u.dead || u.shut ? 0 : L.speed, phase: L.phase, aim: L.aim, crouch: L.crouch, t: u.dead || u.shut ? 0 : t + u.id, v: u.id });
    this.m.makeRotationY(p.yaw).setPosition(p.x, p.y, p.z);
    // Half the sewers' spider robots cling upside down to the roof of the run (U-069).
    if (u.kind === 'crawler' && u.id % 2 && !u.trip) this.m.multiply(this.s.makeTranslation(0, 1.85, 0)).multiply(this.s.makeRotationZ(Math.PI));
    // A tripwire's beam stretched to its far end.
    const to = u.cam !== undefined ? w.cameras[u.cam].to : undefined;
    if (to) this.m.multiply(this.s.makeScale(1, 1, Math.hypot(to.x - p.x, to.y - p.y, to.z - p.z)));
    // A camera shot out (U-093) hangs off its mount, its light dead.
    else if (u.dead && u.cam !== undefined) this.m.multiply(this.s.makeRotationX(0.95)).multiply(this.s.makeRotationZ(0.35));
    // (Each a little bigger or smaller than the next: M10-44.)
    const sz = size(u.kind, u.id);
    this.m.multiply(this.s.makeScale(sz, sz, sz));
    RIGS[u.kind].pose(this.anim, this.parts);
    // Come apart (M4-62): a humanoid's sensor head shot off, its rifle shot out of its hands.
    if (u.kind === 'humanoid') { if (u.blind) this.parts[2].makeScale(0, 0, 0); if (u.disarmed) this.parts[11].makeScale(0, 0, 0); }
    for (let j = 0; j < n; j++) this.parts[j].premultiply(this.m);
  }

  dispose() { this.batch.dispose(); this.group.removeFromParent(); }
}
