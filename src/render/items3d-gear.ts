// Tools, shelter and what he wears (U-053): hand tools painted and worn bare where they're held, power tools in their
// plastics, cans and cylinders carried by their handles (hanging under the fist), bags in woven nylon.
import * as THREE from 'three';
import { M, P, clear, glow, steel, dark, rubber, red, black, worn, lens, chrome, rust, box, cyl, group, ball, ring, lathe, tube, slab, rbox, at, rng } from './items3d-kit';

/** Woven nylon, seen from inside too (a band, a bag's mouth). */
const band = (color: number) => Object.assign(P('fabric', color, 0.9), { side: THREE.DoubleSide });
/** An open band (a headlamp's strap, a strap round a roll): radius, width, facing along Y. */
const loop = (R: number, w: number, m: THREE.Material, x = 0, y = 0, z = 0) => at(new THREE.Mesh(new THREE.CylinderGeometry(R, R, w, 16, 1, true), m), x, y, z);

/** A red-painted crowbar of hex bar: the gooseneck and its split claw at the top, the flat chisel end below, both
 *  ends worn bare. */
function crowbar() {
  const paint = M(0x9a2420, 0.55, 0.3);
  return group(cyl(0.0095, 0.5, paint, 'x', -0.15, 0, 0, 0.0095, 6), tube([[-0.4, 0, 0], [-0.47, 0, 0], [-0.515, 0, -0.025], [-0.52, 0, -0.065], [-0.5, 0, -0.095]], 0.0095, worn, 10, 6),
    at(box(0.04, 0.03, 0.008, worn), -0.49, 0, -0.11, 0, 0.9, 0), at(box(0.025, 0.004, 0.0085, black), -0.485, 0, -0.118, 0, 0.9, 0),
    cyl(0.0096, 0.05, worn, 'x', 0.115, 0, 0, 0.0096, 6), at(box(0.05, 0.022, 0.008, worn), 0.155, 0, -0.004, 0, 0.2, 0));
}

/** 600 mm bolt cutters, closed: rubber-gripped handles, the steel arms running up to the compound head, its side plates
 *  and bolts, the hardened jaws meeting. */
function boltcutters() {
  const arm = M(0x3a5a8a, 0.5, 0.4);
  const C = -0.0225, side = (y: number, s: number) => group(cyl(0.014, 0.26, rubber, 'x', 0.0, y, 0, 0.014, 10), cyl(0.0145, 0.012, M(0x9a2420, 0.7), 'x', 0.135, y, 0, 0.0145, 10),
    tube([[-0.13, y, 0], [-0.3, C + (y - C) * 0.7, 0], [-0.42, C + s * 0.008, 0]], 0.009, arm, 8, 6), at(box(0.07, 0.012, 0.012, steel), -0.5, C + s * 0.007, 0, 0, 0, s * 0.18));
  return group(side(0, 1), side(-0.045, -1), ...[-1, 1].map(s => box(0.09, 0.05, 0.004, dark, -0.44, C, s * 0.008)), ...[-0.415, -0.465].map(x => cyl(0.006, 0.024, chrome, 'z', x, C, 0, 0.006, 8)), box(0.012, 0.003, 0.0125, worn, -0.535, C, 0));
}

/** A cordless angle grinder: the blue motor body with its vents and slide switch, the gear head, the cutting disc behind
 *  its guard, the side handle, the battery slid on beneath. */
function grinder() {
  const body = M(0x2a6a9a, 0.55);
  const guard = slab(Array.from({ length: 9 }, (_, k): [number, number] => [Math.sin(k * Math.PI / 8) * 0.068, -Math.cos(k * Math.PI / 8) * 0.068]), 0.004, steel);
  return group(cyl(0.03, 0.22, body, 'x', -0.05, 0, 0, 0.032, 14), ...[0, 1, 2].map(k => box(0.02, 0.002, 0.03, black, -0.12 + k * 0.006, 0.031, 0)), box(0.04, 0.012, 0.006, black, 0.0, 0, 0.031),
    box(0.05, 0.06, 0.07, M(0x2a2c2e, 0.5, 0.3), -0.18, 0, -0.01), cyl(0.058, 0.003, M(0x5a5a58, 0.9), 'z', -0.19, 0, -0.05, 0.058, 16), cyl(0.012, 0.006, steel, 'z', -0.19, 0, -0.054, 0.012, 8),
    at(guard, -0.19, 0, -0.045), cyl(0.012, 0.1, rubber, 'y', -0.18, 0.08, -0.01, 0.012, 10), box(0.05, 0.07, 0.1, black, 0.085, 0, 0.02), box(0.01, 0.03, 0.01, red, 0.11, 0, 0.068));
}

/** A 2 kg powder extinguisher carried by its valve: the red cylinder domed at the top, its label and the scuffs low
 *  down, the valve with its gauge, lever and carry handle, the pin and seal, the hose down to its nozzle at the side. */
function extinguisher() {
  const paint = M(0xa82420, 0.45, 0.3);
  return group(lathe([[0, 0], [0.05, 0], [0.055, 0.006], [0.055, 0.28], [0.048, 0.31], [0.025, 0.325], [0.014, 0.33], [0, 0.33]], paint, 'x', 0.355),
    cyl(0.0553, 0.12, P('label', 0xe8e0c8, 0.6), 'x', 0.17, 0, 0, 0.0553, 14), cyl(0.0555, 0.02, M(0x5a1a16, 0.8), 'x', 0.34, 0, 0, 0.0555, 14),
    cyl(0.014, 0.035, M(0x2a2a2a, 0.4, 0.5), 'x', 0.005, 0, 0, 0.014, 10), cyl(0.011, 0.008, chrome, 'z', 0.008, 0, 0.016, 0.011, 10), cyl(0.009, 0.001, M(0xf0f0e8, 0.5), 'z', 0.008, 0, 0.0205, 0.009, 10),
    at(box(0.006, 0.022, 0.11, M(0x2a2a2a, 0.4, 0.5)), -0.028, 0, 0.045, 0.0, 0, 0), at(box(0.006, 0.022, 0.1, M(0x2a2a2a, 0.4, 0.5)), -0.006, 0, 0.05, 0, 0, 0),
    ring(0.006, 0.0012, M(0xc8b020, 0.6), 'y', -0.016, 0.013, 0.01, Math.PI * 2, 10, 3),
    tube([[0.0, -0.014, -0.006], [0.03, -0.04, -0.02], [0.15, -0.058, -0.012], [0.27, -0.058, 0]], 0.006, rubber, 12, 6), cyl(0.008, 0.04, black, 'x', 0.29, -0.058, 0, 0.006, 8));
}

/** A small pony cylinder of air: yellow, a white band, a black boot; the valve and first stage, a hose looping to the
 *  mouthpiece clipped on its side, a pressure gauge on its own short hose. */
function oxygen() {
  return group(lathe([[0, 0], [0.05, 0], [0.05, 0.33], [0.04, 0.37], [0.016, 0.39], [0, 0.39]], M(0xc8a020, 0.45, 0.3), 'x', 0.32), cyl(0.0505, 0.04, P('label', 0xe8e8e0, 0.5), 'x', 0.02, 0, 0, 0.0505, 14),
    cyl(0.052, 0.08, rubber, 'x', 0.285, 0, 0, 0.052, 14), cyl(0.012, 0.03, chrome, 'x', -0.085, 0, 0, 0.012, 10), cyl(0.018, 0.05, chrome, 'y', -0.1, 0, 0, 0.018, 12), cyl(0.008, 0.02, rubber, 'x', -0.12, 0, 0, 0.008, 8),
    tube([[-0.1, 0.025, 0], [-0.12, 0.06, 0.02], [-0.05, 0.08, 0.04], [0.04, 0.06, 0.05]], 0.006, rubber, 12, 5), cyl(0.028, 0.03, M(0x1a1a1a, 0.6), 'z', 0.06, 0.055, 0.052, 0.028, 12), box(0.02, 0.012, 0.015, rubber, 0.06, 0.055, 0.074),
    tube([[-0.1, -0.025, 0], [-0.08, -0.06, 0.02], [0.0, -0.06, 0.05]], 0.004, rubber, 8, 4), cyl(0.016, 0.014, chrome, 'z', 0.01, -0.058, 0.055, 0.016, 10), cyl(0.013, 0.001, M(0xf0f0e8, 0.5), 'z', 0.01, -0.058, 0.0625, 0.013, 10));
}

/** A NATO-pattern 20 l jerrycan hanging from its three handles: olive steel embossed with its X, the welded seam round
 *  it, the spout's locking cap, paint worn through at the corners. */
function jerrycan() {
  const paint = M(0x56643a, 0.6, 0.3), H = 0.47, X0 = 0.03, C = X0 + H / 2;
  return group(box(H, 0.345, 0.165, paint, C), box(H + 0.004, 0.349, 0.006, M(0x4a5632, 0.6, 0.3), C),
    ...[-1, 1].flatMap(f => [-1, 1].map(s => at(box(0.53, 0.03, 0.004, paint), C, 0, f * 0.0835, 0, 0, s * 0.63))),
    ...[-0.1, 0, 0.1].flatMap(y => [box(0.014, 0.016, 0.1, paint, 0, y, 0), box(0.03, 0.012, 0.008, paint, 0.015, y, 0.046), box(0.03, 0.012, 0.008, paint, 0.015, y, -0.046)]),
    cyl(0.022, 0.03, paint, 'x', X0 - 0.01, 0.135, 0.02, 0.022, 10), box(0.014, 0.05, 0.03, paint, X0 - 0.03, 0.135, 0.02), box(0.012, 0.012, 0.06, paint, X0 - 0.03, 0.155, -0.01),
    ...[[X0 + 0.002, 0.17, 0.08], [X0 + H - 0.002, -0.17, 0.08], [X0 + H - 0.002, 0.17, -0.08], [X0 + 0.2, -0.172, 0.06]].map(([x, y, z]) => box(0.03, 0.01, 0.01, worn, x, y, z)));
}

/** A red steel toolbox carried by its handle: the body, the lid's raised top, the two catches, paint worn at its
 *  corners and scratched. */
function toolbox() {
  const paint = M(0x9a2420, 0.5, 0.3);
  return group(box(0.17, 0.4, 0.18, paint, 0.115), box(0.03, 0.404, 0.184, paint, 0.025), box(0.012, 0.36, 0.14, paint, 0.005), box(0.003, 0.402, 0.182, M(0x5a1410, 0.6), 0.04),
    box(0.016, 0.16, 0.022, black, -0.022, 0, 0), ...[-1, 1].map(s => box(0.03, 0.012, 0.012, black, -0.008, s * 0.075, 0)), ...[-1, 1].map(s => box(0.03, 0.03, 0.006, chrome, 0.045, s * 0.12, 0.093)),
    ...[[0.2, 0.2, 0.09], [0.2, -0.2, -0.09], [0.012, 0.2, 0.09], [0.12, -0.05, 0.091]].map(([x, y, z], k) => box(k === 3 ? 0.002 : 0.012, k === 3 ? 0.08 : 0.012, 0.012, worn, x, y, z)));
}

/** A collapsible plastic crate folded flat, held by its hand slot: ribbed panels, rows of vents, its stacked edges. */
function foldcrate() {
  const pp = M(0x2d5a7a, 0.65);
  return group(rbox(0.36, 0.48, 0.08, 0.02, pp, 0.17), box(0.025, 0.12, 0.082, M(0x10202a, 0.8), 0.03), ...[0, 1, 2].map(k => box(0.003, 0.482, 0.04, M(0x24485f, 0.7), 0.16, 0, -0.03 + k * 0.03)),
    ...Array.from({ length: 12 }, (_, k) => box(0.05, 0.012, 0.082, M(0x10202a, 0.8), 0.1 + (k >> 2) * 0.08, -0.15 + (k & 3) * 0.1, 0)), box(0.01, 0.2, 0.0805, M(0x6a8aa0, 0.6), 0.345, 0.05, 0));
}

/** A sleeping bag in its stuff sack, carried by the haul loop: the nylon sack domed at its ends, compression straps
 *  down and round it, the drawcord and its toggle. */
function bedroll() {
  const nylon = P('fabric', 0x4f5a3a, 0.9), strap = P('fabric', 0x1c1c1c, 0.9);
  return group(cyl(0.1, 0.34, nylon, 'x', 0.21, 0, 0, 0.1, 14), ball(0.1, nylon, 0.04, 0, 0, 0.22, 1, 1, 12), ball(0.1, nylon, 0.38, 0, 0, 0.22, 1, 1, 12),
    ...[0, 1, 2, 3].map(k => at(box(0.4, 0.022, 0.003, strap), 0.21, Math.sin(k * Math.PI / 2 + 0.6) * 0.101, Math.cos(k * Math.PI / 2 + 0.6) * 0.101, -(k * Math.PI / 2 + 0.6), 0, 0)),
    ...[0.11, 0.31].map(x => ring(0.101, 0.002, strap, 'x', x, 0, 0, Math.PI * 2, 18, 3)), ring(0.018, 0.004, strap, 'y', 0.0, 0, 0, Math.PI * 2, 10, 4), cyl(0.006, 0.016, black, 'x', 0.025, 0.03, 0.02, 0.006, 8));
}

/** A tri-fold foam mattress strapped up: three thick panels in grey-blue ticking, rounded at their folds, the strap and
 *  carry handle round it. */
function mattress() {
  const tick = P('fabric', 0x7d8790, 0.95), C = 0.26;
  return group(...[-0.08, 0, 0.08].map(z => box(0.45, 0.6, 0.078, tick, C, 0, z)), cyl(0.04, 0.45, tick, 'x', C, 0.3, -0.04, 0.04, 10), cyl(0.04, 0.45, tick, 'x', C, -0.3, 0.04, 0.04, 10),
    box(0.452, 0.035, 0.245, P('fabric', 0x1c1c1c, 0.9), C), box(0.012, 0.12, 0.02, black, 0.0, 0, 0), ...[-1, 1].map(s => box(0.035, 0.012, 0.02, black, 0.02, s * 0.055, 0)));
}

/** A red Class 0 insulating glove: the long gauntlet cuff (flattened), the palm, four fingers and the thumb. */
const glove = (dy: number, dz: number, turn: number) => {
  const m = M(0xb8321e, 0.7);
  const cuff = cyl(0.045, 0.15, m, 'x', 0.02, 0, 0, 0.038, 12); cuff.scale.z = 0.4;
  const finger = (k: number) => { const l = 0.075 - Math.abs(k - 1.6) * 0.012; return at(cyl(0.0098, l, m, 'x', 0, 0, 0, 0.0088, 6), 0.186 + l / 2, -0.036 + k * 0.024, 0, 0, 0, (1.5 - k) * 0.06); };
  return at(group(cuff, box(0.09, 0.097, 0.026, m, 0.14, 0, 0), ...[0, 1, 2, 3].map(finger), at(cyl(0.011, 0.065, m, 'x', 0, 0, 0, 0.01, 6), 0.14, 0.066, 0, 0, 0, 0.8)), 0, dy, dz, 0, 0, turn);
};

/** A chalk bag: the cylinder of nylon, its stiff rim round the fleece-lined mouth dusted white, the drawcord and toggle,
 *  the brush in its holder. */
function chalk() {
  const nylon = P('fabric', 0x2a3a6a, 0.9);
  return group(cyl(0.055, 0.13, nylon, 'x', 0, 0, 0, 0.05, 14), ring(0.055, 0.006, M(0x1c1c1c, 0.8), 'x', -0.065, 0, 0, Math.PI * 2, 16, 5), cyl(0.05, 0.002, M(0xe8e6e0, 0.95), 'x', -0.064, 0, 0, 0.05, 14),
    tube([[-0.06, 0.055, 0.0], [-0.04, 0.07, 0.01], [-0.02, 0.06, 0.02]], 0.0015, M(0x9a2420, 0.8), 8, 3), cyl(0.006, 0.014, black, 'x', -0.02, 0.06, 0.022, 0.006, 6),
    cyl(0.009, 0.06, nylon, 'x', 0.0, 0.056, -0.02, 0.009, 8), cyl(0.004, 0.06, M(0x5a3a22, 0.7), 'x', -0.04, 0.056, -0.02, 0.004, 6), box(0.08, 0.025, 0.006, P('fabric', 0x1c1c1c, 0.9), 0.0, 0, -0.056));
}

/** A lump of broken concrete: knocked into facets (each corner its own distance out), grey, a pebble of its aggregate
 *  showing, a stub of rusted rebar sticking out. */
function stone() {
  const g = new THREE.IcosahedronGeometry(0.05, 1), p = g.attributes.position, r = rng(7), knock = new Map<string, number>();
  for (let i = 0; i < p.count; i++) {
    const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!knock.has(k)) knock.set(k, 0.7 + r() * 0.45);
    const s = knock.get(k)!;
    p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * 0.8, p.getZ(i) * s * 0.75);
  }
  g.computeVertexNormals();
  return group(new THREE.Mesh(g, M(0x8a8780, 0.95)), cyl(0.005, 0.05, rust, 'x', -0.05, 0.012, 0.01, 0.005, 6), ball(0.008, M(0x6a6660, 0.9), 0.02, 0.03, 0.022, 1, 0.7, 0.6, 5));
}

export const gearModels: Record<string, () => THREE.Object3D> = {
  stone, crowbar, boltcutters, grinder, extinguisher, oxygen, jerrycan, toolbox, foldcrate, bedroll, mattress, chalk,
  insgloves: () => group(glove(0, 0.006, 0), glove(-0.04, -0.022, 0.22)),
  // A block of climbing chalk, crumbled at a corner, half in its paper wrapper.
  chalkblock: () => group(rbox(0.07, 0.05, 0.034, 0.006, M(0xf2f0ea, 0.98)), box(0.035, 0.052, 0.036, P('label', 0x2a2a2a, 0.8), 0.018), ball(0.005, M(0xf2f0ea, 0.98), -0.038, 0.02, 0.01, 1, 1, 1, 5), ball(0.004, M(0xf2f0ea, 0.98), -0.04, 0.012, 0.016, 1, 1, 1, 5)),
  // A headlamp hanging by its strap: the lamp facing him, its lens, the tilt bracket and button, the reflective stripe.
  headlamp: () => group(loop(0.08, 0.025, band(0x2a2a2a), -0.08), loop(0.0805, 0.004, Object.assign(M(0xb8bcc0, 0.3, 0.6), { side: THREE.DoubleSide }), -0.08),
    box(0.03, 0.045, 0.028, M(0x2a2c2e, 0.5), -0.08, 0, 0.095), cyl(0.012, 0.004, lens, 'z', -0.08, 0, 0.11, 0.012, 12), cyl(0.008, 0.001, glow(0xfff4d8, 0.4), 'z', -0.08, 0, 0.1125, 0.008, 10),
    box(0.02, 0.02, 0.012, black, -0.08, 0, 0.083), box(0.004, 0.012, 0.008, red, -0.097, 0, 0.098)),
  // 10x42 binoculars, rubber-armoured: the two barrels with their objectives and eyecups, the bridge and focus wheel.
  binoculars: () => { const arm = M(0x2a302a, 0.85); return group(...[0, 0.065].flatMap(x => [cyl(0.022, 0.13, arm, 'z', x, 0, 0), cyl(0.024, 0.016, arm, 'z', x, 0, -0.065), cyl(0.019, 0.003, lens, 'z', x, 0, -0.0735, 0.019, 12),
    cyl(0.019, 0.022, rubber, 'z', x, 0, 0.074), cyl(0.011, 0.002, lens, 'z', x, 0, 0.0855, 0.011, 10)]), box(0.03, 0.02, 0.06, arm, 0.0325, 0, 0.0), cyl(0.011, 0.022, rubber, 'x', 0.0325, 0, 0.04, 0.011, 12), box(0.006, 0.008, 0.008, steel, 0.0, 0.024, 0.04)); },
  // A hiking pack hanging from its haul loop: red ripstop, the domed lid, the front pocket zipped, side mesh pockets,
  // compression straps and buckles, the padded shoulder straps behind.
  hikingpack: () => { const rip = P('fabric', 0x8a2a24, 0.9), dk = P('fabric', 0x2a2a2c, 0.9); return group(rbox(0.55, 0.3, 0.22, 0.07, rip, 0.3), ball(1, rip, 0.06, 0, 0.01, 0.06, 0.155, 0.12, 12),
    rbox(0.25, 0.22, 0.05, 0.04, rip, 0.4, 0, 0.12), box(0.004, 0.2, 0.052, dk, 0.29, 0, 0.12), ...[-1, 1].map(s => box(0.16, 0.04, 0.18, clear(0x1c1c1c, 0.7, 0.8), 0.48, s * 0.15, 0)),
    ...[0.22, 0.36].flatMap(x => [box(0.02, 0.31, 0.23, dk, x), box(0.025, 0.03, 0.012, black, x, 0.1, 0.116)]), ...[-1, 1].map(s => box(0.42, 0.06, 0.03, dk, 0.28, s * 0.08, -0.12)),
    ring(0.02, 0.004, dk, 'y', 0.0, 0, 0, Math.PI * 2, 10, 4)); },
};
