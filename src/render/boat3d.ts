// The river police's patrol boat (M7-08), drawn where the run has it (sim/boat.ts), or moored at their pier till he's
// worked on it: a white hull with the police's blue band, a pointed bow, a wheelhouse forward with its windows and a
// light on its roof, the helm aft; Xiaoyu sat in the bow once she's come down into it (M7-09).
import * as THREE from 'three';
import type { SimState } from '../sim/types';
import type { World, Inter } from '../world/world';
import { PIER } from '../world/yuzhong/pier';
import { BOAT } from '../sim/boat';
import { sisterModel, merged } from './furniture';

const lam = (c: number) => new THREE.MeshLambertMaterial({ color: c });

/** The hull, its length along -z (the bow) as the sim's yaw 0 looks. */
function hull() {
  const [L, W] = PIER.hull, g = new THREE.Group(), white = lam(0xe8e8e2), blue = lam(0x1f4f9a), dark = lam(0x2a2e33), glass = lam(0x324a5a);
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
  // (A box for the middle and stern, its deck at his feet; the bow a wedge.)
  const body = L * 0.75, nose = L - body, z0 = L / 2 - body, top = 0.2 + BOAT.deck;
  add(new THREE.BoxGeometry(W, 1.6, body), white, 0, top - 0.8, L / 2 - body / 2);
  add(new THREE.BoxGeometry(W + 0.02, 0.22, body), blue, 0, top - 0.3, L / 2 - body / 2);
  const tri = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(0, nose)]);
  add(new THREE.ExtrudeGeometry(tri, { depth: 1.6, bevelEnabled: false }).rotateX(-Math.PI / 2), white, 0, top - 1.6, z0);
  add(new THREE.BoxGeometry(W - 0.3, 0.04, body - 0.3), dark, 0, top, L / 2 - body / 2);
  // The wheelhouse, its windows, the light; the wheel aft of it at the helm.
  add(new THREE.BoxGeometry(2, 1.6, 2.2), white, 0, top + 0.8, -0.3);
  add(new THREE.BoxGeometry(2.02, 0.5, 2.22), glass, 0, top + 1.2, -0.3);
  add(new THREE.BoxGeometry(0.5, 0.15, 0.25), blue, 0, top + 1.68, -0.3);
  add(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 12).rotateX(Math.PI / 2.6), dark, 0, top + 1.0, BOAT.helm - 0.6);
  return g;
}

export class BoatView {
  readonly group = new THREE.Group();
  private girl: THREE.Object3D;
  /** where it's moored in the world it was last looked up in */
  private moor?: { w: World; it?: Inter };

  constructor(scene: THREE.Scene) {
    this.group.add(merged(hull()));
    this.girl = merged(sisterModel(false));
    this.girl.position.set(0, 0.2 + BOAT.deck, -2.4);
    this.group.add(this.girl);
    this.group.visible = false;
    scene.add(this.group);
  }

  update(s: SimState, w: World) {
    if (this.moor?.w !== w) this.moor = { w, it: w.inter.find(i => i.id === 'patrolboat') };
    const moored = s.boat ? undefined : this.moor.it;
    const at = s.boat ?? (moored && { x: moored.x, y: moored.y - 1.8, z: moored.z, yaw: (moored.data?.yaw as number | undefined) ?? 0 });
    this.group.visible = !!at;
    if (!at) return;
    // (A slight roll and pitch on the water.)
    const t = s.time * 0.05;
    this.group.position.set(at.x, at.y - 0.2 + Math.sin(t * 1.3) * 0.04, at.z);
    this.group.rotation.set(Math.sin(t) * 0.015, at.yaw, Math.sin(t * 0.7) * 0.025, 'YXZ');
    this.girl.visible = !!s.sister?.aboard;
  }
}
