// Parts for building and fixing (U-053): boards and modules as they come out of a drone or a camera, a robot's servo,
// eyes and plate, cables, clips and coils.
import * as THREE from 'three';
import { M, P, glow, steel, dark, rubber, black, worn, chrome, brass, copper, alu, pcb, chip, box, cyl, group, ball, ring, tube, slab, rbox, at } from './items3d-kit';

const gold = M(0xc8a040, 0.3, 0.5), white = M(0xd8dad6, 0.5, 0.1);
/** A row of header pins: the black strip and the gilt pins along it (n of them, down Y). */
const header = (n: number, x: number, z: number) => group(box(0.0025, n * 0.00254, 0.0025, black, x, 0, z), box(0.0008, n * 0.00254, 0.006, gold, x, 0, z + 0.002));
/** A flat flex cable, kapton orange, out from a board to its connector. */
const flex = (x0: number, len: number, w: number) => group(box(len, w, 0.0003, M(0xc87a2a, 0.5, 0.2), x0 + len / 2, 0, 0), box(0.006, w + 0.002, 0.002, M(0xe0d8c8, 0.6), x0 + len, 0, 0.0005));

/** A copper winding: heavy wire round in a helix, its two leads straight out. */
function coil() {
  const pts: [number, number, number][] = [[-0.06, 0.035, 0], [-0.045, 0.035, 0]];
  for (let k = 0; k <= 48; k++) { const a = k / 48 * Math.PI * 2 * 7; pts.push([-0.04 + k / 48 * 0.08, Math.cos(a) * 0.035, Math.sin(a) * 0.035]); }
  pts.push([0.045, 0.035, 0], [0.06, 0.035, 0]);
  return group(tube(pts, 0.0035, copper, 120, 4), box(0.09, 0.006, 0.002, P('cardboard', 0xc8b888, 0.9), 0, 0, 0.037), box(0.09, 0.006, 0.002, P('cardboard', 0xc8b888, 0.9), 0, 0, -0.037));
}

/** A robot's joint servo: the anodised drum, its black rear cap, the output flange and its bolts, the cable gland and
 *  a torn cable, a shard of white plate still on its bracket. */
function servo() {
  const drum = M(0x6a6e72, 0.4, 0.6);
  return group(cyl(0.035, 0.06, drum, 'x', 0, 0, 0, 0.035, 16), cyl(0.034, 0.012, M(0x1a1b1c, 0.6), 'x', 0.036, 0, 0, 0.034, 16), cyl(0.028, 0.008, chrome, 'x', -0.034, 0, 0, 0.028, 16),
    ...[0, 1, 2, 3, 4, 5].map(k => cyl(0.003, 0.003, dark, 'x', -0.039, Math.cos(k * Math.PI / 3) * 0.021, Math.sin(k * Math.PI / 3) * 0.021, 0.003, 6)), cyl(0.008, 0.004, dark, 'x', -0.039, 0, 0, 0.008, 8),
    cyl(0.006, 0.014, M(0x1a1b1c, 0.6), 'y', 0.01, 0.04, 0, 0.007, 8), tube([[0.01, 0.046, 0], [0.03, 0.06, 0.01], [0.07, 0.065, 0.0]], 0.004, black, 8, 4), ...[0, 1, 2].map(k => tube([[0.07, 0.065, 0], [0.078, 0.062 + k * 0.003, 0.003 * k]], 0.0008, copper, 2, 3)),
    box(0.02, 0.06, 0.006, steel, 0.0, -0.04, 0.0), at(slab([[0, 0], [0.04, 0], [0.035, 0.02], [0.01, 0.03]], 0.006, white), 0.005, -0.075, 0));
}

/** A robot's sensor head torn from its neck: the white armoured shell, the dark visor band with three red eyes lit, the
 *  lidar puck on top, cables sticking out of the shorn neck. */
function sensorhead() {
  const C = -0.1;
  return group(ball(1, white, C, 0, 0, 0.075, 0.11, 0.08, 14), box(0.05, 0.17, 0.04, M(0x0c0d0e, 0.15, 0.4), C + 0.005, 0, 0.055), ...[-0.04, 0, 0.04].map(y => cyl(0.009, 0.004, glow(0xd02a1a, 1.4), 'z', C + 0.005, y, 0.076, 0.009, 10)),
    cyl(0.026, 0.03, dark, 'x', C - 0.08, 0, 0, 0.026, 14), cyl(0.0262, 0.008, glow(0x2a1a1a, 0.4), 'x', C - 0.08, 0, 0, 0.0262, 14), cyl(0.028, 0.03, M(0x2a2c2e, 0.5, 0.3), 'x', -0.02, 0, 0, 0.032, 12),
    ...[[0xb02a24, 0.01, 0], [0x2a5ab0, -0.008, 0.008], [0xd8b020, 0.0, -0.01], [0x1a1a1a, -0.012, -0.004]].map(([c, y, z]) => tube([[-0.01, y, z], [0.01, y * 1.5, z * 1.5], [0.03, y * 2.5, z * 2]], 0.0025, M(c, 0.6), 6, 4)),
    box(0.006, 0.05, 0.02, worn, C + 0.05, 0.08, 0.03));
}

/** A composite armour plate off a robot: white, chamfered, a dark backing, its bolts (one sheared), bullet strikes
 *  and chipped paint. */
function armour() {
  const C = -0.1, out: [number, number][] = [[-0.14, -0.09], [-0.1, -0.125], [0.1, -0.125], [0.14, -0.09], [0.14, 0.09], [0.1, 0.125], [-0.1, 0.125], [-0.14, 0.09]];
  const face = slab(out, 0.02, white, 'face', 0.003), back = slab(out.map(([a, b]) => [a * 0.96, b * 0.96]), 0.008, M(0x2a2c2e, 0.8), 'face');
  return group(at(face, C, 0, 0), at(back, C, 0, -0.012), ...[[-0.12, -0.1], [-0.12, 0.1], [0.12, -0.1]].map(([x, y]) => cyl(0.006, 0.004, chrome, 'z', C + x, y, 0.012, 0.006, 6)), cyl(0.004, 0.003, worn, 'z', C + 0.12, 0.1, 0.012, 0.004, 6),
    ...[[-0.03, 0.04], [0.05, -0.02], [0.02, 0.07]].flatMap(([x, y]) => [cyl(0.006, 0.002, M(0x3a3c3e, 0.8, 0.4), 'z', C + x, y, 0.0115, 0.006, 8), ring(0.009, 0.0015, M(0x8a8c8a, 0.7), 'z', C + x, y, 0.011, Math.PI * 2, 10, 3)]),
    box(0.02, 0.012, 0.002, M(0x5a5c5e, 0.7), C - 0.06, -0.05, 0.0115), box(0.012, 0.02, 0.002, M(0x5a5c5e, 0.7), C + 0.08, 0.06, 0.0115));
}

/** A crocodile clip on its lead: the coloured boot, the steel jaws parted a little. */
const croc = (m: THREE.Material, x: number, y: number, up: number) => group(cyl(0.006, 0.03, m, 'x', x, y, 0, 0.0045, 8), at(box(0.025, 0.006, 0.002, steel), x - up * 0.026, y, 0.002, 0, up * 0.12, 0), at(box(0.025, 0.006, 0.002, steel), x - up * 0.026, y, -0.002, 0, -up * 0.12, 0));

export const partsModels: Record<string, () => THREE.Object3D> = {
  coil, servo, sensorhead, armour,
  // A controller board: green FR4, a processor and two chips, crystal and capacitors, a micro-USB socket, a header,
  // a lit LED, gilt mounting holes.
  board: () => group(box(0.07, 0.1, 0.0016, pcb), box(0.016, 0.016, 0.002, chip, -0.01, 0.01, 0.0018), box(0.01, 0.006, 0.0015, chip, 0.015, -0.025, 0.0016), box(0.01, 0.006, 0.0015, chip, 0.015, 0.03, 0.0016),
    rbox(0.004, 0.01, 0.003, 0.0015, alu, -0.01, -0.02, 0.0023), ...[-1, 1].map(s => cyl(0.004, 0.008, M(0x1a1a1a, 0.5), 'z', 0.022, s * 0.01, 0.0048, 0.004, 8)), box(0.006, 0.008, 0.003, steel, -0.035, 0, 0.0023), header(14, 0.03, 0.0021),
    cyl(0.0012, 0.0015, glow(0x3ac83a, 0.9), 'z', -0.025, 0.035, 0.0016, 0.0012, 6), ...[[-0.031, -0.046], [-0.031, 0.046], [0.031, -0.046], [0.031, 0.046]].map(([x, y]) => cyl(0.0025, 0.0018, gold, 'z', x, y, 0, 0.0025, 8))),
  // An RF power amplifier: the aluminium case, finned behind, gold SMA sockets at both ends, power leads, its label.
  rfamp: () => group(box(0.07, 0.045, 0.018, alu), ...[0, 1, 2, 3, 4].map(k => box(0.07, 0.003, 0.01, alu, 0, -0.018 + k * 0.009, -0.014)), ...[-1, 1].map(s => cyl(0.0035, 0.01, gold, 'x', s * 0.04, 0, 0, 0.0035, 6)),
    box(0.03, 0.025, 0.0005, P('label', 0xe0e0d8, 0.6), 0, 0, 0.0092), tube([[0.02, 0.0225, 0.004], [0.035, 0.035, 0.008], [0.05, 0.04, 0.0]], 0.0012, M(0xb02a24, 0.6), 6, 3), tube([[0.02, 0.0225, -0.002], [0.035, 0.033, -0.004], [0.05, 0.034, -0.01]], 0.0012, black, 6, 3)),
  // A defibrillator's capacitor bank: four big capacitors on a fibreglass strip, copper bus bars, heavy leads, an HV
  // warning triangle.
  capbank: () => group(box(0.18, 0.05, 0.003, M(0xc8b888, 0.6)), ...[-0.066, -0.022, 0.022, 0.066].flatMap(x => [cyl(0.02, 0.07, M(0x2a3a8a, 0.5), 'z', x, 0, 0.037, 0.02, 12), cyl(0.0195, 0.002, chrome, 'z', x, 0, 0.073, 0.0195, 12)]),
    box(0.15, 0.006, 0.003, copper, 0, 0.012, 0.075), box(0.15, 0.006, 0.003, copper, 0, -0.012, 0.075), tube([[0.075, 0.012, 0.075], [0.1, 0.02, 0.06], [0.12, 0.015, 0.03]], 0.003, M(0xb02a24, 0.6), 6, 4), tube([[0.075, -0.012, 0.075], [0.1, -0.02, 0.06], [0.12, -0.015, 0.03]], 0.003, black, 6, 4),
    cyl(0.012, 0.001, M(0xd8b020, 0.6), 'z', -0.08, 0.016, 0.002, 0.012, 3)),
  // A heavy-duty momentary switch on a pendant: the black body, a red mushroom button in its yellow collar, the rubber
  // strain relief and its cable.
  trigger: () => group(cyl(0.018, 0.08, M(0x1c1d1f, 0.6), 'x', 0, 0, 0, 0.018, 14), cyl(0.022, 0.008, M(0xd8b020, 0.6), 'x', -0.044, 0, 0, 0.022, 14), ball(0.02, M(0xb02a24, 0.5), -0.05, 0, 0, 0.5, 1, 1, 12),
    cyl(0.006, 0.03, rubber, 'x', 0.054, 0, 0, 0.012, 8), tube([[0.068, 0, 0], [0.09, 0.01, 0.01], [0.12, 0.0, 0.02]], 0.004, black, 8, 4)),
  // A patch cable coiled with a hook-and-loop tie: blue cable, clear RJ45 plugs on their boots.
  cable: () => group(ring(0.045, 0.0028, M(0x2a5ab0, 0.6), 'z', 0.045, 0, 0, Math.PI * 2, 18, 4), ring(0.044, 0.0028, M(0x2a5ab0, 0.6), 'z', 0.047, 0.003, 0.005, Math.PI * 2, 18, 4), box(0.012, 0.018, 0.016, P('fabric', 0x1a1a1a, 0.9), 0.0, 0, 0.002),
    ...[[0.09, 0.03], [0.095, -0.025]].flatMap(([x, y]) => [box(0.018, 0.009, 0.009, M(0x2a5ab0, 0.6), x + 0.01, y, 0.006), box(0.02, 0.012, 0.009, M(0xd8e0e8, 0.15), x + 0.028, y, 0.006), box(0.004, 0.009, 0.0092, gold, x + 0.036, y, 0.006)])),
  // Two clip leads, red and black, a crocodile clip at each end.
  clips: () => group(tube([[-0.06, -0.008, 0], [-0.02, -0.004, 0.012], [0.02, 0.006, 0.006], [0.06, -0.008, 0]], 0.0016, M(0xb02a24, 0.6), 12, 3), tube([[-0.06, 0.008, 0], [-0.02, 0.012, -0.008], [0.02, 0.002, -0.004], [0.06, 0.008, 0]], 0.0016, black, 12, 3),
    croc(M(0xb02a24, 0.6), -0.075, -0.008, 1), croc(black, -0.075, 0.008, 1), croc(M(0xb02a24, 0.6), 0.075, -0.008, -1), croc(black, 0.075, 0.008, -1)),
  // A drone's radio module: a small board under its steel shield can, two pigtails out to dipole antennas.
  radiomod: () => group(box(0.035, 0.025, 0.0012, M(0x1a1a2a, 0.6)), box(0.02, 0.018, 0.003, M(0xb8bcc0, 0.3, 0.5), 0.003, 0, 0.002), header(6, 0.015, 0.0015),
    ...[-1, 1].flatMap(s => [tube([[-0.017, s * 0.008, 0.002], [-0.03, s * 0.02, 0.006], [-0.04, s * 0.025, 0.004]], 0.0007, M(0x8a8a8a, 0.5), 6, 3), cyl(0.0022, 0.05, black, 'x', -0.065, s * 0.025, 0.004, 0.002, 6), cyl(0.0025, 0.004, gold, 'x', -0.042, s * 0.025, 0.004, 0.0025, 6)])),
  // A camera module: the little board, its lens barrel and glass, the flex cable out to its connector.
  cammod: () => group(box(0.025, 0.024, 0.0012, pcb), box(0.009, 0.009, 0.003, black, 0, 0, 0.002), cyl(0.007, 0.008, black, 'z', 0, 0, 0.007, 0.0075, 12), cyl(0.0045, 0.0008, M(0x2a3a5a, 0.05, 0.6), 'z', 0, 0, 0.0112, 0.0045, 10), flex(0.012, 0.06, 0.012)),
  // A thermal camera core: its dark metal housing, the germanium lens (purple-grey, mirror-hard), the board behind and
  // its flex.
  thermalmod: () => group(box(0.03, 0.03, 0.022, M(0x3a3c40, 0.45, 0.5)), cyl(0.012, 0.012, M(0x1a1b1c, 0.5, 0.4), 'z', 0, 0, 0.016, 0.012, 14), cyl(0.0095, 0.002, M(0x3a3048, 0.12, 0.95), 'z', 0, 0, 0.0225, 0.0095, 14),
    box(0.032, 0.032, 0.0016, pcb, 0, 0, -0.012), flex(0.015, 0.05, 0.01)),
  // A drone motor and propeller: the outrunner's bell with its vents, the stator base, a two-bladed prop (twisted) and
  // its nut, three wires with bullet plugs.
  rotor: () => { const blade = (s: number) => at(slab([[0.012, -0.007], [0.06, -0.012], [0.098, -0.006], [0.1, 0.002], [0.06, 0.008], [0.012, 0.006]], 0.0022, M(0x1a1a1a, 0.5)), 0, 0, 0.022, 0, s * 0.18, s > 0 ? Math.PI / 2 : -Math.PI / 2);
    return group(cyl(0.014, 0.014, M(0xa8282a, 0.4, 0.6), 'z', 0, 0, 0.01, 0.014, 14), ...[0, 1, 2].map(k => box(0.003, 0.008, 0.0145, black, Math.cos(k * 2.1) * 0.0135, Math.sin(k * 2.1) * 0.0135, 0.01)), cyl(0.013, 0.004, alu, 'z', 0, 0, 0.001, 0.013, 12),
      blade(1), blade(-1), cyl(0.006, 0.008, M(0x1a1a1a, 0.5), 'z', 0, 0, 0.022, 0.006, 10), cyl(0.0035, 0.006, chrome, 'z', 0, 0, 0.028, 0.0035, 6),
      ...[[0xb02a24, -0.005], [0x1a1a1a, 0], [0x2a5ab0, 0.005]].flatMap(([c, y]) => [tube([[0.006, y, 0], [0.03, y * 2, -0.004], [0.05, y * 3, 0]], 0.0012, M(c, 0.6), 6, 3), cyl(0.0018, 0.008, brass, 'x', 0.054, y * 3, 0, 0.0018, 6)])); },
  // An RFID reader module: the blue board, the copper loop of its antenna, its chip and crystal, a row of pins.
  rfid: () => group(box(0.04, 0.06, 0.0016, M(0x1a4aa0, 0.6)), box(0.0012, 0.046, 0.0003, copper, -0.016, 0, 0.001), box(0.0012, 0.046, 0.0003, copper, 0.008, 0, 0.001), box(0.024, 0.0012, 0.0003, copper, -0.004, -0.023, 0.001), box(0.024, 0.0012, 0.0003, copper, -0.004, 0.023, 0.001),
    box(0.006, 0.006, 0.0012, chip, 0.012, -0.01, 0.0014), rbox(0.003, 0.008, 0.0025, 0.001, alu, 0.012, 0.01, 0.0021), header(8, 0.0185, 0.0021)),
  // A clip-on fibre tap: the grey body and its clamp lid, the channel the line runs in, a lit LED, the yellow pigtail
  // out to its SC connector.
  fibretap: () => group(rbox(0.1, 0.045, 0.03, 0.005, M(0x7a7e82, 0.55)), box(0.1, 0.03, 0.008, M(0x5a5e62, 0.55), 0, 0, 0.018), box(0.1, 0.004, 0.0035, black, 0, 0.018, 0.0155), cyl(0.0018, 0.002, glow(0x3ac83a, 0.9), 'z', -0.04, -0.015, 0.0225, 0.0018, 6),
    tube([[0.05, 0.0, 0], [0.07, 0.01, 0.006], [0.09, 0.0, 0.012], [0.11, -0.01, 0.01]], 0.0015, M(0xd8c020, 0.6), 10, 3), box(0.02, 0.01, 0.01, M(0x2a5ab0, 0.5), 0.12, -0.01, 0.01), cyl(0.00125, 0.006, white, 'x', 0.132, -0.01, 0.01, 0.00125, 6)),
};
