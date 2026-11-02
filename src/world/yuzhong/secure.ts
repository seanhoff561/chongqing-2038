// The high-security sites in the city's buildings (M6-11 to M6-13, DESIGN section 10; Q-010: in buildings already
// standing). Each is a building chosen once and for all, its type fixed so its insides are the same every run, then
// fitted out: its four ways in (the street door behind a keycard reader under a camera, a vent or a shutter to crawl
// through, the roof door from a roof reached by grapple, the basement's manhole), its loot by its own table, its
// own hazard.
import type { World, Camera, Inter, Secure, Prop, Teleport } from '../world';
import { free } from '../../sim/physics';
import type { BuildingType } from '../city/types';
import { onWall } from './sensors';
import { raycast } from '../geom';
import { MAT } from '../mats';

/** The sites: which building (its plan's seed), what it was, its card, its loot table, and its hazard. */
export const SECURE: { id: string; plan: string; type: BuildingType; zh: string; en: string; card?: string; loot: string; hazard: 'plate+pir' | 'turret' | 'acoustic' | 'gas' | 'hv' }[] = [
  { id: 'hospital', plan: 'osm68', type: 'clinic', zh: '渝中医院', en: 'Yuzhong Hospital', card: 'hospcard', loot: 'hospital', hazard: 'plate+pir' },
  { id: 'police', plan: 'osm449', type: 'military', zh: '派出所', en: 'Police station', card: 'policecard', loot: 'police', hazard: 'turret' },
  { id: 'market', plan: 'osm396', type: 'mall', zh: '数码城', en: 'Electronics market', loot: 'electronics', hazard: 'acoustic' },
  { id: 'telecom', plan: 'osm9', type: 'office', zh: '电信枢纽', en: 'Telecom exchange', card: 'telcard', loot: 'telecom', hazard: 'gas' },
  { id: 'substation', plan: 'osm855', type: 'workshop', zh: '新华路变电站', en: 'Xinhua Road substation', card: 'badge', loot: 'substation', hazard: 'hv' },
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
    const vents = its.filter(i => i.kind === 'door' && /\.v\d/.test(i.id)).sort((a, b) => a.y - b.y), hole = its.find(i => i.kind === 'grate' && i.data?.manhole);
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
    // The lowest vent to crawl through: at the police station the garage's shutter, prised up; at the others a duct.
    if (vents[0]) {
      const v = vents[0];
      // (A shutter's drawn by itself, render/shutters.ts: the vent's leaf and its lock go.)
      if (S.id === 'police') { v.data = { ...v.data, shutter: true, lock: 'locked' }; v.zh = '车库卷帘门'; v.en = 'Garage shutter'; w.props = w.props.filter(p => p.text !== v.id); }
      else { v.zh = S.id === 'hospital' ? '洗衣房通风口' : S.id === 'telecom' ? '发电机房通风口' : '通风管'; v.en = S.id === 'hospital' ? 'Laundry vent' : S.id === 'telecom' ? 'Generator-room vent' : 'Vent duct'; }
      ways.push({ kind: S.id === 'police' ? 'shutter' : 'vent', id: v.id });
    }
    // The substation's dark back gate, chained: bolt cutters.
    if (S.id === 'substation' && vents[0]) { vents[0].data = { ...vents[0].data, lock: 'chained' }; vents[0].zh = '后围栏门'; vents[0].en = 'Back fence gate'; ways[ways.length - 1].kind = 'fence'; }
    // The police station's cell-block bars at the back, chained: bolt cutters.
    if (S.id === 'police' && vents[1]) { vents[1].data = { ...vents[1].data, lock: 'chained' }; vents[1].zh = '牢房铁栏'; vents[1].en = 'Cell-block bars'; ways.push({ kind: 'bars', id: vents[1].id }); }
    if (roof) ways.push({ kind: 'roof', id: roof.id });
    if (hole) ways.push({ kind: 'basement', id: hole.id });
    // Its loot by its own table: every container in it.
    for (const i of its) if (i.kind === 'container') i.data = { ...i.data, loot: S.loot, site: S.id };
    // Its hazard.
    const rooms = (k: string) => its.filter(i => i.kind === 'container' && i.data?.room === k);
    if (S.hazard === 'plate+pir') {
      // The pharmacy (its store room nearest the ground): a pressure plate across its floor, door to back wall.
      const ph = rooms('store').sort((a, b) => a.y - b.y)[0];
      if (ph) {
        const down = raycast(w.index, ph.x, ph.y + 0.5, ph.z, 0, -1, 0, 3), y = (down ? ph.y + 0.5 - down.t : ph.y - 0.9) + 0.02;
        cameras.push({ kind: 'tripwire', x: ph.x - 1.5, y, z: ph.z, yaw: Math.PI / 2, to: { x: ph.x + 1.5, y, z: ph.z }, w: PLATE });
        ph.zh = '药房'; ph.en = 'Pharmacy';
      }
      // The wards, dark, each with a motion sensor.
      for (const wd of rooms('ward').filter((q, n, all) => all.findIndex(o => Math.abs(o.y - q.y) < 1) === n).slice(0, 4)) { const c = onWall(w, 'pir', wd); if (c) cameras.push(c); }
    } else if (S.hazard === 'turret') {
      // The armoury's turret, hung under the ceiling at its far wall, looking back across it.
      for (const ar of rooms('armory').filter((q, n, all) => all.findIndex(o => Math.abs(o.y - q.y) < 1) === n).slice(0, 2)) { const c = onWall(w, 'turret', ar); if (c) cameras.push(c); }
    } else if (S.hazard === 'gas') {
      // The server hall: the first office up from the street, its floor racked with servers; the exchange's terminal
      // and the district's relay rack in it; a motion sensor that brings the gas down.
      const hall = rooms('office').filter(q => q.y > (street?.y ?? plot.base) + 1.5).sort((a, b) => a.y - b.y)[0];
      if (hall) {
        const down = raycast(w.index, hall.x, hall.y + 0.5, hall.z, 0, -1, 0, 3), y = down ? hall.y + 0.5 - down.t : hall.y - 0.9, R = 3.5;
        const box = { x0: hall.x - R, y0: y, z0: hall.z - R, x1: hall.x + R, y1: y + 2.9, z1: hall.z + R };
        const pir = onWall(w, 'pir', hall);
        if (pir) { gas.push({ id: `${S.id}-hall`, box, sensor: w.cameras.length + cameras.length }); cameras.push(pir); }
        for (let k = -1; k <= 1; k += 2) w.decor.push({ x0: hall.x + k * 1.6 - 0.3, y0: y, z0: hall.z - 1.2, x1: hall.x + k * 1.6 + 0.3, y1: y + 2, z1: hall.z + 1.2, mat: MAT.metal, ramp: 0, low: 0, tint: 0x3a3e44 });
        w.inter.push({ id: `${S.id}-terminal`, kind: 'exchange', x: hall.x - 1.2, y: y + 1.1, z: hall.z, r: 0.8, zh: '交换机终端', en: 'Exchange terminal', data: { serves: ['jiaochangkou', 'shibati', 'jiefangbei'] } },
          { id: `${S.id}-relay`, kind: 'relay', x: hall.x + 1.2, y: y + 1.1, z: hall.z, r: 0.8, zh: '中继机柜', en: 'Relay rack' });
        hall.zh = '机房'; hall.en = 'Server hall';
      }
      // The camera mesh: at each corner of the building, a camera looking along each of its walls.
      const c4 = plot.corners;
      c4.forEach((p, k) => {
        const ox = p[0] - cx, oz = p[1] - cz, od = Math.hypot(ox, oz) || 1, x = p[0] + (ox / od) * 0.6, z = p[1] + (oz / od) * 0.6, y = plot.base + 4.5;
        if (!free(w.index, x, y - 0.3, z, 0.6)) return;
        for (const q of [c4[(k + 1) % c4.length], c4[(k + c4.length - 1) % c4.length]]) cameras.push({ kind: 'camera', x, y, z, yaw: Math.atan2(q[0] - p[0], q[1] - p[1]) });
      });
    } else if (S.hazard === 'hv') {
      // The transformer hall (its lowest workshop floor): three live busbars across it at 2.6 m, on insulators, the
      // feeder panels and relay cabinet along a wall; the spare HV fuse in the cabinet on the floor above.
      const floors = [...new Set(its.filter(i => i.kind === 'container').map(i => Math.round(i.y)))].sort((a, b) => a - b);
      const hall = its.filter(i => i.kind === 'container' && Math.round(i.y) === floors[0])[0];
      if (hall) {
        const down = raycast(w.index, hall.x, hall.y + 0.5, hall.z, 0, -1, 0, 3), y = (down ? hall.y + 0.5 - down.t : hall.y - 0.9) + 2.6;
        for (const dz of [-0.9, 0, 0.9]) {
          hv.push({ a: { x: hall.x - 3, y, z: hall.z + dz }, b: { x: hall.x + 3, y, z: hall.z + dz } });
          w.decor.push({ x0: hall.x - 3, y0: y - 0.04, z0: hall.z + dz - 0.04, x1: hall.x + 3, y1: y + 0.04, z1: hall.z + dz + 0.04, mat: MAT.tealMetal, ramp: 0, low: 0, tint: 0xd8a040 });
          for (const x of [-2.5, 0, 2.5]) w.decor.push({ x0: hall.x + x - 0.06, y0: y + 0.04, z0: hall.z + dz - 0.06, x1: hall.x + x + 0.06, y1: y + 0.5, z1: hall.z + dz + 0.06, mat: MAT.tile, ramp: 0, low: 0, tint: 0xb0602a });
        }
        hall.zh = '馈线柜'; hall.en = 'Feeder panel';
      }
      const top = its.filter(i => i.kind === 'container' && Math.round(i.y) === floors[1]);
      if (top[0]) { top[0].data = { ...top[0].data, items: [['hvfuse', 1]] }; top[0].zh = '继电保护柜'; top[0].en = 'Relay cabinet'; }
    } else {
      // Acoustic arrays on the shop floors, one a floor.
      for (const sh of rooms('shop').filter((q, n, all) => all.findIndex(o => Math.abs(o.y - q.y) < 1) === n).slice(0, 5)) { const c = onWall(w, 'acoustic', sh); if (c) cameras.push(c); }
    }
    sites.push({ id: S.id, prefix: S.plan, x: cx, z: cz, ways });
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
