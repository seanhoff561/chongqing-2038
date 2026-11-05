// The Dongshuimen Bridge's checkpoint (M6-19, DESIGN section 9): across the road deck over the north bank, where the
// bridge leaves the city. Its north face a concrete barrier wall across the deck, two scanner gates in it, one in each
// carriageway, a face-height scan line across each; over the east footway only a head-high hoarding. Inside, a turret
// cluster on a mast in the median, three turrets looking all round (and a pair at the Nan'an end looking back up the
// road); a sandbagged military crate in the west
// carriageway; a hatch in the median's plate with a ladder up to it from the rail deck below. Past it the road's plates
// are lifted out (bridges.ts `lifted`), so nothing drives on south. Three ways in: through a gate (ducked under its
// scan line), over the hoarding, up the hatch from the rail deck.
import { solid, turn, type Solid } from '../geom';
import { MAT } from '../mats';
import type { Camera, Climbable, Feature, Inter, Teleport } from '../world';
import { TRUSS, at, road, rail, type Span } from './bridges';
import { sin, cos, atan2 } from '../trig';

/** Where the wall's gates are across the deck (s), how high its wall and the hoarding stand, the scan line's height;
 *  the mast's distance in from the wall and its turrets' height; the crate's. */
export const CHECK = { gates: [[-7, -3], [3, 7]] as const, wall: 3.2, hoarding: 2.0, scan: 1.45, mast: 12, turret: 3.2, crate: 18 };

export function checkpoint(b: Span) {
  const H = TRUSS.half, tc = b.checkpoint!, th = b.hatch!, Y = (t: number) => road(b, t), local: Solid[] = [], decor: Solid[] = [];
  const box = (t0: number, t1: number, s0: number, s1: number, y0: number, y1: number, mat: number, tint?: number, out = local) => { const q = solid(b.ox + t0, y0, b.oz + s0, b.ox + t1, y1, b.oz + s1, mat); if (tint) q.tint = tint; out.push(q); };
  const P = (t: number, s: number, y: number) => { const [x, z] = at(b, t, s); return { x, y, z }; };
  const yawTo = (dt: number, ds: number) => atan2(b.ux * dt - b.uz * ds, b.uz * dt + b.ux * ds);
  const y = Y(tc), cameras: Camera[] = [], features: Feature[] = [], inter: Inter[] = [];
  // The north wall: concrete, the gates' gaps in it, the hoarding over the east footway.
  const [[a0, a1], [b0, b1]] = CHECK.gates, hoard = 9.0;
  for (const [s0, s1] of [[-H, a0], [a1, b0], [b1, hoard]]) box(tc, tc + 0.8, s0, s1, y - 0.1, y + CHECK.wall, MAT.concrete, 0x9a9890);
  box(tc, tc + 0.8, hoard, H, y - 0.1, y + CHECK.hoarding, MAT.metal, 0x4f5a48);
  CHECK.gates.forEach(([s0, s1], k) => {
    // The gantry over it, the scanners in its posts, the scan line across at face height.
    box(tc, tc + 0.8, s0, s1, y + 4, y + 4.6, MAT.metal, 0x3a3e44);
    for (const s of [s0 + 0.1, s1 - 0.1]) box(tc + 0.1, tc + 0.7, s - 0.08, s + 0.08, y + 0.4, y + 2.2, MAT.lamp, 0x60c0ff, decor);
    const from = P(tc + 0.4, s0 + 0.02, y + CHECK.scan), to = P(tc + 0.4, s1 - 0.02, y + CHECK.scan);
    cameras.push({ kind: 'tripwire', ...from, yaw: atan2(to.x - from.x, to.z - from.z), to });
    features.push({ kind: 'bridge:gate', ...P(tc + 0.4, (s0 + s1) / 2, y), group: k, nx: b.ux, nz: b.uz });
  });
  features.push({ kind: 'bridge:hoarding', ...P(tc, (hoard + H - TRUSS.chord) / 2, y), group: 0, nx: b.ux, nz: b.uz });
  // The turret cluster: a mast in the median, three turrets round its head looking all round, north first.
  const tm = tc + CHECK.mast, ym = Y(tm);
  box(tm - 0.3, tm + 0.3, -0.3, 0.3, ym, ym + CHECK.turret - 0.3, MAT.metal, 0x3a3e44);
  box(tm - 0.9, tm + 0.9, -0.9, 0.9, ym + CHECK.turret - 0.3, ym + CHECK.turret - 0.1, MAT.metal, 0x3a3e44);
  for (let k = 0; k < 3; k++) {
    const a = Math.PI + (k * 2 * Math.PI) / 3, dt = cos(a), ds = sin(a);
    cameras.push({ kind: 'turret', ...P(tm + dt * 0.6, ds * 0.6, ym + CHECK.turret), yaw: yawTo(dt, ds) });
  }
  features.push({ kind: 'bridge:turrets', ...P(tm, 0, ym), group: 0 });
  // And at the Nan'an bridgehead a pair on posts by the parapets, looking back up the road deck (not under it).
  const tn = b.tb - 25, yn = Y(tn);
  for (const sd of [-1, 1]) {
    box(tn - 0.2, tn + 0.2, sd * 10.4 - 0.2, sd * 10.4 + 0.2, yn, yn + CHECK.turret - 0.2, MAT.metal, 0x3a3e44);
    cameras.push({ kind: 'turret', ...P(tn - 0.5, sd * 10.4, yn + CHECK.turret), yaw: yawTo(-1, -sd * 0.12) });
  }
  // The military crate, sandbagged, in the west carriageway.
  const tk = tc + CHECK.crate, yk = Y(tk);
  for (const t of [tk - 1.6, tk + 1.6]) box(t - 0.35, t + 0.35, -8.4, -3.6, yk, yk + 0.9, MAT.cloth, 0x8a7a58);
  box(tk - 0.4, tk + 0.4, -6.6, -5.4, yk, yk + 0.7, MAT.crate, 0x4a5a3a);
  inter.push({ id: 'bridge-crate', kind: 'container', ...P(tk, -6, yk + 0.5), r: 0.7, zh: '军用物资箱', en: 'Military crate', data: { type: 'crate', loot: 'armory' } });
  // The hatch in the median's plate (bridges.ts leaves the hole), its ladder up from the rail deck.
  const ladder = P(th + 0.05, 0, rail(b, th)), climbables: Climbable[] = [{ kind: 'ladder', x: ladder.x, z: ladder.z, y0: rail(b, th), y1: Y(th) + 0.3, nx: b.ux, nz: b.uz }];
  features.push({ kind: 'bridge:hatch', ...P(th + 0.6, 0, Y(th)), group: 0 });
  // (On the road short of the gates, facing them.)
  const tp = P(tc - 6, -5, Y(tc - 6) + 0.3), teleports: Teleport[] = [{ name: 'Dongshuimen Bridge: checkpoint', ...tp, yaw: atan2(-b.ux, -b.uz) }];
  const yaw = atan2(b.uz, b.ux);
  return { solids: turn(local, yaw, b.ox, b.oz), decor: turn(decor, yaw, b.ox, b.oz), cameras, features, inter, climbables, teleports };
}
