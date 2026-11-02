// The parts the item models are built from (U-053): materials, and boxes, cylinders, balls, rings, turned and
// extruded shapes and bent tubes, each placed as it's made. Sizes in metres. Each model is built around the fist: the
// part he grips sits at the origin running along X, -X up in his view, -Z forward, a flat thing's face toward him (+Z).
import * as THREE from 'three';

export const M = (color: number, rough = 0.6, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
/** A material with a surface of its own, printed, cardboard or woven (dress gives it that texture). */
export const P = (kind: 'label' | 'cardboard' | 'fabric', color: number, rough = 0.6, metal = 0) => Object.assign(M(color, rough, metal), { name: kind });
/** See-through: glass, clear plastic, film, water. */
export const clear = (color: number, opacity = 0.35, rough = 0.15) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.05, transparent: true, opacity, depthWrite: false });
/** Lit from within: an LED, a screen, a robot's eye. */
export const glow = (color: number, k = 1.2) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.4 });

export const steel = M(0x4a4f55, 0.45, 0.6), dark = M(0x1d1f22, 0.5, 0.3), rubber = M(0x222222, 0.9), red = M(0x9a2420, 0.6), wood = M(0x6b4a2e, 0.8);
export const yellow = M(0xc9a227, 0.6), white = M(0xd8d4c8, 0.8), plastic = M(0x2d4a5a, 0.6), olive = M(0x4a5236, 0.8), glass = M(0x6f9fb0, 0.2, 0.1);
export const brass = M(0xb08a3a, 0.35, 0.5), copper = M(0xb06a3a, 0.35, 0.5), alu = M(0x9aa0a6, 0.4, 0.6), chrome = M(0xc4cacf, 0.25, 0.5);
export const black = M(0x141516, 0.55), pcb = M(0x1f5a32, 0.6), chip = M(0x18191a, 0.45), rust = M(0x6a3a22, 0.9, 0.2), paper = M(0xe6e2d6, 0.9);
/** Bare metal where paint or plating has worn off (edges, corners, where it's handled). */
export const worn = M(0x8a8c8e, 0.4, 0.7);
export const lens = clear(0x3a6a8a, 0.5, 0.05);

const place = (o: THREE.Object3D, x: number, y: number, z: number) => { o.position.set(x, y, z); return o; };
/** Point an along-Y geometry down X (its top up, -X) or toward him (Z, its top nearest). */
const turn = (g: THREE.BufferGeometry, axis: 'x' | 'y' | 'z') => (axis === 'x' ? g.rotateZ(Math.PI / 2) : axis === 'z' ? g.rotateX(Math.PI / 2) : g);

export const box = (w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) => place(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m), x, y, z);
/** A cylinder (or a cone, r2 its other end's radius): along X its r end up, along Z its r end toward him. */
export const cyl = (r: number, l: number, m: THREE.Material, axis: 'x' | 'y' | 'z' = 'x', x = 0, y = 0, z = 0, r2 = r, seg = 14) =>
  place(new THREE.Mesh(turn(new THREE.CylinderGeometry(r, r2, l, seg), axis), m), x, y, z);
export const group = (...o: THREE.Object3D[]) => { const g = new THREE.Group(); g.add(...o); return g; };
/** A ball, stretched to an egg, a bun, a pillow. */
export const ball = (r: number, m: THREE.Material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, seg = 10) => {
  const o = place(new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg - 3)), m), x, y, z); o.scale.set(sx, sy, sz); return o;
};
/** A ring (or part of one, arc): a coil of rope, a carabiner, a handle; axis is the way it faces. */
export const ring = (R: number, r: number, m: THREE.Material, axis: 'x' | 'y' | 'z' = 'z', x = 0, y = 0, z = 0, arc = Math.PI * 2, tub = 16, rad = 6) => {
  const g = new THREE.TorusGeometry(R, r, rad, tub, arc);
  if (axis === 'x') g.rotateY(Math.PI / 2); else if (axis === 'y') g.rotateX(Math.PI / 2);
  return place(new THREE.Mesh(g, m), x, y, z);
};
/** A turned shape from its profile, [radius, height] from the bottom up: a bottle, a can, a cup, a warhead. */
export const lathe = (pts: [number, number][], m: THREE.Material, axis: 'x' | 'y' | 'z' = 'x', x = 0, y = 0, z = 0, seg = 12) =>
  place(new THREE.Mesh(turn(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg), axis), m), x, y, z);
/** A round bar bent through the points: a cable, a hose, a hook, a wire. */
export const tube = (pts: [number, number, number][], r: number, m: THREE.Material, seg = 16, rad = 5, closed = false) =>
  new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), closed), seg, r, rad, closed), m);
/** A flat part cut to an outline and given its thickness (bevel rounds its edges): in face view, [x, y] on the face
 *  toward him; in side view, [z, up] seen from his right with its thickness across. */
export const slab = (pts: [number, number][], t: number, m: THREE.Material, view: 'face' | 'side' = 'face', bevel = 0) => {
  const s = new THREE.Shape(pts.map(([a, b]) => new THREE.Vector2(a, b)));
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 4 }).translate(0, 0, -t / 2);
  if (view === 'side') g.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, -1, 0)));
  return new THREE.Mesh(g, m);
};
/** A box with rounded corners (r) seen face on, its depth toward him: a phone, a case, a battery, a tin. */
export const rbox = (w: number, h: number, d: number, r: number, m: THREE.Material, x = 0, y = 0, z = 0) => {
  const s = new THREE.Shape(), a = w / 2 - r, b = h / 2 - r;
  s.moveTo(-a, -h / 2); s.lineTo(a, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -b); s.lineTo(w / 2, b); s.quadraticCurveTo(w / 2, h / 2, a, h / 2);
  s.lineTo(-a, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, b); s.lineTo(-w / 2, -b); s.quadraticCurveTo(-w / 2, -h / 2, -a, -h / 2);
  return place(new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 3 }).translate(0, 0, -d / 2), m), x, y, z);
};
/** Place and turn a part once made. */
export const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; };
/** A seeded random 0 to 1, for a lump's knocks and a pile's scatter. */
export const rng = (seed: number) => { let s = seed >>> 0; return () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; }; };
