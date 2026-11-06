// The meeting of the rivers at Chaotianmen (M6-04): the rivers' water tinted by which river it is, the greener
// Jialing down the north side of the peninsula, the brown Yangtze down the south, and past the tip the two side by
// side a long way downstream, their line wavering, before they mix. Vertex colours over the water's plane.
import * as THREE from 'three';
import { GEO } from '../world/geo';
import { points, inside } from '../world/yuzhong/shapes';

/** The two rivers' tints (over the water's own colour), where they meet past the tip, which way they run on from it,
 *  how far before they've mixed and how soft their line is (m). */
const RIVERS = { jialing: [0.75, 1.2, 1.15], yangtze: [3.6, 1.6, 0.75], tip: [1995, 262], on: [0.96, -0.29], mixed: 1400, soft: 18 };

/** The Jialing's outline: the water OpenStreetMap ends at the tip, the biggest of those. */
const jialing = () => GEO.areas.filter(a => a[0] === 'water').map(a => points(a[2], 0.1)).filter(p => Math.max(...p.map(q => q[0])) < 2100).sort((a, b) => b.length - a.length)[0];

/** How much of the Jialing's water is at (x, z): 1 in it, 0 in the Yangtze, between where they run on together. */
export function jialingShare(x: number, z: number, J = jialing()): number {
  if (J && inside(J, x, z)) return 1;
  const [tx, tz] = RIVERS.tip, [dx, dz] = RIVERS.on, along = (x - tx) * dx + (z - tz) * dz;
  if (along <= 0) return 0;
  const side = (x - tx) * dz - (z - tz) * dx + 12 * Math.sin(along / 45), k = Math.min(1, Math.max(0, 0.5 + side / (2 * RIVERS.soft)));
  return k * Math.max(0, 1 - along / RIVERS.mixed);
}

/** The water's plane over a box, 20 m a square, each corner tinted by its river. */
export function riverPlane(b: { x0: number; z0: number; x1: number; z1: number }): THREE.PlaneGeometry {
  const w = b.x1 - b.x0, h = b.z1 - b.z0, geo = new THREE.PlaneGeometry(w, h, Math.ceil(w / 20), Math.ceil(h / 20)), pos = geo.attributes.position, J = jialing();
  const col = new Float32Array(pos.count * 3), [a, c] = [RIVERS.jialing, RIVERS.yangtze];
  for (let i = 0; i < pos.count; i++) {
    // (Laid flat by turning it about x: its y is the map's -z.)
    const k = jialingShare(b.x0 + w / 2 + pos.getX(i), b.z0 + h / 2 - pos.getY(i), J);
    for (let j = 0; j < 3; j++) col[i * 3 + j] = a[j] * k + c[j] * (1 - k);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
