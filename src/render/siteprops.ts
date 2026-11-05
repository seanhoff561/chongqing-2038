// The construction site's own props (M6-10): its gate, a steel-framed panel of corrugated sheet that slides aside
// along its line when it's opened; and a loose scaffold plank, gone once it's fallen.
import * as THREE from 'three';
import type { Prop } from '../world/world';

const lam = (color: number) => new THREE.MeshLambertMaterial({ color });

export const siteBuilders: Record<string, (p: Prop) => THREE.Object3D> = {
  sitegate: p => {
    const g = new THREE.Group(), panel = new THREE.Group(), w = p.w!, h = p.h!, sheet = lam(0x5a6a72), steel = lam(0x2e3236);
    const add = (sx: number, sy: number, sz: number, x: number, y: number, m: THREE.Material) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, 0); panel.add(b); };
    add(w, h - 0.3, 0.03, 0, h / 2, sheet);
    for (const y of [0.1, h / 2, h - 0.1]) add(w, 0.08, 0.08, 0, y, steel);
    for (const x of [-w / 2, 0, w / 2]) add(0.08, h, 0.08, x, h / 2, steel);
    g.add(panel);
    g.userData.tick = (_t: number, open: Record<string, boolean>) => { const want = open[p.text!] ? w * 0.95 : 0; panel.position.x += (want - panel.position.x) * 0.06; };
    return g;
  },
  looseplank: p => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(p.w!, p.h!, p.d!).translate(0, p.h! / 2, 0), lam(0x8a6a40));
    m.userData.tick = (_t: number, open: Record<string, boolean>) => { m.visible = !open[p.text!]; };
    return m;
  },
};
