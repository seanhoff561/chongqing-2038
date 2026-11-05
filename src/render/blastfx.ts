// Explosions (M10-65, U-107): a kamikaze's, a bomb's, a rocket's, a grenade's, a hunter drone's crash. A white flash
// that lights the street round it, a fireball rolling out and up, a dark smoke column that lingers and drifts on the
// wind, chunks of debris flung out and bouncing down, sparks, a shockwave ring racing out over the ground and a scorch
// left on it. Pooled: a few at once, the oldest giving way.
import * as THREE from 'three';
import type { World } from '../world/world';
import type { Marks } from './marks';
import { raycast } from '../world/geom';
import { rayGround } from '../world/heightfield';

const PUFFS = 96, CHUNKS = 64, RINGS = 4, SCORCH = 12;
/** the wind the smoke drifts on (m/s) */
const WIND = { x: 0.6, z: 0.25 };

/** A soft round blob, white (tinted by each sprite), for fire and smoke. */
function blob(lumpy: boolean): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const spot = (x: number, y: number, r: number, a: number) => {
    const q = g.createRadialGradient(x, y, 0, x, y, r);
    q.addColorStop(0, `rgba(255,255,255,${a})`); q.addColorStop(0.5, `rgba(255,255,255,${a * 0.6})`); q.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = q; g.fillRect(0, 0, 64, 64);
  };
  spot(32, 32, 30, 1);
  // (Smoke's billows: a few lumps round the middle.)
  if (lumpy) for (let i = 0; i < 6; i++) { const a = i * 1.05; spot(32 + Math.cos(a) * 11, 32 + Math.sin(a) * 11, 14, 0.5); }
  return new THREE.CanvasTexture(c);
}

/** The scorch a blast leaves on the ground: black at the heart, ragged out to nothing. */
function scorchArt(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, r = 20 + (i * 37) % 23, x = 64 + Math.cos(a) * 18, y = 64 + Math.sin(a) * 18;
    const q = g.createRadialGradient(x, y, 0, x, y, r);
    q.addColorStop(0, 'rgba(8,6,5,0.55)'); q.addColorStop(1, 'rgba(8,6,5,0)');
    g.fillStyle = q; g.fillRect(0, 0, 128, 128);
  }
  const q = g.createRadialGradient(64, 64, 0, 64, 64, 40);
  q.addColorStop(0, 'rgba(5,4,3,0.9)'); q.addColorStop(1, 'rgba(5,4,3,0)');
  g.fillStyle = q; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

type Puff = { s: THREE.Sprite; m: THREE.SpriteMaterial; v: THREE.Vector3; age: number; life: number; from: number; to: number; fire: boolean; dark: number };
type Chunk = { p: THREE.Vector3; v: THREE.Vector3; spin: THREE.Vector3; rot: THREE.Euler; size: number; floor: number; age: number };

export class Blasts {
  private puffs: Puff[] = [];
  private chunks: Chunk[] = [];
  private chunkMesh: THREE.InstancedMesh;
  private rings: { m: THREE.Mesh; mat: THREE.MeshBasicMaterial; age: number; r: number }[] = [];
  private scorch: THREE.InstancedMesh;
  private scorched = 0;
  private flash = new THREE.PointLight(0xffc27a, 0, 45, 1.5);
  private nextPuff = 0;
  private nextChunk = 0;
  private nextRing = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private one = new THREE.Vector3();

  constructor(scene: THREE.Scene, private marks: Marks) {
    const fire = blob(false), smoke = blob(true);
    for (let i = 0; i < PUFFS; i++) {
      // (Each sprite's own material, for its colour and fade.)
      const m = new THREE.SpriteMaterial({ map: i % 3 === 0 ? fire : smoke, transparent: true, depthWrite: false, opacity: 0, toneMapped: false });
      const s = new THREE.Sprite(m); s.visible = false; scene.add(s);
      this.puffs.push({ s, m, v: new THREE.Vector3(), age: 1, life: 0, from: 0, to: 0, fire: false, dark: 0 });
    }
    this.chunkMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x3a3430 }), CHUNKS);
    this.chunkMesh.frustumCulled = false; this.chunkMesh.count = 0; scene.add(this.chunkMesh);
    for (let i = 0; i < CHUNKS; i++) this.chunks.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), spin: new THREE.Vector3(), rot: new THREE.Euler(), size: 0, floor: 0, age: 99 });
    const ringGeo = new THREE.RingGeometry(0.93, 1, 48).rotateX(-Math.PI / 2);
    for (let i = 0; i < RINGS; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xfff0d8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      const m = new THREE.Mesh(ringGeo, mat); m.visible = false; scene.add(m);
      this.rings.push({ m, mat, age: 99, r: 1 });
    }
    this.scorch = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: scorchArt(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }), SCORCH);
    this.scorch.frustumCulled = false; this.scorch.count = 0; scene.add(this.scorch);
    scene.add(this.flash);
  }

  /** Something blew up at a point, hurting r m round. */
  add(e: { x: number; y: number; z: number; r: number }, w: World) {
    const at = new THREE.Vector3(e.x, e.y, e.z), r = e.r, rnd = Math.random;
    // What's under it: the ground the ring runs over, the debris lands on and the scorch is left on.
    const a = raycast(w.index, e.x, e.y + 0.2, e.z, 0, -1, 0, 6), g = w.ground ? rayGround(w.ground, e.x, e.y + 0.2, e.z, 0, -1, 0, 6) : null;
    const hit = !a ? g : !g ? a : a.t < g.t ? a : g, floor = hit ? e.y + 0.2 - hit.t : e.y - 6;
    // The flash.
    this.flash.position.copy(at).y += 0.5; this.flash.intensity = 60 * r;
    // The fireball: a white-hot core, then orange billows rolling out and up.
    this.puff(at, 0, 0, 0, 0.12, r * 0.5, r * 1.1, true, 0);
    for (let i = 0; i < 9; i++) {
      const v = new THREE.Vector3(rnd() - 0.5, rnd() * 0.8 + 0.2, rnd() - 0.5).normalize().multiplyScalar(r * (0.8 + rnd() * 0.7));
      this.puff(at, v.x, v.y, v.z, 0.5 + rnd() * 0.4, r * 0.2, r * (0.45 + rnd() * 0.3), true, 0);
    }
    // The smoke: thick and dark, rising in a column, spreading, drifting off and thinning over some seconds.
    for (let i = 0; i < 14; i++) {
      const v = new THREE.Vector3((rnd() - 0.5) * 1.6, 0.8 + rnd() * 2.4, (rnd() - 0.5) * 1.6);
      const p = at.clone().add(new THREE.Vector3((rnd() - 0.5) * r * 0.4, rnd() * 0.5, (rnd() - 0.5) * r * 0.4));
      this.puff(p, v.x, v.y, v.z, 6 + rnd() * 5, r * 0.25, r * (0.7 + rnd() * 0.6), false, 0.08 + rnd() * 0.12);
    }
    // The debris flung out, and sparks.
    for (let i = 0; i < 14; i++) {
      const c = this.chunks[this.nextChunk++ % CHUNKS], u = rnd() * Math.PI * 2, sp = 5 + rnd() * 9;
      c.p.copy(at); c.v.set(Math.cos(u) * sp * 0.7, 3 + rnd() * 8, Math.sin(u) * sp * 0.7);
      c.spin.set(rnd() * 12 - 6, rnd() * 12 - 6, rnd() * 12 - 6); c.rot.set(rnd() * 3, rnd() * 3, rnd() * 3);
      c.size = 0.04 + rnd() * 0.14; c.floor = floor; c.age = 0;
    }
    for (let i = 0; i < 3; i++) this.marks.add({ t: 'mark', x: e.x, y: e.y, z: e.z, nx: 0, ny: 1, nz: 0, kind: 'bullet', on: 'machine' });
    // The shockwave over the ground.
    const ring = this.rings[this.nextRing++ % RINGS];
    ring.age = 0; ring.r = r; ring.m.position.set(e.x, Math.max(floor, e.y - 2) + 0.08, e.z); ring.m.visible = true;
    // The scorch, on ground near enough under it and flat enough.
    if (hit && hit.ny > 0.7 && e.y - floor < 2.5) {
      this.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI * 2);
      this.m.compose(new THREE.Vector3(e.x, floor + 0.01, e.z), this.q, new THREE.Vector3(r * 0.7, 1, r * 0.7));
      this.scorch.setMatrixAt(this.scorched++ % SCORCH, this.m);
      this.scorch.count = Math.min(this.scorched, SCORCH); this.scorch.instanceMatrix.needsUpdate = true;
    }
  }

  private puff(at: THREE.Vector3, vx: number, vy: number, vz: number, life: number, from: number, to: number, fire: boolean, dark: number) {
    const p = this.puffs[this.nextPuff++ % PUFFS];
    p.s.position.copy(at); p.v.set(vx, vy, vz); p.age = 0; p.life = life; p.from = from; p.to = to; p.fire = fire; p.dark = dark;
    // (The white-hot core adds light; the billows are thick flame, seen against a bright sky too.)
    const add = fire && vx === 0 && vy === 0 && vz === 0;
    if ((p.m.blending === THREE.AdditiveBlending) !== add) { p.m.blending = add ? THREE.AdditiveBlending : THREE.NormalBlending; p.m.needsUpdate = true; }
    p.s.visible = true;
  }

  /** A new run: the old scorches and smoke gone. */
  clear() {
    this.scorched = 0; this.scorch.count = 0; this.flash.intensity = 0;
    for (const p of this.puffs) { p.age = p.life; p.s.visible = false; }
    for (const c of this.chunks) c.age = 99;
    for (const r of this.rings) { r.age = 99; r.m.visible = false; }
  }

  update(dt: number) {
    this.flash.intensity *= Math.exp(-14 * dt);
    if (this.flash.intensity < 0.5) this.flash.intensity = 0;
    for (const p of this.puffs) {
      if (!p.s.visible) continue;
      p.age += dt;
      const k = p.age / p.life;
      if (k >= 1) { p.s.visible = false; continue; }
      p.s.position.addScaledVector(p.v, dt);
      if (p.fire) {
        // (Rushing out, then slowing and climbing as it burns: white to orange to a dull red, gone.)
        p.v.multiplyScalar(Math.exp(-5 * dt)); p.v.y += 2 * dt;
        p.s.scale.setScalar(p.from + (p.to - p.from) * (1 - (1 - k) * (1 - k) * (1 - k)));
        p.m.color.setRGB(1 - 0.55 * k * k, 0.45 - 0.4 * k, 0.12 - 0.115 * k);
        p.m.opacity = 1 - k * k * k;
      } else {
        p.v.x += (WIND.x - p.v.x) * 0.3 * dt; p.v.z += (WIND.z - p.v.z) * 0.3 * dt; p.v.y *= Math.exp(-0.35 * dt);
        p.s.scale.setScalar(p.from + (p.to - p.from) * Math.sqrt(k));
        // (Lit from under by the fire at first.)
        const glow = Math.max(0, 1 - p.age * 2.5);
        p.m.color.setRGB(p.dark + glow * 0.6, p.dark + glow * 0.3, p.dark * 0.95 + glow * 0.08);
        p.m.opacity = Math.min(1, p.age * 4) * 0.85 * (1 - k);
      }
    }
    let n = 0;
    for (const c of this.chunks) {
      if (c.age > 6) continue;
      c.age += dt;
      if (c.p.y > c.floor + c.size / 2 || c.v.y > 0) {
        c.v.y -= 9.8 * dt; c.p.addScaledVector(c.v, dt);
        c.rot.x += c.spin.x * dt; c.rot.y += c.spin.y * dt; c.rot.z += c.spin.z * dt;
        if (c.p.y < c.floor + c.size / 2) { c.p.y = c.floor + c.size / 2; c.v.set(c.v.x * 0.4, -c.v.y * 0.3, c.v.z * 0.4); c.spin.multiplyScalar(0.5); if (c.v.y < 0.6) c.v.set(0, 0, 0); }
      }
      this.q.setFromEuler(c.rot);
      this.m.compose(c.p, this.q, this.one.setScalar(c.age > 5 ? c.size * (6 - c.age) : c.size));
      this.chunkMesh.setMatrixAt(n++, this.m);
    }
    this.chunkMesh.count = n;
    if (n) this.chunkMesh.instanceMatrix.needsUpdate = true;
    for (const r of this.rings) {
      if (!r.m.visible) continue;
      r.age += dt;
      const k = r.age / 0.4;
      if (k >= 1) { r.m.visible = false; continue; }
      r.m.scale.setScalar(0.5 + r.r * 2.5 * Math.sqrt(k));
      r.mat.opacity = 0.45 * (1 - k) * (1 - k);
    }
  }
}
