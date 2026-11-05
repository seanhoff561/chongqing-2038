// Where the fallen leaves lie (U-107): under and round the trees and bushes, thickest by the trunk and thinning out to
// nearly twice the crown's reach, in uneven drifts; none out in the open far from one. A top-down map of the world's
// trees, 1.5 m a cell: its red how thick they lie, its green how much of it is a ginkgo's (gold fans). Built once per
// world, when it's first drawn; the ground and paving's shaders read it (snowcover.ts).
import * as THREE from 'three';
import type { World } from '../world/world';

const CELL = 1.5;
/** Each tree kind's crown radius (m) and how much it drops (an evergreen palm or bamboo little, a hedge along its run). */
export const LEAFY: Record<string, [number, number]> = {
  figtree: [4.5, 0.8], camphor: [3.8, 0.9], tree: [3.2, 1], ginkgo: [3, 1], palm: [1.8, 0.35], bamboo: [1.6, 0.5], shrub: [1.1, 0.6], hedge: [1, 0.6],
};
/** How far out from the trunk they lie, in crown radii. */
export const LEAF_REACH = 1.8;

export const LEAFMAP = { map: { value: new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1) }, o: { value: new THREE.Vector2() }, s: { value: new THREE.Vector2(1, 1) } };
LEAFMAP.map.value.needsUpdate = true;
let builtFor: World | null = null;

const hash = (i: number, j: number) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };

/** How thick leaves lie at (x, z) from one tree: 1 by the trunk, nothing past its reach (before the drifts). */
export function leafFall(kind: string, dist: number) {
  const L = LEAFY[kind];
  if (!L) return 0;
  const d = dist / (L[0] * LEAF_REACH);
  return d >= 1 ? 0 : L[1] * (1 - d) ** 1.6;
}

/** The world's map of fallen leaves. */
export function buildLeafMap(w: World) {
  if (builtFor === w) return;
  builtFor = w;
  // (A hedge drops along its length: a point every metre of it.)
  const pts: { kind: string; x: number; z: number }[] = [];
  for (const p of w.props) {
    if (!LEAFY[p.kind]) continue;
    if (p.kind !== 'hedge') { pts.push(p); continue; }
    const len = p.w ?? 2, ux = Math.cos(p.yaw), uz = -Math.sin(p.yaw);
    for (let t = -len / 2; t <= len / 2; t += 1) pts.push({ kind: 'hedge', x: p.x + ux * t, z: p.z + uz * t });
  }
  if (!pts.length) { LEAFMAP.map.value = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1); LEAFMAP.map.value.needsUpdate = true; return; }
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p.x); z0 = Math.min(z0, p.z); x1 = Math.max(x1, p.x); z1 = Math.max(z1, p.z); }
  const pad = 5 * LEAF_REACH;
  x0 -= pad; z0 -= pad; x1 += pad; z1 += pad;
  // (Coarser over a city too big for one texture.)
  const C = Math.max(CELL, (x1 - x0) / 4096, (z1 - z0) / 4096), W = Math.ceil((x1 - x0) / C), H = Math.ceil((z1 - z0) / C), thick = new Float32Array(W * H), gold = new Float32Array(W * H);
  for (const p of pts) {
    const reach = LEAFY[p.kind][0] * LEAF_REACH;
    for (let j = Math.max(0, Math.floor((p.z - reach - z0) / C)), j1 = Math.min(H - 1, Math.ceil((p.z + reach - z0) / C)); j <= j1; j++)
      for (let i = Math.max(0, Math.floor((p.x - reach - x0) / C)), i1 = Math.min(W - 1, Math.ceil((p.x + reach - x0) / C)); i <= i1; i++) {
        const v = leafFall(p.kind, Math.hypot(x0 + (i + 0.5) * C - p.x, z0 + (j + 0.5) * C - p.z));
        if (v <= 0) continue;
        thick[j * W + i] += v;
        if (p.kind === 'ginkgo') gold[j * W + i] += v;
      }
  }
  // (Uneven: each cell a little more or less, so they lie in drifts and gaps, not rings.)
  const px = new Uint8Array(W * H * 4);
  for (let k = 0; k < W * H; k++) {
    const t = thick[k];
    if (t <= 0) continue;
    const n = 0.65 + 0.7 * hash(k % W, Math.floor(k / W));
    px[k * 4] = Math.round(255 * Math.min(1, t * n));
    px[k * 4 + 1] = Math.round(255 * Math.min(1, gold[k] / t));
  }
  const tex = new THREE.DataTexture(px, W, H);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  LEAFMAP.map.value = tex; LEAFMAP.o.value.set(x0, z0); LEAFMAP.s.value.set(1 / (W * C), 1 / (H * C));
}
