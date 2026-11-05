// The walking machines' rigs (M4-26, M10-44): the humanoid, the quadruped, the street heavy and the carrier. White
// ceramic shells over dark joints, all points and blades, no faces: their senses are rings of pits and grooves. Each kind
// has a few looks (body plans), every part about the same pivot in each, so one pose serves them all.
import * as THREE from 'three';
import { WHITE, PALE, PLATE, SEAM, PIT, ICE, box, cyl, spike, egg, pits, band, part, at, reach, rig, type Rig } from './machinekit';

const PI = Math.PI, H = PI / 2;

// The humanoid: about 1.9 m, four body plans. Parts: pelvis, torso, head (its sensor cluster), arms (upper, fore) left
// and right, legs (thigh, shin with its foot) right and left, rifle. Each plan's lengths: thigh, shin, upper arm,
// forearm, shoulders' half width, the neck's height on the torso, how far it stoops, its bulk.
interface Hum { th: number; sn: number; l1: number; l2: number; sw: number; neck: number; lean: number; b: number }
const HUM: Hum[] = [
  // The sentinel: tall and narrow, a crest swept back off its head.
  { th: 0.44, sn: 0.42, l1: 0.32, l2: 0.33, sw: 0.27, neck: 0.7, lean: 0, b: 1 },
  // The mantis: long-legged and stooped, its forearms bladed, a needle for a head.
  { th: 0.48, sn: 0.46, l1: 0.3, l2: 0.4, sw: 0.24, neck: 0.62, lean: 0.22, b: 0.85 },
  // The bulwark: short and broad, one great pointed shoulder, a split dome.
  { th: 0.4, sn: 0.4, l1: 0.34, l2: 0.33, sw: 0.31, neck: 0.72, lean: 0, b: 1.25 },
  // The thorn: spines down its back and off its heels, a fin for a head.
  { th: 0.46, sn: 0.44, l1: 0.32, l2: 0.35, sw: 0.26, neck: 0.74, lean: 0.06, b: 0.95 },
];
const hip = (P: Hum) => 0.12 + P.th + P.sn;

function humLook(P: Hum, n: number) {
  const { th, sn, l1, l2, sw, neck, b } = P;
  const pelvis = part(box(0.24 * b, 0.13, 0.17, 0, 0, 0, SEAM), ...[-1, 1].map(s => spike(0.09, 0.01, 0.3, s * 0.13 * b, 0.05, 0, WHITE, PI, 0, s * 0.35, 1, 0.7)),
    ...(n === 3 ? [spike(0.05, 0, 0.42, 0, 0.02, -0.08, PALE, -H - 0.9)] : []));
  const backs = n === 3 ? [0.62, 0.5, 0.38, 0.26, 0.14].map((y, i) => spike(0.05, 0, 0.18 + 0.05 * (i % 2), 0, y, -0.1, PALE, -H + 0.7)) :
    n === 1 ? [-1, 1].map(s => spike(0.06, 0, 0.55, s * 0.1, 0.58, -0.08, PALE, -0.55, 0, s * -0.25, 1, 0.5)) : [spike(0.06, 0, 0.3, 0.06, 0.6, -0.1, PALE, -H + 0.6)];
  // (Its chest a keel, its seam and its line of light down the keel's edge.)
  const keel = (y: number) => 0.5 * (0.11 + ((0.25 * b - 0.11) * (y - 0.16)) / 0.5) + 0.004, tilt = Math.atan(0.25 * b - 0.11);
  const torso = part(cyl(0.08, 0.22, 0, 0.1, 0, SEAM, 'y', 0, 0.08, 6), spike(0.11, 0.25 * b, 0.5, 0, 0.16, 0, WHITE, 0, 0, 0, 1, 0.5),
    spike(0.11, 0, n === 2 ? 0.5 : 0.28, sw, 0.6, 0, PLATE, 0, 0, -1.1, 1, 0.8), spike(0.1, 0, n === 2 ? 0.16 : 0.26, -sw, 0.6, 0, PLATE, 0, 0, 1.1, 1, 0.8),
    box(0.012, 0.18, 0.012, 0, 0.52, keel(0.52), SEAM, 0, tilt), box(0.01, 0.12, 0.01, 0, 0.32, keel(0.32), ICE, 1, tilt), cyl(0.05, 0.14, 0, neck - 0.05, 0, SEAM, 'y', 0, 0.05, 6), ...backs);
  // Its head: no face, its senses in a ring of pits or a groove.
  const head = [
    () => [spike(0.12, 0, 0.5, 0, 0.1, 0.14, WHITE, -H + 0.35, 0, 0, 0.45, 1), egg(0.08, 0.09, 0.11, 0, 0.09, 0.03, PALE), ...pits(5, 0.04, 0.02, 0, 0.13, 0.15)],
    () => [spike(0.07, 0, 0.44, 0, 0.12, -0.06, WHITE, H - 0.15, 0, 0, 1, 0.8, 6), ...[-1, 1].map(s => spike(0.025, 0, 0.2, s * 0.05, 0.06, 0.08, PALE, H + 0.35, s * 0.3)),
      box(0.012, 0.012, 0.26, 0, 0.07, 0.16, SEAM), ...pits(3, 0.025, 0.018, 0, 0.18, 0.05, true)],
    () => [egg(0.15, 0.13, 0.15, 0, 0.12, 0.02, WHITE), cyl(1, 1, 0, 0, 0, SEAM, 'x', 0, 1, 12).scale(0.014, 0.133, 0.153).translate(0, 0.12, 0.02), band(0.15, 0.13, 0.15, 0, 0.12, 0.02, -0.03, SEAM),
      ...[-0.07, 0, 0.07].map(x => spike(0.03, 0, 0.2, x, 0.2, -0.04, PALE, -H + 0.5)), ...pits(4, 0.06, 0.02, 0, 0.255, 0.02, true)],
    () => [spike(0.16, 0, 0.44, 0, 0.04, 0, WHITE, 0, 0, 0, 0.22, 1), box(0.05, 0.006, 0.24, 0, 0.16, 0, SEAM), ...[-1, 1].map(s => spike(0.03, 0, 0.14, s * 0.04, 0.04, 0.02, PALE, 0, 0, s * -0.6)),
      ...[0.06, 0.12, 0.18].map(y => box(0.045, 0.018, 0.015, 0, y, 0.15 - y * 0.35, PIT))],
  ][n]();
  const arm = (s: number) => [
    part(cyl(0.05, 0.13, 0, 0, 0, SEAM, 'x', 0, 0.05, 6), spike(0.065 * b, 0.045, l1, 0, 0, 0, WHITE, PI, 0, 0, 1, 0.9), spike(0.035, 0, 0.14, 0, -l1 + 0.04, 0.02, PALE, H + 0.4),
      ...(n === 2 && s > 0 ? [spike(0.08, 0, 0.3, 0, -0.06, -0.02, PLATE, -0.4, 0, -0.5, 1, 0.5)] : [])),
    part(cyl(0.04, 0.1, 0, 0, 0, SEAM, 'x', 0, 0.04, 6), spike(0.05, 0.03, l2, 0, 0, 0, WHITE, PI, 0, 0, 1, 0.9), ...[-0.02, 0, 0.02].map(x => spike(0.012, 0, 0.11, x, -l2 + 0.03, 0, PALE, PI, 0, x * 4)),
      ...(n === 1 ? [spike(0.03, 0, l2 + 0.3, 0, -0.04, 0.035, PLATE, PI, 0, 0, 0.3, 1)] : [])),
  ];
  const leg = () => [
    part(cyl(0.06, 0.16, 0, 0, 0, SEAM, 'x', 0, 0.06, 6), spike(0.1 * b, 0.065, th, 0, 0, 0, WHITE, PI, 0, 0, 1, 0.85, 6), spike(0.05, 0, 0.16, 0, -th + 0.06, 0.03, PALE, H - 0.5)),
    part(cyl(0.05, 0.12, 0, 0, 0, SEAM, 'x', 0, 0.05, 6), spike(0.07, 0.04, sn, 0, 0, 0, WHITE, PI, 0, 0, 1, 0.9), spike(0.06, 0, 0.3, 0, -sn - 0.04, -0.06, WHITE, H, 0, 0, 0.9, 0.55),
      spike(0.035, 0, n === 3 ? 0.3 : 0.12, 0, -sn - 0.03, -0.05, PALE, n === 3 ? -H + 0.3 : -H - 0.3), ...(n === 3 ? [spike(0.03, 0, 0.22, 0, -0.12, -0.04, PALE, -H + 0.5)] : [])),
  ];
  // Its rifle: a lance, pale, a dark seam down it, a hooked blade for a magazine.
  const rifle = part(spike(0.05, 0.015, 1.15, 0, 0, -0.38, WHITE, H, 0, 0, 0.8, 1, 6), spike(0.045, 0, 0.18, 0, 0, -0.37, PALE, -H), box(0.01, 0.01, 0.6, 0, 0.042, 0.15, SEAM),
    spike(0.03, 0.02, 0.16, 0, -0.01, -0.02, SEAM, PI - 0.25), spike(0.04, 0, 0.2, 0, -0.03, 0.12, PALE, PI - 0.4, 0, 0, 0.5));
  return [pelvis, torso, part(...head), ...arm(1), ...arm(-1), ...leg(), ...leg(), rifle];
}

const RL = new THREE.Matrix4(), SR = new THREE.Vector3(), SL = new THREE.Vector3(), GR = new THREE.Vector3(), FE = new THREE.Vector3(), PR = new THREE.Vector3(), PL = new THREE.Vector3();
export function humanoid(): Rig {
  return rig(HUM.map(humLook), (a, m) => {
    const P = HUM[a.v % HUM.length], run = Math.min(1, Math.max(0, (a.speed - 2.8) / 1.5)), A = Math.min(1, a.speed / 2.5) * (0.42 + 0.3 * run), c = a.crouch;
    const bob = -Math.abs(Math.cos(a.phase)) * 0.04 * A;
    at(m[0], null, 0, hip(P) - 0.46 * (P.th + P.sn) * c + bob, 0, 0.1 * run);
    // (Aiming, bladed: the left shoulder forward.)
    at(m[1], m[0], 0, 0.06, 0, 0.12 * run + 0.25 * c - 0.08 * a.aim + P.lean, -0.35 * a.aim);
    at(m[2], m[1], 0, P.neck, 0, -0.1 * run - 0.15 * c + 0.08 * a.aim - 0.8 * P.lean);
    // The rifle: at the low ready, muzzle down across the body, or up in the right shoulder under its head; the right
    // hand on its grip, the left on its fore-end, elbows down and out.
    const up = a.aim, r = at(RL, null, -0.12 + 0.06 * up, 0.32 + 0.3 * up, 0.3 + 0.12 * up, 0.6 * (1 - up) - P.lean, 0.45 * (1 - up) + 0.35 * up, 0);
    m[11].multiplyMatrices(m[1], r);
    reach(m[5], m[6], m[1], SR.set(-P.sw, 0.56, 0), GR.set(0, -0.1, -0.02).applyMatrix4(r), PR.set(-0.75, 0.2 - 0.3 * up, -0.1), P.l1, P.l2);
    reach(m[3], m[4], m[1], SL.set(P.sw, 0.56, 0), FE.set(0, -0.06, 0.2).applyMatrix4(r), PL.set(0.6, -0.1 - 0.2 * up, 0.1), P.l1, P.l2);
    // The legs: a stride (longer running), knees bending in the swing; crouched, folded under it.
    for (const [k, th, sh, x] of [[0, 7, 8, -0.12], [1, 9, 10, 0.12]] as const) {
      const ph = a.phase + k * Math.PI, sw = Math.sin(ph);
      at(m[th], m[0], x, -0.04, 0, -A * sw - 1.15 * c);
      at(m[sh], m[th], 0, -P.th, 0, (0.25 + 0.9 * A) * Math.max(0, Math.sin(ph - 1.1)) + 1.9 * c);
    }
  });
}

// The quadruped: dog-like, three looks: a long low hound, a tall short-backed one with a forked head, a lurcher ribbed
// with spines. A tag launcher's two tubes along its back, a prod under its head. Parts: body, head, four legs (upper,
// lower) front-left, front-right, back-left, back-right. Each look's leg scale and body length.
const QUAD = [{ k: 1, len: 1 }, { k: 1.18, len: 0.85 }, { k: 0.9, len: 1.12 }];
function quadLook({ k, len }: { k: number; len: number }, n: number) {
  const L = 0.48 * len, launcher = [-1, 1].map(s => spike(0.045, 0.01, 0.4, s * 0.06, 0.17, -0.22, PALE, H, 0, 0, 1, 1, 6));
  const body = [
    () => [egg(0.2, 0.13, L, 0, 0, 0, WHITE), ...[0.3, 0.1, -0.1, -0.3].map(z => spike(0.12, 0.02, 0.3, 0, 0.1, z * len, PALE, -H + 0.25, 0, 0, 1, 0.35)), spike(0.05, 0, 0.4, 0, 0.04, -L + 0.04, WHITE, -H + 0.5)],
    () => [egg(0.18, 0.16, L, 0, 0, 0, WHITE), ...[-1, 1].map(s => spike(0.07, 0, 0.36, s * 0.07, 0.12, 0.22, PLATE, -0.35, 0, s * -0.2, 1, 0.5)), ...[0.05, -0.15].map(z => spike(0.11, 0.02, 0.26, 0, 0.13, z, PALE, -H + 0.3, 0, 0, 1, 0.35)),
      spike(0.04, 0, 0.24, 0, 0.06, -L + 0.04, WHITE, -H + 0.8)],
    () => [egg(0.21, 0.12, L, 0, 0, 0, WHITE), ...[0.32, 0.16, 0, -0.16, -0.32].map(z => spike(0.08, 0.01, 0.24, 0, 0.09, z * len, PALE, -H + 0.3, 0, 0, 1, 0.3)),
      ...[-1, 1].flatMap(s => [0.18, 0, -0.18].map(z => spike(0.03, 0, 0.2, s * 0.18, -0.02, z * len, PALE, 0, 0, s * -(H + 0.6)))), spike(0.05, 0, 0.5, 0, 0.03, -L + 0.04, WHITE, -H + 0.3)],
  ][n]();
  const head = [
    () => [spike(0.11, 0, 0.42, 0, 0, -0.04, WHITE, H - 0.1, 0, 0, 1, 0.7), spike(0.04, 0, 0.26, 0, 0.05, 0.06, PALE, -H + 0.35, 0, 0, 0.5, 1), ...pits(4, 0.03, 0.018, 0, -0.07, 0.08, true)],
    () => [...[-1, 1].map(s => spike(0.05, 0, 0.36, s * 0.05, 0, 0, WHITE, H, s * 0.18, 0, 1, 0.8)), egg(0.09, 0.09, 0.11, 0, 0.02, 0, PALE), ...pits(5, 0.035, 0.016, 0, 0.01, 0.11)],
    () => [spike(0.1, 0, 0.42, 0, 0.05, -0.02, WHITE, H + 0.55, 0, 0, 0.45, 1), ...[-0.06, -0.02, 0.02, 0.06].map(x => spike(0.025, 0, 0.22, x, 0.06, 0.02, PALE, -H + 0.6, 0, x * 3)), ...pits(3, 0.025, 0.018, 0, -0.04, 0.1, true)],
  ][n]();
  const leg = () => [part(cyl(0.05, 0.12, 0, 0, 0, SEAM, 'x', 0, 0.05, 6), spike(0.06 * k, 0.04 * k, 0.34 * k, 0, 0, 0, WHITE, PI, 0, 0, 1, 0.9)),
    part(cyl(0.035, 0.08, 0, 0, 0, SEAM, 'x', 0, 0.035, 6), spike(0.04 * k, 0, 0.43 * k, 0, 0, 0, WHITE, PI, 0, 0, 1, 0.85), spike(0.025, 0, 0.12 * k, 0, -0.02, -0.02, PALE, -H - 0.4))];
  return [part(...body, ...launcher, box(0.02, 0.02, 1.4 * L, 0, -0.125, 0, SEAM), box(0.012, 0.01, 0.2, 0, 0.13, -0.42 * L, ICE, 1)),
    part(...head, spike(0.012, 0, 0.36, 0, -0.06, 0.05, SEAM, H)), ...leg(), ...leg(), ...leg(), ...leg()];
}
export function quadruped(): Rig {
  return rig(QUAD.map(quadLook), (a, m) => {
    const { k, len } = QUAD[a.v % QUAD.length], A = Math.min(1, a.speed / 3) * 0.45, bob = Math.abs(Math.sin(a.phase)) * 0.025 * A;
    at(m[0], null, 0, 0.06 + 0.7 * k + bob, 0, -0.04 * Math.min(1, a.speed / 6));
    at(m[1], m[0], 0, 0.06, 0.5 * len, 0.05 * Math.sin(a.t * 1.3) * (1 - A), 0.25 * Math.sin(a.t * 0.7) * (1 - A));
    // A trot: diagonal pairs together.
    ([[-0.19, 0.36, 0], [0.19, 0.36, Math.PI], [-0.19, -0.36, Math.PI], [0.19, -0.36, 0]] as const).forEach(([x, z, off], i) => {
      const ph = a.phase + off;
      at(m[2 + i * 2], m[0], x, -0.06, z * len, -0.45 + A * Math.sin(ph));
      at(m[3 + i * 2], m[2 + i * 2], 0, -0.34 * k, 0, 0.85 + 0.5 * A * Math.max(0, Math.cos(ph)));
    });
  });
}

// The street heavy (M4-26b, U-038): a 3 m walker on reverse-jointed legs, a wide faceted hull, a blade of a head ringed
// with pits, a lance of a cannon on its right arm, a cluster of rocket shards on its left shoulder. Two looks: three
// spines off its back, or one great fin and a horn. Parts: hips, hull, head, gun arm, pod, legs (thigh, shin, foot) left
// and right.
function heavyLook(n: number) {
  const leg = () => [
    part(cyl(0.15, 0.42, 0, 0, 0, SEAM, 'x', 0, 0.15, 8), spike(0.22, 0.14, 0.8, 0, 0, 0, WHITE, PI, 0, 0, 1, 1, 6), spike(0.1, 0, 0.4, 0, -0.55, 0.12, PALE, H - 0.6), cyl(0.11, 0.34, 0, -0.8, 0, SEAM, 'x', 0, 0.11, 8)),
    part(spike(0.15, 0.09, 0.9, 0, 0, 0, WHITE, PI), spike(0.06, 0, 0.55, 0, -0.08, -0.12, PALE, PI + 0.25), cyl(0.09, 0.28, 0, -0.9, 0, SEAM, 'x', 0, 0.09, 8)),
    part(...[-0.35, 0, 0.35].map(r => spike(0.09, 0, 0.62, 0, -0.08, 0, WHITE, H, r, 0, 1, 0.55)), spike(0.08, 0, 0.35, 0, -0.08, 0, PALE, -H, 0, 0, 1, 0.55)),
  ];
  const back = n ? [spike(0.5, 0, 1.5, 0.1, 0.9, -0.3, PALE, -0.6, 0, -0.1, 0.18, 1), spike(0.12, 0, 0.6, 0, 0.5, 0.4, WHITE, H + 0.7)] :
    [[-0.35, 0.8], [0, 1.1], [0.35, 0.7]].map(([x, l]) => spike(0.16, 0, l, x, 1.1, -0.35, PALE, -0.45, 0, -x * 0.6));
  const head = n ? [spike(0.13, 0, 0.75, 0, 0.12, 0, WHITE, H - 0.4, 0, 0, 1, 1, 6), ...pits(3, 0.05, 0.03, 0, 0.0, 0.2)] :
    [spike(0.36, 0, 0.5, 0, 0.14, -0.1, WHITE, H - 0.15, 0, 0, 1, 0.3), ...pits(6, 0.07, 0.03, 0, 0.06, 0.27)];
  return [
    part(box(0.6, 0.28, 0.5, 0, 0, 0, SEAM), ...[-1, 1].map(s => spike(0.2, 0, 0.6, s * 0.42, 0.05, 0, WHITE, PI, 0, s * 0.3, 0.6, 1)), spike(0.3, 0, 0.45, 0, 0, 0.26, PALE, PI, 0, 0, 1, 0.3)),
    part(spike(0.52, 0.8, 0.98, 0, 0.12, 0, WHITE, 0, 0, 0, 1, 0.72), ...[-1, 1].map(s => spike(0.3, 0, 0.5, s * 0.5, 1.0, 0, PLATE, 0, 0, s * -0.5, 1, 0.8)),
      box(0.014, 0.4, 0.02, 0, 0.85, 0.525, SEAM, 0, 0.2), box(0.012, 0.36, 0.014, 0, 0.45, 0.442, ICE, 0.8, 0.2), ...back),
    part(egg(0.2, 0.12, 0.22, 0, 0.08, 0.05, PALE), ...head),
    part(egg(0.22, 0.24, 0.24, 0, 0, 0, WHITE), spike(0.17, 0.12, 0.55, 0, -0.05, 0, WHITE, PI), spike(0.2, 0.08, 1.35, 0, -0.62, 0, WHITE, H, 0, 0, 1, 1, 6),
      ...[0, 2.1, 4.2].map(q => cyl(0.025, 0.3, Math.cos(q) * 0.05, -0.62 + Math.sin(q) * 0.05, 1.42, SEAM, 'z', 0, 0.025, 5)), spike(0.14, 0, 0.45, 0, -0.62, 0, PALE, -H)),
    part(box(0.3, 0.2, 0.36, 0, 0.1, 0, SEAM), ...[[-0.1, 0.05, 0.55], [0.1, -0.05, 0.7], [0, -0.15, 0.4]].map(([x, z, l]) => spike(0.11, 0, l, x, 0.15, z, WHITE, 0.5, 0, -x * 2)), ...pits(4, 0.08, 0.04, 0, 0.21, 0, true)),
    ...leg(), ...leg(),
  ];
}
export function heavy(): Rig {
  return rig([0, 1].map(heavyLook), (a, m) => {
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
  });
}

// The carrier: a long pale cargo body like a woodlouse's on six long pointed legs. Two looks: plated, a prow ahead; or
// narrower, a row of spines along its back and mandibles. A faint line of light round its middle. Parts: body, six
// legs (upper, lower). Each look's body half width (where its legs join).
const CARRIER = [0.72, 0.6];
function carrierLook(n: number) {
  const w = CARRIER[n], E = n ? [0.58, 0.58, 1.7] as const : [0.72, 0.5, 1.55] as const;
  const top = n ? [1.1, 0.55, 0, -0.55, -1.1].map((z, i) => spike(0.14, 0, 0.5 + 0.15 * (i % 3), 0, 0.5, z, PALE, -0.4)).concat([-1, 1].map(s => spike(0.12, 0, 0.7, s * 0.2, -0.15, 1.5, WHITE, H, s * 0.35)))
    : [1.0, 0.5, 0, -0.5, -1.0].map(z => spike(0.62, 0.1, 0.7, 0, 0.4 - Math.abs(z) * 0.12, z, PALE, -H + 0.2, 0, 0, 1, 0.25)).concat([spike(0.3, 0, 0.9, 0, -0.1, 1.35, WHITE, H, 0, 0, 1, 0.6, 6)]);
  const leg = () => [part(cyl(0.1, 0.2, 0, 0, 0, SEAM, 'x', 0, 0.1, 8), spike(0.11, 0.08, 0.6, 0, 0, 0, WHITE, PI)),
    part(cyl(0.08, 0.16, 0, 0, 0, SEAM, 'x', 0, 0.08, 8), spike(0.08, 0, 0.78, 0, 0, 0, WHITE, PI, 0, 0, 1, 0.8), spike(0.04, 0, 0.2, 0, -0.1, -0.05, PALE, -H - 0.5))];
  return [part(egg(E[0], E[1], E[2], 0, 0, 0, WHITE, 0, 10), band(E[0], E[1], E[2], 0, 0, 0, 0, ICE, 0.6), band(E[0], E[1], E[2], 0, 0, 0, -0.3, SEAM), egg(w - 0.1, 0.2, 1.3, 0, -0.32, 0, SEAM), ...top),
    ...[0, 1, 2, 3, 4, 5].flatMap(leg)];
}
export function carrier(): Rig {
  return rig([0, 1].map(carrierLook), (a, m) => {
    const A = Math.min(1, a.speed / 1.6) * 0.35, w = CARRIER[a.v % CARRIER.length];
    at(m[0], null, 0, 1.53 + Math.abs(Math.sin(a.phase * 2)) * 0.02 * A, 0);
    // A tripod gait: front and back of one side with the middle of the other.
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? 1 : -1, row = Math.floor(i / 2) - 1, ph = a.phase + ((i + (row === 0 ? 1 : 0)) % 2) * Math.PI;
      at(m[1 + i * 2], m[0], side * w, -0.2, row * 1.0, -0.2 + A * Math.sin(ph), 0, side * -0.3);
      at(m[2 + i * 2], m[1 + i * 2], 0, -0.6, 0, 0.4 + 0.6 * A * Math.max(0, Math.cos(ph)), 0, side * 0.3);
    }
  });
}
