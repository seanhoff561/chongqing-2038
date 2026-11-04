// Keys, cards and papers, and his father's phone (U-053): cards in printed PVC held up to him, keys on their rings and
// tags, paper folded and handled.
import * as THREE from 'three';
import { M, P, glow, steel, black, worn, chrome, brass, box, cyl, group, ring, slab, rbox, at } from './items3d-kit';
import { DOCS } from '../data/documents';

/** An access card held up out of the fist, its face to him: printed PVC (base), with a coloured band and whatever else
 *  marks it as that card. */
const card = (base: number, bandColor: number, ...marks: THREE.Object3D[]) => at(group(rbox(0.054, 0.0856, 0.0008, 0.003, P('label', base, 0.45)), box(0.012, 0.0856, 0.0001, M(bandColor, 0.45), -0.021, 0, 0.00045),
  box(0.003, 0.003, 0.0009, M(0x9a9a9a, 0.5), 0.024, 0.038, 0), ...marks), -0.025, 0, 0);
/** A photo on a card or badge, a face in grey-blue. */
const photo = (x: number, y: number, w = 0.02, h = 0.016) => group(box(w, h, 0.0001, M(0x5a6a7a, 0.6), x, y, 0.00046), box(w * 0.4, h * 0.35, 0.0001, M(0xb89a80, 0.6), x - w * 0.08, y, 0.00048));

/** A key's blade in face view, its cuts along one edge, from its shoulder (x0) up to its tip. */
function blade(x0: number, len: number, m: THREE.Material) {
  const pts: [number, number][] = [[x0, -0.004], [x0, 0.004]];
  for (let k = 0; k < 5; k++) pts.push([x0 - len * (k + 0.5) / 6, 0.004 - (k % 2) * 0.0025], [x0 - len * (k + 1) / 6, 0.004 - ((k + 1) % 2) * 0.0015]);
  pts.push([x0 - len, 0.001], [x0 - len, -0.004]);
  return slab(pts, 0.002, m);
}

/** A split ring through the key's bow. */
const split = (x: number, y = 0) => ring(0.012, 0.0012, chrome, 'z', x, y, 0, Math.PI * 2, 14, 4);

/** A found document: a sheet folded once and opened out, soft from handling, lines of ink across it. */
const sheet = () => { const ink = M(0x3a4048, 0.8); return group(at(box(0.105, 0.15, 0.0006, P('label', 0xeee8d6, 0.9)), -0.055, 0, 0, 0, 0.12, 0), at(box(0.105, 0.15, 0.0006, P('label', 0xeee8d6, 0.9)), -0.158, 0, 0.006, 0, -0.12, 0),
  ...[0, 1, 2, 3, 4].map(k => at(box(0.07, 0.0015, 0.0002, ink), -0.06, 0.05 - k * 0.022, 0.0007, 0, 0.12, 0))); };

export const keysModels: Record<string, () => THREE.Object3D> = {
  // His father's work badge in its clear holder on a clip: State Grid's green band, his photo, his name and number.
  badge: () => group(rbox(0.086, 0.054, 0.0008, 0.003, P('label', 0xf0eee8, 0.5), -0.04), box(0.016, 0.054, 0.0001, M(0x00706a, 0.5), -0.075, 0, 0.00045), photo(-0.035, -0.012, 0.024, 0.03),
    box(0.094, 0.06, 0.0025, Object.assign(M(0xe8f0f4, 0.2), { transparent: true, opacity: 0.25, depthWrite: false }), -0.04, 0, 0), box(0.012, 0.014, 0.004, chrome, -0.088, 0, 0), box(0.025, 0.012, 0.002, P('fabric', 0x00706a, 0.9), -0.104, 0, 0),
    box(0.004, 0.03, 0.0026, worn, -0.002, 0.01, 0)),
  // The river police boat key: black rubber head, nickel blade, on a split ring with an orange foam float marked 3.
  boatkey: () => group(rbox(0.06, 0.026, 0.02, 0.01, M(0xe86a1a, 0.85), 0.01), box(0.016, 0.012, 0.0005, P('label', 0xf0f0e8, 0.6), 0.01, 0, 0.0103), split(-0.03),
    rbox(0.022, 0.026, 0.006, 0.006, black, -0.05, 0), blade(-0.061, 0.035, M(0xc4cacf, 0.3, 0.5))),
  // The cableway operator's key: a black-headed switch key, its notched steel blade, a red tag on its ring.
  opkey: () => group(rbox(0.026, 0.03, 0.006, 0.008, black, -0.02), box(0.03, 0.007, 0.002, steel, -0.048), box(0.004, 0.0025, 0.0022, M(0x1a1a1a, 0.5), -0.05, 0.0025, 0), box(0.004, 0.0025, 0.0022, M(0x1a1a1a, 0.5), -0.058, -0.0025, 0),
    split(0.0), rbox(0.045, 0.026, 0.0015, 0.005, P('label', 0xb02a24, 0.6), 0.03, 0.006)),
  // A metro maintenance key: the cross of chrome bar, a socket at each arm (triangle, square, hex, round) for the
  // track doors and service rooms, worn where it's turned.
  metrokey: () => group(cyl(0.005, 0.11, chrome, 'x', -0.01, 0, 0, 0.005, 8), cyl(0.005, 0.11, chrome, 'y', -0.01, 0, 0, 0.005, 8), cyl(0.009, 0.022, chrome, 'x', -0.07, 0, 0, 0.009, 3), cyl(0.009, 0.022, chrome, 'x', 0.05, 0, 0, 0.009, 4),
    cyl(0.009, 0.022, chrome, 'y', -0.01, 0.06, 0, 0.009, 6), cyl(0.008, 0.022, chrome, 'y', -0.01, -0.06, 0, 0.008, 8), cyl(0.0052, 0.03, worn, 'x', 0.01, 0, 0, 0.0052, 8)),
  // The Line 1 blast door's card: grey, a red band, a hazard stripe and the protection office's emblem.
  blastcard: () => card(0x6a7078, 0xa82a24, ...[0, 1, 2, 3, 4, 5].map(k => box(0.006, 0.006, 0.0001, M(k % 2 ? 0x1a1a1a : 0xd8b020, 0.5), 0.022, -0.035 + k * 0.006, 0.00045)), cyl(0.008, 0.0002, M(0xc8a040, 0.4, 0.6), 'z', 0.0, 0.025, 0.0004, 0.008, 10)),
  // The construction site's gate card: yellow, a blue band, a photo, a hole punched for its steel clip.
  sitecard: () => card(0xd8b830, 0x2a5aa8, photo(0.006, -0.026), cyl(0.002, 0.001, M(0x1a1a1a, 0.5), 'z', -0.022, 0.0, 0, 0.002, 8), ring(0.006, 0.0008, chrome, 'z', -0.029, 0.0, 0, Math.PI * 2, 10, 3)),
  // The police station's door card: navy blue, a gold police emblem.
  policecard: () => card(0x1a2a5a, 0xc8a040, cyl(0.01, 0.0003, M(0xc8a040, 0.35, 0.7), 'z', 0.004, -0.024, 0.0004, 0.01, 12), cyl(0.0055, 0.0004, M(0xb02a24, 0.5), 'z', 0.004, -0.024, 0.0006, 0.0055, 5)),
  // The telecom exchange's gate card: sky blue, a white band, the operator's swoosh in a darker blue, a chip.
  telcard: () => card(0x3a8ad8, 0xf0f4f8, ring(0.008, 0.0012, M(0x1a4a8a, 0.5), 'z', 0.008, -0.024, 0.0004, Math.PI * 1.3, 12, 3), box(0.009, 0.007, 0.0002, M(0xc8a040, 0.35, 0.7), -0.012, 0.012, 0.0005)),
  // The hospital's staff card on its badge reel: white, a green band and cross, a photo.
  hospcard: () => group(card(0xf0f0ec, 0x2a8a5a, box(0.012, 0.004, 0.0001, M(0x2a8a5a, 0.5), 0.006, 0.026, 0.00045), box(0.004, 0.012, 0.0001, M(0x2a8a5a, 0.5), 0.006, 0.026, 0.00045), photo(0.006, -0.026)),
    cyl(0.016, 0.012, M(0xe8e8e4, 0.5), 'z', 0.028, 0, -0.004, 0.016, 14), box(0.03, 0.001, 0.0005, M(0x2a2a2a, 0.6), 0.01, 0, -0.002)),
  // Network admin credentials: a hardware token on a ring, its gold touch pad and USB contacts, a folded slip of
  // passwords taped round it.
  netcreds: () => group(rbox(0.045, 0.018, 0.003, 0.003, M(0x1a1b1c, 0.5)), cyl(0.005, 0.0004, M(0xc8a040, 0.3, 0.5), 'z', 0.005, 0, 0.0016, 0.005, 10), box(0.012, 0.012, 0.0008, M(0x1a1b1c, 0.5), -0.028, 0, 0),
    ...[0, 1, 2, 3].map(k => box(0.008, 0.0012, 0.0003, brass, -0.029, -0.003 + k * 0.002, 0.0006)), ring(0.008, 0.0012, chrome, 'z', 0.03, 0, 0, Math.PI * 2, 12, 3),
    at(box(0.04, 0.03, 0.0005, P('label', 0xf4f0e0, 0.9)), 0.012, 0.012, 0.004, 0, 0.15, 0.1), box(0.01, 0.022, 0.0006, M(0xc8c4b0, 0.5), 0.012, 0.012, 0.0045)),
  // The Line 6 deck's maintenance schedule: a printout folded in three, handled soft, a coffee ring and a red pen
  // circle on it.
  schedule: () => group(...[0, 1, 2].map(k => at(box(0.055, 0.14, 0.0006, P('label', 0xf0ece0, 0.9)), -0.03 - k * 0.052, 0, k === 1 ? 0.005 : 0, 0, k === 1 ? -0.18 : 0.18, 0)),
    ring(0.012, 0.0012, M(0x8a6a4a, 0.9), 'z', -0.08, 0.03, 0.006, Math.PI * 1.7, 12, 3), ring(0.009, 0.0007, M(0xb02a24, 0.6), 'z', -0.025, -0.03, 0.0008, Math.PI * 2, 12, 3)),
  // His father's phone: the dark frame and glass, cracked out from a corner, side buttons, the camera behind.
  phone: () => { const crack = M(0xa8b0b8, 0.2, 0.5); return group(rbox(0.15, 0.072, 0.008, 0.009, M(0x2a2c30, 0.4, 0.5), -0.04), box(0.142, 0.066, 0.0005, M(0x0a0c10, 0.08, 0.3), -0.04, 0, 0.0042),
    ...[[0.07, -0.25], [0.05, 0.3], [0.04, -0.9], [0.012, 2.6], [0.045, -0.5]].map(([l, a]) => at(box(l, 0.0007, 0.0002, crack), -0.1 + Math.cos(a) * l / 2, 0.015 + Math.sin(a) * l / 2, 0.0046, 0, 0, a)),
    rbox(0.03, 0.022, 0.002, 0.005, M(0x1a1b1c, 0.4, 0.4), -0.09, 0.016, -0.005), cyl(0.0045, 0.002, M(0x0a0a0a, 0.1, 0.5), 'z', -0.09, 0.02, -0.0065, 0.0045, 10), box(0.02, 0.001, 0.003, M(0x3a3c40, 0.4, 0.6), -0.07, 0.0365, 0),
    box(0.012, 0.001, 0.003, M(0x3a3c40, 0.4, 0.6), -0.1, 0.0365, 0), cyl(0.0012, 0.0005, glow(0x1a2a1a, 0.2), 'z', -0.105, -0.025, 0.0045, 0.0012, 6)); },
  // The found documents (M10-37).
  ...Object.fromEntries(DOCS.map(d => [d.id, sheet])),
};
