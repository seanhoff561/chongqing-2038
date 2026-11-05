// The city's tunnels joined up (M6-21): from the west end of Jiaochangkou's Line 1/2 station hall, the telecom
// exchange's cable tunnel south under the lower town and west to the exchange's basement shaft (taking in the crawlway
// that ran its last stretch), and the hospital basement link north, up a flight to the sewer under the hospital's
// street, along it (taken in) to the hospital's basement shaft. Square to the map, lined in concrete, cable trays
// along both walls; each bore cuts what it runs into (the hall's end wall, the sewers and shafts it takes in).
import { solid, carve, type Solid, type Box } from '../geom';
import { MAT } from '../mats';
import { stair } from '../steps';
import type { Zone, Feature } from '../world';

type V3 = { x: number; y: number; z: number };
/** Their width, height and lining. */
const LINK = { w: 2.4, h: 2.4, t: 0.4 };

/** Cut b out of every solid in list it touches that's square to the map, in place. */
export function cut(list: Solid[], b: Box) {
  const hit = (s: Solid) => !s.rot && !s.ramp && b.x0 < s.x1 && b.x1 > s.x0 && b.y0 < s.y1 && b.y1 > s.y0 && b.z0 < s.z1 && b.z1 > s.z0;
  if (!list.some(hit)) return;
  const pieces = carve(list.filter(hit), b), keep = list.filter(s => !hit(s));
  list.length = 0;
  list.push(...keep, ...pieces);
}

/** Dig each way through its points in turn (each square to the map from the last: level, or a flight where it
 *  climbs); `into`: the solids it cuts where it meets them; `spaces`: what's dug already (its lining opens onto any
 *  it meets). Its walk for the tests, as features `<name>` in order. */
export function links(ways: Record<string, V3[]>, into: Solid[][], spaces: Box[]) {
  const bores: Box[] = [], lining: Solid[] = [], kept: Solid[] = [], decor: Solid[] = [], zones: Zone[] = [], features: Feature[] = [], { w, h, t } = LINK, hw = w / 2;
  const space = (x0: number, z0: number, x1: number, z1: number, y0: number, y1: number) => {
    bores.push({ x0, y0, z0, x1, y1, z1 });
    lining.push(solid(x0 - t, y0 - t, z0 - t, x1 + t, y0, z1 + t, MAT.concrete), solid(x0 - t, y1, z0 - t, x1 + t, y1 + t, z1 + t, MAT.concrete),
      solid(x0 - t, y0, z0 - t, x0, y1, z1 + t, MAT.concrete), solid(x1, y0, z0 - t, x1 + t, y1, z1 + t, MAT.concrete), solid(x0, y0, z0 - t, x1, y1, z0, MAT.concrete), solid(x0, y0, z1, x1, y1, z1 + t, MAT.concrete));
    zones.push({ kind: 'under', box: { x0: x0 - 0.3, y0: y0 - 0.5, z0: z0 - 0.3, x1: x1 + 0.3, y1, z1: z1 + 0.3 } });
  };
  for (const [name, pts] of Object.entries(ways)) {
    pts.forEach((q, n) => features.push({ kind: name, ...q, group: n }));
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], alongX = Math.abs(b.x - a.x) > Math.abs(b.z - a.z);
      const x0 = Math.min(a.x, b.x) - hw, x1 = Math.max(a.x, b.x) + hw, z0 = Math.min(a.z, b.z) - hw, z1 = Math.max(a.z, b.z) + hw;
      if (a.y === b.y) {
        space(x0, z0, x1, z1, a.y, a.y + h);
        // Cable trays along both walls, the cables in them.
        for (const s of [-1, 1]) for (const ty of [1.5, 1.9]) {
          const [u0, u1] = s < 0 ? [alongX ? z0 : x0, (alongX ? z0 : x0) + 0.35] : [(alongX ? z1 : x1) - 0.35, alongX ? z1 : x1];
          decor.push(alongX ? solid(x0, a.y + ty, u0, x1, a.y + ty + 0.08, u1, MAT.cloth) : solid(u0, a.y + ty, z0, u1, a.y + ty + 0.08, z1, MAT.cloth));
        }
        continue;
      }
      // A flight from its foot to its head, its space in 2 m lengths each as high over its top step as the tunnel.
      const [lo, hi] = a.y < b.y ? [a, b] : [b, a], len = Math.hypot(hi.x - lo.x, hi.z - lo.z), dx = Math.sign(hi.x - lo.x), dz = Math.sign(hi.z - lo.z);
      stair(Math.min(a.x, b.x) - (alongX ? 0 : hw), Math.min(a.z, b.z) - (alongX ? hw : 0), Math.max(a.x, b.x) + (alongX ? 0 : hw), Math.max(a.z, b.z) + (alongX ? hw : 0), lo.y, hi.y, alongX ? (dx > 0 ? 1 : 2) : dz > 0 ? 3 : 4, kept, decor);
      for (let d = 0; d < len; d += 2) {
        const e = Math.min(len, d + 2), y = (k: number) => lo.y + ((hi.y - lo.y) * k) / len, p = { x: lo.x + dx * d, z: lo.z + dz * d }, q = { x: lo.x + dx * e, z: lo.z + dz * e };
        space(Math.min(p.x, q.x) - (alongX ? 0 : hw), Math.min(p.z, q.z) - (alongX ? hw : 0), Math.max(p.x, q.x) + (alongX ? 0 : hw), Math.max(p.z, q.z) + (alongX ? hw : 0), y(d), y(e) + h);
      }
    }
  }
  let all = lining;
  for (const b of bores.concat(spaces.filter(q => bores.some(b => b.x0 < q.x1 && b.x1 > q.x0 && b.y0 < q.y1 && b.y1 > q.y0 && b.z0 < q.z1 && b.z1 > q.z0)))) all = carve(all, b);
  for (const list of into) for (const b of bores) cut(list, b);
  for (const q of all) q.inner = true;
  return { solids: all.concat(kept), decor, zones, features };
}
