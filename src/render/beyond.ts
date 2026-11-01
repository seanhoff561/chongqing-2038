// Beyond the city's edge (M4-100, U-077): past the map's border there's more to see, never to walk. The rivers go on
// round the peninsula, and across them (and over the land to the west) the far districts' towers stand in the haze,
// windows lit after dark, with hills behind. Low stand-ins, three draws in all, built from a stream of their own.
import * as THREE from 'three';
import type { Heightfield } from '../world/heightfield';
import { night } from './materials';
import { mergeGeometries } from './view';

/** How far the river runs out from the border before the far bank, how far the towers stand, where the hills are (m),
 *  and how many towers. */
const BEYOND = { river: 260, towers: 1500, hills: [1700, 3200], count: 1400 };

function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; }; }

/** The windows of the far towers: a dark facade, a grid of panes, some lit (drawn once). */
function windows() {
  const N = 128, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d')!, r = rng(7);
  g.fillStyle = '#000'; g.fillRect(0, 0, N, N);
  for (let y = 4; y < N; y += 8) for (let x = 3; x < N; x += 6) { const v = r() < 0.3 ? 200 + r() * 55 : 0; g.fillStyle = `rgb(${v},${v * 0.85},${v * 0.6})`; g.fillRect(x, y, 3, 4); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let lit: THREE.MeshLambertMaterial | null = null;

/** The stand-ins round a world whose ground is `g`, its water at `waterY`. */
export function buildBeyond(g: Heightfield, waterY: number): THREE.Group {
  const out = new THREE.Group(), r = rng(2038);
  const x0 = g.x0, z0 = g.z0, x1 = g.x0 + (g.w - 1) * g.cell, z1 = g.z0 + (g.h - 1) * g.cell, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const far = BEYOND.hills[1] + 400, span = Math.max(x1 - x0, z1 - z0) + 2 * far;
  // The rivers, on round it (a little under the world's own water, so that shows where they meet).
  const water = new THREE.Mesh(new THREE.PlaneGeometry(span, span).rotateX(-Math.PI / 2).translate(cx, waterY - 0.15, cz), new THREE.MeshLambertMaterial({ color: 0x3c4a4e }));
  out.add(water);
  // How far a point is out past the border, and the ground at the border nearest it.
  const past = (x: number, z: number) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
  const edge = (x: number, z: number) => { const ex = Math.min(x1, Math.max(x0, x)), ez = Math.min(z1, Math.max(z0, z)), i = Math.round((ex - g.x0) / g.cell), j = Math.round((ez - g.z0) / g.cell); return g.y[j * g.w + i]; };
  // The towers: on the far banks across the rivers (north, east, south), and on over the land to the west.
  lit = new THREE.MeshLambertMaterial({ color: 0x7d858c, emissive: 0xffffff, emissiveMap: windows(), emissiveIntensity: 0 });
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), towers = new THREE.InstancedMesh(box, lit, BEYOND.count), m = new THREE.Matrix4();
  let n = 0;
  for (let k = 0; k < BEYOND.count * 4 && n < BEYOND.count; k++) {
    const a = r() * Math.PI * 2, d = Math.max(x1 - x0, z1 - z0) / 2 + r() * BEYOND.towers, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, o = past(x, z);
    const land = x < x0 && edge(x, z) > waterY + 3;
    if (o < (land ? 40 : BEYOND.river) || o > BEYOND.towers) continue;
    const w = 14 + r() * 26, h = 25 + r() ** 2 * 170, base = land ? edge(x, z) : waterY + 4 + r() * 12;
    towers.setMatrixAt(n++, m.makeRotationY(r() * Math.PI).setPosition(x, base, z).multiply(new THREE.Matrix4().makeScale(w, h, w * (0.6 + r() * 0.8))));
  }
  towers.count = n;
  // (Windows a few metres a pane, whatever the tower's size.)
  box.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(box.getAttribute('uv').array).map((v, i) => v * (i % 2 ? 6 : 3)), 2));
  towers.computeBoundingSphere();
  out.add(towers);
  // The hills behind, a ring of low-poly rises in the haze.
  const hills: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 46; k++) {
    const a = (k / 46) * Math.PI * 2 + r() * 0.1, d = Math.max(x1 - x0, z1 - z0) / 2 + BEYOND.hills[0] + r() * (BEYOND.hills[1] - BEYOND.hills[0]);
    const h = 150 + r() * 320, rad = 500 + r() * 600;
    hills.push(new THREE.ConeGeometry(rad, h, 7, 1, true).translate(cx + Math.cos(a) * d, waterY + h / 2 - 10, cz + Math.sin(a) * d));
  }
  out.add(new THREE.Mesh(mergeGeometries(hills), new THREE.MeshLambertMaterial({ color: 0x4f5c52 })));
  out.traverse(o => { o.castShadow = false; o.receiveShadow = false; });
  return out;
}

/** Every frame: the far windows lit by the hour. */
export function tickBeyond() { if (lit) lit.emissiveIntensity = 0.9 * night.k; }
