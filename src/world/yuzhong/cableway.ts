// The Yangtze River Cableway's north station on Xinhua Road (M6-16, M10-38d, U-104), made by hand in its building's
// frame (city/handmade.ts: u along the long side, v across; the street door at u = U). The city's towers stand in the
// ropes' way down to the river (no line over them starts lower than about 230 m), so its cabin hall stands on a steel
// stair tower 88 m over the roof. Below, the station: the ticket hall off the street (the turnstiles, the stair down
// to the cellar), the staff corridor, come down in the middle, round it through the switch room where the 10 kV
// feeder comes in dead (the tool cabinet: a crowbar), to the stairwell and up to the roof. On the roof the tower's
// stair shaft, its gate locked, 29 flights up into the upper station: the stair room; its door onto the platform
// buried where the roof sheeting came down, so round by the machine deck past the bullwheel (creeping in the wind,
// the brake off: sim/cableway.ts); off it the operator's booth (locked; its desk drawer the operator key and the
// operator's note) and the store (the rope gear); cabin 2 parked at the platform (the heart), its door open. The ropes run out of the hall's open end to the south station across the river (cableRopes()). Its ways in:
// the street door, the staff door on the side street, the roof, the sewer up into its cellar.
import { handmade } from '../city/handmade';
import { FLOOR, SLAB } from '../city/rooms';
import { MAT } from '../mats';
import { solid, type Solid } from '../geom';
import { heightAt } from '../heightfield';
import { WATER_Y } from './ground';
import type { Lot } from '../city/buildings';
import type { World, Line, Feature } from '../world';

/** The upper station's floor (its floor number over the street, 3 m each); its tower's flights' lanes (u0, u1, v0, v1);
 *  the ropes' height over the hall floor where they leave it, the track ropes either side of the haul rope (m), their
 *  sag mid-span; the south station's tower over its ground. */
export const CABLE = { top: 34, laneA: [10, 16, 3.75, 5.2], laneB: [9, 15, 5.3, 6.75], rope: 5.6, track: 0.45, sag: 8, south: 50 };

export const cableway: Lot['inside'] = (fr, from, out, look, rolled) => {
  const n0 = out.features.length, K = handmade(fr, from, out, look), { U, V } = K, { B, at, base } = fr, y = (k: number) => base + k * FLOOR, T = CABLE.top, H = y(T), roof = y(fr.n);
  const box = (u0: number, u1: number, v0: number, v1: number, y0: number, y1: number, mat: number) => B(u0, y0, v0, u1, y1, v1, mat);
  const late: Solid[] = [];
  const feat = (kind: string, u: number, v: number, yy: number, face: [number, number] = [1, 0]) => {
    const [x, z] = at(u, v), [ax, az] = at(0, 0), [bx, bz] = at(face[0], face[1]);
    out.features.push({ kind, x, y: yy, z, group: out.features.length, nx: bx - ax, nz: bz - az });
  };
  // Ground floor.
  K.room(0, 0, 2.6, 6.1, 5.5, 'lobby'); // stair hall
  K.room(0, 0, 5.8, 6.1, V, 'workshop'); // switch room, the cellar hatch in its floor
  K.room(0, 6.4, 0, 9.0, V, 'corridor'); // staff corridor
  K.heap(0, 6.4, 6.2, 9.0, 7.8);
  K.room(0, 9.3, 0, U, V, 'lobby'); // ticket hall
  K.door(0, 6.25, 4.0, 'u', 'open');
  K.door(0, 6.25, 10.5, 'u', 'shut');
  K.door(0, 9.15, 10.5, 'u', 'shut', { label: ['员工通道', 'Staff only'] });
  K.door(0, 3.0, 5.65, 'v', 'jammed');
  K.door(0, 7.7, -0.12, 'v', 'locked', { label: ['员工门', 'Staff door'], way: 'staff' });
  // The turnstiles across the ticket hall, the wide gate smashed open; the ticket office; the queue's leavings.
  K.block(0, 'counter', 11.3, 0.3, 11.8, 9.9, 1.0, [1, 0]);
  K.block(0, 'counter', 11.3, 11.5, 11.8, V - 0.3, 1.0, [1, 0]);
  K.block(0, 'counter', 14.5, 0.3, 17.0, 2.2, 1.1, [0, 1]);
  K.cellarStair(9.5, 3.4, 10.9, 8.2, '+v'); // the stair down to the cellar, beside the turnstiles
  K.prop(0, 'papers', 15.5, 1.4, [0, 1], 0.5, 0.02, 0.4, false, 1.1);
  for (const [u, v] of [[13.5, 6.0], [15.8, 11.2], [12.6, 3.4]]) K.prop(0, 'bag', u, v, [1, 0], 0.4, 0.4, 0.3);
  K.scrawl(0, 11.55, 9.0, [1, 0], '长江索道 · 停运  YANGTZE RIVER CABLEWAY · SUSPENDED', 2.4);
  K.scrawl(0, U - 0.02, 4.0, [-1, 0], '1号车厢 41人 16:30全部下车  CABIN 1 · 41 ABOARD · ALL OFF BY 16:30');
  // The switch room: the feeder's incoming panel, dead; the tool cabinet.
  K.block(0, 'cabinet', 0, 11.2, 0.7, V - 0.2, 2.2, [1, 0]);
  K.scrawl(0, 0.72, 12.3, [1, 0], '10kV进线 新华路变电站 · 无电  10 kV FEEDER FROM XINHUA RD SUBSTATION · DEAD');
  K.put(0, 'cabinet', 5.85, 7.6, [-1, 0], { zh: '工具柜', en: 'Tool cabinet', items: [['crowbar', 1]] });
  K.scrawl(0, 8.98, 3.0, [-1, 0], '上站 · 塔架楼梯 · 风大勿停留  TO THE UPPER STATION · TOWER STAIR · DON\'T LINGER IN THE WIND');
  K.entry([[U - 0.8, 8.05], [12.6, 10.7], [10.2, 10.5], [7.7, 10.5], [5.6, 10.5], [3.0, 9.0], [3.0, 4.5]]);

  // The tower: its stair shaft clad from the roof to under the hall's floor, its gate at the foot; its four legs.
  const [a0, a1, av0, av1] = CABLE.laneA, [b0, b1, bv0, bv1] = CABLE.laneB, top = H - 0.35;
  out.solids.push(box(8.65, 8.75, 3.6, 6.9, roof, top, MAT.tealMetal), box(16.6, 16.7, 3.6, 6.9, roof, top, MAT.tealMetal),
    box(8.65, 16.7, 3.6, 3.7, roof, top, MAT.tealMetal), box(8.65, 16.7, 6.8, 6.9, roof, top, MAT.tealMetal));
  K.door(fr.n, 8.7, 4.5, 'u', 'locked', { label: ['塔架门', 'Tower gate'] });
  // Up it: flights of 3 m, lane A rising along u, lane B back; a landing across both lanes at each end.
  for (let k = fr.n; k < T; k++) {
    if ((k - fr.n) % 2 === 0) K.flight(k, a0, av0, a1, av1, '+u');
    else K.flight(k, b0, bv0, b1, bv1, '-u');
  }
  // The upper station: its hall's shell on the tower, rooms carved out of it two floors high.
  out.solids.push(box(2, 20, 1, 12.5, H - 0.35, H + 6.3, MAT.concrete));
  K.room(T, 2.3, 1.3, 8.7, 12.2, null, { floors: 2 }); // machine deck
  K.room(T, 9.0, 3.6, 16.3, 6.9, null, { floors: 2 }); // stair room
  K.room(T, 9.0, 1.3, 16.3, 3.3); // rope store
  K.room(T, 16.6, 1.3, 19.7, 6.9); // operator's booth
  K.room(T, 9.0, 7.2, 19.7, 12.2, null, { floors: 2 }); // platform
  K.room(T, 19.6, 7.6, 20.5, 11.9, null, { floors: 2 }); // the open end the ropes leave by
  K.door(T, 12.0, 7.05, 'v', 'collapsed');
  K.door(T, 8.85, 5.0, 'u', 'shut');
  K.door(T, 8.85, 10.8, 'u', 'open');
  K.door(T, 12.5, 3.45, 'v', 'shut');
  K.door(T, 16.45, 5.6, 'u', 'locked', { label: ['操作室', "Operator's booth"] });
  // The booth: the control desk (its drawer the operator key and the note), the dead screens; the store's rope gear.
  K.put(T, 'drawer', 19.4, 3.0, [-1, 0], { zh: '操作台抽屉', en: 'Control desk drawer', items: [['opkey', 1]], doc: true });
  K.put(T, 'desk', 19.3, 4.8, [-1, 0]);
  K.prop(T, 'chair', 18.3, 4.6, [1, 0], 0.45, 0.9, 0.45, true);
  K.block(T, 'cabinet', 16.8, 1.5, 17.6, 3.0, 1.6, [1, 0]);
  K.prop(T, 'papers', 19.2, 5.2, [-1, 0], 0.5, 0.02, 0.4, false, 0.76);
  // (Up here only what's set out by hand.)
  for (const u of [10.2, 11.4]) K.put(T, 'shelf', u, 1.5, [0, 1]);
  K.put(T, 'locker', 15.0, 1.55, [0, 1], { zh: '绳索工具柜', en: 'Rope gear locker', items: [['carabiners', 2], ['harness', 1]] });
  K.scrawl(T, 16.62, 2.5, [-1, 0], '钥匙在操作台  KEY AT THE DESK · DON\'T TAKE IT HOME');
  // The bullwheel on the machine deck: its hub, its rim (solid where it stands), the haul rope off it up over the
  // platform; its brake lever by the wall.
  const wy = H + 1.1;
  late.push(box(5.2, 5.8, 6.45, 7.05, H, wy + 0.5, MAT.metal), box(3.5, 7.5, 4.75, 8.75, wy - 0.15, wy + 0.15, MAT.hidden));
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8, u = 5.5 + Math.cos(a) * 1.9, v = 6.75 + Math.sin(a) * 1.9;
    out.decor.push(box(u - 0.25, u + 0.25, v - 0.25, v + 0.25, wy - 0.12, wy + 0.12, MAT.metal));
    if (i % 4 === 0) out.decor.push(box(Math.min(5.5, u), Math.max(5.5, u), Math.min(6.75, v), Math.max(6.75, v), wy - 0.05, wy + 0.05, MAT.metal));
  }
  out.decor.push(box(5.5, 8.6, 8.62, 8.68, wy - 0.03, wy + 0.03, MAT.metal), box(8.55, 8.65, 8.62, 8.68, wy, H + CABLE.rope - 0.2, MAT.metal), box(8.6, 20, 9.72, 9.78, H + CABLE.rope - 0.23, H + CABLE.rope - 0.17, MAT.metal));
  feat('cable:bullwheel', 5.5, 6.75, H);
  K.block(T, 'cabinet', 6.0, 11.6, 7.0, 12.2, 1.1, [0, -1]);
  const [lx, lz] = at(6.5, 11.3);
  out.inter.push({ id: 'cablebrake', kind: 'cablebrake', x: lx, y: H + 1.2, z: lz, r: 0.7, zh: '主轮制动手柄', en: 'Bullwheel brake' });
  K.scrawl(T, 8.68, 6.0, [-1, 0], '制动未合 · 风吹轮转 · 别靠近轮缘  BRAKE OFF · THE WIND TURNS IT · KEEP OFF THE RIM');
  K.scrawl(T, 2.32, 4.0, [1, 0], '驱动无电 · 应急驱动用完  MAIN DRIVE DEAD · EMERGENCY DRIVE SPENT');
  // The track ropes along the hall to the open end, anchored at the back wall.
  for (const dv of [-CABLE.track, CABLE.track]) out.decor.push(box(2.3, 20.4, 9.75 + dv - 0.035, 9.75 + dv + 0.035, H + CABLE.rope - 0.035, H + CABLE.rope + 0.035, MAT.metal));
  // Cabin 2, parked: its floor on the platform's, its door open toward the platform's edge, glass round it, hung from
  // its carriage on the track ropes.
  const c = { u0: 12.6, u1: 18.8, v0: 8.4, v1: 11.6 }, glass = (q: Solid) => late.push({ ...q, tint: 0x9ab8c8 });
  late.push(box(c.u0, c.u1, c.v0, c.v1, H, H + 0.1, MAT.metal), box(c.u0 - 0.1, c.u1 + 0.1, c.v0 - 0.1, c.v1 + 0.1, H + 2.3, H + 2.45, MAT.metal));
  const walls: [number, number, number, number][] = [[c.u0, 15.0, c.v0, c.v0 + 0.08], [16.4, c.u1, c.v0, c.v0 + 0.08], [c.u0, c.u1, c.v1 - 0.08, c.v1], [c.u0, c.u0 + 0.08, c.v0, c.v1], [c.u1 - 0.08, c.u1, c.v0, c.v1]];
  for (const [u0, u1, v0, v1] of walls) { late.push(box(u0, u1, v0, v1, H + 0.1, H + 1.1, MAT.metal), box(u0, u1, v0, v1, H + 2.1, H + 2.3, MAT.metal)); glass(box(u0, u1, v0, v1, H + 1.1, H + 2.1, MAT.glass)); }
  out.decor.push(box(15.4, 16.0, 9.6, 9.9, H + 2.45, H + CABLE.rope - 0.3, MAT.metal), box(14.0, 17.4, 9.2, 10.3, H + CABLE.rope - 0.35, H + CABLE.rope - 0.05, MAT.tealMetal));
  feat('cable:cabin', 15.7, c.v0 + 0.25, H, [0, -1]);
  K.prop(T, 'bag', 18.2, 11.0, [0, -1], 0.4, 0.4, 0.3);
  K.prop(T, 'papers', 10.5, 9.0, [1, 0], 0.5, 0.02, 0.4);
  K.scrawl(T, 9.02, 9.5, [1, 0], '2号车厢 停放 · 1号车厢在上新街  CABIN 2 PARKED · CABIN 1 AT SHANGXIN STREET');
  K.scrawl(T, 14.0, 6.88, [0, -1], '顶棚塌了 走机房  ROOF CAME DOWN · GO ROUND BY THE MACHINE DECK');
  K.mark('heart', T, 15.7, 10.0);
  // Where the ropes leave, over the river (cableRopes()).
  feat('cable:saddle', 20.4, 9.75, H + CABLE.rope);
  K.build();
  // (What stands in its rooms, set after they're carved.)
  out.solids.push(...late);
  // The tower's landings at each end, both lanes; its legs and their bracing; seen from afar.
  for (let k = fr.n + 1; k <= T; k++) {
    const yy = y(k);
    if ((k - fr.n) % 2 === 1) out.solids.push(box(a1 - 1, a1, bv0 - 0.1, bv1, yy - SLAB, yy, MAT.metal));
    else out.solids.push(box(b0, b0 + 1, av0, av1 + 0.1, yy - SLAB, yy, MAT.metal));
  }
  for (const [u, v] of [[7.5, 3.2], [16.8, 3.2], [7.5, 12.8], [16.8, 12.8]]) out.solids.push(box(u - 0.3, u + 0.3, v - 0.3, v + 0.3, roof, H - 0.35, MAT.tealMetal));
  for (let yy = roof + 12; yy < H - 4; yy += 12) {
    out.decor.push(box(7.5, 16.8, 3.1, 3.3, yy, yy + 0.2, MAT.tealMetal), box(7.5, 16.8, 12.7, 12.9, yy, yy + 0.2, MAT.tealMetal),
      box(7.4, 7.6, 3.2, 12.8, yy, yy + 0.2, MAT.tealMetal), box(16.7, 16.9, 3.2, 12.8, yy, yy + 0.2, MAT.tealMetal));
  }
  // (Its rooms as the city's ways through it and its waiting machines know them: those it was rolled with, M6-16, so
  // the city round it stands as it did.)
  const mine = out.features.splice(n0);
  out.features.push(...rolled.features.filter(f => f.kind.startsWith('inside:')), ...mine.filter(f => !f.kind.startsWith('inside:')));
  out.far.push(box(7.2, 17.1, 2.9, 13.1, roof, H, MAT.tealMetal), box(2, 20, 1, 12.5, H - 0.35, H + 6.3, MAT.concrete));
};

/** The ropes over the river from the upper station's open end to the south station on the far bank (along its
 *  line, on the bank 15 m past the water's edge), a little sag mid-span: two track ropes and the haul rope between,
 *  drawn (`w.ropes`); the south station (cabin 1 in it) drawn too, nothing there to stand on. Marks the haul rope's
 *  two ends ('cable:rope'). */
export function cableRopes(w: World): { ropes: Line[]; features: Feature[] } {
  const s = w.features.find(f => f.kind === 'cable:saddle');
  if (!s || !w.ground) return { ropes: [], features: [] };
  const dx = s.nx!, dz = s.nz!, g = (t: number) => heightAt(w.ground!, s.x + dx * t, s.z + dz * t) ?? -Infinity;
  let wet = 0, far = 0;
  for (let t = 50; t < 2500 && !far; t += 5) { if (!wet && g(t) < WATER_Y) wet = t; if (wet && t > wet + 60 && g(t) > WATER_Y + 4) far = t + 15; }
  if (!far) return { ropes: [], features: [] };
  // (Its tower stands clear over the far bank's rise under the rope's last stretch.)
  let rise = g(far);
  for (let t = wet; t < far; t += 5) rise = Math.max(rise, g(t));
  const fx = s.x + dx * far, fz = s.z + dz * far, gy = g(far), top = Math.max(gy + CABLE.south, rise + 25), ropes: Line[] = [], n = 16;
  for (const side of [-CABLE.track, 0, CABLE.track]) {
    const ox = -dz * side, oz = dx * side, dy = side ? 0 : -0.2;
    const at = (f: number) => ({ x: s.x + ox + (fx - s.x) * f, y: s.y + dy + (top - s.y) * f - CABLE.sag * 4 * f * (1 - f), z: s.z + oz + (fz - s.z) * f });
    for (let i = 0; i < n; i++) ropes.push({ a: at(i / n), b: at((i + 1) / n) });
  }
  // The south station: its tower, its hall on it, cabin 1 at its platform.
  const sb = (a: number, b: number, c: number, d: number, y0: number, y1: number, mat: number) => {
    const x = fx + dx * a - dz * c, z = fz + dz * a + dx * c, x1 = fx + dx * b - dz * d, z1 = fz + dz * b + dx * d;
    return solid(x, y0, z, x1, y1, z1, mat);
  };
  w.decor.push(sb(-2, 6, -4, 4, gy, top - 6, MAT.tealMetal), sb(-4, 10, -6, 6, top - 6.3, top + 1, MAT.concrete), sb(-3, 3, -1.6, 1.6, top - 5.6, top - 3.2, MAT.metal));
  return { ropes, features: [{ kind: 'cable:rope', x: s.x, y: s.y - 0.2, z: s.z, group: 0, nx: dx, nz: dz }, { kind: 'cable:rope', x: fx, y: top - 0.2, z: fz, group: 1, nx: -dx, nz: -dz }] };
}
