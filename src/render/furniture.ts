// Furniture he puts down (U-013): beds, crates, and the toolbox that turns a table into a workbench (square on its
// top, M10-25); what he drops, lying where it fell (M3-72); and his sister where she waits (M10-39).
import * as THREE from 'three';
import { itemModel } from './items3d';
import type { SimState } from '../sim/types';

const lam = (c: number) => new THREE.MeshLambertMaterial({ color: c });
const box = (w: number, h: number, d: number, m: THREE.Material, y = h / 2) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.y = y; return o; };

const MODELS: Record<string, () => THREE.Object3D> = {
  mattress: () => { const g = new THREE.Group(); g.add(box(0.9, 0.16, 1.9, lam(0x7d8790)), box(0.6, 0.1, 0.35, lam(0xb8b2a4), 0.21)); g.children[1].position.z = -0.7; return g; },
  bedroll: () => { const g = new THREE.Group(); g.add(box(0.7, 0.07, 1.9, lam(0x4f5a3a))); const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 10).rotateZ(Math.PI / 2), lam(0x3f4a2e)); roll.position.set(0, 0.12, -0.85); g.add(roll); return g; },
  foldcrate: () => box(0.6, 0.42, 0.42, lam(0x2d5a7a)),
  toolbox: () => { const g = new THREE.Group(); g.add(box(0.5, 0.22, 0.25, lam(0x9a2420)), box(0.3, 0.04, 0.03, lam(0x222222), 0.26)); return g; },
};

/** Xiaoyu (M10-39): a girl in a dark padded jacket and jeans, her black hair to her shoulders, her bag on her back;
 *  sat against the wall with her knees up while she waits, stood once she'll come. */
function sister(standing: boolean) {
  const g = new THREE.Group(), coat = lam(0x2a3140), jeans = lam(0x3a4a66), skin = lam(0xd9b59a), hair = lam(0x141414), bag = lam(0x6a3030);
  const part = (o: THREE.Object3D, x: number, y: number, z: number, rx = 0) => { o.position.set(x, y, z); o.rotation.x = rx; g.add(o); return o; };
  const mesh = (geo: THREE.BufferGeometry, m: THREE.Material) => new THREE.Mesh(geo, m);
  const hip = standing ? 0.82 : 0.12;
  for (const s of [-1, 1]) {
    if (standing) part(box(0.12, 0.8, 0.14, jeans, -0.4), s * 0.08, hip, 0);
    // (Sat: thighs up toward her chest, shins down to the floor.)
    else { part(box(0.12, 0.42, 0.13, jeans, 0.21), s * 0.08, hip, 0.02, 1.0); part(box(0.11, 0.4, 0.12, jeans, -0.2), s * 0.08, 0.4, 0.37, 0.15); }
    part(box(0.08, 0.5, 0.09, coat, -0.25), s * 0.2, hip + 0.48, standing ? 0 : 0.06, standing ? 0 : -0.9);
  }
  part(box(0.36, 0.52, 0.22, coat, 0.26), 0, hip, 0, standing ? 0 : -0.12);
  part(box(0.3, 0.38, 0.14, bag, 0.19), 0, hip + 0.1, -0.17, standing ? 0 : -0.12);
  const head = part(new THREE.Group(), 0, hip + 0.66, standing ? 0 : -0.06);
  head.add(mesh(new THREE.SphereGeometry(0.1, 12, 10), skin));
  // (Her hair over the top and down the back to her shoulders, her face clear.)
  const top = mesh(new THREE.SphereGeometry(0.108, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.3), hair), crown = mesh(new THREE.SphereGeometry(0.108, 8, 8, Math.PI, Math.PI, 0, Math.PI * 0.7), hair);
  const back = box(0.21, 0.22, 0.05, hair, -0.07);
  back.position.z = -0.075;
  head.add(top, crown, back);
  return g;
}

export class Furniture {
  readonly group = new THREE.Group();
  private sig = '';

  /** Rebuild when what's placed changes. */
  sync(s: SimState) {
    const sig = s.placed.map(p => p.id).join() + '|' + s.dropped.map(d => d.stack.uid).join() + '|' + (s.sister ? `${s.sister.x},${s.sister.z},${!!s.sister.with}` : '');
    if (sig === this.sig) return;
    this.sig = sig;
    this.group.clear();
    for (const p of s.placed) {
      const m = MODELS[p.item]?.();
      if (!m) continue;
      m.position.set(p.x, p.y, p.z);
      m.rotation.y = p.yaw;
      this.group.add(m);
    }
    for (const d of s.dropped) {
      const m = itemModel(d.stack.id);
      m.position.set(d.x, d.y + 0.05, d.z);
      m.rotation.set(Math.PI / 2, 0, d.stack.uid * 2.4);
      this.group.add(m);
    }
    if (s.sister) {
      const m = sister(!!s.sister.with);
      m.position.set(s.sister.x, s.sister.y, s.sister.z);
      // (The model faces +z; her yaw is the sim's, facing -z.)
      m.rotation.y = s.sister.yaw + Math.PI;
      this.group.add(m);
    }
  }
}
