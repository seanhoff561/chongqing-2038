// The map editor's red signs (M10-32): a red plate, its text in white line by line, on a wall (facing +z, centred on
// its foot) or lying on the floor; p.w across, p.h high (or deep, on the floor).
import * as THREE from 'three';
import type { Prop } from '../world/world';
import { textTexture } from './textures';

function redSign(p: Prop): THREE.Group {
  const g = new THREE.Group(), w = p.w ?? 1.2, h = p.h ?? 0.6, lines = (p.text ?? '').split('\n').filter(l => l.trim());
  g.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), new THREE.MeshLambertMaterial({ color: 0xb3201c })));
  // (Every line the same size: as big as the longest fits across, at most 0.3 m.)
  const texts = lines.map(l => textTexture(l, { fg: '#fff', bg: '#b3201c', size: 48 })), lh = Math.min(0.3, (h * 0.85) / Math.max(1, lines.length));
  const sh = Math.min(lh, ...texts.map(t => (w * 0.92) / t.aspect));
  texts.forEach(({ tex, aspect }, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sh * aspect, sh), new THREE.MeshLambertMaterial({ map: tex }));
    m.position.set(0, ((lines.length - 1) / 2 - i) * Math.min(lh, sh * 1.2), 0.012);
    g.add(m);
  });
  return g;
}

export const signBuilders: Record<string, (p: Prop) => THREE.Object3D> = {
  redsign: redSign,
  redfloor: p => { const o = new THREE.Group(), g = redSign(p); g.rotation.x = -Math.PI / 2; o.add(g); return o; },
};
