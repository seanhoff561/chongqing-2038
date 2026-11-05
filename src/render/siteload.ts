// The construction site's crane at work on its own (M6-10, sim/sitehaz.ts): the trolley running along the jib, the
// hoist cable down from it, and the skip of rebar swinging on the end; where the sim has it.
import * as THREE from 'three';
import type { World } from '../world/world';
import { craneLoad, SITEHAZ } from '../sim/sitehaz';

export class SiteLoad {
  readonly group = new THREE.Group();
  private skip: THREE.Group;
  private trolley: THREE.Mesh;
  private cable: THREE.Mesh;
  private jibY = 0;

  constructor(readonly w: World) {
    const jib = w.features.find(f => f.kind === 'crane:jib');
    this.jibY = jib?.y ?? 0;
    const steel = new THREE.MeshLambertMaterial({ color: 0x8a6a2a }), rebar = new THREE.MeshLambertMaterial({ color: 0x5a3a28 }), dark = new THREE.MeshLambertMaterial({ color: 0x2a2c2e });
    const [hu, hv, hy] = SITEHAZ.half;
    // A steel skip, open at the top, a bundle of rebar lying in it.
    this.skip = new THREE.Group();
    const add = (sx: number, sy: number, sz: number, x: number, y: number, z: number, m: THREE.Material) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); this.skip.add(b); };
    add(hu * 2, 0.08, hv * 2, 0, -hy, 0, steel);
    for (const s of [-1, 1]) { add(hu * 2, hy * 1.2, 0.06, 0, -hy * 0.4, s * hv, steel); add(0.06, hy * 1.2, hv * 2, s * hu, -hy * 0.4, 0, steel); }
    for (let k = 0; k < 6; k++) add(hu * 2.3, 0.05, 0.05, 0, -hy + 0.1 + (k % 2) * 0.06, -hv * 0.7 + k * hv * 0.28, rebar);
    this.trolley = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 1.2), dark);
    this.cable = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 4), dark);
    this.group.add(this.skip, this.trolley, this.cable);
    this.group.visible = !!jib;
  }

  update(time: number) {
    const L = craneLoad(this.w, time);
    if (!L) return;
    this.skip.position.set(L.x, L.y, L.z);
    this.skip.rotation.y = -L.yaw;
    this.trolley.position.set(L.x, this.jibY - 0.2, L.z);
    this.trolley.rotation.y = -L.yaw;
    const top = this.jibY - 0.4, bottom = L.y + SITEHAZ.half[2] * 0.6, len = Math.max(0.1, top - bottom);
    this.cable.position.set(L.x, (top + bottom) / 2, L.z);
    this.cable.scale.y = len;
  }
}
