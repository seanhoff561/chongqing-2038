// Climbing, rigging and lock gear (U-053): rope coiled as climbers coil it, steel hardware forged, cast or bent, the
// ladder collapsed, a lockpick's fine steel.
import * as THREE from 'three';
import { M, P, steel, dark, black, worn, chrome, rust, box, cyl, group, ball, ring, tube, slab, at } from './items3d-kit';

const two = (m: THREE.Material) => Object.assign(m, { side: THREE.DoubleSide });

/** A locking steel carabiner: the oval frame, the screw sleeve on its gate. */
export const carabiner = (x = 0, y = 0, z = 0, turn = 0) => {
  const o = ring(0.02, 0.0045, chrome, 'z', 0, 0, 0, Math.PI * 2, 12, 4); o.scale.x = 1.65;
  return at(group(o, cyl(0.0068, 0.026, M(0x8a8e92, 0.35, 0.5), 'x', 0, 0.02, 0, 0.0068, 8)), x, y, z, 0, 0, turn);
};

/** A haul-rope trolley: two red anodised side plates round twin wheels, its axle bolts, the carabiner through the hole
 *  below; a sewn sling down to a second carabiner. */
function trolley() {
  const side = M(0xa8282a, 0.4, 0.6);
  const plate = slab([[-0.06, 0.0], [-0.05, -0.035], [0.05, -0.035], [0.06, 0.0], [0.02, 0.03], [-0.02, 0.03]], 0.004, side);
  return group(at(plate.clone(), -0.06, 0, 0.014, 0, 0, Math.PI / 2), at(plate, -0.06, 0, -0.014, 0, 0, Math.PI / 2),
    ...[-0.03, 0.03].flatMap(y => [cyl(0.022, 0.02, dark, 'z', -0.075, y, 0, 0.022, 12), cyl(0.005, 0.034, chrome, 'z', -0.075, y, 0, 0.005, 6)]),
    carabiner(0, 0, 0), at(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.022, 12, 1, true), two(P('fabric', 0x2a2a2c, 0.9))), 0.07, 0, 0, Math.PI / 2, 0, 0), carabiner(0.12, 0, 0, 0.3));
}

/** A collapsed telescoping ladder carried by its top rung: aluminium rungs stacked tight, the black collars at their
 *  ends over the stile tubes, the release buttons, the rubber feet. */
function ladder() {
  const al = M(0xb8bcc0, 0.4, 0.6), Y = -0.08, N = 12, S = 0.065;
  return group(...Array.from({ length: N }, (_, k) => [box(0.028, 0.44, 0.03, al, k * S, Y, 0), box(0.04, 0.034, 0.036, M(0x1c1d1e, 0.6), k * S, Y - 0.235, 0), box(0.04, 0.034, 0.036, M(0x1c1d1e, 0.6), k * S, Y + 0.235, 0)]).flat(),
    ...[-1, 1].flatMap(s => [cyl(0.015, N * S, al, 'x', (N - 1) * S / 2, Y + s * 0.235, 0, 0.015, 10), box(0.03, 0.04, 0.045, M(0x111111, 0.95), (N - 1) * S + 0.03, Y + s * 0.235, 0), box(0.012, 0.012, 0.01, M(0xb02a24, 0.6), 0.0, Y + s * 0.2, 0.02)]),
    box(0.002, 0.3, 0.031, worn, 0.0, Y, 0));
}

/** A grappling hook with its rope: four black tines curving out and down from the crown, their points worn bright, the
 *  shank and eye, the rope knotted on and coiled below. */
function grapple() {
  const paint = M(0x1e2022, 0.55, 0.4), rope = P('fabric', 0x2a5a9a, 0.9);
  const tine = (a: number) => { const c = Math.cos(a), s = Math.sin(a); return group(tube([[-0.17, 0, 0], [-0.2, 0.03 * s, 0.03 * c], [-0.185, 0.065 * s, 0.065 * c], [-0.14, 0.075 * s, 0.075 * c], [-0.115, 0.064 * s, 0.064 * c]], 0.007, paint, 8, 4), ball(0.006, worn, -0.115, 0.064 * s, 0.064 * c, 1, 1, 1, 5)); };
  return group(cyl(0.011, 0.2, paint, 'x', -0.08, 0, 0, 0.011, 10), ...[0, 1, 2, 3].map(k => tine(k * Math.PI / 2 + 0.4)), ring(0.014, 0.004, steel, 'y', 0.035, 0, 0, Math.PI * 2, 12, 5),
    tube([[0.035, 0, 0.014], [0.06, 0, 0.02], [0.08, 0.02, 0.0]], 0.006, rope, 8, 5), ring(0.075, 0.022, rope, 'z', 0.15, 0.0, 0, Math.PI * 2, 16, 6));
}

/** 20 m of static rope in a butterfly coil carried by its wraps: the coiled bundle, the wraps round its top, the tail,
 *  two locking carabiners clipped through below. */
function rope() {
  const kern = P('fabric', 0xd8d4c8, 0.9);
  return group(ring(0.13, 0.034, kern, 'z', 0.13, 0, 0, Math.PI * 2, 20, 8), ...[-0.035, 0, 0.035].map(y => ring(0.038, 0.007, kern, 'y', 0.0, y, 0, Math.PI * 2, 10, 4)),
    tube([[0.02, 0.05, 0.02], [0.08, 0.07, 0.04], [0.16, 0.06, 0.05]], 0.0055, kern, 8, 5), carabiner(0.27, -0.02, 0.02, 0.2), carabiner(0.27, 0.025, -0.01, -0.3));
}

/** A forged rigging hook painted yellow, worn bare inside its bowl: the eye, the shank, the bowl curling to the point,
 *  the sprung safety latch across its throat. */
function hook() {
  const paint = M(0xc8a020, 0.5, 0.35);
  return group(ring(0.02, 0.008, paint, 'z', -0.06, 0, 0, Math.PI * 2, 14, 6), cyl(0.011, 0.07, paint, 'x', -0.005, 0, 0, 0.011, 10),
    tube([[0.03, 0, 0], [0.085, -0.002, 0], [0.115, 0.028, 0], [0.104, 0.062, 0], [0.075, 0.068, 0], [0.052, 0.058, 0]], 0.012, paint, 14, 7),
    tube([[0.1, 0.01, 0], [0.117, 0.03, 0], [0.11, 0.05, 0]], 0.0125, worn, 6, 7), at(box(0.06, 0.006, 0.003, steel), 0.03, 0.035, 0, 0, 0, 0.75));
}

/** A crane's pulley block: two yellow cheek plates round the grooved sheave, the axle bolt and its nut, the tang and
 *  swivel eye it hangs from. */
function pulley() {
  const paint = M(0xc8a020, 0.5, 0.35), C = 0.07;
  return group(...[-0.016, 0.016].map(z => cyl(0.05, 0.006, paint, 'z', C, 0, z, 0.05, 16)), ...[-0.009, 0.009].map(z => cyl(0.045, 0.006, dark, 'z', C, 0, z, 0.045, 16)), cyl(0.036, 0.012, dark, 'z', C, 0, 0, 0.036, 16),
    cyl(0.008, 0.044, chrome, 'z', C, 0, 0, 0.008, 8), cyl(0.012, 0.006, steel, 'z', C, 0, 0.022, 0.012, 6), box(0.04, 0.03, 0.026, paint, 0.012, 0, 0), cyl(0.009, 0.03, steel, 'x', -0.018, 0, 0, 0.009, 8),
    ring(0.018, 0.0065, steel, 'z', -0.05, 0, 0, Math.PI * 2, 12, 5), box(0.012, 0.012, 0.0335, worn, C + 0.048, 0, 0));
}

/** A fall-arrest harness hanging by its back D-ring: yellow webbing over the back pad, the shoulder straps, the chest
 *  strap and its buckle, the two leg loops below. */
function harness() {
  const web = P('fabric', 0xd8a020, 0.9), weave = two(P('fabric', 0xd8a020, 0.9));
  return group(ring(0.022, 0.004, chrome, 'z', -0.012, 0, 0.004, Math.PI * 2, 12, 5), box(0.08, 0.1, 0.012, P('fabric', 0x1c1c1c, 0.9), 0.03, 0, -0.006),
    ...[-1, 1].map(s => at(box(0.38, 0.045, 0.003, web), 0.19, s * 0.06, 0, 0, 0, s * 0.22)), box(0.035, 0.24, 0.003, web, 0.2, 0, 0.002), box(0.02, 0.04, 0.008, steel, 0.2, 0, 0.006),
    ...[-1, 1].flatMap(s => [at(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.045, 14, 1, true), weave), 0.44, s * 0.08, 0, Math.PI / 2, 0, 0), box(0.02, 0.035, 0.008, steel, 0.37, s * 0.08, 0.006)]));
}

/** A coil of steel zip cable with its two wire-rope clamps (U-bolt, saddle, nuts) and a trolley clipped on. */
function zipkit() {
  const wire = M(0x8a8e92, 0.35, 0.5);
  const clamp = (y: number) => group(ring(0.012, 0.0025, chrome, 'z', 0.0, 0, 0, Math.PI, 8, 4), box(0.008, 0.03, 0.012, steel, 0.003, 0, 0), ...[-1, 1].map(s => cyl(0.004, 0.006, chrome, 'x', 0.009, s * 0.012, 0, 0.004, 6))).translateY(y).translateX(0.24);
  const tr = trolley(); tr.position.set(0.12, 0.12, 0.03); tr.scale.setScalar(0.9);
  return group(ring(0.11, 0.02, wire, 'z', 0.11, 0, 0, Math.PI * 2, 16, 5), ring(0.1, 0.012, wire, 'z', 0.115, 0.004, 0.012, Math.PI * 2, 14, 4), clamp(-0.02), clamp(0.02), tr);
}

/** A lockpick: its black handle, the fine steel shaft, its tip (a hook, a rake, a half-diamond). */
const pick = (tip: number, turn: number) => {
  const shaft = M(0xc4cacf, 0.3, 0.5), tips = [[box(0.008, 0.0018, 0.0007, shaft, -0.096, 0.003, 0)], [-0.092, -0.098, -0.104].map((x, k) => box(0.005, 0.0018, 0.0007, shaft, x, k % 2 ? 0.003 : 0.0015, 0)), [at(box(0.01, 0.004, 0.0007, shaft), -0.095, 0.0015, 0, 0, 0, 0.5)]];
  return at(group(box(0.055, 0.008, 0.003, black, 0.0), box(0.06, 0.0018, 0.0007, shaft, -0.058, 0, 0), ...tips[tip % 3]), 0, 0, 0, 0, 0, turn);
};
/** A bobby pin: one leg straight, one rippled, the bend at its top; straightened and its tip bent for a pick. */
const bobby = (y: number, bent: boolean, turn = 0) => {
  const m = M(0x2a2622, 0.4, 0.6);
  return at(group(box(0.05, 0.0012, 0.0008, m, 0, 0.0015, 0), bent ? at(box(0.045, 0.0012, 0.0008, m), 0.003, -0.012, 0, 0, 0, -0.35) : tube([[0.025, -0.0015, 0], [0.012, -0.0005, 0], [0, -0.0018, 0], [-0.012, -0.0005, 0], [-0.025, -0.0015, 0]], 0.0006, m, 8, 3),
    ring(0.0016, 0.0006, m, 'z', -0.025, 0, 0, Math.PI, 5, 3).rotateZ(Math.PI / 2), ...(bent ? [box(0.0012, 0.006, 0.0008, m, 0.025, 0.004, 0)] : [])), 0, y, 0, 0, 0, turn);
};

export const rigModels: Record<string, () => THREE.Object3D> = {
  trolley, ladder, grapple, rope, hook, pulley, harness, zipkit,
  carabiner: () => carabiner(),
  // Two short steel rods, cut bright at their ends, rust coming through in patches.
  rods: () => group(...[-1, 1].flatMap(s => [at(group(cyl(0.0055, 0.38, steel, 'x', 0, 0, 0, 0.0055, 8), cyl(0.0057, 0.04, rust, 'x', 0.05 * s, 0, 0, 0.0057, 8), cyl(0.0057, 0.025, rust, 'x', -0.12 * s, 0, 0, 0.0057, 8),
    cyl(0.0056, 0.002, worn, 'x', -0.19, 0, 0, 0.0056, 8)), 0, s * 0.006, 0, 0, 0, s * 0.03)])),
  // A roll of duct tape: the silver tape wound on its cardboard core, the loose end hanging.
  tape: () => { const silver = two(M(0x9a9c9e, 0.5, 0.3)), card = two(P('cardboard', 0xb08a5a, 0.9));
    return group(at(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.048, 20, 1, true), silver), 0, 0, 0, Math.PI / 2, 0, 0), at(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.048, 16, 1, true), card), 0, 0, 0, Math.PI / 2, 0, 0),
      ...[-0.024, 0.024].flatMap(z => [at(new THREE.Mesh(new THREE.RingGeometry(0.038, 0.05, 20), two(M(0x7a7c7e, 0.6, 0.2))), 0, 0, z), at(new THREE.Mesh(new THREE.RingGeometry(0.035, 0.038, 16), card), 0, 0, z)]),
      box(0.045, 0.0006, 0.048, silver, 0.022, 0.0503, 0)); },
  // A lockpick set fanned in the fist: hook, rake and half-diamond picks, and the L of the tension wrench.
  lockpick: () => group(...[0, 1, 2, 3].map(k => pick(k, (k - 1.5) * 0.14)), at(group(box(0.075, 0.003, 0.0012, M(0xc4cacf, 0.3, 0.5), -0.02), box(0.003, 0.012, 0.0012, M(0xc4cacf, 0.3, 0.5), -0.056, 0.006, 0)), 0, -0.008, 0.003, 0, 0, -0.32)),
  // Three bobby pins bent into a pick and tension wrenches.
  picks: () => group(bobby(0, true, -0.1), bobby(0.006, true, 0.05), bobby(-0.006, false, 0.15)),
  // A few bobby pins still clipped on their pink card.
  hairpins: () => group(box(0.065, 0.045, 0.0008, P('label', 0xd8a0b0, 0.7), 0.0, 0, -0.001), ...[-0.015, -0.005, 0.005, 0.015].map(y => bobby(y, false))),
};
