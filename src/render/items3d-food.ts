// Food, drink and medicine (U-053), as they're sold and carried in Chongqing: tins, cups, pouches and bags printed,
// the fresh things bare, bottles of clear PET, medicine in its packets.
import * as THREE from 'three';
import { M, P, clear, steel, red, white, chrome, box, cyl, group, ball, ring, lathe, rbox, tube, at } from './items3d-kit';

/** A 550 ml PET bottle stood in the fist: the ribbed body and grip waist, the shoulder and neck ring, its cap; full of
 *  clear or river water (fill), or empty and crushed a little; a label, or its glue line where one was peeled. */
function bottle(fill: number | null, label: number | null, cap: number, crushed = false) {
  const pet = clear(0xc8dce6, 0.28, 0.1), B = 0.075;
  const body = lathe([[0, 0], [0.026, 0], [0.031, 0.008], [0.0325, 0.02], [0.0325, 0.06], [0.029, 0.07], [0.0325, 0.08], [0.0325, 0.13], [0.03, 0.15], [0.018, 0.178], [0.0135, 0.186], [0.0135, 0.197]], pet, 'x', B);
  if (crushed) body.scale.set(1, 1, 0.78);
  const parts: THREE.Object3D[] = [body, cyl(0.0155, 0.016, M(cap, 0.5), 'x', B - 0.205, 0, 0, 0.0155, 12), cyl(0.0172, 0.002, M(cap, 0.5), 'x', B - 0.193, 0, 0, 0.0172, 12)];
  if (fill !== null) parts.push(cyl(0.0305, 0.15, clear(fill, fill === 0xb8d8e8 ? 0.22 : 0.7, 0.3), 'x', B - 0.085, 0, 0, 0.0305, 12));
  if (fill === 0x6a6a3a) parts.push(ball(0.004, M(0x3a3020, 0.9), B - 0.012, 0.01, 0.006, 1, 1, 1, 5), ball(0.003, M(0x3a3020, 0.9), B - 0.01, -0.012, -0.004, 1, 1, 1, 5));
  if (label !== null) { const l = cyl(0.0332, 0.05, P('label', label, 0.5), 'x', B - 0.105, 0, 0, 0.0332, 12); if (crushed) l.scale.set(1, 1, 0.78); parts.push(l); }
  else parts.push(cyl(0.0328, 0.003, M(0xd8d4c0, 0.6), 'x', B - 0.11, 0, 0, 0.0328, 12));
  return group(...parts);
}

/** A sealed pillow pouch or bag: the puffed body printed, crimped seals across its ends. */
function pouch(len: number, w: number, t: number, color: number, seal: number) {
  const m = P('label', color, 0.45), s = M(seal, 0.45);
  return group(ball(1, m, 0, 0, 0, len / 2, w / 2, t / 2, 14), box(0.012, w * 0.98, 0.003, s, -len / 2 + 0.002), box(0.012, w * 0.98, 0.003, s, len / 2 - 0.002));
}

export const foodModels: Record<string, () => THREE.Object3D> = {
  water: () => bottle(0xb8d8e8, 0xc83a2e, 0xc8302a),
  riverwater: () => bottle(0x6a6a3a, null, 0x2a5aa0),
  bottle: () => bottle(null, 0xc83a2e, 0xe0e0d8, true),
  // A 250 ml Red Bull, China's gold steel can: the necked top and its ring pull, the base's rim.
  energy: () => group(lathe([[0, 0], [0.021, 0], [0.0265, 0.007], [0.0265, 0.118], [0.0225, 0.129], [0.0225, 0.134], [0.02, 0.131], [0, 0.131]], P('label', 0xc9a227, 0.35, 0.6), 'x', 0.067),
    at(box(0.002, 0.012, 0.022, chrome), -0.066, 0, -0.004), ring(0.005, 0.0012, chrome, 'x', -0.066, 0, -0.012, Math.PI * 2, 10, 3)),
  // A Maling luncheon meat tin: the rounded oblong can printed, its seamed ends, the ring pull on its lid.
  luncheon: () => group(at(rbox(0.062, 0.1, 0.078, 0.014, P('label', 0xb02a24, 0.4, 0.5)), 0, 0, 0, 0, Math.PI / 2, 0), at(rbox(0.064, 0.102, 0.005, 0.015, M(0xb8bcc0, 0.35, 0.5)), -0.04, 0, 0, 0, Math.PI / 2, 0),
    at(rbox(0.064, 0.102, 0.005, 0.015, M(0xb8bcc0, 0.35, 0.5)), 0.04, 0, 0, 0, Math.PI / 2, 0), ring(0.008, 0.0014, chrome, 'x', -0.043, 0, -0.014, Math.PI * 2, 10, 3), box(0.002, 0.008, 0.016, chrome, -0.043, 0, -0.002)),
  // A cup of Master Kong beef noodles: the printed paper cup and its rolled rim, the foil lid with its tab peeled up.
  noodles: () => group(lathe([[0, 0], [0.039, 0], [0.047, 0.085], [0.0495, 0.087], [0.0495, 0.091], [0, 0.091]], P('label', 0xd8483a, 0.7), 'x', 0.046),
    cyl(0.0496, 0.002, M(0xc8c8c4, 0.3, 0.7), 'x', -0.046, 0, 0, 0.0496, 14), at(box(0.002, 0.03, 0.022, M(0xc8c8c4, 0.3, 0.7)), -0.054, 0, 0.05, 0, 0.6, 0)),
  // Fuling zhacai in its green foil sachet.
  zhacai: () => pouch(0.12, 0.085, 0.016, 0x3f8a3a, 0x2e6a2a),
  // Want Want rice crackers in their bag, the round crackers pressing through.
  crackers: () => group(pouch(0.22, 0.14, 0.045, 0xc8302a, 0xa82822), ...[-0.05, 0, 0.05].map(x => cyl(0.03, 0.006, M(0xe8dcc0, 0.8), 'z', x, 0, 0.02, 0.03, 12))),
  // A chocolate bar, its wrapper torn back and the foil crumpled, the top squares bare.
  chocolate: () => group(box(0.1, 0.062, 0.012, P('label', 0x5a3020, 0.5), 0.02), box(0.012, 0.064, 0.0135, M(0xc0c4c8, 0.25, 0.5), -0.034), ...[0, 1].flatMap(r => [-1, 1].map(c => box(0.026, 0.028, 0.009, M(0x4a2818, 0.45), -0.054 - r * 0.029, c * 0.0148, 0)))),
  // A pair of Sichuan sausages, dark red and glossy with fat flecks, tied together at the top with string.
  sausage: () => group(...[-1, 1].map(s => at(group(ball(0.011, M(0x6a2018, 0.75), 0, 0, 0, 9, 1, 1, 10)), 0.0, s * 0.012, 0, 0, 0, s * 0.06)), ball(0.006, M(0xb8a070, 0.9), -0.1, 0, 0, 1, 1, 1, 6),
    ring(0.018, 0.0012, M(0xb8a070, 0.9), 'y', -0.118, 0, 0, Math.PI * 2, 12, 3)),
  // A zongzi: sticky rice wrapped in bamboo leaves to a pyramid, bound round twice with string.
  zongzi: () => { const leaf = M(0x5f7a2c, 0.8); const c = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.1, 3).rotateZ(Math.PI / 2), leaf); const twine = (x: number) => at(ring(0.0555 * (x + 0.05) / 0.1 + 0.0012, 0.0012, M(0xc8b888, 0.9), 'x', 0, 0, 0, Math.PI * 2, 3, 3), x, 0, 0, Math.PI, 0, 0);
    return group(c, twine(0.0), twine(0.03)); },
  // Two plain steamed buns, domed and white.
  buns: () => group(ball(0.042, M(0xefe9dc, 0.9), -0.03, 0, 0, 0.9, 1, 0.72), ball(0.042, M(0xefe9dc, 0.9), 0.045, 0.006, -0.004, 0.9, 1, 0.72)),
  // Two tea eggs, their shells crazed and stained brown in soy and tea.
  teaeggs: () => group(ball(0.0215, M(0x6e4a2a, 0.8), -0.022, 0, 0, 1.32, 1, 1), ball(0.0215, M(0x7a5232, 0.8), 0.03, 0.004, 0, 1.32, 1, 1)),
  // Two ripe peaches, blushed red, one with its leaf.
  peaches: () => group(ball(0.035, M(0xe39a6a, 0.7), -0.03), ball(0.032, M(0xc0443a, 0.75), -0.032, 0.01, 0.007), ball(0.033, M(0xe0a070, 0.7), 0.04, 0.008), ball(0.03, M(0xc04a3a, 0.75), 0.04, 0.016, 0.006),
    cyl(0.002, 0.008, M(0x4a3a20, 0.9), 'x', -0.066, 0, 0, 0.002, 4), at(box(0.002, 0.04, 0.016, M(0x4a7a2a, 0.7)), -0.068, 0.018, 0, 0, 0, 0.5)),
  // Raw pork belly as the market hangs it: skin, fat and lean in layers, on a loop of red plastic string.
  pork: () => group(...[[0xd8b090, 0.006], [0xf0e2d0, 0.014], [0xb8484a, 0.016], [0xf0e2d0, 0.008], [0xb04044, 0.02]].reduce<[THREE.Object3D[], number]>(([a, y], [c, t]) => [[...a, box(0.17, t, 0.06, M(c, 0.5), 0.105, y + t / 2 - 0.032, 0)], y + t], [[], 0])[0],
    tube([[0.03, 0.0, 0], [-0.03, 0.02, 0.004], [-0.06, 0, 0], [-0.03, -0.02, -0.004], [0.03, 0.0, 0]], 0.0012, red, 16, 3)),
  // Water purification tablets: a foil blister card of ten, one popped, the printed card behind.
  tablets: () => group(box(0.09, 0.05, 0.002, M(0xc8ccd0, 0.3, 0.5)), box(0.09, 0.05, 0.001, P('label', 0x2a6ab0, 0.7), 0, 0, -0.0015),
    ...Array.from({ length: 10 }, (_, k) => cyl(k === 9 ? 0.0055 : 0.0058, 0.004, k === 9 ? clear(0xd8d8d8, 0.25) : M(0xe8e8e4, 0.35), 'z', -0.032 + (k >> 1) * 0.016, (k & 1 ? 1 : -1) * 0.011, 0.002, 0.0064, 8))),
  // An elastic bandage rolled tight, its loose end hanging and its metal clip.
  bandage: () => group(cyl(0.028, 0.075, P('fabric', 0xe8e0d0, 0.95), 'x', 0, 0, 0, 0.028, 14), box(0.06, 0.072, 0.0015, P('fabric', 0xe8e0d0, 0.95), 0.035, 0, 0.0285), box(0.01, 0.014, 0.002, steel, 0.062, 0.02, 0.03), box(0.01, 0.014, 0.002, steel, 0.062, -0.02, 0.03)),
  // A combat tourniquet folded: the black strap, its windlass rod and clip, the red tip, the white time strip.
  tourniquet: () => group(box(0.15, 0.038, 0.022, P('fabric', 0x1c1c1c, 0.9)), cyl(0.006, 0.1, M(0x222222, 0.6), 'x', 0, 0, 0.016, 0.006, 8), box(0.02, 0.03, 0.012, M(0x222222, 0.6), -0.045, 0, 0.018),
    box(0.02, 0.038, 0.024, M(0xb02020, 0.7), 0.075, 0, 0), box(0.03, 0.03, 0.002, white, 0.03, 0, -0.012)),
  // A SAM splint folded lengthways to a channel: orange foam face, blue back, the wear rubbed into its edges.
  splint: () => group(box(0.36, 0.045, 0.006, M(0xd8642a, 0.9), 0, 0, 0.003), box(0.36, 0.045, 0.004, M(0x2a4a9a, 0.9), 0, 0, -0.002),
    ...[-1, 1].flatMap(s => [at(box(0.36, 0.035, 0.006, M(0xd8642a, 0.9)), 0, s * 0.036, 0.013, s * -0.6, 0, 0), at(box(0.36, 0.035, 0.004, M(0x2a4a9a, 0.9)), 0, s * 0.038, 0.009, s * -0.6, 0, 0)]),
    box(0.04, 0.046, 0.0065, M(0xa8582e, 0.95), -0.16, 0, 0.003)),
  // A bottle of ibuprofen: the white HDPE bottle, its printed label, the ribbed child-proof cap.
  painkillers: () => group(lathe([[0, 0], [0.017, 0], [0.018, 0.004], [0.018, 0.05], [0.014, 0.056], [0.012, 0.062], [0, 0.062]], M(0xece8de, 0.5), 'x', 0.03), cyl(0.0182, 0.032, P('label', 0xe8ecf2, 0.5), 'x', 0.006, 0, 0, 0.0182, 12),
    cyl(0.0155, 0.016, white, 'x', -0.038, 0, 0, 0.0155, 12), ...[0, 1, 2, 3, 4, 5].map(k => box(0.014, 0.002, 0.002, white, -0.038, Math.sin(k) * 0.0157, Math.cos(k) * 0.0157))),
  // A first-aid case carried by its handle: white ABS, a red cross, two latches, the hinge, grubby where it's handled.
  firstaid: () => group(at(rbox(0.2, 0.13, 0.07, 0.014, M(0xe2ded2, 0.6)), 0.1, 0, 0, 0, 0, Math.PI / 2), box(0.131, 0.201, 0.004, M(0x8a8678, 0.6), 0.1), box(0.05, 0.016, 0.073, red, 0.1), box(0.016, 0.05, 0.073, red, 0.1),
    ...[-0.07, 0.07].map(y => box(0.016, 0.02, 0.012, M(0x707478, 0.5), 0.035, y, 0.036)), at(ring(0.045, 0.006, M(0x505458, 0.6), 'z', 0, 0, 0, Math.PI, 12, 6), 0.04, 0, 0, 0, 0, Math.PI / 2), box(0.03, 0.04, 0.071, M(0xb0a898, 0.8), 0.15, 0.05, 0)),
  // A mylar blanket folded in its clear bag behind a printed card header.
  mylar: () => group(box(0.1, 0.065, 0.016, M(0xc0c4c8, 0.25, 0.5), 0.01), at(box(0.06, 0.04, 0.004, M(0xb0b4b8, 0.2, 0.5)), 0.02, 0.006, 0.009, 0, 0, 0.15), box(0.106, 0.07, 0.02, clear(0xe0e8f0, 0.25), 0.01),
    box(0.026, 0.072, 0.004, P('label', 0xd8d4c8, 0.7), -0.052)),
  // 75% medical alcohol in a white bottle with its blue label and flip cap.
  alcohol: () => group(lathe([[0, 0], [0.024, 0], [0.026, 0.004], [0.026, 0.1], [0.018, 0.118], [0.011, 0.124], [0.011, 0.13], [0, 0.13]], M(0xf0eee8, 0.5), 'x', 0.065), cyl(0.0262, 0.06, P('label', 0x2a5aa8, 0.5), 'x', 0.01, 0, 0, 0.0262, 12),
    cyl(0.0125, 0.018, M(0x2a5aa8, 0.5), 'x', -0.073, 0, 0, 0.0125, 12), box(0.004, 0.012, 0.006, M(0x2a5aa8, 0.5), -0.084, 0, -0.008)),
  // A clean cotton cloth folded in three, blue-striped at its hem.
  cloth: () => group(...[0, 1, 2].map(k => box(0.11, 0.1, 0.006, P('fabric', k === 1 ? 0xe0dcd2 : 0xe8e4da, 0.95), 0.002 * k, 0.002 * k, k * 0.006)), cyl(0.009, 0.1, P('fabric', 0xe8e4da, 0.95), 'y', -0.055, 0, 0.006, 0.009, 8),
    box(0.11, 0.006, 0.0005, M(0x3a5a9a, 0.9), 0, 0.04, 0.0153), box(0.11, 0.003, 0.0005, M(0x3a5a9a, 0.9), 0, 0.03, 0.0153)),
  // A sandwich loaf in its clear bag twisted shut: the golden domed crust, the crumb showing at the cut end.
  bread: () => group(box(0.2, 0.105, 0.075, M(0xb57a3c, 0.9), 0.04, 0, -0.0075), cyl(0.0525, 0.2, M(0xa86a30, 0.9), 'x', 0.04, 0, 0.02, 0.0525, 12), box(0.003, 0.1, 0.07, M(0xe8d8a8, 0.95), 0.141, 0, -0.0075),
    box(0.21, 0.112, 0.112, clear(0xe8f0f0, 0.2), 0.04, 0, 0.012), cyl(0.028, 0.04, clear(0xe8f0f0, 0.25), 'x', -0.085, 0, 0, 0.008, 10), box(0.004, 0.03, 0.004, M(0xc8a020, 0.6), -0.08, 0, 0)),
};
