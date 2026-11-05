// The construction site's own props (M6-10): its gate, a steel-framed panel of corrugated sheet that slides aside
// along its line when it's opened; and a loose scaffold plank, gone once it's fallen.
import * as THREE from 'three';
import type { Prop } from '../world/world';
import { Kit } from './propkit';
import { PROP_MAT } from './props-lib';

const lam = (color: number) => new THREE.MeshLambertMaterial({ color });

export const siteBuilders: Record<string, (p: Prop) => THREE.Object3D> = {
  sitegate: p => {
    // (Its sheet and frame one mesh, one draw call: M10-04.)
    const g = new THREE.Group(), w = p.w!, h = p.h!, k = new Kit(Math.round(p.x * 13 + p.z * 7));
    k.muted = false;
    k.use('metal').box(w, h - 0.3, 0.03, 0x5a6a72, 0, 0.15);
    for (const y of [0.1, h / 2, h - 0.1]) k.box(w, 0.08, 0.08, 0x2e3236, 0, y - 0.04);
    for (const x of [-w / 2, 0, w / 2]) k.box(0.08, h, 0.08, 0x2e3236, x);
    const panel = new THREE.Mesh(k.geometry(), PROP_MAT);
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
