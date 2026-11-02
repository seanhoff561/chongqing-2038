// The weapons, their ammunition and attachments, and the things thrown (U-053): each gun gripped at its pistol grip or
// wrist, its barrel forward (-Z); rounds, magazines and parts stood up in the fist.
import * as THREE from 'three';
import { M, P, clear, glow, steel, dark, rubber, wood, white, olive, brass, copper, black, worn, lens, box, cyl, group, ball, ring, lathe, tube, slab, at } from './items3d-kit';

/** The QSZ-92 (M4-21b, U-032): a raked polymer grip with its magazine's base, the frame and trigger guard, the steel
 *  slide (named, to run back as it fires) with its sights and ejection port, and the barrel's crown. (No muzzle
 *  flash: U-058.) */
function pistol() {
  const poly = M(0x383b3f, 0.7, 0.05), slideMat = M(0x595f67, 0.4, 0.5);
  const grip = group(box(0.105, 0.03, 0.036, poly), box(0.012, 0.032, 0.038, dark, 0.058, 0, 0.002), ...[0, 1, 2, 3].map(k => box(0.006, 0.031, 0.037, rubber, -0.03 + k * 0.022, 0, 0)));
  grip.rotation.y = -0.32; grip.position.set(0.012, 0, 0.012);
  const slide = group(box(0.032, 0.028, 0.19, slideMat), box(0.008, 0.006, 0.006, dark, -0.019, 0, -0.088), box(0.008, 0.012, 0.006, dark, -0.019, 0, 0.088), box(0.004, 0.004, 0.004, white, -0.024, 0, 0.088),
    box(0.012, 0.0285, 0.035, dark, -0.004, 0, -0.005), ...[0, 1, 2, 3, 4].map(k => box(0.02, 0.0285, 0.003, dark, 0, 0, 0.06 + k * 0.007)));
  slide.name = 'slide'; slide.position.set(-0.066, 0, -0.062);
  return group(grip, box(0.026, 0.026, 0.16, poly, -0.042, 0, -0.07), box(0.004, 0.022, 0.05, poly, -0.012, 0, -0.04), box(0.032, 0.022, 0.004, poly, -0.03, 0, -0.065), box(0.016, 0.006, 0.006, steel, -0.022, 0, -0.03),
    slide, cyl(0.0065, 0.012, steel, 'z', -0.07, 0, -0.16), cyl(0.0035, 0.013, rubber, 'z', -0.07, 0, -0.161));
}

/** A plain fixed-blade knife (U-084): a black rubber grip with a steel guard and pommel, and a steel blade standing up
 *  out of the fist, its spine straight, its edge (forward) sweeping up to the point. */
function knife() {
  const s = new THREE.Shape(), T = 0.003;
  s.moveTo(0, -0.011); s.lineTo(0.098, -0.011); s.quadraticCurveTo(0.117, -0.009, 0.126, -0.002);
  s.quadraticCurveTo(0.104, 0.013, 0.07, 0.014); s.lineTo(0, 0.013); s.closePath();
  const blade = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: true, bevelThickness: 0.0007, bevelSize: 0.0009, bevelSegments: 1, curveSegments: 12 })
    .translate(0, 0, -T / 2).rotateX(Math.PI / 2).rotateY(Math.PI).translate(-0.058, 0, 0);
  return group(box(0.1, 0.026, 0.022, rubber, 0.004), ...[0, 1, 2].map(k => box(0.008, 0.028, 0.024, rubber, -0.025 + k * 0.025)), box(0.008, 0.024, 0.05, steel, -0.054, 0, 0.004),
    cyl(0.012, 0.012, steel, 'x', 0.06), new THREE.Mesh(blade, M(0xc4cacf, 0.35, 0.45)));
}

/** The pistol's attachments on it (U-058), in its model space (-x up, -z forward): a suppressor on the muzzle, a reflex
 *  sight's housing and window on the slide, or a 4x scope on its mount; a sight marks the model (userData.optic) so the
 *  aim looks through it. */
export function fit(gun: THREE.Object3D, mods: string[]) {
  const scopeMat = M(0x1c1e20, 0.35, 0.5), win0 = new THREE.MeshBasicMaterial({ color: 0x3a6a8a, transparent: true, opacity: 0.45 });
  if (mods.includes('suppressor')) gun.add(cyl(0.016, 0.15, scopeMat, 'z', -0.07, 0, -0.24));
  if (mods.includes('reddot')) {
    gun.add(box(0.012, 0.03, 0.05, dark, -0.088, 0, 0.0), box(0.042, 0.004, 0.012, dark, -0.11, 0.013, -0.018), box(0.042, 0.004, 0.012, dark, -0.11, -0.013, -0.018), box(0.004, 0.026, 0.012, dark, -0.131, 0, -0.018));
    // (Its window placed after it's made: a mesh's position can't be assigned over, and doing so threw every frame: U-088.)
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.026, 0.038).rotateY(Math.PI / 2).rotateX(Math.PI / 2), win0);
    win.position.set(-0.11, 0, -0.018);
    gun.add(win);
    gun.userData.optic = true;
  }
  if (mods.includes('scope4x')) {
    gun.add(box(0.016, 0.012, 0.012, dark, -0.09, 0, -0.04), box(0.016, 0.012, 0.012, dark, -0.09, 0, 0.03), cyl(0.014, 0.17, scopeMat, 'z', -0.11, 0, -0.01), cyl(0.018, 0.03, scopeMat, 'z', -0.11, 0, -0.09), cyl(0.017, 0.03, scopeMat, 'z', -0.11, 0, 0.07));
    gun.userData.optic = true;
  }
  return gun;
}

const alu0 = M(0xa8acb0, 0.35, 0.7);

/** A grip raked back under a gun, its top at the gun's underside (x0), down to its base. */
const grip = (m: THREE.Material, len: number, x0 = -0.05, z = 0, w = 0.03) => at(box(len, w, 0.036, m), x0 + len / 2, 0, z + 0.012, 0, -0.28, 0);

/** A pump shotgun (Norinco 982 type): a walnut stock gripped at its wrist, the steel receiver with its ejection port
 *  and trigger guard, the barrel with its bead over the magazine tube, and the grooved pump forend slid on it. */
function shotgun() {
  const blued = M(0x2a2d31, 0.4, 0.6), walnut = M(0x5a3a22, 0.75);
  const stock = slab([[-0.02, 0.035], [0.36, 0.022], [0.36, -0.125], [0.06, -0.032], [-0.02, -0.024]], 0.038, walnut, 'side');
  return group(stock, box(0.15, 0.04, 0.022, rubber, 0.05, 0, 0.372), box(0.062, 0.034, 0.2, blued, -0.008, 0, -0.12),
    box(0.024, 0.002, 0.07, black, -0.02, 0.0175, -0.13), box(0.003, 0.0342, 0.2, worn, -0.0385, 0, -0.12),
    box(0.004, 0.012, 0.055, blued, 0.034, 0, -0.045), box(0.03, 0.012, 0.004, blued, 0.02, 0, -0.072), box(0.016, 0.004, 0.004, steel, 0.026, 0, -0.05),
    cyl(0.0115, 0.5, blued, 'z', -0.032, 0, -0.47, 0.0115, 12), cyl(0.008, 0.002, black, 'z', -0.032, 0, -0.721, 0.008, 10), ball(0.0025, brass, -0.046, 0, -0.71, 1, 1, 1, 6),
    cyl(0.011, 0.44, blued, 'z', 0, 0, -0.44, 0.011, 12), cyl(0.0125, 0.012, steel, 'z', 0, 0, -0.665, 0.0125, 12), box(0.044, 0.016, 0.012, blued, -0.016, 0, -0.64),
    box(0.04, 0.042, 0.2, walnut, 0.002, 0, -0.36), ...[0, 1, 2, 3, 4].map(k => box(0.041, 0.043, 0.004, M(0x3a2414, 0.85), 0.002, 0, -0.3 - k * 0.03)));
}

/** An RPG-7: the steel tube with its muzzle ring and rear venturi flaring out, two wooden heat guards banded at their
 *  ends, the trigger grip and the front grip under it, the iron sights and the optic on its bracket at the left. */
function rpg() {
  const tubeMat = M(0x3a3d35, 0.5, 0.5), X = -0.075;
  return group(cyl(0.02, 0.8, tubeMat, 'z', X, 0, -0.15, 0.02, 12), cyl(0.024, 0.024, tubeMat, 'z', X, 0, -0.55, 0.024, 12), cyl(0.017, 0.002, black, 'z', X, 0, -0.563, 0.017, 10),
    cyl(0.046, 0.15, tubeMat, 'z', X, 0, 0.32, 0.022, 12), cyl(0.04, 0.002, black, 'z', X, 0, 0.396, 0.04, 10),
    cyl(0.03, 0.15, wood, 'z', X, 0, -0.085, 0.03, 12), cyl(0.03, 0.15, wood, 'z', X, 0, 0.12, 0.03, 12), ...[-0.16, -0.01, 0.045, 0.195].map(z => cyl(0.032, 0.01, steel, 'z', X, 0, z, 0.032, 12)),
    grip(M(0x2c241c, 0.8), 0.1, -0.055, 0), box(0.004, 0.01, 0.045, steel, 0.0, 0, -0.035), box(0.05, 0.01, 0.004, steel, -0.025, 0, -0.058), box(0.025, 0.004, 0.005, steel, -0.03, 0, -0.025),
    grip(wood, 0.1, -0.055, -0.22), box(0.02, 0.004, 0.012, steel, X - 0.026, 0, -0.47), box(0.014, 0.012, 0.01, steel, X - 0.028, 0, 0.018),
    box(0.012, 0.02, 0.06, dark, X - 0.01, -0.03, -0.03), box(0.05, 0.032, 0.1, olive, X - 0.02, -0.055, -0.03), cyl(0.014, 0.04, rubber, 'z', X - 0.02, -0.055, 0.035, 0.014, 10), cyl(0.012, 0.004, lens, 'z', X - 0.02, -0.055, -0.081, 0.012, 10));
}

/** A PG-7V round: the warhead's ogive and probe nose over its wide body (marked), the sustainer motor with its fins
 *  folded, and the paper booster charge under it. */
function rocket() {
  const drab = M(0x56603e, 0.6, 0.3);
  return group(lathe([[0, 0.02], [0.024, 0.02], [0.042, 0.1], [0.0425, 0.2], [0.035, 0.3], [0.02, 0.37], [0.008, 0.385], [0, 0.385]], drab),
    cyl(0.0065, 0.1, steel, 'x', -0.435, 0, 0, 0.0065, 8), cyl(0.0045, 0.012, copper, 'x', -0.49, 0, 0, 0.0065, 8), cyl(0.0428, 0.012, M(0x111111, 0.6), 'x', -0.15, 0, 0, 0.0428, 12),
    cyl(0.021, 0.14, M(0x3a4230, 0.5, 0.4), 'x', 0.05, 0, 0, 0.021, 12), ...[0, 1, 2, 3].map(k => at(box(0.07, 0.03, 0.002, steel, 0.08, 0, 0), 0.08, Math.sin(k * Math.PI / 2) * 0.022, Math.cos(k * Math.PI / 2) * 0.022, k * Math.PI / 2, 0, 0)),
    cyl(0.022, 0.3, P('cardboard', 0x6a6a48, 0.85), 'x', 0.27, 0, 0, 0.022, 12), cyl(0.0225, 0.01, M(0x8a7a48, 0.8), 'x', 0.42, 0, 0, 0.0225, 12));
}

/** A cordless framing nailer: the rubber-gripped handle on its battery, the yellow motor body over it, the steel nose
 *  with its contact trip, and the angled magazine back to the battery with its strip of nails. */
function nailgun() {
  const shell = M(0xd0a020, 0.55);
  return group(at(box(0.11, 0.032, 0.04, shell, 0.01, 0, 0), 0.01, 0, 0, 0, -0.15, 0), at(box(0.09, 0.034, 0.02, rubber, 0.01, 0, 0.01), 0.01, 0, 0.012, 0, -0.15, 0),
    box(0.05, 0.075, 0.11, black, 0.085, 0, 0.01), box(0.012, 0.03, 0.01, M(0xa02a20, 0.6), 0.07, 0, 0.068),
    box(0.075, 0.07, 0.32, shell, -0.085, 0, -0.08), box(0.02, 0.072, 0.18, black, -0.125, 0, -0.06), ...[0, 1, 2].map(k => box(0.03, 0.073, 0.006, black, -0.085, 0, 0.0 + k * 0.014)),
    box(0.13, 0.026, 0.032, steel, -0.03, 0, -0.255), box(0.04, 0.02, 0.012, worn, 0.045, 0, -0.262), cyl(0.012, 0.012, black, 'y', -0.05, 0.02, -0.235, 0.012, 10),
    slab([[-0.25, -0.02], [0.05, -0.11], [0.05, -0.14], [-0.25, -0.05]], 0.022, M(0x30343a, 0.4, 0.6), 'side'),
    slab([[-0.24, -0.015], [0.03, -0.096], [0.03, -0.104], [-0.24, -0.023]], 0.03, brass, 'side'));
}

/** A pistol magazine: the blued steel body with its witness holes (brass showing), the feed lips holding the top round,
 *  and the base (on the extended one, a polymer sleeve taking ten more). */
function mag(len: number, ext: boolean) {
  const body = M(0x2a2d31, 0.4, 0.6), poly = M(0x2c2e30, 0.75), top = -len / 2;
  return group(box(len, 0.022, 0.032, body), box(0.004, 0.0225, 0.032, worn, top + 0.004, 0, 0), cyl(0.0045, 0.019, brass, 'z', top - 0.004, 0, -0.002, 0.0045, 8), ball(0.0045, copper, top - 0.004, 0, -0.012, 1, 1, 1, 6),
    ...[0, 1, 2].map(k => cyl(0.0022, 0.023, brass, 'y', top + 0.03 + k * (len - 0.05) / 2, 0, 0.009, 0.0022, 6)),
    ext ? box(0.05, 0.026, 0.036, poly, len / 2 + 0.02, 0, 0.001) : box(0.01, 0.026, 0.037, poly, len / 2 + 0.004, 0, 0.002));
}

/** A shotgun shell: the red plastic hull crimped at its top, the brass head with its rim. */
const shell = (y: number, z: number, dx: number) => group(cyl(0.0086, 0.058, M(0x9a2420, 0.55), 'x', dx - 0.02, y, z, 0.0093, 8), cyl(0.0105, 0.014, brass, 'x', dx + 0.016, y, z, 0.0105, 8), cyl(0.004, 0.0015, M(0x5a1410, 0.7), 'x', dx - 0.049, y, z, 0.004, 6));

/** A Type 82 grenade: the smooth steel ball with its yellow band, the fuze, the spoon down its side, and the pin's ring. */
function grenade() {
  return group(ball(0.03, olive, 0, 0, 0, 1, 1, 1, 12), cyl(0.0296, 0.004, M(0xb89a30, 0.6), 'x', 0.006, 0, 0, 0.0296, 12), cyl(0.009, 0.022, steel, 'x', -0.035, 0, 0, 0.0095, 10),
    box(0.004, 0.012, 0.03, steel, -0.046, 0, 0.01), at(box(0.06, 0.012, 0.003, steel), -0.02, 0, 0.027, 0, 0.4, 0), ring(0.01, 0.0014, steel, 'y', -0.04, 0.018, 0, Math.PI * 2, 12, 4), cyl(0.0012, 0.02, steel, 'y', -0.04, 0.008, 0, 0.0012, 4));
}

/** A string of firecrackers: the red tubes in pairs angled down a braided fuse, a red paper header printed gold. */
function firecrackers() {
  const tubeM = M(0xb0221c, 0.7), core = M(0x7a2a20, 0.9);
  const crackers = Array.from({ length: 16 }, (_, k) => { const row = k >> 1, s = k & 1 ? 1 : -1; return at(cyl(0.0045, 0.034, tubeM, 'x', 0, 0, 0, 0.0045, 6), 0.05 + row * 0.026 + (k & 1) * 0.013, s * 0.012, 0, 0, 0, s * 0.9); });
  return group(box(0.05, 0.05, 0.004, P('label', 0xb81e1a, 0.7)), cyl(0.0015, 0.24, core, 'x', 0.15, 0, 0, 0.0015, 4), tube([[-0.02, 0, 0.004], [-0.06, 0.01, 0.01], [-0.09, -0.005, 0.006]], 0.0012, M(0x3a3a2a, 0.9), 8, 3), ...crackers);
}

/** A breaching charge: four cartridges of emulsion explosive in red film, clipped at their ends, bound with grey tape,
 *  a detonator pushed in with its leg wires coiled. */
function breach() {
  const film = P('label', 0xc0321e, 0.5), tape = M(0x8a8c8a, 0.6, 0.2);
  const sticks = [[-1, -1], [1, -1], [-1, 1], [1, 1]].flatMap(([a, b]) => [cyl(0.016, 0.2, film, 'x', 0.04, a * 0.0165, b * 0.0165, 0.016, 10), cyl(0.004, 0.012, alu0, 'x', -0.066, a * 0.0165, b * 0.0165, 0.012, 6)]);
  return group(...sticks, cyl(0.036, 0.025, tape, 'x', -0.01, 0, 0, 0.036, 12), cyl(0.036, 0.025, tape, 'x', 0.1, 0, 0, 0.036, 12), cyl(0.0035, 0.05, alu0, 'x', -0.075, 0.0165, -0.0165, 0.0035, 6),
    tube([[-0.1, 0.0165, -0.0165], [-0.12, 0.03, -0.01], [-0.1, 0.045, 0.02], [-0.05, 0.04, 0.035]], 0.0012, M(0xc8b020, 0.6), 12, 3), ring(0.018, 0.002, M(0xc8b020, 0.6), 'z', -0.03, 0.04, 0.04, Math.PI * 2, 14, 3));
}

/** A humanoid's rifle: a dark polymer bullpup with a white plate down its side (its maker's), a scope, a long curved
 *  magazine behind the grip, a muzzle brake, the lit pad on the grip that reads its owner's hand, and the shorn
 *  bracket where it was fixed to the machine. */
function mrifle() {
  const poly = M(0x24272b, 0.65, 0.1), plate = M(0xd8dad6, 0.5, 0.1);
  return group(grip(poly, 0.1, -0.045, 0), box(0.004, 0.014, 0.02, glow(0x8a1a14, 0.8), 0.0, 0, 0.032), box(0.004, 0.012, 0.05, poly, 0.0, 0, -0.04),
    box(0.075, 0.042, 0.56, poly, -0.075, 0, -0.04), box(0.05, 0.044, 0.3, plate, -0.075, 0, -0.1), box(0.02, 0.045, 0.06, worn, -0.06, 0, 0.12),
    slab([[0.07, 0.04], [0.13, 0.04], [0.16, -0.15], [0.1, -0.15]], 0.026, M(0x1c1d20, 0.6), 'side'),
    cyl(0.009, 0.16, dark, 'z', -0.085, 0, -0.39, 0.009, 10), cyl(0.014, 0.04, dark, 'z', -0.085, 0, -0.48, 0.014, 10), box(0.034, 0.04, 0.16, poly, -0.075, 0, -0.38),
    box(0.012, 0.03, 0.03, dark, -0.12, 0, -0.08), box(0.012, 0.03, 0.03, dark, -0.12, 0, 0.0), cyl(0.016, 0.16, dark, 'z', -0.14, 0, -0.04, 0.016, 12), cyl(0.017, 0.04, dark, 'z', -0.14, 0, -0.13, 0.021, 12), cyl(0.017, 0.003, lens, 'z', -0.14, 0, -0.152, 0.017, 10),
    box(0.03, 0.04, 0.05, rubber, -0.06, 0, 0.26), at(box(0.03, 0.014, 0.05, steel), -0.075, -0.028, 0.06, 0.3, 0, 0), at(box(0.031, 0.003, 0.05, worn), -0.075, -0.036, 0.06, 0.3, 0, 0));
}

export const armsModels: Record<string, () => THREE.Object3D> = {
  pistol, knife, shotgun, rpg, rocket, nailgun, grenade, firecrackers, breach, mrifle,
  mag9: () => mag(0.125, false),
  mag9x: () => mag(0.155, true),
  // A suppressor: the matte black can, its front cap and bore, the threaded mount, the finish worn through at its rim.
  suppressor: () => group(cyl(0.016, 0.16, M(0x1e1f21, 0.7, 0.3), 'x', 0, 0, 0, 0.016, 14), cyl(0.0163, 0.006, worn, 'x', -0.083, 0, 0, 0.0163, 14), cyl(0.005, 0.002, black, 'x', -0.087, 0, 0, 0.005, 8),
    cyl(0.007, 0.014, steel, 'x', 0.087, 0, 0, 0.007, 10), ...[0, 1, 2].map(k => cyl(0.0164, 0.003, rubber, 'x', 0.05 + k * 0.008, 0, 0, 0.0164, 14))),
  // A reflex sight: its base and clamp screw, the hood round a tinted window, the brightness buttons at its side.
  reddot: () => group(box(0.01, 0.026, 0.05, dark), cyl(0.004, 0.03, steel, 'y', 0.002, 0, 0.015, 0.004, 8), box(0.034, 0.004, 0.014, dark, -0.022, 0.012, -0.012),
    box(0.034, 0.004, 0.014, dark, -0.022, -0.012, -0.012), box(0.004, 0.028, 0.014, dark, -0.04, 0, -0.012), at(box(0.03, 0.022, 0.0015, clear(0x6a9ac0, 0.45)), -0.022, 0, -0.012, 0, -0.2, 0),
    box(0.008, 0.004, 0.006, rubber, -0.01, 0.014, 0.012), box(0.008, 0.004, 0.006, rubber, -0.01, 0.014, 0.02), box(0.012, 0.012, 0.006, worn, -0.008, 0, 0.026)),
  // A 4x scope: the tube with its turrets and power ring, the objective bell and eyepiece with their lenses, the rings
  // and rail clamp under it.
  scope4x: () => group(cyl(0.0127, 0.15, dark, 'x', 0, 0, 0, 0.0127, 12), cyl(0.02, 0.05, dark, 'x', -0.1, 0, 0, 0.0127, 12), cyl(0.019, 0.003, lens, 'x', -0.126, 0, 0, 0.019, 12),
    cyl(0.017, 0.055, dark, 'x', 0.1, 0, 0, 0.017, 12), cyl(0.0172, 0.012, rubber, 'x', 0.12, 0, 0, 0.0172, 12), cyl(0.015, 0.003, lens, 'x', 0.128, 0, 0, 0.015, 12),
    cyl(0.009, 0.018, dark, 'z', -0.01, 0, -0.018, 0.009, 10), cyl(0.009, 0.018, dark, 'y', -0.01, 0.018, 0, 0.009, 10), ...[-0.045, 0.04].map(x => box(0.012, 0.03, 0.026, black, x, 0, 0.012)), box(0.12, 0.022, 0.008, black, 0, 0, 0.026)),
  shells: () => group(...[[-0.021, 0], [-0.0105, 0.004], [0, 0], [0.0105, 0.004], [0.021, 0]].map(([y, dx], k) => shell(y, k % 2 ? -0.004 : 0.004, dx))),
  // A strip of thirty plastic-collated framing nails: their clipped heads touching along the top, two collation strips.
  nails: () => group(...Array.from({ length: 30 }, (_, k) => box(0.09, 0.003, 0.003, M(0x8a8e92, 0.4, 0.7), 0.02 - k * 0.0032, -0.105 + k * 0.007, 0)),
    at(box(0.004, 0.235, 0.007, steel), -0.074, 0, 0, 0, 0, 0.43), at(box(0.006, 0.23, 0.0045, M(0x2a5ab0, 0.6)), -0.045, 0, 0, 0, 0, 0.43), at(box(0.006, 0.23, 0.0045, M(0x2a5ab0, 0.6)), -0.005, 0, 0, 0, 0, 0.43)),
};
