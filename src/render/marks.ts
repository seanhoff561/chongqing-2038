// The marks of damage (M4-61, U-052): where a round or a blow lands it leaves its mark (a bullet hole chipped out of
// concrete, a bright pock in metal, a crowbar's scrape, a knife's nick), laid flat on the surface and kept, the oldest
// going once there are too many; and at the moment it lands, sparks off metal and machines, a puff of grit off stone.
import * as THREE from 'three';
import type { SimEvent } from '../sim/types';

type Mark = Extract<SimEvent, { t: 'mark' }>;
const CAP = 160, SPARKS = 240;

/** A mark's picture, drawn once on a canvas. */
function art(kind: 'hole' | 'pock' | 'scrape'): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!, r = (a: number) => (Math.sin(a * 12.9898) * 43758.5453) % 1;
  if (kind === 'scrape') {
    for (let i = 0; i < 7; i++) { g.strokeStyle = `rgba(${i % 2 ? 210 : 40},${i % 2 ? 205 : 40},${i % 2 ? 195 : 40},0.75)`; g.lineWidth = 1 + (i % 3); g.beginPath(); g.moveTo(6, 22 + i * 3); g.lineTo(58, 26 + i * 3 + r(i) * 4); g.stroke(); }
  } else {
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 28);
    if (kind === 'hole') { grad.addColorStop(0, 'rgba(10,10,10,1)'); grad.addColorStop(0.25, 'rgba(30,28,26,0.95)'); grad.addColorStop(0.5, 'rgba(120,115,105,0.6)'); grad.addColorStop(1, 'rgba(120,115,105,0)'); }
    else { grad.addColorStop(0, 'rgba(25,25,28,1)'); grad.addColorStop(0.3, 'rgba(220,220,225,0.9)'); grad.addColorStop(0.55, 'rgba(160,160,170,0.4)'); grad.addColorStop(1, 'rgba(160,160,170,0)'); }
    g.fillStyle = grad; g.beginPath();
    for (let a = 0; a <= 16; a++) { const t = (a / 16) * Math.PI * 2, rr = 22 + Math.abs(r(a + (kind === 'hole' ? 3 : 7))) * 8; g.lineTo(32 + Math.cos(t) * rr, 32 + Math.sin(t) * rr); }
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Marks {
  readonly group = new THREE.Group();
  private sets: Record<'hole' | 'pock' | 'scrape', { mesh: THREE.InstancedMesh; n: number }>;
  private sparks: THREE.Points;
  private vel = new Float32Array(SPARKS * 3);
  private life = new Float32Array(SPARKS);
  /** smoke rises where sparks fall */
  private rise = new Uint8Array(SPARKS);
  private next = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();

  constructor() {
    const set = (kind: 'hole' | 'pock' | 'scrape', size: number) => {
      const mat = new THREE.MeshLambertMaterial({ map: art(kind), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
      const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(size * (kind === 'scrape' ? 2.5 : 1), size), mat, CAP);
      mesh.count = 0; mesh.frustumCulled = false; this.group.add(mesh);
      return { mesh, n: 0 };
    };
    this.sets = { hole: set('hole', 0.09), pock: set('pock', 0.07), scrape: set('scrape', 0.12) };
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3));
    this.sparks = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.035, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.sparks.frustumCulled = false;
    this.group.add(this.sparks);
  }

  /** A round or blow landed: its mark kept (unless on a machine, which moves) and a burst of sparks or grit. */
  add(e: Mark) {
    const n = new THREE.Vector3(e.nx, e.ny, e.nz);
    if (e.on !== 'machine' && n.lengthSq() > 0.5) {
      const kind = e.kind !== 'bullet' ? 'scrape' : e.on === 'metal' ? 'pock' : 'hole', s = this.sets[kind];
      this.q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.random() * Math.PI));
      this.m.compose(new THREE.Vector3(e.x, e.y, e.z).addScaledVector(n, 0.005), this.q, new THREE.Vector3(1, 1, 1));
      s.mesh.setMatrixAt(s.n % CAP, this.m);
      s.n++; s.mesh.count = Math.min(s.n, CAP); s.mesh.instanceMatrix.needsUpdate = true;
    }
    // Sparks off metal and machines (bright, fast), grit off stone (grey, slower); nothing off wood or cloth.
    const metal = e.on === 'metal' || e.on === 'machine', count = metal ? 14 : e.on === 'hard' ? 8 : 0;
    const pos = this.sparks.geometry.getAttribute('position') as THREE.BufferAttribute, col = this.sparks.geometry.getAttribute('color') as THREE.BufferAttribute;
    for (let k = 0; k < count; k++) {
      const i = this.next++ % SPARKS, sp = metal ? 3 + Math.random() * 3 : 1 + Math.random();
      pos.setXYZ(i, e.x, e.y, e.z);
      this.vel[i * 3] = (n.x + (Math.random() - 0.5) * 1.6) * sp; this.vel[i * 3 + 1] = (n.y + Math.random() * 0.8) * sp; this.vel[i * 3 + 2] = (n.z + (Math.random() - 0.5) * 1.6) * sp;
      this.life[i] = metal ? 0.35 : 0.5; this.rise[i] = 0;
      if (metal) col.setXYZ(i, 1, 0.75, 0.3); else col.setXYZ(i, 0.45, 0.43, 0.4);
    }
    pos.needsUpdate = col.needsUpdate = count > 0;
  }

  /** A puff of smoke off a hurt machine (M4-62): a few grey motes rising and drifting. */
  puff(x: number, y: number, z: number) {
    const pos = this.sparks.geometry.getAttribute('position') as THREE.BufferAttribute, col = this.sparks.geometry.getAttribute('color') as THREE.BufferAttribute;
    for (let k = 0; k < 4; k++) {
      const i = this.next++ % SPARKS;
      pos.setXYZ(i, x + (Math.random() - 0.5) * 0.3, y, z + (Math.random() - 0.5) * 0.3);
      this.vel[i * 3] = (Math.random() - 0.5) * 0.3; this.vel[i * 3 + 1] = 0.5 + Math.random() * 0.4; this.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
      this.life[i] = 1.4; this.rise[i] = 1; col.setXYZ(i, 0.22, 0.22, 0.22);
    }
    pos.needsUpdate = col.needsUpdate = true;
  }

  /** A new run: the old marks gone. */
  clear() { for (const s of Object.values(this.sets)) { s.n = 0; s.mesh.count = 0; } this.life.fill(0); }

  /** Every frame: the sparks flying and falling, fading out. */
  update(dt: number) {
    const pos = this.sparks.geometry.getAttribute('position') as THREE.BufferAttribute, col = this.sparks.geometry.getAttribute('color') as THREE.BufferAttribute;
    let live = false;
    for (let i = 0; i < SPARKS; i++) {
      if (this.life[i] <= 0) continue;
      live = true;
      this.life[i] -= dt;
      if (!this.rise[i]) this.vel[i * 3 + 1] -= 9.8 * dt;
      pos.setXYZ(i, pos.getX(i) + this.vel[i * 3] * dt, pos.getY(i) + this.vel[i * 3 + 1] * dt, pos.getZ(i) + this.vel[i * 3 + 2] * dt);
      if (this.life[i] <= 0) col.setXYZ(i, 0, 0, 0);
    }
    if (live) pos.needsUpdate = col.needsUpdate = true;
  }
}
