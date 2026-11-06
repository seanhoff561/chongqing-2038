// The river-police pier (M6-20, DESIGN section 10): the dock nearest Chaotianmen is theirs. A gangway down from the
// bank to its pontoon under two cameras; an iron ladder up its river side from the water, for a swimmer off the
// stilt docks; a cargo crane on the bank whose jib reaches out over the deck (containers stacked in steps under its
// end to drop onto); the patrol boat moored alongside; sonar buoys round it in the water (sim/river.ts: a swimmer near
// them is heard as one far out); their deckhouse on it, made by hand (pierhouse.ts).
import { solid, rampSolid, turn, type Solid } from '../geom';
import { MAT } from '../mats';
import { heightAt, type Heightfield } from '../heightfield';
import { WATER_Y } from './ground';
import { DOCK } from './riverfront';
import type { Camera, Climbable, Feature, Inter } from '../world';
import type { Obb } from './shapes';
import { pierHouse } from './pierhouse';
import { sin, cos, atan2 } from '../trig';

/** The gangway's width; the crane's jib height over the deck (a safe drop) and length past the deck's middle; the
 *  buoys' distance out; the boat's hull. */
export const PIER = { gang: 1.6, jibUp: 6, buoys: 22, hull: [9, 3] };

export function riverPolice(g: Heightfield, piers: Obb[], near: { x: number; z: number }) {
  const solids: Solid[] = [], decor: Solid[] = [], climbables: Climbable[] = [], inter: Inter[] = [], cameras: Camera[] = [], features: Feature[] = [];
  const top = WATER_Y + DOCK.up, h = (x: number, z: number) => heightAt(g, x, z) ?? -Infinity;
  // The pontoon nearest the place, afloat (as docks() builds them).
  const wet = (o: Obb) => { const c = cos(o.yaw), s = sin(o.yaw); return [[0, 0], [o.hw * 0.7, 0], [-o.hw * 0.7, 0], [0, o.hd * 0.7], [0, -o.hd * 0.7]].filter(([u, v]) => h(o.cx + c * u - s * v, o.cz + s * u + c * v) < WATER_Y).length >= 3; };
  // (Which side's the bank: the long side the ground's nearer above the water; one within 25 m.)
  const bankOf = (o: Obb, side: number) => { const c = cos(o.yaw), s = sin(o.yaw); for (let d = 0; d < 40; d += 1) { const v = side * (o.hd + d); if (h(o.cx - s * v, o.cz + c * v) > WATER_Y + 0.5) return d; } return Infinity; };
  const o = piers.filter(q => wet(q) && q.hw >= 3 && q.hd >= 1.5 && Math.min(bankOf(q, 1), bankOf(q, -1)) < 25).sort((a, b) => Math.hypot(a.cx - near.x, a.cz - near.z) - Math.hypot(b.cx - near.x, b.cz - near.z))[0];
  if (!o) return null;
  const c = cos(o.yaw), sn = sin(o.yaw), W = (u: number, v: number): [number, number] => [o.cx + c * u - sn * v, o.cz + sn * u + c * v];
  const side = bankOf(o, 1) <= bankOf(o, -1) ? 1 : -1, gap = bankOf(o, side);
  /** A box in the pier's own frame (u along it, v across, toward the bank +), turned into place. */
  const box = (u0: number, u1: number, v0: number, v1: number, y0: number, y1: number, mat: number): Solid => turn([solid(o.cx + Math.min(u0, u1), y0, o.cz + Math.min(v0, v1) * side, o.cx + Math.max(u0, u1), y1, o.cz + Math.max(v0, v1) * side, mat)], o.yaw, o.cx, o.cz)[0];

  // The gangway: from the deck's bank edge up (or down) to the ground, railed; on up a steep bank to its top, not
  // into its face (M7-14: it stopped 5.6 m under the road, a drop he couldn't come back up).
  if (gap < 30) {
    let end = gap + 1;
    while (end < gap + 10 && h(...W(0, side * (o.hd + end + 1))) > h(...W(0, side * (o.hd + end))) + 0.25) end++;
    const [ex, ez] = W(0, side * (o.hd + end)), land = Math.max(top, h(ex, ez)), v0 = o.hd - 0.2, v1 = o.hd + end;
    const r = rampSolid(o.cx - PIER.gang / 2, Math.min(top, land) - 0.3, o.cz + Math.min(v0, v1) * side, o.cx + PIER.gang / 2, o.cz + Math.max(v0, v1) * side, top, land, side > 0 ? 3 : 4, MAT.metal);
    solids.push(turn([r], o.yaw, o.cx, o.cz)[0]);
    for (const du of [-PIER.gang / 2, PIER.gang / 2]) decor.push(box(du - 0.03, du + 0.03, v0, v1, Math.max(top, land) + 0.9, Math.max(top, land) + 0.95, MAT.metal));
    const [gx, gz] = W(PIER.gang, side * (o.hd + end + 0.5)), [dx, dz] = W(0, side * (o.hd - 1));
    cameras.push({ kind: 'camera', x: gx, y: land + 4, z: gz, yaw: atan2(dx - gx, dz - gz) });
    const [kx, kz] = W(-o.hw + 1, side * (o.hd - 0.5));
    cameras.push({ kind: 'camera', x: kx, y: top + 3.5, z: kz, yaw: atan2(W(0, side * (o.hd + gap))[0] - kx, W(0, side * (o.hd + gap))[1] - kz) });
    features.push({ kind: 'pier:gangway', x: ex, y: land, z: ez, group: features.length });
  }
  // The ladder up its river side from the water.
  const [lx, lz] = W(o.hw * 0.6, -side * (o.hd + 0.05));
  climbables.push({ kind: 'ladder', x: lx, z: lz, y0: WATER_Y - 2, y1: top, nx: -side * -sn, nz: -side * c });
  features.push({ kind: 'pier:ladder', x: lx, y: WATER_Y, z: lz, group: features.length });
  // The cargo crane on the bank at the pier's end, its jib out over the deck; a container under the jib's end.
  if (gap < 30) {
    const mu = -o.hw + 1.5, [mx, mz] = W(mu, side * (o.hd + gap + 3)), base = Math.max(top, h(mx, mz)), jib = Math.max(base + 3, top + PIER.jibUp);
    solids.push(box(mu - 0.6, mu + 0.6, o.hd + gap + 2.4, o.hd + gap + 3.6, base - 1, jib, MAT.tealMetal), box(mu - 0.5, mu + 0.5, -o.hd * 0.3, o.hd + gap + 3.6, jib, jib + 0.4, MAT.tealMetal));
    // (Up the mast's side, clear of the jib reaching out over his head.)
    const [cx, cz] = W(mu + 0.65, side * (o.hd + gap + 3));
    climbables.push({ kind: 'ladder', x: cx, z: cz, y0: base, y1: jib + 0.4, nx: c, nz: sn });
    // Containers stacked under the jib's end, stepping down along the deck, so it's a few safe drops to the deck
    // however high the bank stands.
    const drop = jib + 0.4 - top, n = drop > 6.5 ? Math.ceil((drop - 6) / 2.6) : 0;
    for (let i = 0; i < n; i++) solids.push({ ...box(mu - 1.2 + i * 2.5, mu + 1.2 + i * 2.5, -o.hd * 0.3 - 0.4, o.hd * 0.6, top, top + (n - i) * 2.6, MAT.crate), tint: [0x2a5a8a, 0xa83a2a, 0x3a7a4a, 0xc8a040][i % 4] });
    const [jx, jz] = W(mu, side * -o.hd * 0.3);
    features.push({ kind: 'pier:crane', x: cx, y: base, z: cz, group: features.length }, { kind: 'pier:jib', x: jx, y: jib + 0.4, z: jz, group: features.length + 1 });
  }
  // The patrol boat alongside on the river side, its bow along the pier (drawn and moved from the run's state:
  // sim/boat.ts, render/boat3d.ts; its heading as his yaw, in its data).
  const bv = o.hd + PIER.hull[1] / 2 + 0.3;
  const [bx, bz] = W(-o.hw * 0.3, -side * bv);
  inter.push({ id: 'patrolboat', kind: 'boat', x: bx, y: WATER_Y + 1.8, z: bz, r: 1.5, zh: '水警巡逻艇', en: 'River-police patrol boat', data: { yaw: atan2(-c, -sn) } });
  // The sonar buoys round it.
  for (let k = 0; k < 4; k++) {
    const a = o.yaw + (k * Math.PI) / 2 + Math.PI / 4, x = o.cx + cos(a) * PIER.buoys, z = o.cz + sin(a) * PIER.buoys;
    if (h(x, z) > WATER_Y - 0.5) continue;
    decor.push(solid(x - 0.35, WATER_Y - 0.4, z - 0.35, x + 0.35, WATER_Y + 0.6, z + 0.35, MAT.metal), solid(x - 0.08, WATER_Y + 0.6, z - 0.08, x + 0.08, WATER_Y + 1.6, z + 0.08, MAT.lamp));
    features.push({ kind: 'pier:buoy', x, y: WATER_Y, z, group: features.length });
  }
  features.push({ kind: 'pier:deck', x: o.cx, y: top, z: o.cz, group: features.length });
  // Their deckhouse on it (M10-38d: pierhouse.ts).
  const house = pierHouse(o, side, top);
  solids.push(...house.solids); decor.push(...house.decor); inter.push(...house.inter);
  features.push(...house.features.map(f => ({ ...f, group: features.length + f.group })));
  return { solids, decor, climbables, inter, cameras, features, props: house.props, deck: { ...o, top, side } };
}
