// The machines' models (M4-26, U-031): code-built, painted white so they're seen at night, armoured and armed, each a
// rig of parts posed every frame. Humanoids walk, run, crouch and bring their rifles up like soldiers; quadrupeds trot
// with a tag launcher on their backs and a prod under the chin; carriers stride on six legs; drones' rotors spin;
// delivery robots' wheels turn. Each part is its own geometry about its pivot, facing +z; pose() places every part
// relative to the unit's feet. Sensors and eyes glow (the batch's emissive by vertex).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { UnitKind } from '../data/units';

const WHITE = 0xdfe2e5, GREY = 0x5d6268, PLATE = 0xf4f5f6, DARK = 0x2a2d32, BLACK = 0x111316, GUN = 0x34373c, EYE = 0xd8ecff, RED = 0xff3020;

function paint(g: THREE.BufferGeometry, color: number, glow: number) {
  const g2 = g.index ? g.toNonIndexed() : g, n = g2.attributes.position.count, c = new THREE.Color(color), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  g2.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g2.setAttribute('glow', new THREE.BufferAttribute(new Float32Array(n).fill(glow), 1));
  if (g2.attributes.uv) g2.deleteAttribute('uv');
  return g2;
}
/** A box (w, h, d) centred at (x, y, z), turned (rx, ry, rz) about its centre. */
const box = (w: number, h: number, d: number, x: number, y: number, z: number, c: number, glow = 0, rx = 0, ry = 0, rz = 0) =>
  paint(new THREE.BoxGeometry(w, h, d).rotateX(rx).rotateY(ry).rotateZ(rz).translate(x, y, z), c, glow);
/** A cylinder of radius r (r2 at its far end) and length h along an axis, centred at (x, y, z). */
function cyl(r: number, h: number, x: number, y: number, z: number, c: number, axis: 'x' | 'y' | 'z' = 'y', glow = 0, r2 = r, seg = 10) {
  const g = new THREE.CylinderGeometry(r2, r, h, seg);
  if (axis === 'x') g.rotateZ(-Math.PI / 2); else if (axis === 'z') g.rotateX(Math.PI / 2);
  return paint(g.translate(x, y, z), c, glow);
}
const part = (...p: THREE.BufferGeometry[]) => mergeGeometries(p);

/** How a unit moves just now: its speed (m/s), its stride's phase, how far it has its gun up (0-1), how far crouched
 *  (0-1), and real seconds (rotors, scanning). */
export interface Anim { speed: number; phase: number; aim: number; crouch: number; t: number }
export interface Rig { parts: THREE.BufferGeometry[]; pose(a: Anim, m: THREE.Matrix4[]): void }

const E = new THREE.Euler();
/** out = parent × translate(x, y, z) × rotate(rx, ry, rz). */
function at(out: THREE.Matrix4, parent: THREE.Matrix4 | null, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
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
/** An arm reaching a point (two bones, l1 and l2 long, the elbow bent toward `pole`): its upper and fore parts. */
function reach(up: THREE.Matrix4, fore: THREE.Matrix4, parent: THREE.Matrix4, s: THREE.Vector3, t: THREE.Vector3, pole: THREE.Vector3, l1: number, l2: number) {
  D.subVectors(t, s);
  const d = Math.min(l1 + l2 - 1e-3, Math.max(Math.abs(l1 - l2) + 1e-3, D.length())), a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  D.normalize();
  Q.subVectors(pole, s); Q.addScaledVector(D, -Q.dot(D)).normalize();
  EL.copy(s).addScaledVector(D, a).addScaledVector(Q, h);
  HA.subVectors(t, EL).normalize().multiplyScalar(l2).add(EL);
  bone(up, parent, s, EL, pole);
  bone(fore, parent, EL, HA, pole);
}
const still = (g: THREE.BufferGeometry): Rig => ({ parts: [g], pose: (_a, m) => { m[0].identity(); } });

// The humanoid: 1.9 m, armoured in white plate over dark joints, a visor slit lit, a power pack on its back, a rifle
// with a scope and a long magazine. Parts: pelvis, torso, head, arms (upper, fore) left and right, legs (thigh, shin
// with its foot) left and right, rifle.
const RL = new THREE.Matrix4(), SR = new THREE.Vector3(-0.27, 0.56, 0), SL = new THREE.Vector3(0.27, 0.56, 0), GR = new THREE.Vector3(), FE = new THREE.Vector3(), PR = new THREE.Vector3(), PL = new THREE.Vector3();
function humanoid(): Rig {
  const arm = (k: number) => [
    part(box(0.14, 0.31, 0.15, 0, -0.155, 0, WHITE), box(0.2, 0.13, 0.27, k * 0.03, 0.02, 0, PLATE, 0, 0, 0, k * -0.25), cyl(0.06, 0.15, 0, -0.32, 0, DARK, 'x')),
    part(box(0.11, 0.29, 0.12, 0, -0.145, 0, DARK), box(0.13, 0.17, 0.14, 0, -0.1, 0.005, WHITE), box(0.09, 0.11, 0.1, 0, -0.33, 0, DARK)),
  ];
  const leg = () => [
    part(box(0.18, 0.44, 0.2, 0, -0.22, 0, WHITE), box(0.16, 0.26, 0.05, 0, -0.2, 0.11, PLATE), cyl(0.07, 0.17, 0, -0.44, 0, DARK, 'x')),
    part(box(0.13, 0.42, 0.14, 0, -0.21, 0, DARK), box(0.15, 0.3, 0.06, 0, -0.2, 0.08, PLATE), box(0.16, 0.12, 0.09, 0, -0.02, 0.09, WHITE), box(0.15, 0.08, 0.3, 0, -0.46, 0.05, DARK)),
  ];
  const parts = [
    part(box(0.36, 0.18, 0.22, 0, 0, 0, DARK), box(0.38, 0.16, 0.05, 0, -0.06, 0.12, WHITE), box(0.38, 0.16, 0.05, 0, -0.06, -0.12, WHITE)),
    part(box(0.3, 0.18, 0.22, 0, 0.08, 0, DARK), box(0.48, 0.46, 0.3, 0, 0.38, 0, WHITE), box(0.42, 0.32, 0.06, 0, 0.42, 0.17, PLATE), box(0.3, 0.12, 0.05, 0, 0.2, 0.16, PLATE),
      box(0.36, 0.4, 0.17, 0, 0.38, -0.22, WHITE), box(0.24, 0.04, 0.02, 0, 0.3, -0.31, RED, 1), cyl(0.07, 0.12, 0, 0.66, 0, DARK)),
    part(box(0.25, 0.25, 0.29, 0, 0.14, 0, WHITE), box(0.21, 0.05, 0.02, 0, 0.15, 0.15, EYE, 1), box(0.19, 0.09, 0.2, 0, 0.02, 0.04, DARK),
      cyl(0.045, 0.05, 0.14, 0.14, 0, DARK, 'x'), cyl(0.045, 0.05, -0.14, 0.14, 0, DARK, 'x'), cyl(0.008, 0.3, -0.1, 0.38, -0.08, BLACK)),
    ...arm(-1), ...arm(1), ...leg(), ...leg(),
    part(box(0.07, 0.11, 0.48, 0, 0, 0.1, GUN), cyl(0.02, 0.42, 0, 0.02, 0.55, BLACK, 'z'), box(0.05, 0.17, 0.08, 0, -0.12, 0.14, BLACK, 0, -0.25),
      box(0.06, 0.12, 0.24, 0, -0.03, -0.24, GUN), cyl(0.026, 0.16, 0, 0.09, 0.1, BLACK, 'z'), box(0.04, 0.1, 0.05, 0, -0.08, -0.02, DARK)),
  ];
  return {
    parts,
    pose: (a, m) => {
      const run = Math.min(1, Math.max(0, (a.speed - 2.8) / 1.5)), A = Math.min(1, a.speed / 2.5) * (0.42 + 0.3 * run), c = a.crouch;
      const bob = -Math.abs(Math.cos(a.phase)) * 0.04 * A;
      at(m[0], null, 0, 0.98 - 0.4 * c + bob, 0, 0.1 * run);
      // (Aiming, bladed: the left shoulder forward.)
      at(m[1], m[0], 0, 0.06, 0, 0.12 * run + 0.25 * c - 0.08 * a.aim, -0.35 * a.aim);
      at(m[2], m[1], 0, 0.7, 0, -0.1 * run - 0.15 * c + 0.08 * a.aim);
      // The rifle: at the low ready, muzzle down across the body, or up in the right shoulder under the eye; the right
      // hand on its grip, the left on its fore-end, elbows down and out.
      const up = a.aim, r = at(RL, null, -0.12 + 0.06 * up, 0.32 + 0.3 * up, 0.3 + 0.12 * up, 0.6 * (1 - up), 0.45 * (1 - up) + 0.35 * up, 0);
      m[11].multiplyMatrices(m[1], r);
      reach(m[5], m[6], m[1], SR, GR.set(0, -0.1, -0.02).applyMatrix4(r), PR.set(-0.75, 0.2 - 0.3 * up, -0.1), 0.32, 0.33);
      reach(m[3], m[4], m[1], SL, FE.set(0, -0.06, 0.2).applyMatrix4(r), PL.set(0.6, -0.1 - 0.2 * up, 0.1), 0.32, 0.33);
      // The legs: a stride (longer running), knees bending in the swing; crouched, folded under him.
      for (const [k, th, sh, x] of [[0, 7, 8, -0.12], [1, 9, 10, 0.12]] as const) {
        const ph = a.phase + k * Math.PI, sw = Math.sin(ph);
        at(m[th], m[0], x, -0.04, 0, -A * sw - 1.15 * c);
        at(m[sh], m[th], 0, -0.44, 0, (0.25 + 0.9 * A) * Math.max(0, Math.sin(ph - 1.1)) + 1.9 * c);
      }
    },
  };
}

// The street heavy (M4-26b, U-038): a 3 m walker on reverse-jointed legs, a wide armoured hull, a sensor head with a
// red eye band, a rotary cannon on its right arm, a rocket pod on its left shoulder. Parts: hips, hull, head, gun arm,
// pod, legs (thigh, shin, foot) left and right.
function heavy(): Rig {
  const leg = () => [
    part(box(0.32, 0.8, 0.38, 0, -0.4, 0, WHITE), box(0.34, 0.5, 0.06, 0, -0.35, 0.2, PLATE), cyl(0.16, 0.42, 0, 0, 0, DARK, 'x'), cyl(0.12, 0.36, 0, -0.8, 0, DARK, 'x')),
    part(box(0.22, 0.9, 0.26, 0, -0.45, 0, DARK), box(0.24, 0.6, 0.07, 0, -0.4, -0.15, WHITE), cyl(0.05, 0.7, 0.14, -0.4, 0, GUN), cyl(0.1, 0.3, 0, -0.9, 0, DARK, 'x')),
    part(box(0.42, 0.14, 0.8, 0, -0.06, 0.18, DARK), box(0.12, 0.1, 0.25, -0.14, -0.08, 0.62, BLACK), box(0.12, 0.1, 0.25, 0.14, -0.08, 0.62, BLACK), box(0.14, 0.1, 0.22, 0, -0.08, -0.3, BLACK)),
  ];
  const parts = [
    part(box(0.76, 0.32, 0.56, 0, 0, 0, DARK), box(0.8, 0.26, 0.08, 0, -0.04, 0.3, WHITE), box(0.1, 0.4, 0.5, -0.44, -0.05, 0, WHITE), box(0.1, 0.4, 0.5, 0.44, -0.05, 0, WHITE)),
    part(box(1.3, 0.9, 1.0, 0, 0.62, 0, WHITE), box(1.2, 0.62, 0.08, 0, 0.64, 0.53, PLATE), box(1.36, 0.1, 0.9, 0, 1.1, 0, PLATE), box(1.0, 0.7, 0.4, 0, 0.66, -0.68, WHITE),
      box(0.5, 0.12, 0.3, 0, 0.18, 0.1, DARK), box(0.06, 0.06, 0.02, -0.5, 0.95, 0.58, RED, 1), box(0.06, 0.06, 0.02, 0.5, 0.95, 0.58, RED, 1), cyl(0.08, 0.3, -0.3, 1.1, -0.75, BLACK), cyl(0.08, 0.3, 0.3, 1.1, -0.75, BLACK)),
    part(box(0.52, 0.32, 0.56, 0, 0.16, 0.08, WHITE), box(0.46, 0.06, 0.02, 0, 0.17, 0.37, RED, 1), box(0.08, 0.06, 0.02, -0.15, 0.08, 0.37, EYE, 1), box(0.08, 0.06, 0.02, 0.15, 0.08, 0.37, EYE, 1),
      box(0.56, 0.06, 0.6, 0, 0.34, 0.06, PLATE), cyl(0.012, 0.6, 0.18, 0.6, -0.12, BLACK)),
    part(box(0.36, 0.62, 0.42, 0, -0.26, 0, WHITE), cyl(0.2, 0.44, 0, 0, 0, DARK, 'x'), box(0.34, 0.34, 0.7, 0, -0.62, 0.2, GUN), cyl(0.15, 0.9, 0, -0.62, 0.95, BLACK, 'z', 0, 0.13, 8),
      ...[0, 1, 2, 3, 4, 5].map(i => cyl(0.03, 0.3, Math.cos(i) * 0.09, -0.62 + Math.sin(i) * 0.09, 1.45, BLACK, 'z')), box(0.3, 0.3, 0.3, 0.12, -0.5, -0.25, DARK)),
    part(box(0.5, 0.42, 0.66, 0, 0.12, 0, WHITE), box(0.52, 0.06, 0.6, 0, 0.36, 0, PLATE), ...[[-0.11, 0.06], [0.11, 0.06], [-0.11, 0.2], [0.11, 0.2]].map(([x, y]) => cyl(0.07, 0.04, x, y, 0.34, BLACK, 'z'))),
    ...leg(), ...leg(),
  ];
  return {
    parts,
    pose: (a, m) => {
      const A = Math.min(1, a.speed / 1.6) * (0.3 + 0.12 * Math.min(1, Math.max(0, (a.speed - 1.8) / 1.2))), bob = -Math.abs(Math.cos(a.phase)) * 0.08 * A;
      at(m[0], null, 0, 1.7 + bob, 0, 0, 0, Math.sin(a.phase) * 0.04 * A);
      at(m[1], m[0], 0, 0.1, 0, 0.06 * A - 0.05 * a.aim, Math.sin(a.phase) * 0.05 * A);
      at(m[2], m[1], 0, 1.18, 0.2, 0.05 * a.aim, 0.3 * Math.sin(a.t * 0.4) * (1 - a.aim) * (1 - A));
      // The cannon: its muzzle dipped at the ready, brought up level at him (the arm raised a little to it).
      at(m[3], m[1], -0.86, 0.92 + 0.12 * a.aim, 0.1, 0.3 * (1 - a.aim) + 0.06 * Math.sin(a.phase) * A);
      at(m[4], m[1], 0.86, 1.05, -0.1, -0.15 * a.aim);
      for (const [k, th, sh, ft, x] of [[0, 5, 6, 7, -0.3], [1, 8, 9, 10, 0.3]] as const) {
        const ph = a.phase + k * Math.PI, sw = Math.sin(ph), lift = Math.max(0, Math.sin(ph - 1.1)), t1 = -0.5 - A * sw, s1 = 1.05 + 0.6 * A * lift;
        at(m[th], m[0], x, -0.1, 0, t1);
        at(m[sh], m[th], 0, -0.8, 0, s1);
        at(m[ft], m[sh], 0, -0.9, 0, -(t1 + s1));
      }
    },
  };
}

// The quadruped: a white armoured body on four two-jointed legs (knees back), a sensor head with three lit eyes and a
// lidar puck, a twin-tube tag launcher on its back, a shock prod under its chin. Parts: body, head, four legs (upper,
// lower) front-left, front-right, back-left, back-right.
function quadruped(): Rig {
  const leg = () => [part(box(0.09, 0.34, 0.12, 0, -0.17, 0, WHITE), cyl(0.07, 0.14, 0, 0, 0, DARK, 'x')), part(box(0.07, 0.36, 0.08, 0, -0.18, 0, DARK), cyl(0.05, 0.08, 0, -0.38, 0, BLACK, 'y', 0, 0.04))];
  const parts = [
    part(box(0.42, 0.26, 0.95, 0, 0, 0, WHITE), box(0.38, 0.06, 0.72, 0, 0.15, -0.02, PLATE), box(0.44, 0.14, 0.5, 0, -0.04, 0, PLATE), box(0.3, 0.08, 0.8, 0, -0.15, 0, DARK),
      box(0.22, 0.08, 0.3, 0, 0.2, -0.12, DARK), cyl(0.055, 0.5, -0.06, 0.29, -0.08, GUN, 'z'), cyl(0.055, 0.5, 0.06, 0.29, -0.08, GUN, 'z'), box(0.1, 0.03, 0.02, 0, 0.1, -0.48, RED, 1)),
    part(box(0.24, 0.17, 0.3, 0, 0, 0.12, WHITE), box(0.2, 0.08, 0.04, 0, 0.01, 0.28, BLACK), box(0.04, 0.04, 0.02, -0.06, 0.02, 0.3, EYE, 1), box(0.04, 0.04, 0.02, 0.06, 0.02, 0.3, EYE, 1),
      box(0.03, 0.03, 0.02, 0, -0.02, 0.3, RED, 1), cyl(0.06, 0.06, 0, 0.12, 0.08, DARK), cyl(0.015, 0.34, 0, -0.12, 0.3, BLACK, 'z')),
    ...leg(), ...leg(), ...leg(), ...leg(),
  ];
  return {
    parts,
    pose: (a, m) => {
      const A = Math.min(1, a.speed / 3) * 0.45, bob = Math.abs(Math.sin(a.phase)) * 0.025 * A;
      at(m[0], null, 0, 0.66 + bob, 0, -0.04 * Math.min(1, a.speed / 6));
      at(m[1], m[0], 0, 0.06, 0.5, 0.05 * Math.sin(a.t * 1.3) * (1 - A), 0.25 * Math.sin(a.t * 0.7) * (1 - A));
      // A trot: diagonal pairs together.
      ([[-0.21, 0.36, 0], [0.21, 0.36, Math.PI], [-0.21, -0.36, Math.PI], [0.21, -0.36, 0]] as const).forEach(([x, z, off], i) => {
        const ph = a.phase + off;
        at(m[2 + i * 2], m[0], x, -0.06, z, -0.45 + A * Math.sin(ph));
        at(m[3 + i * 2], m[2 + i * 2], 0, -0.34, 0, 0.85 + 0.5 * A * Math.max(0, Math.cos(ph)));
      });
    },
  };
}

// The carrier: a long white cargo body on six legs, a cab with a lit band at the front. Parts: body, six legs (upper,
// lower).
function carrier(): Rig {
  const leg = () => [part(box(0.16, 0.6, 0.18, 0, -0.3, 0, WHITE), cyl(0.12, 0.2, 0, 0, 0, DARK, 'x')), part(box(0.12, 0.7, 0.14, 0, -0.35, 0, DARK), box(0.24, 0.06, 0.3, 0, -0.72, 0, BLACK))];
  const parts = [
    part(box(1.4, 1.0, 3.0, 0, 0, 0, WHITE), box(1.44, 0.12, 2.6, 0, 0.45, 0, PLATE), box(1.0, 0.5, 0.6, 0, -0.15, 1.7, WHITE), box(0.8, 0.08, 0.04, 0, -0.1, 2.01, EYE, 1),
      box(1.2, 0.3, 2.6, 0, -0.6, 0, DARK), box(0.06, 0.6, 2.4, -0.73, 0.05, 0, DARK), box(0.06, 0.6, 2.4, 0.73, 0.05, 0, DARK)),
    ...[0, 1, 2, 3, 4, 5].flatMap(leg),
  ];
  return {
    parts,
    pose: (a, m) => {
      const A = Math.min(1, a.speed / 1.6) * 0.35;
      at(m[0], null, 0, 1.35 + Math.abs(Math.sin(a.phase * 2)) * 0.02 * A, 0);
      // A tripod gait: front and back of one side with the middle of the other.
      for (let i = 0; i < 6; i++) {
        const side = i % 2 ? 1 : -1, row = Math.floor(i / 2) - 1, ph = a.phase + ((i + (row === 0 ? 1 : 0)) % 2) * Math.PI;
        at(m[1 + i * 2], m[0], side * 0.72, -0.4, row * 1.1, -0.2 + A * Math.sin(ph), 0, side * -0.3);
        at(m[2 + i * 2], m[1 + i * 2], 0, -0.6, 0, 0.4 + 0.6 * A * Math.max(0, Math.cos(ph)), 0, side * 0.3);
      }
    },
  };
}

// The delivery robot: a white six-wheeled box with a lid, a flag on a whip, a lit strip. Parts: body, six wheels.
function delivery(): Rig {
  const parts = [part(box(0.6, 0.45, 0.78, 0, 0.42, 0, WHITE), box(0.56, 0.08, 0.7, 0, 0.68, 0, PLATE), box(0.4, 0.04, 0.02, 0, 0.5, 0.4, EYE, 1), cyl(0.006, 1.0, -0.22, 1.1, -0.3, BLACK),
    box(0.16, 0.1, 0.01, -0.14, 1.55, -0.3, RED, 1), box(0.5, 0.08, 0.7, 0, 0.18, 0, DARK)),
  ...Array.from({ length: 6 }, () => part(cyl(0.11, 0.08, 0, 0, 0, BLACK, 'x'), box(0.09, 0.03, 0.18, 0, 0, 0, DARK)))];
  return {
    parts,
    pose: (a, m) => {
      m[0].identity();
      for (let i = 0; i < 6; i++) at(m[1 + i], null, (i % 2 ? 1 : -1) * 0.33, 0.11, (Math.floor(i / 2) - 1) * 0.28, a.phase * 3);
    },
  };
}

// The drones: a white shell on four arms, a rotor at each tip (two blades, spun), a camera gimbal under with a lit
// lens; the hunter bigger, ducted, its gun slung under it. Parts: body, four rotors.
/** A giant spider walker (M4-48, U-050, U-068): building-sized, its broad white armoured body slung 13 m up between eight
 *  thick legs, a head crowded with red eyes; its legs step in two alternating sets, each foot reached by its knee
 *  bending high over it. In the hive's white, like the rest of them. */
const SPIDER = 4.5;
function spider(): Rig {
  const K = SPIDER, b = (w: number, h: number, d: number, x: number, y: number, z: number, c: number, glow = 0) => box(w * K, h * K, d * K, x * K, y * K, z * K, c, glow);
  const upper = part(b(0.28, 3.2, 0.28, 0, -1.6, 0, WHITE), b(0.34, 1.1, 0.34, 0, -0.65, 0, PLATE), cyl(0.24 * K, 0.4 * K, 0, 0, 0, DARK, 'x'));
  const lower = part(b(0.2, 3.6, 0.2, 0, -1.8, 0, WHITE), b(0.25, 1.2, 0.27, 0, -0.7, 0, PLATE), cyl(0.14 * K, 0.3 * K, 0, -3.6 * K, 0, DARK, 'y'), cyl(0.18 * K, 0.34 * K, 0, 0, 0, DARK, 'x'));
  const parts = [
    part(b(2.4, 1.2, 3.4, 0, 0, 0, WHITE), b(2.0, 0.3, 2.8, 0, 0.7, 0, PLATE), b(2.6, 0.4, 1.2, 0, -0.5, 0, DARK), cyl(0.3 * K, 1.4 * K, 0, 0.9 * K, -0.6 * K, GUN, 'z'), b(0.4, 0.05, 0.05, 0, -0.4, -1.72, RED, 1)),
    part(b(1.2, 0.8, 0.9, 0, 0, 0.4, WHITE), ...[-0.35, -0.12, 0.12, 0.35].flatMap(x => [b(0.1, 0.1, 0.05, x, 0.12, 0.86, RED, 1), b(0.08, 0.08, 0.05, x * 0.8, -0.1, 0.86, RED, 1)]), cyl(0.06 * K, 0.8 * K, 0.4 * K, -0.3 * K, 0.9 * K, GUN, 'z'), cyl(0.06 * K, 0.8 * K, -0.4 * K, -0.3 * K, 0.9 * K, GUN, 'z')),
    ...Array.from({ length: 8 }, () => [upper, lower]).flat(),
  ];
  const s = new THREE.Vector3(), t = new THREE.Vector3(), pole = new THREE.Vector3();
  return {
    parts,
    pose: (a, m) => {
      const A = Math.min(1, a.speed / 2) * 0.9, bob = Math.abs(Math.sin(a.phase)) * 0.08 * A;
      at(m[0], null, 0, (3.0 + bob) * K, 0);
      at(m[1], m[0], 0, 0.1 * K, 1.9 * K, 0.06 * Math.sin(a.t * 0.8), 0.3 * Math.sin(a.t * 0.37));
      for (let k = 0; k < 8; k++) {
        const side = k < 4 ? -1 : 1, j = k % 4, z0 = 1.2 - j * 0.8, ph = a.phase + ((j + (side > 0 ? 1 : 0)) % 2) * Math.PI;
        s.set(side * 1.1 * K, 0, z0 * K); t.set(side * 4.0 * K, (-3.0 + Math.max(0, Math.cos(ph)) * 0.6 * A) * K, (z0 * 1.7 + Math.sin(ph) * 0.9 * A) * K); pole.set(side * 3.2 * K, 3.5 * K, z0 * K);
        reach(m[2 + k * 2], m[3 + k * 2], m[0], s, t, pole, 3.2 * K, 3.6 * K);
      }
    },
  };
}

/** A colossus (M4-48): a walking machine 9 m tall, long-legged and thin, its arms hanging, a small head with a red bar of
 *  light turning slowly as it goes. */
function colossus(): Rig {
  const limb = (l: number, w: number, c: number) => part(box(w, l, w, 0, -l / 2, 0, c), cyl(w * 0.7, w * 1.3, 0, 0, 0, DARK, 'x'));
  const parts = [
    part(box(1.6, 0.8, 0.9, 0, 0, 0, DARK), box(1.8, 0.4, 1.0, 0, 0.3, 0, GREY)),
    part(box(1.2, 3.0, 0.8, 0, 1.5, 0, GREY), box(1.6, 0.9, 1.0, 0, 2.7, 0, GUN), box(0.5, 1.4, 0.3, 0, 1.6, -0.5, DARK), cyl(0.2, 0.6, 0, 3.1, 0, DARK)),
    part(box(0.7, 0.6, 0.8, 0, 0.3, 0.1, GREY), box(0.6, 0.08, 0.05, 0, 0.32, 0.52, RED, 1), box(0.2, 0.4, 0.2, 0, 0.75, -0.1, DARK)),
    limb(2.4, 0.3, GREY), limb(2.2, 0.24, DARK), limb(2.4, 0.3, GREY), limb(2.2, 0.24, DARK),
    limb(2.6, 0.45, GREY), limb(2.6, 0.36, DARK), limb(2.6, 0.45, GREY), limb(2.6, 0.36, DARK),
  ];
  return {
    parts,
    pose: (a, m) => {
      const A = Math.min(1, a.speed / 1.2) * 0.4, sw = Math.sin(a.phase), bob = -Math.abs(Math.cos(a.phase)) * 0.15 * A;
      at(m[0], null, 0, 5.2 + bob, 0);
      at(m[1], m[0], 0, 0.3, 0, 0.05);
      at(m[2], m[1], 0, 3.4, 0.1, 0.1, 0.5 * Math.sin(a.t * 0.3));
      [-1, 1].forEach((side, i) => {
        at(m[3 + i * 2], m[1], side * 0.9, 2.9, 0, -sw * side * A * 0.6, 0, side * 0.12);
        at(m[4 + i * 2], m[3 + i * 2], 0, -2.4, 0, -0.35);
        at(m[7 + i * 2], m[0], side * 0.55, 0, 0, sw * side * A);
        at(m[8 + i * 2], m[7 + i * 2], 0, -2.6, 0, Math.max(0, -sw * side) * A * 1.4);
      });
    },
  };
}

/** A strike drone (M4-47): a small X frame, its warhead slung under it, its camera ahead, four rotors spinning. */
function fpv(): Rig {
  const blade = part(box(0.22, 0.005, 0.025, 0, 0, 0, BLACK));
  const parts = [part(box(0.38, 0.02, 0.04, 0, 0, 0, DARK, 0, 0, Math.PI / 4), box(0.38, 0.02, 0.04, 0, 0, 0, DARK, 0, 0, -Math.PI / 4), box(0.08, 0.05, 0.14, 0, 0.03, 0, GUN),
    cyl(0.035, 0.18, 0, -0.05, 0.02, 0x4a5236, 'z'), box(0.02, 0.02, 0.02, 0, 0.05, 0.08, RED, 1)), blade, blade, blade, blade];
  return { parts, pose: (a, m) => { at(m[0], null, 0, 0, 0, 0.3); [[0.13, 0.13], [-0.13, 0.13], [0.13, -0.13], [-0.13, -0.13]].forEach(([x, z], k) => at(m[1 + k], m[0], x, 0.03, z, 0, a.t * 60 * (k % 2 ? 1 : -1))); } };
}

function drone(hunter: boolean): Rig {
  const k = hunter ? 1.4 : 1, arm = 0.32 * k;
  const body = [box(0.36 * k, 0.12 * k, 0.42 * k, 0, 0, 0, WHITE), box(0.3 * k, 0.05 * k, 0.34 * k, 0, 0.08 * k, 0, PLATE), box(0.12, 0.02, 0.02, 0, 0, 0.21 * k, RED, 1),
    ...[1, 3, 5, 7].flatMap(q => { const a = (q * Math.PI) / 4; return [box(0.05, 0.03, arm * 1.4, Math.sin(a) * arm * 0.7, 0.02, Math.cos(a) * arm * 0.7, DARK, 0, 0, a), cyl(0.04 * k, 0.08, Math.sin(a) * arm * 1.4, 0.04, Math.cos(a) * arm * 1.4, DARK)]; }),
    cyl(0.06 * k, 0.08, 0, -0.1 * k, 0.08, DARK), box(0.06, 0.04, 0.02, 0, -0.11 * k, 0.15 * k, EYE, 1)];
  if (hunter) body.push(box(0.1, 0.1, 0.5, 0, -0.16, 0.1, GUN), cyl(0.025, 0.45, 0, -0.16, 0.55, BLACK, 'z'), box(0.14, 0.16, 0.12, 0, -0.18, -0.08, BLACK),
    ...[1, 3, 5, 7].map(q => { const a = (q * Math.PI) / 4; return cyl(0.24, 0.07, Math.sin(a) * arm * 1.4, 0.1, Math.cos(a) * arm * 1.4, WHITE, 'y', 0, 0.24, 14); }));
  const blade = part(box(0.36 * k, 0.006, 0.04, 0, 0, 0, BLACK), cyl(0.02, 0.03, 0, 0, 0, DARK));
  return {
    parts: [part(...body), blade, blade, blade, blade],
    pose: (a, m) => {
      // A hover's sway, tipped forward into its flight.
      at(m[0], null, 0, Math.sin(a.t * 1.7 + a.phase) * 0.04, 0, 0.12 * Math.min(1, a.speed / 9));
      [1, 3, 5, 7].forEach((q, i) => { const ang = (q * Math.PI) / 4; at(m[1 + i], m[0], Math.sin(ang) * arm * 1.4, 0.1 + (hunter ? 0.02 : 0), Math.cos(ang) * arm * 1.4, 0, a.t * (i % 2 ? 61 : -59)); });
    },
  };
}

/** Every kind's rig. (The smart lampposts' cameras are their props'.) */
export const RIGS: Record<UnitKind, Rig> = {
  humanoid: humanoid(), heavy: heavy(), quadruped: quadruped(), carrier: carrier(), delivery: delivery(), drone: drone(false), hunter: drone(true), fpv: fpv(), bomber: drone(true), spider: spider(), colossus: colossus(),
  // A camera: its housing under a sun hood on a wall bracket, tipped down, the lens dark, its light red; a sweeper's
  // on a pan motor on a pole.
  camera: still(part(box(0.2, 0.15, 0.34, 0, 0, 0.12, WHITE, 0, 0.35), box(0.24, 0.03, 0.4, 0, 0.1, 0.14, PLATE, 0, 0.35), cyl(0.055, 0.04, 0, -0.06, 0.29, BLACK, 'z'),
    box(0.03, 0.03, 0.02, 0.07, -0.02, 0.29, RED, 1), box(0.05, 0.25, 0.05, 0, 0.12, -0.04, DARK))),
  sweeper: still(part(box(0.18, 0.18, 0.3, 0, 0, 0.12, WHITE, 0, 0.3), cyl(0.05, 0.04, 0, -0.05, 0.28, BLACK, 'z'), box(0.03, 0.03, 0.02, 0.06, -0.02, 0.28, RED, 1),
    cyl(0.1, 0.08, 0, 0.14, 0, DARK), cyl(0.03, 0.3, 0, 0.3, 0, DARK))),
  lamppost: still(box(0.01, 0.01, 0.01, 0, 0, 0, DARK)),
  // A turret: an armoured head on a ring, twin barrels, its sensor box lit red, an ammunition can at its side.
  turret: still(part(cyl(0.45, 0.25, 0, -0.38, 0, DARK, 'y', 0, 0.5, 14), cyl(0.36, 0.1, 0, -0.2, 0, BLACK, 'y', 0, 0.36, 14), box(0.6, 0.36, 0.7, 0, 0.05, 0.05, WHITE), box(0.64, 0.08, 0.6, 0, 0.26, 0.05, PLATE),
    cyl(0.05, 1.0, -0.12, 0.08, 0.8, BLACK, 'z'), cyl(0.05, 1.0, 0.12, 0.08, 0.8, BLACK, 'z'), box(0.2, 0.14, 0.12, 0, 0.3, 0.38, DARK), box(0.12, 0.05, 0.02, 0, 0.3, 0.45, RED, 1), box(0.16, 0.22, 0.3, 0.38, 0, -0.05, GUN))),
  pir: still(part(box(0.16, 0.12, 0.08, 0, 0, 0, WHITE), cyl(0.05, 0.05, 0, -0.03, 0.05, BLACK, 'z'), box(0.02, 0.02, 0.01, 0.05, 0.03, 0.045, RED, 1))),
  acoustic: still(part(box(0.3, 0.3, 0.1, 0, 0, 0, WHITE), ...[-0.08, 0, 0.08].map(y => box(0.26, 0.02, 0.02, 0, y, 0.06, DARK)), box(0.02, 0.02, 0.01, 0.12, 0.12, 0.055, RED, 1))),
  // A tripwire is all beam, a metre long (scaled to its length): red, lit.
  tripwire: still(box(0.012, 0.012, 1, 0, 0, 0.5, RED, 1)),
};
