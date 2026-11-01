// What he's rigged, drawn (M5-14, M5-20 to M5-22, M5-33): his ropes hanging down their walls (the grappling hook over
// the edge), ladders stood against walls or laid across gaps, EMP traps on the floor, the lines he's strung (a slight
// sag in each).
import * as THREE from 'three';
import type { SimState } from '../sim/types';

const N = 6;

/** A ladder 1 m long up y (two rails, rungs every 0.3 m), 0.45 m wide: scaled to its length. */
function ladderGeo() {
  const parts: THREE.BufferGeometry[] = [];
  for (const x of [-0.2, 0.2]) parts.push(new THREE.BoxGeometry(0.04, 1, 0.03).translate(x, 0.5, 0));
  for (let y = 0.15; y < 1; y += 0.3) parts.push(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 6).rotateZ(Math.PI / 2).translate(0, y, 0));
  const g = new THREE.BufferGeometry(), pos: number[] = [], idx: number[] = [];
  for (const p of parts) {
    const base = pos.length / 3, a = p.getAttribute('position'), ix = p.getIndex()!;
    for (let i = 0; i < a.count; i++) pos.push(a.getX(i), a.getY(i), a.getZ(i));
    for (let i = 0; i < ix.count; i++) idx.push(base + ix.getX(i));
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

export class Rigs {
  private ropes: THREE.Mesh[] = [];
  private ladders: THREE.Mesh[] = [];
  private traps: THREE.Mesh[] = [];
  private cables: THREE.Line[] = [];

  constructor(scene: THREE.Scene) {
    const rope = new THREE.CylinderGeometry(0.012, 0.012, 1, 5).translate(0, 0.5, 0), ropeMat = new THREE.MeshLambertMaterial({ color: 0x8a6a3a });
    const lad = ladderGeo(), metal = new THREE.MeshLambertMaterial({ color: 0x9aa0a4 });
    const trap = new THREE.BoxGeometry(0.3, 0.12, 0.2).translate(0, 0.06, 0), trapMat = new THREE.MeshLambertMaterial({ color: 0x3a4038 });
    const cableMat = new THREE.LineBasicMaterial({ color: 0x2a2c2e });
    for (let i = 0; i < N; i++) {
      const l = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(9 * 3), 3)), cableMat);
      l.visible = false; l.frustumCulled = false; this.cables.push(l); scene.add(l);
      for (const [list, geo, mat] of [[this.ropes, rope, ropeMat], [this.ladders, lad, metal], [this.traps, trap, trapMat]] as const) {
        const m = new THREE.Mesh(geo, mat); m.visible = false; m.frustumCulled = false; list.push(m); scene.add(m);
      }
    }
  }

  update(s: SimState) {
    const hung = s.ropes ?? [], flat = s.planks ?? [];
    let r = 0, l = 0;
    for (const q of hung) {
      const m = q.kind === 'ladder' ? this.ladders[l++] : this.ropes[r++];
      if (!m) continue;
      m.visible = true; m.position.set(q.x + q.nx * 0.04, q.y0, q.z + q.nz * 0.04); m.scale.set(1, q.y1 - q.y0, 1);
      // (A ladder leans a little into its wall; its face along the wall.)
      m.rotation.set(q.kind === 'ladder' ? -0.12 : 0, Math.atan2(q.nx, q.nz), 0, 'YXZ');
    }
    for (const q of flat) {
      const m = this.ladders[l++];
      if (!m) continue;
      m.visible = true; m.position.set(q.x - Math.sin(q.yaw) * q.a, q.y - 0.04, q.z - Math.cos(q.yaw) * q.a); m.scale.set(1, q.b - q.a, 1);
      m.rotation.set(-Math.PI / 2, q.yaw, 0, 'YXZ');
    }
    for (let i = r; i < N; i++) this.ropes[i].visible = false;
    for (let i = l; i < N; i++) this.ladders[i].visible = false;
    this.traps.forEach((m, i) => { const t = s.traps?.[i]; m.visible = !!t; if (t) m.position.set(t.x, t.y, t.z); });
    this.cables.forEach((c, i) => {
      const l = s.lines?.[i]; c.visible = !!l;
      if (!l) return;
      const a = c.geometry.attributes.position as THREE.BufferAttribute, len = Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y, l.b.z - l.a.z);
      for (let k = 0; k <= 8; k++) { const f = k / 8; a.setXYZ(k, l.a.x + (l.b.x - l.a.x) * f, l.a.y + (l.b.y - l.a.y) * f - Math.sin(f * Math.PI) * len * 0.01, l.a.z + (l.b.z - l.a.z) * f); }
      a.needsUpdate = true;
    });
  }
}
