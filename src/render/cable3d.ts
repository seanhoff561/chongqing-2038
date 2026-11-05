// The cableway (M7-05): cabin 2 out along its ropes where the run has it (sim/cablecar.ts), Xiaoyu sat by its window
// if she came; and the line drone over its stretch of the line, a white disc on four rotors with its line of light.
import * as THREE from 'three';
import type { SimState } from '../sim/types';
import type { World } from '../world/world';
import { CABIN, lineOf, cabinAt, lineDrone } from '../sim/cablecar';
import { sisterModel, merged } from './furniture';

const lam = (c: number) => new THREE.MeshLambertMaterial({ color: c });

/** The cabin, its floor at the origin, its length along +z (the way it runs): metal to the sill, glass to the roof,
 *  the roof, the hanger up to its carriage on the track ropes. */
function cabin() {
  const g = new THREE.Group(), metal = lam(0x8a9096), teal = lam(0x2f6f73), glass = new THREE.MeshLambertMaterial({ color: 0x9ab8c8, transparent: true, opacity: 0.3 });
  const add = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y + h / 2, z); g.add(o); };
  const W = 3.2, L = 6.2;
  add(W, 0.1, L, metal, 0, 0, 0);
  for (const [w, d, x, z] of [[W, 0.08, 0, L / 2], [W, 0.08, 0, -L / 2], [0.08, L, W / 2, 0], [0.08, L, -W / 2, 0]]) {
    add(w, CABIN.sill - 0.1, d, teal, x, 0.1, z);
    add(w, CABIN.glass - CABIN.sill, d, glass, x, CABIN.sill, z);
    add(w, 0.2, d, teal, x, CABIN.glass, z);
  }
  add(W + 0.2, 0.15, L + 0.2, metal, 0, 2.3, 0);
  add(0.3, CABIN.hang - 2.75, 0.6, metal, 0, 2.45, 0);
  add(1.1, 0.3, 3.4, teal, 0, CABIN.hang - 0.35, 0);
  return g;
}

/** The line drone: a white disc, its ring of light, four arms out to their rotors. */
function drone() {
  const g = new THREE.Group(), white = lam(0xe8e8e4), dark = lam(0x2a2e33);
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.1, 12), white));
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.015, 12), new THREE.MeshBasicMaterial({ color: 0x9fe6ff })));
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2, arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.45), white), rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.01, 10), dark);
    arm.position.set(Math.sin(a) * 0.3, 0.02, Math.cos(a) * 0.3); arm.rotation.y = a;
    rotor.position.set(Math.sin(a) * 0.5, 0.07, Math.cos(a) * 0.5);
    g.add(arm, rotor);
  }
  return g;
}

export class CableView {
  private car = new THREE.Group();
  private girl: THREE.Object3D;
  private drone = drone();

  constructor(scene: THREE.Scene) {
    this.car.add(merged(cabin()));
    this.girl = merged(sisterModel(false));
    this.girl.position.set(-0.9, 0.1, 1.6);
    this.girl.rotation.y = Math.PI / 2;
    this.car.add(this.girl);
    this.car.visible = this.drone.visible = false;
    scene.add(this.car, this.drone);
  }

  update(s: SimState, w: World) {
    const l = lineOf(w), C = s.cable, d = C && (C.by === 'cabin' ? C.d : C.cabin);
    this.drone.visible = !!l;
    this.car.visible = !!l && d !== undefined;
    if (!l) return;
    const q = lineDrone(s, l);
    this.drone.position.set(q.x, q.y + Math.sin(s.time * 0.1) * 0.15, q.z);
    this.drone.rotation.y = q.yaw;
    if (d === undefined) return;
    const c = cabinAt(l, d);
    this.car.position.set(c.x, c.y, c.z);
    // (Swaying a little on its hanger as it runs.)
    this.car.rotation.set(Math.sin(s.time * 0.04) * 0.01 * Math.min(1, (C!.by === 'cabin' ? C!.v : 0) / 4), Math.atan2(l.dx, l.dz), 0, 'YXZ');
    this.girl.visible = !!s.sister?.aboard;
  }
}
