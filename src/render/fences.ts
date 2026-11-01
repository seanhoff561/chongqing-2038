// Chain-link fences drawn (M5-25b): steel posts and a top rail, the diamond mesh between; cut, its bottom peeled back
// in a flap where he cut it.
import * as THREE from 'three';
import type { SimState } from '../sim/types';
import type { World, Inter } from '../world/world';
import { canvasTexture } from './textures';

let meshMat: THREE.MeshLambertMaterial | null = null;
/** The diamond mesh, see-through between its wires. */
function chainLink() {
  if (meshMat) return meshMat;
  const tex = canvasTexture('chainlink', 128, 128, (g, w) => {
    g.clearRect(0, 0, w, w); g.strokeStyle = '#9aa0a2'; g.lineWidth = 5;
    for (const [a, b, c, d] of [[0, 0, w, w], [w, 0, 0, w], [-w, 0, w, 2 * w], [0, -w, 2 * w, w], [2 * w, 0, 0, 2 * w], [w, -w, -w, w]]) { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
  });
  return (meshMat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
}
const POST = new THREE.MeshLambertMaterial({ color: 0x7a8084 });

export class Fences {
  private made = new Map<string, { flap: THREE.Mesh }>();
  /** the world's fences, found once */
  private of: World | null = null;
  private list: Inter[] = [];

  constructor(private scene: THREE.Scene) {}

  /** A fence's posts, rail and mesh, along x from x0 to x1 at z, h high (its lower 0.7 m the flap that's cut). */
  private build(it: Inter) {
    const d = it.data as { x0: number; x1: number; z: number; h: number }, L = d.x1 - d.x0, g = new THREE.Group(), cell = 0.06;
    for (let x = 0; x <= L + 1e-6; x += Math.max(1, L / Math.ceil(L / 2.5))) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, d.h, 8).translate(x, d.h / 2, 0), POST));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, L, 6).rotateZ(Math.PI / 2).translate(L / 2, d.h, 0), POST));
    const up = new THREE.PlaneGeometry(L, d.h - 0.7), uv = up.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L / (cell * 2), uv.getY(i) * (d.h - 0.7) / (cell * 2));
    const tex = chainLink();
    (tex.map as THREE.Texture).wrapS = (tex.map as THREE.Texture).wrapT = THREE.RepeatWrapping;
    g.add(new THREE.Mesh(up.translate(L / 2, 0.7 + (d.h - 0.7) / 2, 0), tex));
    const low = new THREE.PlaneGeometry(L * 0.4, 0.7), lv = low.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < lv.count; i++) lv.setXY(i, lv.getX(i) * L * 0.4 / (cell * 2), lv.getY(i) * 0.7 / (cell * 2));
    const flap = new THREE.Mesh(low.translate(0, -0.35, 0), tex);
    flap.position.set(L / 2, 0.7, 0);
    g.add(flap);
    for (const s of [-1, 1]) { const side = new THREE.PlaneGeometry(L * 0.3, 0.7), sv = side.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < sv.count; i++) sv.setXY(i, sv.getX(i) * L * 0.3 / (cell * 2), sv.getY(i) * 0.7 / (cell * 2)); g.add(new THREE.Mesh(side.translate(L / 2 + s * L * 0.35, 0.35, 0), tex)); }
    g.position.set(d.x0, it.y - 0.5, d.z);
    this.scene.add(g);
    return { flap };
  }

  /** Every frame: each fence of the world's drawn, cut ones with their flap bent back. */
  update(s: SimState, w: World) {
    if (this.of !== w) { this.of = w; this.list = w.inter.filter(i => i.kind === 'fence'); }
    for (const it of this.list) {
      let f = this.made.get(it.id);
      if (!f) this.made.set(it.id, (f = this.build(it)));
      f.flap.rotation.x = s.wstate.open[it.id] ? -1.4 : 0;
    }
  }
}
