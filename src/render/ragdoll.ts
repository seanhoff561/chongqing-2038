// A machine on the ground destroyed comes down (M10-47): its rig's parts let go as rigid boxes, toppling over the way
// its id picks, falling, bouncing a little and tipping onto a face, then still where they lie (on the ground 2 s after it let go). Drawn
// only: the sim's wreck stays where it fell (u.stop).
import * as THREE from 'three';

/** A part come loose: its middle and turn and scale, its box about its middle (half sizes, its own frame), its speed and
 *  spin, how long it's lain on the ground, and its matrix as drawn. Still once it lies (or never moved: hidden). */
interface Piece { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3; c: THREE.Vector3; h: THREE.Vector3; v: THREE.Vector3; w: THREE.Vector3; lain: number; still: boolean; m: THREE.Matrix4 }
export interface Ragdoll { parts: Piece[]; /** seconds it has fallen */ t: number; acc: number }
/** The ground's height under a point (the world's raycast, in the game). */
export type Ground = (x: number, y: number, z: number) => number;

export const FALL = { g: 9.8, step: 1 / 120, bounce: 0.2, slide: 6, spin: 5, rest: 2, topple: 1.2 };

/** A number in [0, 1) from a seed and a salt (the same each time). */
const hash = (n: number, k: number) => { const x = Math.sin(n * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

const T = new THREE.Matrix4(), O = new THREE.Vector3(), R = new THREE.Vector3(), DQ = new THREE.Quaternion(), A = new THREE.Vector3(), LOW = new THREE.Vector3();

/** Its parts let go from where they're drawn (each part's world matrix and geometry), toppling about its feet. */
export function ragdoll(mats: THREE.Matrix4[], geos: THREE.BufferGeometry[], foot: THREE.Vector3, seed: number): Ragdoll {
  const a = hash(seed, 1) * Math.PI * 2, top = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(FALL.topple * (0.8 + 0.4 * hash(seed, 2)));
  const parts = mats.map((m, j): Piece => {
    const g = geos[j];
    if (!g.boundingBox) g.computeBoundingBox();
    const c = g.boundingBox!.getCenter(new THREE.Vector3()), h = g.boundingBox!.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    m.decompose(p, q, s);
    const hidden = Math.abs(m.determinant()) < 1e-9;
    p.copy(c).applyMatrix4(m);
    // Each part sent the way it all topples (the higher, the faster), with a knock of its own.
    const v = new THREE.Vector3().crossVectors(top, O.subVectors(p, foot)).add(R.set(hash(seed, 3 + j) - 0.5, 0, hash(seed, 40 + j) - 0.5).multiplyScalar(0.8));
    const w = top.clone().add(R.set(hash(seed, 80 + j) - 0.5, hash(seed, 120 + j) - 0.5, hash(seed, 160 + j) - 0.5).multiplyScalar(3));
    return { p, q, s, c, h, v, w, lain: 0, still: hidden, m: m.clone() };
  });
  return { parts, t: 0, acc: 0 };
}

/** One step of a part: gravity, its spin, and the ground: pushed up out of it, bouncing a little, sliding to a stop,
 *  tipped by its weight over what it rests on until it lies on a face. */
function step(b: Piece, dt: number, ground: Ground, t: number) {
  b.v.y -= FALL.g * dt;
  b.p.addScaledVector(b.v, dt);
  const sp = b.w.length();
  if (sp > 1e-6) b.q.premultiply(DQ.setFromAxisAngle(A.copy(b.w).divideScalar(sp), sp * dt)).normalize();
  const gy = ground(b.p.x, b.p.y, b.p.z);
  // Its lowest corners: what it rests on (their middle).
  let low = Infinity;
  const ys: number[] = [];
  for (let k = 0; k < 8; k++) {
    R.set(k & 1 ? b.h.x : -b.h.x, k & 2 ? b.h.y : -b.h.y, k & 4 ? b.h.z : -b.h.z).multiply(b.s).applyQuaternion(b.q);
    ys.push(R.y);
    low = Math.min(low, R.y);
  }
  // (Within 2 cm of it, it's on it.)
  const pen = gy - b.p.y - low;
  if (pen < -0.02) { b.lain = 0; return; }
  if (pen > 0) { b.p.y += pen; if (b.v.y < 0) b.v.y *= -FALL.bounce; }
  LOW.set(0, 0, 0);
  let n = 0;
  for (let k = 0; k < 8; k++) if (ys[k] < low + 0.03) { LOW.add(R.set(k & 1 ? b.h.x : -b.h.x, k & 2 ? b.h.y : -b.h.y, k & 4 ? b.h.z : -b.h.z).multiply(b.s).applyQuaternion(b.q)); n++; }
  LOW.divideScalar(n);
  const f = Math.exp(-FALL.slide * dt);
  b.v.x *= f; b.v.z *= f;
  // Its weight about what it rests on (LOW, from its middle): r × (0, -g, 0) with r = -LOW.
  const I = R.copy(b.h).multiply(b.s).lengthSq() / 3 + 0.01;
  b.w.x += (FALL.g * -LOW.z / I) * dt; b.w.z += (FALL.g * LOW.x / I) * dt;
  b.w.multiplyScalar(Math.exp(-FALL.spin * dt));
  b.lain += dt;
  if ((b.lain > 0.3 && b.v.length() < 0.08 && b.w.length() < 0.15) || t > FALL.rest) { b.still = true; b.v.set(0, 0, 0); b.w.set(0, 0, 0); }
}

/** It falls on dt seconds (in fixed steps); its parts' matrices then where they are. True once every part lies still. */
export function settle(r: Ragdoll, dt: number, ground: Ground) {
  r.acc += dt;
  while (r.acc >= FALL.step) {
    r.acc -= FALL.step; r.t += FALL.step;
    for (const b of r.parts) if (!b.still) { step(b, FALL.step, ground, r.t); b.m.compose(b.p, b.q, b.s).multiply(T.makeTranslation(-b.c.x, -b.c.y, -b.c.z)); }
  }
  return r.parts.every(b => b.still);
}
