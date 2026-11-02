// Anna's devices and the power to run them (U-053): small electronics in their cases, a drone and its controller,
// batteries shrink-wrapped, cased or loose, solar panels, the inverter and the fuse.
import * as THREE from 'three';
import { M, P, glow, steel, dark, rubber, red, black, worn, chrome, brass, copper, alu, pcb, box, cyl, group, ball, ring, tube, rbox, at } from './items3d-kit';

const wireR = M(0xb02a24, 0.6), wireK = M(0x1a1a1a, 0.6);
/** A battery clamp, its jaws and sleeve in red or black. */
const clamp = (m: THREE.Material, x: number, y: number) => group(box(0.04, 0.012, 0.016, m, x, y, 0), at(box(0.03, 0.01, 0.004, copper), x + 0.03, y, 0.005, 0, 0.25, 0), at(box(0.03, 0.01, 0.004, copper), x + 0.03, y, -0.005, 0, -0.25, 0));

/** A quadcopter salvaged off a patrol: the white shell and four arms, motors and two-bladed props, the camera ball
 *  under it with its lens lit, and Anna's new radio taped on top with its whip antenna. */
function drone() {
  const shell = M(0xd8dad6, 0.5, 0.1), cx = -0.075, cy = -0.075;
  const arms = [0, 1, 2, 3].flatMap(k => {
    const a = Math.PI / 4 + k * Math.PI / 2, ex = cx + Math.cos(a) * 0.15, ey = cy + Math.sin(a) * 0.15;
    return [at(box(0.15, 0.022, 0.014, M(0x2a2c2e, 0.5)), cx + Math.cos(a) * 0.075, cy + Math.sin(a) * 0.075, 0, 0, 0, a), cyl(0.017, 0.02, dark, 'z', ex, ey, 0.012, 0.017, 10),
      at(box(0.008, 0.16, 0.002, black), ex, ey, 0.025, 0, 0, a + k), cyl(0.004, 0.006, chrome, 'z', ex, ey, 0.027, 0.004, 6)];
  });
  return group(rbox(0.13, 0.09, 0.05, 0.025, shell, cx, cy, 0), ...arms, ball(0.018, M(0x2a2c2e, 0.4), cx, cy, -0.028, 1, 1, 1, 10), cyl(0.007, 0.004, glow(0x8a1a14, 0.6), 'z', cx + 0.012, cy, -0.04, 0.007, 8),
    box(0.035, 0.025, 0.004, pcb, cx, cy, 0.027), box(0.014, 0.06, 0.03, M(0x8a8c8a, 0.6, 0.2), cx, cy, 0.016), tube([[cx - 0.015, cy, 0.029], [cx - 0.05, cy + 0.01, 0.045], [cx - 0.12, cy + 0.01, 0.05]], 0.0012, black, 8, 3));
}

/** A drone's radio controller: the case with its two hand grips, two gimbal sticks, the toggle switches along its top,
 *  the flip-up antenna and a small lit screen; the right grip in the fist. */
function dronectl() {
  const c = M(0x2a2c30, 0.55), Y = -0.07;
  return group(rbox(0.1, 0.18, 0.045, 0.025, c, 0, Y, 0), ...[-1, 1].map(s => ball(0.03, c, 0.035, Y + s * 0.075, -0.005, 1.4, 0.9, 0.9, 10)),
    ...[-1, 1].flatMap(s => [cyl(0.018, 0.003, M(0x1a1a1a, 0.6), 'z', -0.005, Y + s * 0.045, 0.024, 0.018, 12), cyl(0.0025, 0.022, steel, 'z', -0.005, Y + s * 0.045, 0.034, 0.0025, 6), cyl(0.006, 0.008, rubber, 'z', -0.005, Y + s * 0.045, 0.047, 0.006, 8)]),
    ...[-0.06, -0.03, 0.03, 0.06].map(y => cyl(0.002, 0.012, chrome, 'x', -0.055, Y + y, 0.01, 0.002, 6)), box(0.06, 0.016, 0.008, M(0x1a1a1a, 0.6), -0.075, Y, -0.012), box(0.03, 0.05, 0.002, glow(0x2a4a6a, 0.6), -0.03, Y, 0.0235),
    box(0.02, 0.03, 0.004, worn, 0.03, Y + 0.085, 0.01));
}

/** A battery jammer: the black case, its fan grille and vents, the LED row and switches, six antennas up from its top. */
function jammer() {
  const c = M(0x262a2e, 0.55, 0.2);
  return group(rbox(0.13, 0.08, 0.035, 0.008, c, -0.02, 0, 0), ring(0.022, 0.002, black, 'z', 0.0, 0, 0.018, Math.PI * 2, 14, 3), box(0.002, 0.044, 0.002, black, 0, 0, 0.018), box(0.044, 0.002, 0.002, black, 0, 0, 0.018),
    ...[0, 1, 2, 3, 4, 5].flatMap(k => [cyl(0.006, 0.016, brass, 'x', -0.093, -0.033 + k * 0.0132, 0, 0.006, 6), cyl(0.0042, 0.12, M(0x161616, 0.6), 'x', -0.16, -0.033 + k * 0.0132, 0, 0.0042, 6)]),
    ...[0, 1, 2, 3, 4, 5].map(k => box(0.004, 0.004, 0.002, k < 4 ? glow(0x3ac83a, 0.8) : black, -0.065, -0.03 + k * 0.012, 0.018)), box(0.01, 0.014, 0.008, red, -0.065, 0.03, 0.02),
    ...[0, 1, 2].map(k => box(0.05, 0.003, 0.0365, black, 0.02 + k * 0.006, 0.036, 0)));
}

/** Anna's EMP: a pistol grip under a grey tube, the copper coil wound on its front, the capacitors along its top, the
 *  battery taped under it, the arming switch and three lit charge lamps, wired in red. */
function emp() {
  const tubeM = M(0x7a7e82, 0.5, 0.3), tape = M(0x8a8c8a, 0.6, 0.2);
  return group(at(box(0.1, 0.03, 0.036, M(0x2a2c2e, 0.7)), 0.0, 0, 0.012, 0, -0.28, 0), box(0.004, 0.012, 0.05, M(0x2a2c2e, 0.7), 0.0, 0, -0.04),
    cyl(0.035, 0.24, tubeM, 'z', -0.075, 0, -0.06, 0.035, 14), cyl(0.045, 0.07, copper, 'z', -0.075, 0, -0.2, 0.045, 16), ...[-0.18, -0.2, -0.22].map(z => ring(0.045, 0.0018, M(0x6a3a1a, 0.6, 0.6), 'z', -0.075, 0, z, Math.PI * 2, 16, 3)),
    ...[-0.04, 0.0, 0.04].map(z => cyl(0.012, 0.035, M(0x2a3a8a, 0.5), 'x', -0.12, 0, z, 0.012, 10)), box(0.03, 0.05, 0.09, M(0x2a5ab0, 0.4), -0.025, 0, -0.14), ...[-0.12, -0.16].map(z => box(0.032, 0.052, 0.012, tape, -0.025, 0, z)),
    cyl(0.004, 0.014, chrome, 'x', -0.115, 0.022, 0.06, 0.004, 6), ...[0, 1, 2].map(k => cyl(0.0035, 0.004, glow(0x3ac83a, 0.8), 'z', -0.075 + (k - 1) * 0.012, 0, 0.062, 0.0035, 6)),
    tube([[-0.11, 0.012, 0.05], [-0.1, 0.03, 0.0], [-0.085, 0.04, -0.12], [-0.075, 0.046, -0.17]], 0.0018, wireR, 12, 3));
}

export const techModels: Record<string, () => THREE.Object3D> = {
  drone, dronectl, jammer, emp,
  // An RTL-SDR dongle: the aluminium stick, its label, the USB plug below, the SMA socket and a little telescopic whip.
  sdr: () => group(rbox(0.065, 0.025, 0.012, 0.005, alu), box(0.03, 0.02, 0.0005, P('label', 0x2a2a2a, 0.6), 0.0, 0, 0.0062), box(0.013, 0.012, 0.0045, steel, 0.038), cyl(0.0032, 0.01, brass, 'x', -0.037, 0, 0, 0.0032, 6),
    cyl(0.004, 0.02, black, 'x', -0.052, 0, 0, 0.004, 8), cyl(0.0015, 0.09, chrome, 'x', -0.105, 0, 0, 0.0025, 6)),
  // A camera tap: a black box with its RJ45 jack and LED, a ribbon lead to the piercing clip that bites a camera's line.
  cameratap: () => group(rbox(0.05, 0.035, 0.02, 0.004, M(0x1c1d1f, 0.6)), box(0.014, 0.016, 0.008, M(0x0a0a0a, 0.5), -0.026, 0, 0.004), box(0.012, 0.014, 0.001, brass, -0.026, 0, 0.0085), cyl(0.0018, 0.002, glow(0x3ac83a, 0.8), 'z', 0.012, 0.012, 0.0105, 0.0018, 6),
    tube([[0.025, 0, 0], [0.05, 0.01, 0.005], [0.07, -0.01, 0.01], [0.09, 0, 0.004]], 0.0018, M(0x8a8a8a, 0.6), 10, 3), box(0.016, 0.02, 0.01, M(0x2a5ab0, 0.5), 0.1, 0, 0.004)),
  // A handheld RFID card copier: the grey case, its little lit screen and keys, the reading pad marked at its top.
  cloner: () => group(rbox(0.12, 0.06, 0.022, 0.012, M(0x3a3e44, 0.55)), box(0.035, 0.045, 0.001, glow(0x3a6aa0, 0.5), -0.005, 0, 0.0115), ...[0, 1, 2].map(k => cyl(0.005, 0.004, M(0xd8742a, 0.5), 'z', 0.035, -0.018 + k * 0.018, 0.012, 0.005, 8)),
    ring(0.014, 0.0012, M(0xd8742a, 0.5), 'z', -0.042, 0, 0.0115, Math.PI * 2, 14, 3), box(0.008, 0.02, 0.004, worn, 0.058, 0, 0)),
  // A CAN interface: a small black box with its label and LED, a lead to an OBD-II plug, a USB lead out of its top.
  canif: () => group(rbox(0.07, 0.04, 0.02, 0.005, M(0x1c1d1f, 0.6)), box(0.03, 0.03, 0.0005, P('label', 0xe0e0d8, 0.6), 0.0, 0, 0.0102), cyl(0.0018, 0.002, glow(0xd8a020, 0.8), 'z', -0.025, 0.012, 0.0105, 0.0018, 6),
    tube([[0.035, 0, 0], [0.06, 0.01, 0.01], [0.09, -0.01, 0.015], [0.11, 0, 0.01]], 0.0025, black, 12, 4), at(box(0.018, 0.04, 0.014, black), 0.125, 0, 0.01), box(0.002, 0.034, 0.01, M(0x8a8c8e, 0.5), 0.135, 0, 0.01),
    tube([[-0.035, 0, 0], [-0.055, 0.005, 0.005], [-0.065, 0.015, 0.0]], 0.002, black, 6, 4), box(0.012, 0.012, 0.0045, steel, -0.072, 0.017, 0)),
  // A scooter's battery pack: cells in blue shrink-wrap, a white label, its XT60 leads, scuffed at a corner.
  battpack: () => group(rbox(0.2, 0.075, 0.065, 0.012, M(0x2a5ab0, 0.35)), box(0.06, 0.05, 0.0005, P('label', 0xe8e8e0, 0.6), 0.02, 0, 0.0326), box(0.03, 0.06, 0.004, M(0x1a3a80, 0.4), -0.06, 0, 0.034),
    tube([[-0.1, 0.01, 0], [-0.12, 0.012, 0.005], [-0.135, 0.004, 0.01]], 0.0025, wireR, 6, 4), tube([[-0.1, -0.01, 0], [-0.12, -0.008, 0.005], [-0.135, -0.004, 0.01]], 0.0025, wireK, 6, 4), box(0.016, 0.022, 0.009, M(0xd8b020, 0.5), -0.143, 0, 0.01),
    box(0.02, 0.012, 0.012, M(0x5a6a8a, 0.6), 0.095, 0.034, 0.028)),
  // Loose 18650 cells pulled from a scooter pack, ten in two rows, a strip of nickel still welded across them, a rubber
  // band round.
  scootercells: () => group(...Array.from({ length: 10 }, (_, k) => cyl(0.009, 0.065, M([0x2a5ab0, 0x3a8a4a, 0x6a3a9a, 0x2a5ab0, 0xa8322a][k % 5], 0.35), 'x', 0, -0.036 + (k % 5) * 0.018, k < 5 ? -0.009 : 0.009, 0.009, 8)),
    box(0.002, 0.09, 0.006, M(0xb8bcc0, 0.3, 0.5), -0.033, 0, 0.009), box(0.002, 0.09, 0.006, M(0xb8bcc0, 0.3, 0.5), -0.033, 0, -0.009), at(box(0.006, 0.096, 0.042, M(0x8a5a2a, 0.8)), 0.01, 0, 0)),
  // A 12 V lead-acid car battery carried by its strap: the black case and lid, two terminals in their red and black
  // caps, the vent plugs, a label, a crust of corrosion at one post.
  carbattery: () => group(box(0.19, 0.28, 0.175, M(0x1a1b1c, 0.6), 0.13), box(0.012, 0.284, 0.179, M(0x2a2b2c, 0.6), 0.04), box(0.1, 0.16, 0.002, P('label', 0x2a5aa0, 0.5), 0.13, 0, 0.0885),
    ...[-1, 1].flatMap(s => [cyl(0.009, 0.02, M(0x6a6e72, 0.5, 0.7), 'x', 0.025, s * 0.1, 0.05, 0.009, 8), cyl(0.013, 0.016, s < 0 ? wireK : wireR, 'x', 0.022, s * 0.1, 0.05, 0.014, 8)]),
    ...[0, 1, 2, 3, 4, 5].map(k => cyl(0.006, 0.006, M(0x2a2b2c, 0.6), 'x', 0.032, -0.06 + k * 0.024, -0.04, 0.006, 6)),
    tube([[0.035, -0.125, 0], [0.0, -0.1, 0], [-0.012, 0, 0], [0.0, 0.1, 0], [0.035, 0.125, 0]], 0.006, black, 12, 4), ball(0.006, M(0xc8d8c0, 0.9), 0.03, 0.115, 0.06, 1, 1, 1, 6)),
  // A 12 V to 220 V inverter: finned aluminium, black end caps, a socket and switch at one end, the fan and battery
  // leads with their clamps at the other.
  inverter: () => group(box(0.18, 0.1, 0.055, alu, -0.02), ...[0, 1, 2, 3, 4, 5].map(k => box(0.18, 0.003, 0.008, alu, -0.02, -0.04 + k * 0.016, 0.031)), box(0.012, 0.104, 0.06, black, -0.115), box(0.012, 0.104, 0.06, black, 0.075),
    box(0.002, 0.034, 0.03, M(0x0a0a0a, 0.5), -0.122, 0.02, 0), box(0.003, 0.012, 0.016, red, -0.122, -0.03, 0), ring(0.016, 0.0015, M(0x0a0a0a, 0.5), 'x', 0.082, 0, 0, Math.PI * 2, 12, 3),
    tube([[0.08, 0.03, 0], [0.12, 0.04, 0.01], [0.15, 0.045, 0.0]], 0.003, wireR, 8, 4), tube([[0.08, -0.03, 0], [0.12, -0.04, 0.01], [0.15, -0.045, 0.0]], 0.003, wireK, 8, 4), clamp(wireR, 0.165, 0.045), clamp(wireK, 0.165, -0.045)),
  // A folding solar charger in olive canvas held by its top edge: two panels of cells gridded silver, grommets at its
  // corners, the pouch with its controller, leads and clamps.
  solar: () => { const cell = M(0x1a2a4a, 0.3, 0.4), grid = M(0xa8acb0, 0.3, 0.5);
    return group(rbox(0.3, 0.42, 0.012, 0.02, P('fabric', 0x4a5236, 0.9), 0.15), ...[-1, 1].flatMap(s => [box(0.26, 0.18, 0.004, cell, 0.15, s * 0.1, 0.007), ...[0.07, 0.15, 0.23].map(x => box(0.002, 0.18, 0.0045, grid, x, s * 0.1, 0.007)), box(0.26, 0.002, 0.0045, grid, 0.15, s * 0.1, 0.007)]),
      box(0.3, 0.008, 0.013, P('fabric', 0x343a26, 0.9), 0.15), ...[[0.015, 0.195], [0.015, -0.195], [0.285, 0.195], [0.285, -0.195]].map(([x, y]) => ring(0.005, 0.0015, chrome, 'z', x, y, 0.007, Math.PI * 2, 8, 3)),
      box(0.08, 0.1, 0.025, P('fabric', 0x343a26, 0.9), 0.24, 0, -0.018), tube([[0.28, 0.02, -0.02], [0.33, 0.03, -0.01], [0.37, 0.02, 0]], 0.0025, wireR, 6, 4), clamp(wireR, 0.38, 0.02)); },
  // A small solar panel off a rooftop sensor: an aluminium frame round black cells, its bus lines, the junction box and
  // bent bracket behind, two wires torn off and stripped.
  solarpanel: () => group(rbox(0.15, 0.2, 0.018, 0.004, alu, -0.07), box(0.13, 0.18, 0.004, M(0x141a2a, 0.25, 0.4), -0.07, 0, 0.008), ...[-0.045, 0, 0.045].map(y => box(0.13, 0.0015, 0.0045, M(0xa8acb0, 0.3, 0.5), -0.07, y, 0.008)),
    box(0.04, 0.05, 0.015, black, -0.07, 0, -0.016), at(box(0.12, 0.03, 0.003, steel), -0.04, 0.06, -0.025, 0.3, 0, 0), tube([[-0.05, 0.01, -0.02], [0.0, 0.02, -0.02], [0.04, 0.0, -0.01]], 0.0018, wireR, 6, 3),
    tube([[-0.05, -0.01, -0.02], [0.0, -0.02, -0.02], [0.03, -0.02, -0.005]], 0.0018, wireK, 6, 3), cyl(0.001, 0.008, copper, 'x', 0.044, 0, -0.01, 0.001, 4)),
  // A PWM solar charge controller: its white case and blue face, a lit LCD, two buttons, six screw terminals in a row.
  chargectl: () => group(rbox(0.08, 0.13, 0.028, 0.006, M(0xe0e0dc, 0.5)), box(0.05, 0.12, 0.002, M(0x2a5aa8, 0.5), -0.012, 0, 0.0145), box(0.016, 0.03, 0.001, glow(0x8ac0a0, 0.5), -0.02, 0, 0.016),
    ...[-1, 1].map(s => cyl(0.004, 0.003, M(0xd8d8d8, 0.5), 'z', 0.0, s * 0.03, 0.016, 0.004, 8)), ...[0, 1, 2, 3, 4, 5].flatMap(k => [box(0.012, 0.016, 0.01, M(0x2a7a3a, 0.6), 0.031, -0.045 + k * 0.018, 0.012), cyl(0.0035, 0.002, steel, 'z', 0.031, -0.045 + k * 0.018, 0.0175, 0.0035, 6)])),
  // A robot's power cell: the dark composite case, white end caps, its contacts, status lights (two of three lit), a
  // hazard band, scuffed.
  powercell: () => group(rbox(0.22, 0.09, 0.07, 0.015, M(0x2e3236, 0.5, 0.2)), box(0.02, 0.092, 0.072, M(0xd8dad6, 0.5), -0.1), box(0.02, 0.092, 0.072, M(0xd8dad6, 0.5), 0.1), ...[0, 1, 2].map(k => box(0.004, 0.01, 0.04, chrome, -0.112, -0.025 + k * 0.025, 0)),
    ...[0, 1, 2].map(k => box(0.006, 0.012, 0.002, k < 2 ? glow(0x3ac8c8, 0.9) : black, -0.06 + k * 0.014, 0.025, 0.0355)), ...[0, 1, 2, 3, 4].map(k => box(0.012, 0.0905, 0.0705, k % 2 ? black : M(0xc8a020, 0.6), 0.03 + k * 0.012, 0, 0)),
    box(0.03, 0.004, 0.02, worn, -0.02, 0.0452, 0.02)),
  // A spare 10 kV fuse cartridge: its fibreglass body and label, tinned end caps and studs, the striker pin at one end.
  hvfuse: () => group(cyl(0.025, 0.24, M(0xd8ccb0, 0.6), 'x', 0, 0, 0, 0.025, 14), cyl(0.0252, 0.1, P('label', 0xe8e0c8, 0.6), 'x', 0, 0, 0, 0.0252, 14), ...[-1, 1].flatMap(s => [cyl(0.028, 0.04, M(0xb8bcc0, 0.35, 0.5), 'x', s * 0.13, 0, 0, 0.028, 14), cyl(0.01, 0.02, M(0xb8bcc0, 0.35, 0.5), 'x', s * 0.16, 0, 0, 0.01, 8)]),
    cyl(0.004, 0.008, red, 'x', -0.174, 0, 0, 0.004, 6)),
};
