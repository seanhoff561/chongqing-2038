// What the machines' models are made of (M4-26, M10-44): their palette, the shapes their parts are built from (boxes,
// cylinders, eggs, and the spikes and blades that make them what they are), and the posing of parts (a part about its
// parent, a bone between two points, an arm reaching a point). The rigs are in render/machines.ts and render/walkers.ts.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Matte white and pale grey ceramic, its plates, the thin dark seams and joints between, the pits and grooves its
 *  senses sit in, and the faint ice-blue of its inner light (its state's colour, by the batch's tint). */
export const WHITE = 0xe4e6e8, PALE = 0xc6cbd0, PLATE = 0xf3f4f5, SEAM = 0x2a2d32, PIT = 0x0d0f11, ICE = 0xbfe6ff;

/** How a unit moves just now: its speed (m/s), its stride's phase, how far it has its gun up (0-1), how far crouched
 *  (0-1), and real seconds (rotors, scanning). */
export interface Anim { speed: number; phase: number; aim: number; crouch: number; t: number; /** which of its kind's variations (by the unit) */ v: number }
/** A kind's model: its parts as each of its looks draws them (the same parts, the same pivots; `parts` the first look),
 *  and how they're posed. */
export interface Rig { parts: THREE.BufferGeometry[]; looks: THREE.BufferGeometry[][]; pose(a: Anim, m: THREE.Matrix4[]): void }
export const rig = (looks: THREE.BufferGeometry[][], pose: Rig['pose']): Rig => ({ parts: looks[0], looks, pose });
export const still = (g: THREE.BufferGeometry): Rig => rig([[g]], (_a, m) => { m[0].identity(); });
/** A number in [0, 1) from a seed and a salt (the same each time). */
export const hash = (n: number, k: number) => { const x = Math.sin(n * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

/** How far the machines' plate texture runs before it repeats (m). */
const PANEL = 0.8;
function paint(g: THREE.BufferGeometry, color: number, glow: number) {
  const g2 = g.index ? g.toNonIndexed() : g, n = g2.attributes.position.count, c = new THREE.Color(color), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  g2.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g2.setAttribute('glow', new THREE.BufferAttribute(new Float32Array(n).fill(glow), 1));
  // Its plates' texture (M4-99) laid on at one scale whatever the part's size: each face's own two axes, PANEL m a
  // repeat.
  const P = g2.attributes.position, N = g2.attributes.normal, uv = new Float32Array(n * 2);
  for (let i = 0; N && i < n; i++) {
    const ax = Math.abs(N.getX(i)), ay = Math.abs(N.getY(i)), az = Math.abs(N.getZ(i));
    uv[i * 2] = (ax >= ay && ax >= az ? P.getZ(i) : P.getX(i)) / PANEL;
    uv[i * 2 + 1] = (ay > ax && ay >= az ? P.getZ(i) : P.getY(i)) / PANEL;
  }
  g2.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g2;
}
/** A box (w, h, d) centred at (x, y, z), turned (rx, ry, rz) about its centre. */
export const box = (w: number, h: number, d: number, x: number, y: number, z: number, c: number, glow = 0, rx = 0, ry = 0, rz = 0) =>
  paint(new THREE.BoxGeometry(w, h, d).rotateX(rx).rotateY(ry).rotateZ(rz).translate(x, y, z), c, glow);
/** A cylinder of radius r (r2 at its far end) and length h along an axis, centred at (x, y, z). */
export function cyl(r: number, h: number, x: number, y: number, z: number, c: number, axis: 'x' | 'y' | 'z' = 'y', glow = 0, r2 = r, seg = 10) {
  const g = new THREE.CylinderGeometry(r2, r, h, seg);
  if (axis === 'x') g.rotateZ(-Math.PI / 2); else if (axis === 'z') g.rotateX(Math.PI / 2);
  return paint(g.translate(x, y, z), c, glow);
}
/** A spike or blade (M10-44): a tapering prism of `seg` faces (4, a diamond), len long from (x, y, z) out along its +y
 *  turned (rx, then ry, then rz), r across at its base and r2 at its tip, squashed to fx and fz of that across; its faces
 *  flat, like fired ceramic. Pointing down: rx π; ahead (+z): rx π/2; back: -π/2; out to +x: rz -π/2. */
export function spike(r: number, r2: number, len: number, x: number, y: number, z: number, c: number, rx = 0, ry = 0, rz = 0, fx = 1, fz = 1, seg = 4, glow = 0) {
  const g = new THREE.CylinderGeometry(r2, r, len, seg).translate(0, len / 2, 0).scale(fx, 1, fz).rotateX(rx).rotateY(ry).rotateZ(rz).translate(x, y, z).toNonIndexed();
  g.computeVertexNormals();
  return paint(g, c, glow);
}
/** An egg: a smooth ellipsoid of half sizes (sx, sy, sz) centred at (x, y, z), pitched rx. */
export const egg = (sx: number, sy: number, sz: number, x: number, y: number, z: number, c: number, rx = 0, seg = 8) =>
  paint(new THREE.SphereGeometry(1, seg, Math.max(4, seg - 2)).scale(sx, sy, sz).rotateX(rx).translate(x, y, z), c, 0);
/** A seam (or a line of light) round an egg of half sizes (sx, sy, sz) at (x, y, z), dy above its middle. */
export function band(sx: number, sy: number, sz: number, x: number, y: number, z: number, dy: number, c: number, glow = 0) {
  const k = Math.sqrt(Math.max(0, 1 - (dy / sy) ** 2)) * 1.02;
  return paint(new THREE.CylinderGeometry(1, 1, 0.014, 12).scale(sx * k, 1, sz * k).translate(x, y + dy, z), c, glow);
}
/** A ring of n small pits (its senses, M10-44: no eyes) of size s on a circle of radius r about (x, y, z), in the plane
 *  facing +z (or, `up`, facing +y). */
export const pits = (n: number, r: number, s: number, x: number, y: number, z: number, up = false) =>
  Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, u = Math.cos(a) * r, v = Math.sin(a) * r; return up ? box(s, s * 0.6, s, x + u, y, z + v, PIT) : box(s, s, s * 0.6, x + u, y + v, z, PIT); });
export const part = (...p: THREE.BufferGeometry[]) => mergeGeometries(p);

const E = new THREE.Euler();
/** out = parent × translate(x, y, z) × rotate(rx, ry, rz). */
export function at(out: THREE.Matrix4, parent: THREE.Matrix4 | null, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
  out.makeRotationFromEuler(E.set(rx, ry, rz)).setPosition(x, y, z);
  if (parent) out.premultiply(parent);
  return out;
}
const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), D = new THREE.Vector3(), Q = new THREE.Vector3(), EL = new THREE.Vector3(), HA = new THREE.Vector3();
/** A bone from `from` to `to` (its geometry hanging down its -y), turned so its +z leans toward `pole`; in the parent's
 *  frame. */
function bone(out: THREE.Matrix4, parent: THREE.Matrix4, from: THREE.Vector3, to: THREE.Vector3, pole: THREE.Vector3) {
  Y.subVectors(from, to).normalize();
  Z.subVectors(pole, from);
  X.crossVectors(Y, Z).normalize();
  Z.crossVectors(X, Y);
  return out.makeBasis(X, Y, Z).setPosition(from).premultiply(parent);
}
/** A limb reaching a point (two bones, l1 and l2 long, the joint bent toward `pole`): its upper and fore parts. */
export function reach(up: THREE.Matrix4, fore: THREE.Matrix4, parent: THREE.Matrix4, s: THREE.Vector3, t: THREE.Vector3, pole: THREE.Vector3, l1: number, l2: number) {
  D.subVectors(t, s);
  const d = Math.min(l1 + l2 - 1e-3, Math.max(Math.abs(l1 - l2) + 1e-3, D.length())), a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  D.normalize();
  Q.subVectors(pole, s); Q.addScaledVector(D, -Q.dot(D)).normalize();
  EL.copy(s).addScaledVector(D, a).addScaledVector(Q, h);
  HA.subVectors(t, EL).normalize().multiplyScalar(l2).add(EL);
  bone(up, parent, s, EL, pole);
  bone(fore, parent, EL, HA, pole);
}
