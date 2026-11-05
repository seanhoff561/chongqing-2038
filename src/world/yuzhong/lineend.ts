// Route D's way out (M7-11, DESIGN section 10): Line 1's running tunnel on east past the crossover under Xiaoshizi,
// the unfinished extension toward the river. Its protective door (防护密闭门) in a bulkhead 3 m in from the
// crossover, shut on the first day: a card's reader by it. Beyond, the tunnel falls at 1 in 10 to the east, turns
// north under the hill (under the culverts off the Xiaoshizi tubes), runs level at the bottom past its dead drainage
// pumps, and climbs to the end wall of the bore, a doorway through it into the service passage beyond: the way out
// (`tunnel:end`, the ending's zone). With the pumps stopped the water has come up in the dip to 1 m under the door's
// sill, over the roof for about 120 m of it; the station's pump panel, its feeder powered, drains it (sim/tunnelend.ts).
// Seismic sensors on the track bed from Jiefangbei's hall to the end feel anything faster than a slow walk.
import { solid, rampSolid, type Box } from '../geom';
import { MAT } from '../mats';
import type { Feature, Inter, Zone } from '../world';
import type { Dig } from './underkit';

/** The bore: its width and height; its grade; the water's top (under the door's sill) and the bottom's floor, both
 *  from the network's level; how far east of the crossover's wall it turns north; the bottom's length; how long the
 *  passage beyond the end wall is. */
export const LINE_END = { w: 4.4, h: 4.4, grade: 0.1, top: -1, low: -8.5, east: 42, bottom: 58, passage: 7 };

/** At: the east tubes' run (x0 Jiefangbei's hall's east end to x1 the crossover's west wall), the crossover's middle
 *  (cx, cz) and half size cr, the tracks' offset either side of the middle, the floor y. */
export function lineEnd(d: Dig, at: { x0: number; x1: number; cx: number; cz: number; cr: number; off: number; y: number }, inter: Inter[], marks: Feature[]) {
  const { w, h, grade, east, bottom, passage } = LINE_END, hw = w / 2, Y = at.y, TOP = Y + LINE_END.top, LOW = Y + LINE_END.low;
  const X0 = at.cx + at.cr, Z = at.cz - at.off, X2 = X0 + east, END = TOP - 0.4;
  const mark = (kind: string, x: number, y: number, z: number) => marks.push({ kind, x, y, z, group: 0 });
  /** A straight piece over the rect, its floor from fa at one end to fb at the other (along x, or z): a level bore,
   *  or 2 m bores stepping down with it over one ramp. */
  const piece = (x0: number, z0: number, x1: number, z1: number, alongX: boolean, fa: number, fb: number) => {
    if (fa === fb) { d.space(x0, z0, x1, z1, fa, fa + h); return; }
    const a0 = alongX ? x0 : z0, a1 = alongX ? x1 : z1, f = (a: number) => fa + ((fb - fa) * (a - a0)) / (a1 - a0);
    for (let a = a0; a < a1 - 1e-6; a += 2) {
      const b = Math.min(a1, a + 2), lo = Math.min(f(a), f(b)), hi = Math.max(f(a), f(b));
      if (alongX) d.space(a, z0, b, z1, lo, hi + h); else d.space(x0, a, x1, b, lo, hi + h);
    }
    const [lo, hi] = [Math.min(fa, fb), Math.max(fa, fb)], dir = alongX ? (fb > fa ? 1 : 2) : fb > fa ? 3 : 4;
    d.kept.push(rampSolid(x0, lo - 0.5, z0, x1, z1, lo, hi, dir, MAT.concrete));
  };
  // East from the crossover to the ramp's head, the bulkhead and its door 3 m in; down at 1 in 10 to the corner.
  const B = X0 + 6, C = Y - grade * (X2 - hw - B);
  piece(X0 - 0.5, Z - hw, B, Z + hw, true, Y, Y);
  piece(B, Z - hw, X2 - hw, Z + hw, true, Y, C);
  piece(X2 - hw, Z - hw, X2 + hw, Z + hw, true, C, C);
  // North: down to the bottom (under the culverts), along it, up to the end wall and the level before it.
  const D = Z - hw - (C - LOW) / grade, E = D - bottom, F = E - (END - LOW) / grade, G = F - 4;
  piece(X2 - hw, D, X2 + hw, Z - hw, false, LOW, C);
  piece(X2 - hw, E, X2 + hw, D, false, LOW, LOW);
  piece(X2 - hw, F, X2 + hw, E, false, END, LOW);
  piece(X2 - hw, G, X2 + hw, F, false, END, END);
  // Through the end wall, the service passage north: its doorway lit by the exit sign over it.
  d.space(X2 - 0.7, G - passage, X2 + 0.7, G + 0.1, END, END + 2.3);
  d.decor.push(solid(X2 - 0.4, END + 2.45, G + 0.01, X2 + 0.4, END + 2.75, G + 0.06, MAT.glare));
  d.props.push({ kind: 'graffiti', x: X2 + 1.6, y: END + 1.8, z: G + 0.02, yaw: 0, text: '安全出口  EXIT' });
  mark('tunnel:end', X2, END, G - passage / 2);
  // The bulkhead: a frame wall across the bore, its doorway 3 m wide and 3.6 high, the steel leaf hinged on its north
  // side, swinging back toward the crossover; its card reader beside it, its name over it, a lamp still on.
  const DX = X0 + 3, DW = 3, DH = 3.6, z0 = Z - DW / 2, z1 = Z + DW / 2;
  d.kept.push(solid(DX - 0.3, Y, Z - hw, DX + 0.3, Y + h, z0, MAT.concrete), solid(DX - 0.3, Y, z1, DX + 0.3, Y + h, Z + hw, MAT.concrete), solid(DX - 0.3, Y + DH, z0, DX + 0.3, Y + h, z1, MAT.concrete));
  d.kept.push({ ...solid(DX - 0.15, Y, z0, DX + 0.15, Y + DH, z1, MAT.hidden), part: 'line1-blast' });
  d.props.push({ kind: 'door', x: DX - 0.3, y: Y, z: z0, yaw: -Math.PI / 2, w: DW, h: DH, d: 0.3, text: 'line1-blast' });
  d.decor.push(solid(DX - 0.36, Y + 1.1, z1 + 0.25, DX - 0.3, Y + 1.5, z1 + 0.5, MAT.screen), solid(DX - 0.5, Y + h - 0.25, Z - 0.3, DX - 0.3, Y + h - 0.1, Z + 0.3, MAT.lamp));
  d.props.push({ kind: 'graffiti', x: DX - 0.32, y: Y + 3.9, z: Z, yaw: -Math.PI / 2, text: '1号线 防护密闭门  LINE 1 PROTECTIVE DOOR' });
  inter.push({ id: 'line1-blast', kind: 'blastdoor', x: DX - 0.5, y: Y + 1.3, z: Z + 0.6, r: 1.2, zh: '防护密闭门', en: 'Protective door', data: { part: 'line1-blast', key: 'blastcard' } });
  mark('tunnelEnd:door', DX, Y, Z);
  // The dead pumps at the bottom along its east wall, their riser up to the roof; the track along the bottom.
  for (const k of [0, 1, 2]) {
    const pz = D - 8 - k * 3;
    d.kept.push(solid(X2 + hw - 1, LOW, pz - 0.5, X2 + hw, LOW + 1.2, pz + 0.5, MAT.metal));
    d.decor.push(solid(X2 + hw - 0.5, LOW + 1.2, pz - 0.1, X2 + hw - 0.3, LOW + h, pz + 0.1, MAT.tealMetal));
  }
  d.props.push({ kind: 'graffiti', x: X2 - hw + 0.02, y: LOW + 2.4, z: D - 11, yaw: Math.PI / 2, text: '排水泵站  DRAINAGE PUMPS' });
  for (const s of [-0.72, 0.72]) d.decor.push(solid(X2 + s - 0.035, LOW + 0.1, E, X2 + s + 0.035, LOW + 0.24, D, MAT.metal));
  // The seismic sensors: a small grey box on the track bed every 20 m, its status light (a glow, no lamp).
  const sensor = (x: number, y: number, z: number) => d.decor.push(solid(x - 0.15, y, z - 0.15, x + 0.15, y + 0.15, z + 0.15, MAT.metal), solid(x - 0.03, y + 0.15, z - 0.03, x + 0.03, y + 0.19, z + 0.03, MAT.screen));
  for (let x = at.x0 + 10; x < at.x1; x += 20) for (const c of [-at.off, at.off]) sensor(x, Y + 0.04, at.cz + c);
  for (let x = B + 4; x < X2 - hw; x += 20) sensor(x, Y - grade * (x - B) + 0.04, Z);
  for (let z = E + 10; z < D; z += 20) sensor(X2, LOW + 0.04, z);
  // A walk for the tests: from the crossover through the door, down, along the bottom, up and out.
  [[X0 - 2, Y, Z], [B, Y, Z], [X2, C, Z], [X2, LOW, D], [X2, LOW, E], [X2, END, G + 1], [X2, END, G - passage / 2]].forEach(([x, y, z]) => mark('tunnelEnd:walk', x, y, z));
  // The water in the dip (two boxes along the north run, each drawn near only); the sensors' reach.
  const water: Box[] = [{ x0: B, y0: LOW - 1, z0: Z - hw, x1: X2 + hw, y1: TOP, z1: Z + hw }];
  const zn = G - passage, mid = (zn + Z - hw) / 2;
  water.push({ x0: X2 - hw, y0: LOW - 1, z0: zn, x1: X2 + hw, y1: TOP, z1: mid }, { x0: X2 - hw, y0: LOW - 1, z0: mid, x1: X2 + hw, y1: TOP, z1: Z - hw });
  const zones: Zone[] = [
    { x0: at.x0, z0: at.cz - at.off - 2.3, x1: at.x1, z1: at.cz + at.off + 2.3, y0: Y - 0.5, y1: Y + 5 },
    { x0: at.cx - at.cr, z0: at.cz - at.cr, x1: at.cx + at.cr, z1: at.cz + at.cr, y0: Y - 0.5, y1: Y + 6 },
    { x0: X0 - 0.5, z0: Z - hw, x1: X2 + hw, z1: Z + hw, y0: LOW - 1, y1: Y + h },
    { x0: X2 - hw, z0: G, x1: X2 + hw, z1: Z - hw, y0: LOW - 1, y1: END + h },
  ].map(box => ({ kind: 'seismic', box }));
  return { water, zones, flood: { boxes: water, top: TOP, bottom: LOW - 0.1 } };
}
