// World labels: canvas text cards laid on the ground.
import * as THREE from 'three';
import type { Label } from '../world/world';
import { textTexture } from './textures';

export function buildLabels(labels: Label[]): THREE.Group {
  const g = new THREE.Group();
  for (const l of labels) {
    const { tex, aspect } = textTexture(l.text, { fg: '#111', bg: '#e8e2c8', size: 40 });
    const h = 0.32;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(h * aspect, h), new THREE.MeshBasicMaterial({ map: tex }));
    m.position.set(l.x, l.y + 0.02, l.z);
    m.rotation.x = -Math.PI / 2;
    g.add(m);
  }
  return g;
}
