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

/** The sites: which building (its plan's seed), what it was, its card, its loot table, and its hazard. */
export const SECURE: { id: string; plan: string; type: BuildingType; zh: string; en: string; card?: string; loot: string; hazard: 'plate+pir' | 'turret' | 'acoustic' }[] = [
  { id: 'hospital', plan: 'osm68', type: 'clinic', zh: '渝中医院', en: 'Yuzhong Hospital', card: 'hospcard', loot: 'hospital', hazard: 'plate+pir' },
  { id: 'police', plan: 'osm449', type: 'military', zh: '派出所', en: 'Police station', card: 'policecard', loot: 'police', hazard: 'turret' },
  { id: 'market', plan: 'osm396', type: 'mall', zh: '数码城', en: 'Electronics market', loot: 'electronics', hazard: 'acoustic' },
];

/** How far over a street door its camera hangs and out from the wall (m); the pharmacy's plate's half-width (m). */
const DOOR_CAM = { up: 3.2, out: 0.6 }, PLATE = 1.6;

export function fitSecure(w: World): { sites: Secure[]; cameras: Camera[]; props: Prop[] } {
  const sites: Secure[] = [], cameras: Camera[] = [], props: Prop[] = [];
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
      const dx = street.x - cx, dz = street.z - cz, d = Math.hypot(dx, dz) || 1;
      cameras.push({ kind: 'camera', x: street.x + (dx / d) * DOOR_CAM.out, y: street.y - 1.1 + DOOR_CAM.up, z: street.z + (dz / d) * DOOR_CAM.out, yaw: Math.atan2(dx, dz) });
      ways.push({ kind: S.card ? 'card' : 'door', id: street.id });
    }
    // The lowest vent to crawl through: at the police station the garage's shutter, prised up; at the others a duct.
    if (vents[0]) {
      const v = vents[0];
      // (A shutter's drawn by itself, render/shutters.ts: the vent's leaf and its lock go.)
      if (S.id === 'police') { v.data = { ...v.data, shutter: true, lock: 'locked' }; v.zh = '车库卷帘门'; v.en = 'Garage shutter'; w.props = w.props.filter(p => p.text !== v.id); }
      else { v.zh = S.id === 'hospital' ? '洗衣房通风口' : '通风管'; v.en = S.id === 'hospital' ? 'Laundry vent' : 'Vent duct'; }
      ways.push({ kind: S.id === 'police' ? 'shutter' : 'vent', id: v.id });
    }
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
    } else {
      // Acoustic arrays on the shop floors, one a floor.
      for (const sh of rooms('shop').filter((q, n, all) => all.findIndex(o => Math.abs(o.y - q.y) < 1) === n).slice(0, 5)) { const c = onWall(w, 'acoustic', sh); if (c) cameras.push(c); }
    }
    sites.push({ id: S.id, prefix: S.plan, x: cx, z: cz, ways });
  }
  return { sites, cameras, props };
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
