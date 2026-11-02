// The Liberation Monument (M6-01, M6-02): 抗战胜利纪功碑暨人民解放纪念碑 at the heart of Jiefangbei, on its own OSM
// footprint (it had been built as a block of flats). An octagonal stone column 27.5 m tall on a stepped octagonal
// plinth, a band of clock faces near the top under a cornice, a small lantern and spire; round it a low kerb ringing
// the flower beds, the plaza open all round. Each octagon is a square and the same square turned an eighth.
import { solid, turn, type Solid } from '../geom';
import { MAT } from '../mats';
import type { Fabric } from '../city/buildings';
import type { Obb } from './shapes';

/** Its parts: half-widths across the flats (m) and heights over the plaza (m). */
export const MONUMENT = { height: 27.5, steps: [[7.5, 0.35], [6.2, 0.7], [5, 1.05]], shaft: [2.1, 1.05, 21.5], clock: [2.5, 21.5, 24.2], cornice: [2.8, 24.2, 24.6], lantern: [1.6, 24.6, 26.3], spire: [0.35, 26.3, 27.5], kerb: [10.5, 0.45] };

const PALE = 0xe2dccd, STEPS = 0xcfcabd;

export function monument(o: Obb, base: number, out: Pick<Fabric, 'solids' | 'decor' | 'far'>) {
  const { cx, cz } = o, M = MONUMENT;
  // (Pale dressed stone, the column a touch warmer than its steps.)
  const oct = (r: number, y0: number, y1: number, mat: number, to: Solid[], tint = PALE) => {
    const sq = { ...solid(cx - r, base + y0, cz - r, cx + r, base + y1, cz + r, mat), tint };
    to.push(...turn([sq], o.yaw, cx, cz), ...turn([{ ...sq }], o.yaw + Math.PI / 4, cx, cz));
  };
  // The plinth's steps, the shaft, the clock band and its cornice, the lantern and the spire.
  let y = 0;
  for (const [r, top] of M.steps) { oct(r, y, top, MAT.stone, out.solids, STEPS); y = top; }
  oct(M.shaft[0], M.shaft[1], M.shaft[2], MAT.plaster, out.solids);
  oct(M.clock[0], M.clock[1], M.clock[2], MAT.plaster, out.solids);
  oct(M.cornice[0], M.cornice[1], M.cornice[2], MAT.concrete, out.solids);
  oct(M.lantern[0], M.lantern[1], M.lantern[2], MAT.plaster, out.solids);
  oct(M.spire[0], M.spire[1], M.spire[2], MAT.metal, out.solids);
  // A clock face on each of the four main sides, just proud of the band: lit after dark.
  const fr = M.clock[0] + 0.04, fy0 = base + M.clock[1] + 0.5, fy1 = base + M.clock[2] - 0.5, fw = 0.9;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const b = dx ? solid(cx + dx * fr - 0.05, fy0, cz - fw, cx + dx * fr + 0.05, fy1, cz + fw, MAT.lamp) : solid(cx - fw, fy0, cz + dz * fr - 0.05, cx + fw, fy1, cz + dz * fr + 0.05, MAT.lamp);
    out.decor.push(...turn([b], o.yaw, cx, cz));
  }
  // The kerb round the flower beds: eight low lengths, a gap on the four main sides to walk in by.
  const [kr, kh] = M.kerb, side = kr * Math.tan(Math.PI / 8);
  for (let k = 0; k < 8; k++) {
    const a = o.yaw + (k * Math.PI) / 4, spans = k % 2 ? [[-side, side]] : [[-side, -side * 0.4], [side * 0.4, side]];
    for (const [z0, z1] of spans) out.solids.push(...turn([solid(cx + kr - 0.25, base, cz + z0, cx + kr + 0.25, base + kh, cz + z1, MAT.concrete)], a, cx, cz));
  }
  // Seen from far off: the column in one piece.
  out.far.push(...turn([{ ...solid(cx - M.shaft[0], base, cz - M.shaft[0], cx + M.shaft[0], base + M.height, cz + M.shaft[0], MAT.plaster), tint: PALE }], o.yaw, cx, cz));
}
