// The cableway (M7-05, M7-06): cabin 2 out along its ropes where the run has it (sim/cablecar.ts), Xiaoyu sat by its
// window if she came; the line drone over its stretch of the line, a white disc on four rotors with its line of light;
// and his trolley on the haul rope (sim/trolley.ts), its block on the rope and the sling down to his harness. Cabin 2
// is drawn here parked at the platform too, until it leaves (the world's own boxes for it left out of the world's
// meshes: parkedCabin()).
import * as THREE from 'three';
import type { SimState } from '../sim/types';
import type { World, Feature } from '../world/world';
import type { Solid } from '../world/geom';
import { CABIN, lineOf, cabinAt, onLine, lineDrone } from '../sim/cablecar';
import { TROLLEY } from '../sim/trolley';
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

/** The line drone (and the bridge's maintenance drones): a white disc, its ring of light, four arms out to their
 *  rotors. */
export function drone() {
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

/** The trolley: its block and sheaves on the rope at the origin, the sling down to his harness. */
function trolley() {
  const g = new THREE.Group(), steel = lam(0x9aa0a6), red = lam(0xb03a2e), sling = lam(0x2a2a2a);
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, y: number) => { const o = new THREE.Mesh(geo, m); o.position.y = y; g.add(o); };
  add(new THREE.BoxGeometry(0.06, 0.22, 0.3), red, -0.08);
  for (const z of [-0.09, 0.09]) { const o = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12).rotateZ(Math.PI / 2), steel); o.position.set(0, 0, z); g.add(o); }
  add(new THREE.BoxGeometry(0.03, TROLLEY.hang - 0.9, 0.03), sling, -0.2 - (TROLLEY.hang - 0.9) / 2);
  return g;
}

/** Cabin 2 parked: its feature, its floor's middle, the way along it (the station's long side); found once a world. */
type Parked = { y: number; x: number; z: number; ux: number; uz: number } | undefined;
const parkedAt = new WeakMap<World, Parked>();
function parked(w: World): Parked {
  if (parkedAt.has(w)) return parkedAt.get(w);
  const f = w.features.find((q): q is Feature & { nx: number; nz: number } => q.kind === 'cable:cabin');
  const P = f && { y: f.y, x: f.x - f.nx * 1.35, z: f.z - f.nz * 1.35, ux: -f.nz, uz: f.nx };
  parkedAt.set(w, P);
  return P;
}

/** Whether a world box is parked cabin 2's (its floor, walls, glass, roof, hanger and carriage: the boxes within its
 *  bounds up to its track ropes, none longer than it), which the world's meshes leave to this. */
export function parkedCabin(w: World): (s: Solid) => boolean {
  const P = parked(w);
  if (!P) return () => false;
  return s => {
    const e = s.rot ?? s, x = (s.x0 + s.x1) / 2 - P.x, z = (s.z0 + s.z1) / 2 - P.z, y = (s.y0 + s.y1) / 2 - P.y;
    return y > 0.02 && y < CABIN.hang && Math.max(e.x1 - e.x0, e.z1 - e.z0) < 6.6 && Math.abs(x * P.ux + z * P.uz) < 3.3 && Math.abs(-x * P.uz + z * P.ux) < 1.75;
  };
}

export class CableView {
  private car = new THREE.Group();
  private girl: THREE.Object3D;
  private drone = drone();
  private block = trolley();

  constructor(scene: THREE.Scene) {
    this.car.add(merged(cabin()));
    this.girl = merged(sisterModel(false));
    this.girl.position.set(-0.9, 0.1, 1.6);
    this.girl.rotation.y = Math.PI / 2;
    this.car.add(this.girl);
    this.car.visible = this.drone.visible = this.block.visible = false;
    scene.add(this.car, this.drone, this.block);
  }

  update(s: SimState, w: World) {
    const l = lineOf(w), C = s.cable, d = C && (C.by === 'cabin' ? C.d : C.cabin);
    this.drone.visible = !!l;
    const P = d === undefined ? parked(w) : undefined;
    this.car.visible = !!l && (d !== undefined || !!P);
    this.block.visible = !!l && C?.by === 'trolley' && s.player.mode === 'cable';
    if (!l) return;
    if (this.block.visible) { const r = onLine(l, C!.d); this.block.position.set(r.x, r.y - 0.2, r.z); this.block.rotation.y = Math.atan2(l.dx, l.dz); }
    const q = lineDrone(s, l);
    this.drone.position.set(q.x, q.y + Math.sin(s.time * 0.1) * 0.15, q.z);
    this.drone.rotation.y = q.yaw;
    this.girl.visible = !!s.sister?.aboard;
    if (P) { this.car.position.set(P.x, P.y, P.z); this.car.rotation.set(0, Math.atan2(P.ux, P.uz), 0); return; }
    if (d === undefined) return;
    const c = cabinAt(l, d);
    this.car.position.set(c.x, c.y, c.z);
    // (Swaying a little on its hanger as it runs.)
    this.car.rotation.set(Math.sin(s.time * 0.04) * 0.01 * Math.min(1, (C!.by === 'cabin' ? C!.v : 0) / 4), Math.atan2(l.dx, l.dz), 0, 'YXZ');
  }
}
