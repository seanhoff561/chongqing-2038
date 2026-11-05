// The machines' models (M4-26, U-031, M10-44): code-built, each a rig of parts posed every frame. Eldritch and white
// (U-104): matte white and pale grey ceramic, pointed limbs and blades, asymmetric segmented shells over thin dark
// seams, and nothing like a face: their senses are rings of pits and dark grooves, now and then a faint line of
// ice-blue light (the batch's emissive, by vertex, tinted by the unit's state). Every kind has its looks (render/
// walkers.ts for the walkers) and every unit its own size; each part is its own geometry about its pivot, facing +z, and
// pose() places every part relative to the unit's feet.
import * as THREE from 'three';
import { STATIC, type UnitKind } from '../data/units';
import { WHITE, PALE, PLATE, SEAM, PIT, ICE, box, cyl, spike, egg, pits, band, part, at, reach, rig, still, hash, type Rig } from './machinekit';
import { humanoid, quadruped, heavy, carrier } from './walkers';

export type { Anim, Rig } from './machinekit';
const PI = Math.PI, H = PI / 2, RED = 0xff3020;

/** Which of its kind's looks a unit wears (by its id: a squad's are mixed). */
export const lookOf = (r: Rig, id: number) => r.looks[id % r.looks.length];
/** Its size by the unit (M10-44): each a little taller or shorter than the last, within 10%; the fixed ones as built. */
export const size = (kind: UnitKind, id: number) => (STATIC.has(kind) ? 1 : 0.9 + 0.2 * hash(id, 7));

// The delivery robot: a pale six-wheeled egg with a lid's seam, a pointed nose, a pennant blade on a whip. Two looks:
// low and long, or tall with a crest. Parts: body, six wheels.
function delivery(): Rig {
  const look = (n: number) => {
    const E = n ? [0.27, 0.3, 0.36, 0.52] as const : [0.31, 0.22, 0.42, 0.44] as const;
    return [part(egg(E[0], E[1], E[2], 0, E[3], 0, WHITE), band(E[0], E[1], E[2], 0, E[3], 0, 0.06, SEAM), band(E[0], E[1], E[2], 0, E[3], 0, -0.08, ICE, 0.7), box(0.5, 0.08, 0.7, 0, 0.2, 0, SEAM),
      spike(0.1, 0, 0.3, 0, 0.32, 0.34, PALE, H, 0, 0, 1, 0.5), cyl(0.006, 1.0, -0.2, 1.05, -0.3, SEAM, 'y', 0, 0.006, 4), spike(0.06, 0, 0.22, -0.2, 1.45, -0.3, PLATE, 0, 0, -H, 1, 0.1),
      ...(n ? [-0.12, 0, 0.12].map(z => spike(0.05, 0, 0.18, 0, E[3] + 0.26, z, PALE, -0.5)) : [])),
    ...Array.from({ length: 6 }, () => part(cyl(0.11, 0.08, 0, 0, 0, SEAM, 'x', 0, 0.11, 8), spike(0.03, 0, 0.06, 0.04, 0, 0, PALE, 0, 0, -H)))];
  };
  return rig([look(0), look(1)], (a, m) => {
    m[0].identity();
    for (let i = 0; i < 6; i++) at(m[1 + i], null, (i % 2 ? 1 : -1) * 0.33, 0.11, (Math.floor(i / 2) - 1) * 0.28, a.phase * 3);
  });
}

/** A rotor: two thin pale blades from a dark hub, `r` m from the hub to each tip. */
const rotor = (r: number) => part(spike(0.025, 0.004, r, 0, 0, 0, PALE, 0, 0, -H, 1, 0.2), spike(0.025, 0.004, r, 0, 0, 0, PALE, 0, 0, H, 1, 0.2), cyl(0.02, 0.03, 0, 0, 0, SEAM, 'y', 0, 0.02, 6));
/** Its four arms out to its rotors (on the diagonals, `d` m out) and the hubs they turn on. */
const arms = (d: number, k: number) => [1, 3, 5, 7].flatMap(q => { const a = (q * PI) / 4; return [spike(0.03 * k, 0.012, d, 0, 0.02, 0, WHITE, H + 0.08, a), cyl(0.03 * k, 0.12, Math.sin(a) * d, 0.04, Math.cos(a) * d, SEAM, 'y', 0, 0.03 * k, 6)]; });

// The drones (M4-87): a patrol drone a spindle or a disc, its sensor a ring of pits underneath, a line of light round it;
// a hunter a long dart, ducted, a lance slung under it; a bomber a flat arrowhead with its eggs slung under. Parts: body,
// four rotors.
function drone(kind: 'drone' | 'hunter' | 'bomber'): Rig {
  const k = kind === 'drone' ? 1 : 1.4, arm = 0.32 * k, d = arm * 1.4;
  const looks = kind === 'drone' ? [
    [spike(0.17, 0, 0.16, 0, 0, 0, WHITE, 0, 0, 0, 1, 1, 6), spike(0.17, 0, 0.22, 0, 0, 0, PALE, PI, 0, 0, 1, 1, 6), cyl(0.175, 0.012, 0, 0, 0, ICE, 'y', 0.8, 0.175, 6), ...pits(5, 0.055, 0.025, 0, -0.14, 0, true)],
    [egg(0.24, 0.07, 0.24, 0, 0, 0, WHITE), band(0.24, 0.07, 0.24, 0, 0, 0, 0, ICE, 0.8), ...[-0.08, 0, 0.08].map(x => spike(0.03, 0, 0.16, x, 0.04, -0.04, PALE, -H + 0.6)), ...pits(5, 0.08, 0.025, 0, -0.065, 0, true)],
  ] : kind === 'hunter' ? [
    [spike(0.13, 0, 0.75, 0, 0, -0.3, WHITE, H, 0, 0, 1, 0.6, 6), spike(0.13, 0, 0.4, 0, 0, -0.3, PALE, -H, 0, 0, 1, 0.6, 6), box(0.01, 0.01, 0.16, 0, 0.075, -0.22, ICE, 1),
      spike(0.05, 0.01, 0.8, 0, -0.14, -0.15, PALE, H, 0, 0, 1, 1, 6), box(0.03, 0.08, 0.04, 0, -0.1, -0.1, SEAM), ...pits(4, 0.035, 0.02, 0, -0.09, 0.15, true),
      ...[1, 3, 5, 7].map(q => { const a = (q * PI) / 4; return cyl(0.24, 0.07, Math.sin(a) * d, 0.1, Math.cos(a) * d, WHITE, 'y', 0, 0.24, 12); })],
  ] : [
    [spike(0.5, 0, 0.95, 0, 0, -0.35, WHITE, H, 0, 0, 1, 0.12), spike(0.08, 0, 0.5, 0, 0, -0.35, PALE, -H, 0, 0, 1, 0.5), box(0.01, 0.01, 0.4, 0, 0.065, -0.1, ICE, 0.8),
      ...[-0.16, 0, 0.16].map(x => egg(0.06, 0.06, 0.13, x, -0.1, -0.1 - Math.abs(x), PALE)), ...pits(3, 0.04, 0.02, 0, -0.05, 0.25, true)],
  ];
  return rig(looks.map(b => [part(...b, ...arms(d, k)), rotor(0.18 * k), rotor(0.18 * k), rotor(0.18 * k), rotor(0.18 * k)]), (a, m) => {
    // A hover's sway, tipped forward into its flight.
    at(m[0], null, 0, Math.sin(a.t * 1.7 + a.phase) * 0.04, 0, 0.12 * Math.min(1, a.speed / 9));
    [1, 3, 5, 7].forEach((q, i) => { const ang = (q * PI) / 4; at(m[1 + i], m[0], Math.sin(ang) * d, 0.1 + (k > 1 ? 0.02 : 0), Math.cos(ang) * d, 0, a.t * (i % 2 ? 61 : -59)); });
  });
}

/** A strike drone (M4-47): a white needle on a thin X, its warhead a dark egg slung under it, four rotors spinning. */
function fpv(): Rig {
  const blade = rotor(0.11);
  const body = part(spike(0.035, 0, 0.32, 0, 0.02, -0.12, WHITE, H, 0, 0, 1, 1, 6), ...[1, 3, 5, 7].map(q => spike(0.012, 0.006, 0.19, 0, 0, 0, PALE, H, (q * PI) / 4)),
    egg(0.035, 0.035, 0.09, 0, -0.04, 0.02, SEAM), box(0.012, 0.012, 0.012, 0, 0.045, 0.12, ICE, 1));
  return rig([[body, blade, blade, blade, blade]], (a, m) => { at(m[0], null, 0, 0, 0, 0.3); [[0.13, 0.13], [-0.13, 0.13], [0.13, -0.13], [-0.13, -0.13]].forEach(([x, z], k) => at(m[1 + k], m[0], x, 0.03, z, 0, a.t * 60 * (k % 2 ? 1 : -1))); });
}

/** A crawler drone (M4-92, M10-43): a thing of the sewers a metre across, in the hive's white. A smooth eyeless pod,
 *  ringed like a grub, slung low between ten long needle-thin legs, each jointed high over it like a harvestman's. It
 *  goes in jerks: its legs snap from hold to hold, and now and then its body twitches. Parts: the body, then each leg's
 *  upper and lower. */
function crawler(): Rig {
  const upper = part(box(0.022, 0.5, 0.022, 0, -0.25, 0, WHITE), cyl(0.028, 0.05, 0, 0, 0, PLATE, 'x'));
  const lower = part(box(0.016, 0.6, 0.016, 0, -0.3, 0, WHITE), cyl(0.024, 0.04, 0, 0, 0, PLATE, 'x'), cyl(0.012, 0.1, 0, -0.65, 0, PLATE, 'y', 0, 0.002, 6));
  const parts = [
    part(cyl(0.11, 0.5, 0, 0, -0.04, WHITE, 'z', 0, 0.05), cyl(0.1, 0.1, 0, 0.005, 0.25, PLATE, 'z', 0, 0.035), ...[-0.18, -0.08, 0.02, 0.12].map(z => cyl(0.12 - Math.abs(z) * 0.2, 0.025, 0, 0, z, PLATE, 'z')),
      ...[-1, 1].map(x => box(0.012, 0.012, 0.16, x * 0.03, -0.02, 0.34, WHITE, 0, 0.5, x * 0.4, 0))),
    ...Array.from({ length: 10 }, () => [upper, lower]).flat(),
  ];
  const s = new THREE.Vector3(), t = new THREE.Vector3(), pole = new THREE.Vector3();
  return rig([parts], (a, m) => {
    // (Its stride in three jerks a step; a twitch a few times a minute, its own by the time.)
    const A = Math.min(1, a.speed / 1.5), ph0 = Math.round(a.phase * 1.5) / 1.5, tw = Math.sin(a.t * 1.7) * Math.sin(a.t * 0.61) > 0.85 ? Math.sin(a.t * 47) : 0;
    at(m[0], null, 0, 0.4 + Math.abs(Math.sin(ph0)) * 0.03 * A, 0, tw * 0.12, tw * 0.3, tw * 0.1);
    for (let k = 0; k < 10; k++) {
      const side = k < 5 ? -1 : 1, j = k % 5, z0 = 0.16 - j * 0.08, ph = ph0 + ((j + (side > 0 ? 1 : 0)) % 2) * Math.PI;
      s.set(side * 0.09, 0, z0); t.set(side * 0.78, -0.4 + Math.max(0, Math.cos(ph)) * 0.14 * A, z0 * 3.2 + Math.sin(ph) * 0.14 * A); pole.set(side * 0.35, 0.9, z0 * 2);
      reach(m[1 + k * 2], m[2 + k * 2], m[0], s, t, pole, 0.5, 0.6);
    }
  });
}

/** The giant walkers (M4-93, U-069): less spider than something that shouldn't be: a small white pod held 19 to 26 m
 *  up on many giant jointed legs standing close under it, its knees climbing high over it, all white; taller than wide.
 *  Three variations: six legs on a tall slow stride; eight under a longer pod, higher still; ten on a lower, wider,
 *  skittering gait. Under its pod, a ring of pits and a faint line of light, no eyes. */
const ELDRITCH = [{ legs: 6, h: 24, r: 6.5, lift: 2.4, sets: 2, long: 1 }, { legs: 8, h: 28, r: 5.5, lift: 1.6, sets: 2, long: 1.5 }, { legs: 10, h: 21, r: 7.5, lift: 1.2, sets: 3, long: 0.8 }];
function eldritch(): Rig {
  const L1 = 15, L2 = 19, MOST = 10;
  const upper = part(cyl(0.6, 1, 0, 0, 0, PALE, 'x', 0, 0.6, 8), spike(0.5, 0.3, L1, 0, 0, 0, WHITE, PI, 0, 0, 1, 0.8), spike(0.35, 0, 3, 0, -L1 + 1.4, 0.1, PALE, H + 0.5), box(0.06, L1 * 0.7, 0.06, 0, -L1 * 0.45, 0.42, SEAM));
  const lower = part(cyl(0.45, 0.9, 0, 0, 0, PALE, 'x', 0, 0.45, 8), spike(0.38, 0, L2, 0, 0, 0, WHITE, PI, 0, 0, 1, 0.8), ...[2.5, 4.5].map(y => spike(0.2, 0, 1.6, 0, -y, -0.1, PALE, -H - 0.6)));
  const body = part(egg(1.3, 1.25, 1.8, 0, 0, 0, WHITE, 0, 10), ...[1.1, 0.3, -0.5, -1.3].map(z => spike(1.0, 0.1, 1.2, 0, 1.0 - Math.abs(z) * 0.3, z, PALE, -H + 0.25, 0, 0, 1, 0.25)),
    band(1.3, 1.25, 1.8, 0, 0, 0, -0.45, ICE, 0.5), band(1.3, 1.25, 1.8, 0, 0, 0, 0.25, SEAM), egg(0.75, 0.8, 0.75, 0, -1.4, 1.0, PALE), ...pits(7, 0.35, 0.14, 0, -1.95, 1.0, true),
    spike(0.35, 0, 3.2, 0, -0.6, -1.4, WHITE, PI + 0.5));
  const P = new THREE.Matrix4(), S = new THREE.Matrix4(), s = new THREE.Vector3(), t = new THREE.Vector3(), pole = new THREE.Vector3();
  return rig([[body, ...Array.from({ length: MOST }, () => [upper, lower]).flat()]], (a, m) => {
    const V = ELDRITCH[a.v % ELDRITCH.length], A = Math.min(1, a.speed / 2), bob = Math.abs(Math.sin(a.phase)) * 0.3 * A;
    at(P, null, 0, V.h + bob, 0, 0.04 * Math.sin(a.t * 0.4), 0.15 * Math.sin(a.t * 0.17), 0.05 * Math.sin(a.t * 0.31));
    m[0].copy(P).multiply(S.makeScale(1, 1, V.long));
    for (let k = 0; k < MOST; k++) {
      if (k >= V.legs) { m[1 + k * 2].makeScale(0, 0, 0); m[2 + k * 2].makeScale(0, 0, 0); continue; }
      const ang = ((k + 0.5) / V.legs) * Math.PI * 2, c = Math.cos(ang), sn = Math.sin(ang), ph = a.phase + ((k % V.sets) * Math.PI * 2) / V.sets;
      s.set(c * 1.0, 0, sn * 1.6 * V.long);
      t.set(c * V.r, -V.h - bob + Math.max(0, Math.cos(ph)) * V.lift * A, sn * V.r + Math.sin(ph) * 2.2 * A);
      pole.set(c * 2, V.h * 1.6, sn * 2);
      reach(m[1 + k * 2], m[2 + k * 2], P, s, t, pole, L1, L2);
    }
  });
}

/** A colossus (M4-48): a walking machine 9 m tall, long-legged and thin, its arms hanging to needles, a small pod of a
 *  head under a crown of blades (or one tall spire), turning slowly as it goes. Parts: hips, torso, head, arms (upper,
 *  fore) left and right, legs (upper, lower) left and right. */
function colossus(): Rig {
  const limb = (l: number, w: number, w2: number, c: number) => part(spike(w, w2, l, 0, 0, 0, c, PI, 0, 0, 1, 0.8), cyl(w * 0.8, w * 2.2, 0, 0, 0, SEAM, 'x', 0, w * 0.8, 8));
  const look = (n: number) => [
    part(box(1.2, 0.6, 0.7, 0, 0, 0, SEAM), ...[-1, 1].map(s => spike(0.45, 0, 1.3, s * 0.7, 0.2, 0, WHITE, PI, 0, s * 0.4, 1, 0.6))),
    part(spike(0.45, 0.95, 3.0, 0, 0.1, 0, WHITE, 0, 0, 0, 1, 0.55), ...[2.6, 2.0, 1.4].map((y, i) => spike(0.18, 0, 1.1 - i * 0.2, 0, y, -0.4, PALE, -H + 0.6)), box(0.04, 1.2, 0.04, 0, 1.6, 0.39, ICE, 0.7, 0.09),
      cyl(0.2, 0.6, 0, 3.1, 0, SEAM, 'y', 0, 0.2, 8)),
    part(egg(0.35, 0.35, 0.4, 0, 0.3, 0.05, WHITE), ...pits(5, 0.13, 0.07, 0, -0.03, 0.05, true),
      ...(n ? [spike(0.2, 0, 2.6, 0, 0.5, -0.1, PALE, -0.25, 0, 0, 1, 0.6, 6)] : [-0.9, -0.45, 0, 0.45, 0.9].map(r => spike(0.1, 0, 2.2 - Math.abs(r) * 0.7, 0, 0.5, -0.15, PALE, -0.35, 0, r)))),
    limb(2.4, 0.22, 0.15, WHITE), part(spike(0.16, 0, 3.1, 0, 0, 0, WHITE, PI, 0, 0, 1, 0.8)), limb(2.4, 0.22, 0.15, WHITE), part(spike(0.16, 0, n ? 2.7 : 3.1, 0, 0, 0, WHITE, PI, 0, 0, 1, 0.8)),
    limb(2.6, 0.32, 0.22, WHITE), part(spike(0.24, 0.07, 2.6, 0, 0, 0, WHITE, PI), spike(0.12, 0, 0.9, 0, -2.52, -0.2, PALE, H, 0, 0, 1, 0.5)),
    limb(2.6, 0.32, 0.22, WHITE), part(spike(0.24, 0.07, 2.6, 0, 0, 0, WHITE, PI), spike(0.12, 0, 0.9, 0, -2.52, -0.2, PALE, H, 0, 0, 1, 0.5)),
  ];
  return rig([look(0), look(1)], (a, m) => {
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
  });
}

/** The troop helicopter (M4-92): a long pale hull like a seed, a dark groove where a canopy would be, a tail tapering to
 *  a spike between blade fins, needle skids, a searchlight lit under its nose; its main rotor's four blades and its tail
 *  rotor spinning. Parts: body, rotor, tail rotor. */
function heli(): Rig {
  const body = part(egg(1.1, 1.1, 2.9, 0, 0, 0, WHITE, 0, 10), spike(0.7, 0, 1.8, 0, -0.1, 2.3, WHITE, H, 0, 0, 1, 0.8, 6), box(1.1, 0.06, 1.0, 0, 0.55, 1.9, SEAM, 0, 0.35),
    band(1.1, 1.1, 2.9, 0, 0, 0, -0.35, SEAM), spike(0.42, 0.05, 7.5, 0, 0.35, -2.3, WHITE, -H + 0.04, 0, 0, 1, 0.8, 6), spike(0.6, 0, 2.0, 0, 0.5, -8.6, PALE, -0.5, 0, 0, 0.12, 1),
    spike(0.4, 0, 1.2, 0, 0.35, -8.6, PALE, PI + 0.5, 0, 0, 0.12, 1), spike(0.3, 0, 1.2, 0, 0.6, -8.9, PALE, 0, 0, -H, 0.2, 1), spike(0.3, 0, 1.2, 0, 0.6, -8.9, PALE, 0, 0, H, 0.2, 1),
    ...[-1, 1].flatMap(s => [spike(0.07, 0, 5.2, s * 1.1, -1.6, -2.2, PALE, H, 0, 0, 1, 1, 4), spike(0.05, 0.03, 1.3, s * 1.1, -1.6, 1.4, SEAM, 0, 0, s * 0.3), spike(0.05, 0.03, 1.3, s * 1.1, -1.6, -1.0, SEAM, 0, 0, s * 0.3)]),
    cyl(0.3, 0.5, 0, 1.25, 0, SEAM, 'y', 0, 0.3, 8), cyl(0.25, 0.3, 0, -0.7, 2.3, ICE, 'y', 1, 0.25, 10), ...pits(6, 0.5, 0.12, 0, -1.08, 0.4, true));
  const rotor = part(...[0, 1, 2, 3].map(i => spike(0.22, 0.05, 6.5, 0, 0, 0, PALE, H, (i * PI) / 2, 0, 1, 0.15)), cyl(0.35, 0.3, 0, 0, 0, SEAM, 'y', 0, 0.35, 8));
  const tail = part(...[0, 1, 2, 3].map(i => spike(0.08, 0.02, 1.1, 0, 0, 0, PALE, (i * PI) / 2, 0, 0, 0.2, 1)));
  return rig([[body, rotor, tail]], (a, m) => {
    at(m[0], null, 0, Math.sin(a.t * 0.9) * 0.15, 0, 0.1 * Math.min(1, a.speed / 20));
    at(m[1], m[0], 0, 1.7, 0, 0, a.t * 31);
    at(m[2], m[0], 0.32, 1.2, -8.8, a.t * 47, 0, 0);
  });
}

/** Every kind's rig. (The smart lampposts' cameras are their props'.) */
export const RIGS: Record<UnitKind, Rig> = {
  humanoid: humanoid(), heavy: heavy(), quadruped: quadruped(), carrier: carrier(), delivery: delivery(), drone: drone('drone'), hunter: drone('hunter'), fpv: fpv(), bomber: drone('bomber'), spider: eldritch(), colossus: colossus(), crawler: crawler(), heli: heli(),
  // A camera: a pointed white housing under a blade of a hood on a wall bracket, tipped down, its lens a dark slit, a
  // fleck of light by it; a sweeper's on a pan motor on a pole.
  camera: still(part(spike(0.11, 0.05, 0.4, 0, 0, -0.08, WHITE, H + 0.35, 0, 0, 1, 0.75, 6), spike(0.15, 0.03, 0.46, 0, 0.08, -0.1, PLATE, H + 0.3, 0, 0, 1, 0.22),
    box(0.08, 0.016, 0.02, 0, -0.1, 0.24, PIT, 0, 0.35), box(0.016, 0.016, 0.01, 0.05, -0.07, 0.22, ICE, 1, 0.35), box(0.05, 0.25, 0.05, 0, 0.12, -0.04, SEAM))),
  sweeper: still(part(spike(0.1, 0.04, 0.36, 0, 0, -0.08, WHITE, H + 0.3, 0, 0, 1, 0.8, 6), box(0.07, 0.015, 0.02, 0, -0.09, 0.2, PIT, 0, 0.3), box(0.015, 0.015, 0.01, 0.045, -0.06, 0.19, ICE, 1, 0.3),
    cyl(0.1, 0.08, 0, 0.14, 0, SEAM, 'y', 0, 0.1, 8), cyl(0.03, 0.3, 0, 0.3, 0, SEAM, 'y', 0, 0.03, 6))),
  lamppost: still(box(0.01, 0.01, 0.01, 0, 0, 0, SEAM)),
  // A turret: a faceted white head on a dark ring, a pointed cap, twin needle barrels, its senses a groove with a line
  // of light in it, a blade of an ammunition box at its side.
  turret: still(part(cyl(0.45, 0.25, 0, -0.38, 0, SEAM, 'y', 0, 0.5, 12), cyl(0.36, 0.1, 0, -0.2, 0, PIT, 'y', 0, 0.36, 12), spike(0.42, 0.32, 0.36, 0, -0.14, 0.05, WHITE, 0, 0, 0, 1, 0.85, 6),
    spike(0.32, 0, 0.3, 0, 0.22, 0.05, PLATE, -0.25, 0, 0, 1, 0.85, 6), ...[-1, 1].map(s => spike(0.05, 0.018, 1.05, s * 0.12, 0.06, 0.3, PALE, H, 0, 0, 1, 1, 6)),
    box(0.3, 0.03, 0.03, 0, 0.12, 0.39, PIT), box(0.22, 0.012, 0.012, 0, 0.12, 0.405, ICE, 1), spike(0.12, 0, 0.5, 0.38, -0.1, -0.2, PALE, -H + 0.4, 0, 0, 0.6, 1))),
  pir: still(part(spike(0.08, 0, 0.18, 0, -0.04, 0, WHITE, 0, 0, 0, 1, 0.5, 4), box(0.08, 0.012, 0.01, 0, 0.02, 0.045, PIT), box(0.012, 0.012, 0.01, 0.03, -0.01, 0.04, ICE, 1))),
  acoustic: still(part(spike(0.2, 0.14, 0.32, 0, -0.16, 0, WHITE, 0, 0, 0, 1, 0.3, 4), ...[-0.08, 0, 0.08].map(y => box(0.18, 0.016, 0.02, 0, y, 0.05, SEAM)), box(0.016, 0.016, 0.01, 0.07, 0.12, 0.05, ICE, 1))),
  // A tripwire is all beam, a metre long (scaled to its length): red, lit.
  tripwire: still(box(0.012, 0.012, 1, 0, 0, 0.5, RED, 1)),
};
