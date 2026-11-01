// First-person 3D hands (U-006): the rigged WebXR generic hands (MIT, see CREDITS.md), posed in code.
// The model's joints are flat siblings (built for tracked poses), so finger curls are done with our own
// forward kinematics along each finger chain.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Player } from '../sim/player';

const FINGERS = ['thumb', 'index-finger', 'middle-finger', 'ring-finger', 'pinky-finger'];
const CHAIN = (f: string) => f === 'thumb'
  ? ['thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip']
  : [`${f}-metacarpal`, `${f}-phalanx-proximal`, `${f}-phalanx-intermediate`, `${f}-phalanx-distal`, `${f}-tip`];

/** Finger curl 0 (straight) to 1 (fist) and thumb curl; where the hand sits in camera space and how it's turned; where
 *  its elbow is, if the forearm runs off at an angle to the hand (holding a gun: U-052), else straight back from it. */
export interface HandPose { curl: number; thumb: number; pos: THREE.Vector3; rot: THREE.Euler; elbow?: THREE.Vector3; /** the thumb moved out from the palm (metres along the back of the hand's axis), clear of a pistol's side (U-061) */ thumbOut?: number }

interface Hand {
  pivot: THREE.Group;
  /** curl axes in model space: fingers fold toward the palm, the thumb swings across it */
  curlAxis: THREE.Vector3;
  /** each finger bone's axis along the finger */
  along: Map<string, number>;
  thumbAxis: THREE.Vector3;
  /** the thumb moved out from the palm, along the back of the hand's axis */
  outAxis: THREE.Vector3;
  out: number;
  bones: Map<string, THREE.Object3D>;
  rest: Map<string, { p: THREE.Vector3; q: THREE.Quaternion }>;
  side: number;
  curl: number;
  thumb: number;
  held: THREE.Group;
  cuff: THREE.Mesh;
  /** the forearm's way back from the wrist, in the hand's own frame */
  arm: THREE.Vector3;
}

export const CALIB = { thumbMix: 0.6, flip: 1 };

const tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), BACK = new THREE.Vector3(0, 0, 1);
/** The most the forearm turns off the line of the hand (radians). */
const WRIST = 0.3;
const CHAINS: Record<string, string[]> = Object.fromEntries(FINGERS.map(f => [f, CHAIN(f)]));
const SCRATCH_P = Array.from({ length: 5 }, () => new THREE.Vector3()), SCRATCH_Q = Array.from({ length: 5 }, () => new THREE.Quaternion());
/** Each joint's share of a full curl, from the knuckle out. */
const THUMB_ANGLES = [0.35, 0.5, 0.5], FINGER_ANGLES = [0.15, 1.2, 1.4, 0.9];

export class Hands3D {
  readonly group = new THREE.Group();
  private hands: Hand[] = [];
  ready = false;

  constructor(cam: THREE.Camera) {
    cam.add(this.group);
    const loader = new GLTFLoader();
    const skin = new THREE.MeshStandardMaterial({ color: 0xc89f86, roughness: 0.75, metalness: 0, emissive: 0x2a1a12, emissiveIntensity: 0.35 });
    const sleeve = new THREE.MeshStandardMaterial({ color: 0x3a4148, roughness: 0.95, emissive: 0x0a0c0e, emissiveIntensity: 0.4 });
    let loaded = 0;
    ['left', 'right'].forEach((name, i) => loader.load(`./models/hands/${name}.glb`, gltf => {
      const root = gltf.scene;
      const bones = new Map<string, THREE.Object3D>(), rest = new Map<string, { p: THREE.Vector3; q: THREE.Quaternion }>();
      root.traverse(o => {
        if ((o as THREE.SkinnedMesh).isSkinnedMesh) { const m = o as THREE.SkinnedMesh; m.material = skin; m.frustumCulled = false; }
        if (o.name.includes('-') || o.name === 'wrist') { bones.set(o.name, o); rest.set(o.name, { p: o.position.clone(), q: o.quaternion.clone() }); }
      });
      // Each finger bone's own axis along the finger (0 x, 1 y, 2 z), for fattening it across.
      const along = new Map<string, number>();
      for (const f of FINGERS) {
        const names = CHAIN(f);
        names.forEach((n, j) => {
          const a = rest.get(n)!, b = rest.get(names[Math.min(j + 1, names.length - 1)])!, c = rest.get(names[Math.max(j - 1, 0)])!;
          const d = (j + 1 < names.length ? b.p.clone().sub(a.p) : a.p.clone().sub(c.p)).applyQuaternion(a.q.clone().invert());
          const ax = Math.abs(d.x), ay = Math.abs(d.y), az = Math.abs(d.z);
          along.set(n, ax >= ay && ax >= az ? 0 : ay >= az ? 1 : 2);
        });
      }
      const side = i === 0 ? -1 : 1;
      const wrist = rest.get('wrist')!.p;
      root.position.copy(wrist).multiplyScalar(-1);
      // The hand's own frame from its joints: F along the fingers, L across the knuckles (index side), B the back.
      const F = rest.get('middle-finger-phalanx-proximal')!.p.clone().sub(wrist).normalize();
      const L = rest.get('index-finger-phalanx-proximal')!.p.clone().sub(rest.get('pinky-finger-phalanx-proximal')!.p);
      L.sub(F.clone().multiplyScalar(L.dot(F))).normalize();
      const Bk = F.clone().cross(L).multiplyScalar(side * CALIB.flip);
      // Map a right-handed frame (back, fingers, back x fingers) so the back faces up and the fingers point forward.
      const model = new THREE.Matrix4().makeBasis(Bk, F, Bk.clone().cross(F));
      const target = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0));
      const orient = new THREE.Group();
      orient.quaternion.setFromRotationMatrix(target.multiply(model.transpose()));
      orient.add(root);
      const pivot = new THREE.Group();
      pivot.add(orient);
      // Sleeve back from the wrist toward the elbow.
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.062, 0.77, 14).rotateX(Math.PI / 2).translate(0, 0, 0.365), sleeve);
      pivot.add(cuff);
      const held = new THREE.Group();
      pivot.add(held);
      this.group.add(pivot);
      const curlAxis = L.clone().multiplyScalar(side * CALIB.flip);
      const thumbAxis = F.clone().multiplyScalar(side * CALIB.flip * CALIB.thumbMix).add(L.clone().multiplyScalar(side * CALIB.flip * (1 - CALIB.thumbMix))).normalize();
      this.hands[i] = { pivot, curlAxis, thumbAxis, outAxis: Bk.clone().normalize(), out: 0, bones, rest, along, side, curl: 0.3, thumb: 0.3, held, cuff, arm: BACK.clone() };
      if (++loaded === 2) this.ready = true;
    }, undefined, () => { /* missing model: no hands */ }));
  }

  /** Bend each finger chain: every joint after a bend turns about it by the curl angle. */
  private applyCurl(h: Hand) {
    for (const f of FINGERS) {
      // Worked in place on scratch vectors (no garbage each frame, M3-53).
      const names = CHAINS[f], pts = SCRATCH_P, qs = SCRATCH_Q;
      names.forEach((n, j) => { const r = h.rest.get(n)!; pts[j].copy(r.p); qs[j].copy(r.q); });
      const thumb = f === 'thumb';
      const amount = thumb ? h.thumb : h.curl;
      const angles = thumb ? THUMB_ANGLES : FINGER_ANGLES;
      const axis = thumb ? h.thumbAxis : h.curlAxis;
      for (let k = 0; k < angles.length; k++) {
        tmpQ.setFromAxisAngle(axis, angles[k] * amount);
        for (let j = k + 1; j < names.length; j++) {
          tmpV.copy(pts[j]).sub(pts[k]).applyQuaternion(tmpQ);
          pts[j].copy(pts[k]).add(tmpV);
          qs[j].premultiply(tmpQ);
        }
      }
      // The thumb moved out from the palm, all of it from its root.
      if (thumb && h.out) for (const q of pts) q.addScaledVector(h.outAxis, h.out);
      names.forEach((n, j) => {
        const b = h.bones.get(n)!;
        b.position.copy(pts[j]); b.quaternion.copy(qs[j]);
        // A sharply bent knuckle pinches the skin thin just past it (U-023): the bones past the first two bends
        // fatten across their length as the finger curls; a straight finger keeps the model's slim shape.
        const fat = thumb ? 0 : j === 1 ? 0.45 * amount : j === 2 ? 0.2 * amount : 0, ax = h.along.get(n);
        if (ax !== undefined) b.scale.set(ax === 0 ? 1 : 1 + fat, ax === 1 ? 1 : 1 + fat, ax === 2 ? 1 : 1 + fat);
      });
    }
  }

  setPose(i: number, pose: HandPose, k: number) {
    const h = this.hands[i];
    if (!h) return;
    h.curl += (pose.curl - h.curl) * k;
    h.thumb += (pose.thumb - h.thumb) * k;
    h.out += ((pose.thumbOut ?? 0) - h.out) * k;
    h.pivot.position.lerp(pose.pos, k);
    tmpQ.setFromEuler(pose.rot);
    h.pivot.quaternion.slerp(tmpQ, k);
    // The forearm toward the elbow (in the hand's frame), bending at the wrist no more than a wrist bends inside a
    // sleeve: further and the hand's heel shows through its side (U-057).
    if (pose.elbow) {
      tmpV.copy(pose.elbow).sub(h.pivot.position).applyQuaternion(tmpQ.copy(h.pivot.quaternion).invert()).normalize();
      const a = tmpV.angleTo(BACK);
      if (a > WRIST) tmpV.copy(BACK).lerp(tmpV, WRIST / a).normalize();
    } else tmpV.copy(BACK);
    h.arm.lerp(tmpV, k).normalize();
    h.cuff.quaternion.setFromUnitVectors(BACK, h.arm);
    this.applyCurl(h);
  }

  heldSlot(i: number) { return this.hands[i]?.held ?? null; }
}

/** A gripping hand in camera space: wrist just under and in front of the hold, fingers up and over it, palm to the wall. */
export function gripPose(cam: THREE.Camera, gx: number, gy: number, gz: number, nx: number, nz: number, side: number): HandPose {
  const n = new THREE.Vector3(nx, 0, nz);
  const lat = new THREE.Vector3(-nz, 0, nx).multiplyScalar(0.04 * side);
  const wrist = new THREE.Vector3(gx, gy - 0.13, gz).addScaledVector(n, 0.07).add(lat);
  const fingers = new THREE.Vector3(0, 0.85, 0).addScaledVector(n, -0.5).normalize();
  const back = n.clone().sub(fingers.clone().multiplyScalar(n.dot(fingers))).normalize();
  const z = fingers.clone().negate(), x = back.clone().cross(z);
  const qWorld = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, back, z));
  cam.updateMatrixWorld();
  const camQ = cam.getWorldQuaternion(new THREE.Quaternion()).invert();
  const local = wrist.applyMatrix4(cam.matrixWorld.clone().invert());
  if (local.length() > 0.8) local.setLength(0.8);
  return { curl: 0.85, thumb: 0.6, pos: local, rot: new THREE.Euler().setFromQuaternion(camQ.multiply(qWorld)) };
}

/** Where a held item sits on the right hand's pivot. */
export const HELD_AT = new THREE.Vector3(0, -0.03, -0.075);
/** Where an item sits in the fist: HELD_AT, or deeper for the pistol, whose grip is fitted to the hand (U-057). */
export const heldAt = (id: string) => (HOLDS[id]?.seat ? HELD_AT.clone().add(HOLDS[id].seat!) : HELD_AT.clone());
/** How each thing is held (U-052), the right hand's place and turn in camera space: a handshake grip (the back of the
 *  hand outward, whatever is held standing up through the fist), the pistol out in front at the lower right as a
 *  shooter holds it, the knife low with its point forward. The forearms run down and away to elbows at his sides. */
const HOLD: { pos: THREE.Vector3; rot: THREE.Euler; curl?: number; thumb?: number; thumbOut?: number; lthumb?: number; lcurl?: number; seat?: THREE.Vector3 } = { pos: new THREE.Vector3(0.18, -0.25, -0.4), rot: new THREE.Euler(0.25, 0.12, -1.35) };
/** (A hold's fingers and thumbs, right and left, if not curled tight round the grip, and where the item sits in the fist
 *  if not at HELD_AT: the pistol's thumb forward along the frame's side, moved
 *  out from the palm so it's clear of the gun (U-061), the left hand's fingers wrapping the right's: U-056, U-057, fitted by
 *  tests/e2e/thumbs.e2e.mjs.) */
const HOLDS: Record<string, typeof HOLD> = {
  pistol: { pos: new THREE.Vector3(0.15, -0.15, -0.27), rot: new THREE.Euler(0.05, 0.05, -1.45), thumb: 0.15, thumbOut: -0.014, lthumb: 0.15, lcurl: 0.7 },
  knife: { pos: new THREE.Vector3(0.2, -0.22, -0.36), rot: new THREE.Euler(-0.9, 0.2, -1.3) },
};
const LEFT_ROT = new THREE.Euler(0.25, -0.6, 1.35);
const R_ELBOW = new THREE.Vector3(0.3, -0.62, 0.08), L_ELBOW = new THREE.Vector3(-0.1, -0.66, 0.08);

/** Poses by situation (camera space, metres). stride is the camera's step phase; support is where the
 *  left hand grips a two-handed item (item model space), null for one-handed items; reload runs 0 to 1 through a
 *  magazine change, the left hand down to the belt and back to the grip. */
export function poseFor(p: Player, i: number, readied: boolean, holding: string, gripCam: HandPose | null, stride: number, support: THREE.Vector3 | null = null, reload = -1): HandPose {
  const s = i === 0 ? -1 : 1;
  const P = (x: number, y: number, z: number) => new THREE.Vector3(x * s, y, z);
  const R = (x: number, y: number, z: number) => new THREE.Euler(x, y * s, z * s);
  if (gripCam) return gripCam;
  if (p.mode === 'cling') return { curl: 0.05, thumb: 0.15, pos: P(0.2, 0.02, -0.34), rot: R(0.9, 0, 0) };
  if (p.mode === 'action') return { curl: 0.2, thumb: 0.2, pos: P(0.22, -0.2, -0.42), rot: R(-0.3, 0, 0) };
  // Riding a line (M3-52): both fists up round the hook or trolley over his head.
  if (p.mode === 'zip') return { curl: 0.9, thumb: 0.75, pos: P(0.07, 0.38, -0.22), rot: R(1.4, 0, 0) };
  const hold = HOLDS[holding] ?? HOLD;
  // (Only the holds of their own bend the forearms toward the elbows; the rest are held as they always were, U-057.)
  const own = holding in HOLDS;
  if (holding && i === 1) return { curl: hold.curl ?? 0.95, thumb: hold.thumb ?? 0.8, thumbOut: hold.thumbOut, pos: hold.pos.clone(), rot: hold.rot.clone(), elbow: own ? R_ELBOW : undefined };
  // The left hand wraps the item at its support point: its fist centre (the mirror of HELD_AT) lands there; changing
  // a magazine it drops to his belt and comes back with the new one.
  if (holding && support) {
    const grip = support.clone().add(heldAt(holding)).applyEuler(hold.rot).add(hold.pos);
    const fist = HELD_AT.clone().applyEuler(LEFT_ROT), pos = grip.sub(fist);
    const down = reload >= 0 ? Math.sin(Math.min(1, reload / 0.8) * Math.PI) : 0;
    if (down > 0) pos.add(new THREE.Vector3(-0.08, -0.3, 0.12).multiplyScalar(down));
    return { curl: (hold.lcurl ?? 0.85) - down * 0.3, thumb: hold.lthumb ?? 0.7, pos, rot: LEFT_ROT.clone(), elbow: own ? L_ELBOW : undefined };
  }
  if (readied) return { curl: 0.1, thumb: 0.15, pos: P(0.16, -0.12, -0.38), rot: R(0.9, 0.15, 0.1) };
  // On his feet (U-007): hands low at his sides, forearms running down out of view, swinging with the stride,
  // the same at a run.
  if (p.mode === 'ground' && p.posture !== 'crawl') {
    const sp = Math.hypot(p.vel.x, p.vel.z);
    // Running holds the hands as walking does (U-026: the walking hands look right; pumped fists didn't).
    const amp = Math.min(1, sp / 3) * 0.35, sw = Math.sin(stride) * -s * amp, up = Math.max(0, sw);
    return {
      curl: 0.45, thumb: 0.35,
      pos: P(0.3, -0.33 + up * 0.03 + Math.min(0, sw) * 0.05, -0.36 - sw * 0.05),
      rot: R(0.2 + sw * 0.2, 0.1, -0.9),
    };
  }
  return { curl: 0.4, thumb: 0.3, pos: P(0.2, -0.2, -0.36), rot: R(0.15, 0.2, 0.15) };
}
