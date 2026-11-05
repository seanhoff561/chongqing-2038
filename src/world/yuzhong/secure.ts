// The high-security sites in the city's buildings (M6-11 to M6-13, DESIGN section 10; Q-010: in buildings already
// standing). Each is a building chosen once and for all, its type fixed and its insides made by hand (M10-38b:
// yuzhong/insides.ts), then fitted out: its ways in (the street door behind a keycard reader under a camera, the ways
// its layout makes through its outer walls, the roof door from a roof reached by grapple, the basement's manhole),
// its loot by its own table, its hazard where its layout marks it, and its heart (where what it's for is).
import type { World, Camera, Secure, Prop, Teleport, Inter } from '../world';
import { free } from '../../sim/physics';
import type { BuildingType } from '../city/types';
import { onWall } from './sensors';
import { raycast } from '../geom';
import { MAT } from '../mats';
import { hospital, police, market } from './insides';
import { telecom, substation } from './insides2';
import { cableway } from './cableway';
import type { Lot } from '../city/buildings';

/** The sites: which building (its plan's seed), what it was (else as rolled), its card, its loot table, its hazard and its insides. */
export const SECURE: { id: string; plan: string; type?: BuildingType; zh: string; en: string; card?: string; loot: string; hazard: 'plate+pir' | 'turret' | 'acoustic' | 'gas' | 'hv' | 'bullwheel'; inside: Lot['inside'] }[] = [
  { id: 'hospital', plan: 'osm68', type: 'clinic', zh: '渝中医院', en: 'Yuzhong Hospital', card: 'hospcard', loot: 'hospital', hazard: 'plate+pir', inside: hospital },
  { id: 'police', plan: 'osm449', type: 'military', zh: '派出所', en: 'Police station', card: 'policecard', loot: 'police', hazard: 'turret', inside: police },
  { id: 'market', plan: 'osm396', type: 'mall', zh: '数码城', en: 'Electronics market', loot: 'electronics', hazard: 'acoustic', inside: market },
  { id: 'telecom', plan: 'osm9', type: 'office', zh: '电信枢纽', en: 'Telecom exchange', card: 'telcard', loot: 'telecom', hazard: 'gas', inside: telecom },
  { id: 'substation', plan: 'osm855', type: 'workshop', zh: '新华路变电站', en: 'Xinhua Road substation', card: 'badge', loot: 'substation', hazard: 'hv', inside: substation },
  // (The cableway's north station, M6-16: its hazard, the bullwheel up in its hall, sim/cableway.ts. Its type as the
  // run rolls it: what it would have been decides the dice for the city round it.)
  { id: 'cableway', plan: 'back4300', zh: '长江索道北站', en: 'Yangtze cableway', loot: 'workshop', hazard: 'bullwheel', inside: cableway },
];

/** How far up a street door's camera hangs, out from the wall and along it from the door (m); the pharmacy's plate's
 *  half-width (m). */
const DOOR_CAM = { up: 3.2, out: 0.4, side: 4 }, PLATE = 1.6;

export function fitSecure(w: World): { sites: Secure[]; cameras: Camera[]; props: Prop[]; gas: NonNullable<World['gas']>; hv: NonNullable<World['hv']> } {
  const sites: Secure[] = [], cameras: Camera[] = [], props: Prop[] = [], gas: NonNullable<World['gas']> = [], hv: NonNullable<World['hv']> = [];
  for (const S of SECURE) {
    const plot = w.plots.find(p => p.prefix === S.plan);
    if (!plot) continue;
    const its = w.inter.filter(i => i.id.startsWith(`${S.plan}-`)), own = (i: Inter) => i.id.slice(S.plan.length + 1);
    const cx = plot.corners.reduce((a, c) => a + c[0], 0) / plot.corners.length, cz = plot.corners.reduce((a, c) => a + c[1], 0) / plot.corners.length;
    const street = its.find(i => i.kind === 'door' && own(i).includes('street')), roof = its.find(i => i.kind === 'door' && own(i).includes('roof'));
    const hole = its.find(i => i.kind === 'grate' && i.data?.manhole);
    const marks = (what: string) => w.features.filter(f => f.kind === `secure:${what}` && inside(plot.corners, f.x, f.z));
    const ways: Secure['ways'] = [];
    // The street door: shut and locked behind its card's reader, a camera over it looking down the street.
    if (street) {
      if (S.card) street.data = { ...street.data, lock: 'locked', key: S.card };
      // (Along the wall from it, aimed back at the doorstep: one right over the door can't see who stands at it.)
      // (Out of the wall the door's in, by its leaf: the way away from the building's middle.)
      const leaf = w.props.find(p => p.text === street.id), ly = leaf?.yaw ?? Math.atan2(street.x - cx, street.z - cz);
      let ux = -Math.sin(ly), uz = -Math.cos(ly);
      if (!leaf) { ux = Math.sin(ly); uz = Math.cos(ly); } else if (ux * (street.x - cx) + uz * (street.z - cz) < 0) { ux = -ux; uz = -uz; }
      const y = street.y - 1.1 + DOOR_CAM.up, tx = street.x + ux * 2, tz = street.z + uz * 2;
      for (const side of [DOOR_CAM.side, -DOOR_CAM.side, DOOR_CAM.side / 2, -DOOR_CAM.side / 2]) {
        const x = street.x + ux * DOOR_CAM.out - uz * side, z = street.z + uz * DOOR_CAM.out + ux * side, d = Math.hypot(tx - x, street.y - y, tz - z);
        if (raycast(w.index, x, y, z, (tx - x) / d, (street.y - y) / d, (tz - z) / d, d)) continue;
        cameras.push({ kind: 'camera', x, y, z, yaw: Math.atan2(tx - x, tz - z) });
        break;
      }
      ways.push({ kind: S.card ? 'card' : 'door', id: street.id });
    }
    // The ways its layout makes through its outer walls (a vent, a shutter, bars, a gate, a loading dock), each by
    // what it is.
    for (const it of its) { const m = /\.way([a-z]+)\d+$/.exec(it.id); if (it.kind === 'door' && m) ways.push({ kind: m[1], id: it.id }); }
    if (roof) ways.push({ kind: 'roof', id: roof.id });
    if (hole) ways.push({ kind: 'basement', id: hole.id });
    // Its loot by its own table: every container in it.
    for (const i of its) if (i.kind === 'container') i.data = { ...i.data, loot: S.loot, site: S.id };
    // Its hazard, where its layout marks it.
    for (const f of marks('pir')) { const c = onWall(w, 'pir', f); if (c) cameras.push(c); }
    for (const f of marks('turret')) { const c = onWall(w, 'turret', f); if (c) cameras.push(c); }
    for (const f of marks('acoustic')) { const c = onWall(w, 'acoustic', f); if (c) cameras.push(c); }
    // The pharmacy's pressure plate: across its floor along the mark, 3 m long.
    for (const f of marks('plate')) {
      const y = f.y + 0.02, nx = f.nx!, nz = f.nz!;
      cameras.push({ kind: 'tripwire', x: f.x - nx * 1.5, y, z: f.z - nz * 1.5, yaw: Math.atan2(nx, nz), to: { x: f.x + nx * 1.5, y, z: f.z + nz * 1.5 }, w: PLATE });
    }
    // The server hall: its floor racked with servers, the exchange's terminal and the district's relay rack in it, a
    // motion sensor that brings the gas down.
    for (const f of marks('hall')) {
      const y = f.y, R = 3.5, box = { x0: f.x - R, y0: y, z0: f.z - R, x1: f.x + R, y1: y + 2.9, z1: f.z + R };
      const pir = onWall(w, 'pir', f);
      if (pir) { gas.push({ id: `${S.id}-hall`, box, sensor: w.cameras.length + cameras.length }); cameras.push(pir); }
      for (let k = -1; k <= 1; k += 2) w.decor.push({ x0: f.x + k * 1.6 - 0.3, y0: y, z0: f.z - 1.2, x1: f.x + k * 1.6 + 0.3, y1: y + 2, z1: f.z + 1.2, mat: MAT.metal, ramp: 0, low: 0, tint: 0x3a3e44 });
      w.inter.push({ id: `${S.id}-terminal`, kind: 'exchange', x: f.x - 1.2, y: y + 1.1, z: f.z, r: 0.8, zh: '交换机终端', en: 'Exchange terminal', data: { serves: ['jiaochangkou', 'shibati', 'jiefangbei'] } },
        { id: `${S.id}-relay`, kind: 'relay', x: f.x + 1.2, y: y + 1.1, z: f.z, r: 0.8, zh: '中继机柜', en: 'Relay rack' });
    }
    // The transformer hall's three live busbars across it at 2.6 m (along x, 6 m long, round the mark), on insulators.
    for (const f of marks('busbar')) {
      const y = f.y + 2.6;
      for (const dz of [-0.9, 0, 0.9]) {
        hv.push({ a: { x: f.x - 3, y, z: f.z + dz }, b: { x: f.x + 3, y, z: f.z + dz } });
        w.decor.push({ x0: f.x - 3, y0: y - 0.04, z0: f.z + dz - 0.04, x1: f.x + 3, y1: y + 0.04, z1: f.z + dz + 0.04, mat: MAT.tealMetal, ramp: 0, low: 0, tint: 0xd8a040 });
        for (const x of [-2.5, 0, 2.5]) w.decor.push({ x0: f.x + x - 0.06, y0: y + 0.04, z0: f.z + dz - 0.06, x1: f.x + x + 0.06, y1: y + 0.5, z1: f.z + dz + 0.06, mat: MAT.tile, ramp: 0, low: 0, tint: 0xb0602a });
      }
    }
    if (S.hazard === 'gas') {
      // The camera mesh: at each corner of the building, a camera looking along each of its walls.
      const c4 = plot.corners;
      c4.forEach((p, k) => {
        const ox = p[0] - cx, oz = p[1] - cz, od = Math.hypot(ox, oz) || 1, x = p[0] + (ox / od) * 0.6, z = p[1] + (oz / od) * 0.6, y = plot.base + 4.5;
        if (!free(w.index, x, y - 0.3, z, 0.6)) return;
        for (const q of [c4[(k + 1) % c4.length], c4[(k + c4.length - 1) % c4.length]]) cameras.push({ kind: 'camera', x, y, z, yaw: Math.atan2(q[0] - p[0], q[1] - p[1]) });
      });
    }
    const heart = marks('heart')[0] ?? { x: cx, y: plot.base, z: cz };
    sites.push({ id: S.id, prefix: S.plan, x: cx, z: cz, ways, heart: { x: heart.x, y: heart.y, z: heart.z } });
  }
  return { sites, cameras, props, gas, hv };
}

/** A teleport to each of a site's ways in (M6-25): stood outside it on what's there, facing it; the roof door's on
 *  the roof by it, the basement's at the foot of its shaft in the sewer below. */
export function approaches(w: World, sites: Secure[]): Teleport[] {
  const out: Teleport[] = [];
  for (const S of sites) {
    const meta = SECURE.find(q => q.id === S.id)!;
    for (const way of S.ways) {
      const it = w.inter.find(i => i.id === way.id)!;
      let at: { x: number; y: number; z: number } | null = null;
      if (way.kind === 'basement') {
        const lad = w.climbables.find(c => c.kind === 'ladder' && Math.hypot(c.x - it.x, c.z - it.z) < 1.5 && c.y1 > it.y - 3 && c.y0 < it.y);
        if (lad) for (const d of [1, 1.6]) for (const [dx, dz] of [[lad.nx, lad.nz], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const x = lad.x + dx * d, z = lad.z + dz * d, y = lad.y0 + 0.05;
          if (!at && free(w.index, x, y, z, 1.8)) at = { x, y, z };
        }
      } else {
        // Outside it: away from the building's middle (or round it, on a roof), on the floor there, room to stand.
        const ox = it.x - S.x, oz = it.z - S.z, od = Math.hypot(ox, oz) || 1;
        for (const d of [1.5, 2.2, 3]) for (const turn of [0, 0.5, -0.5, 1, -1, Math.PI / 2, -Math.PI / 2, Math.PI]) {
          if (at) break;
          const a = Math.atan2(ox / od, oz / od) + turn, x = it.x + Math.sin(a) * d, z = it.z + Math.cos(a) * d;
          const down = raycast(w.index, x, it.y + 0.8, z, 0, -1, 0, 4);
          if (!down) continue;
          const y = it.y + 0.8 - down.t + 0.05;
          if (Math.abs(y - (it.y - 1.1)) < 1.6 && free(w.index, x, y, z, 1.8)) at = { x, y, z };
        }
      }
      if (at) out.push({ name: `${meta.en}: ${way.kind}`, ...at, yaw: Math.atan2(-(it.x - at.x), -(it.z - at.z)) });
    }
  }
  return out;
}

/** Whether (x, z) is inside a plot's outline. */
function inside(c: [number, number][], x: number, z: number) {
  let n = false;
  for (let i = 0, j = c.length - 1; i < c.length; j = i++) if ((c[i][1] > z) !== (c[j][1] > z) && x < ((c[j][0] - c[i][0]) * (z - c[i][1])) / (c[j][1] - c[i][1]) + c[i][0]) n = !n;
  return n;
}
