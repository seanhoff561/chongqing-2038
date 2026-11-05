// The air-raid shelter (M10-38c, U-104): the first 150 m of the air-raid tunnel north off the Grand Tunnel's junction
// room, made by hand (the run's own frame from the junction: t north along it, s across, east positive). Its gallery
// runs straight on through (the underground's way north), the protective door and the gas-tight door standing open
// behind the entrance, the shelter's tool cabinet between them; off it the dormitory hall where the families slept,
// the old ventilation hall with its hand-cranked fan and the students' corner, the hotpot restaurant's store passage
// behind, and the Dongdong Shelter Hotpot (its heart) where they lived: its front door buried where the roof came
// down, its kitchen door off the gallery locked, round by the ventilation hall and the store passage to the kitchen's
// back door. Its ways in: from the junction room, the grate down at 120 m, the cellar steps at 140 m, and on from the
// tunnel north. What the generic tunnel would have laid there is rolled and thrown away (`clipped`).
import { solid, carve, type Box, type Solid } from '../geom';
import { MAT } from '../mats';
import type { Feature, Inter } from '../world';
import type { Dig, run } from './underkit';
import { door, heap, put, scrawl, mark, type Hand } from './handunder';

type Run = ReturnType<typeof run>;
type V3 = { x: number; y: number; z: number };
/** How far along the run it's made by hand. */
export const SHELTER = { t0: 4, t1: 150 };

/** A dig that leaves out whatever falls between t0 and t1 along the run (cut off where it runs past), so what's made
 *  by hand there stands alone and the dice thrown for what was there fall as before; flush() hands the rest on. */
export function clipped(d: Dig, R: Run, t0: number, t1: number) {
  const [x0, z0, x1, z1] = R.rect(t0, t1, -60, 60), cut: Box = { x0, y0: -1e4, z0, x1, y1: 1e4, z1 };
  const inR = (x: number, z: number) => x > x0 && x < x1 && z > z0 && z < z1;
  const off = (a: Solid[]) => a.flatMap(s => (s.ramp || s.rot ? (inR((s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2) ? [] : [s]) : carve([s], cut)));
  const c: Dig = { ...d, kept: [], decor: [], props: [], bores: [],
    space: (a0, b0, a1, b1, y0, y1, mat, open, lit) => { for (const q of carve([solid(a0, y0, b0, a1, y1, b1)], cut)) d.space(q.x0, q.z0, q.x1, q.z1, y0, y1, mat, open, lit); },
    mark: (kind, at, y) => { if (!inR(...at)) d.mark(kind, at, y); } };
  return { dig: c, flush() { d.kept.push(...off(c.kept)); d.decor.push(...off(c.decor)); d.props.push(...c.props.filter(p => !inR(p.x, p.z))); d.bores.push(...c.bores); } };
}

/** Lay it out along run R from the junction at floor y (the gallery as high as the tunnel, h); where he's put to
 *  see it (the restaurant). */
export function airRaid(d: Dig, R: Run, y: number, h: number, inter: Inter[], features: Feature[]): V3 {
  const H: Hand = { pre: 'shelter', y, space: (t0, t1, s0, s1, y0, y1, mat = MAT.brick) => d.space(...R.rect(t0, t1, s0, s1), y0, y1, mat), box: R.box, pt: R.pt, kept: d.kept, decor: d.decor, props: d.props, inter, features };
  const lamp = (t: number, s: number, top: number) => d.decor.push(R.box(t - 0.3, t + 0.3, s - 0.3, s + 0.3, top - 0.1, top, MAT.lamp));
  // The gallery, straight through; its bulkhead lamps.
  H.space(-0.5, SHELTER.t1 + 0.5, -1.8, 1.8, y, y + h);
  for (let t = 6; t < SHELTER.t1; t += 16) lamp(t, 0, y + h);
  // The protective door and the gas-tight door, open against the walls, their frames; the tool cabinet between.
  for (const [t, s] of [[6, 1], [11, -1]]) {
    d.kept.push(R.box(t - 0.3, t, -1.8, -1.45, y, y + h, MAT.concrete), R.box(t - 0.3, t, 1.45, 1.8, y, y + h, MAT.concrete), R.box(t + 0.2, t + 1.8, s * 1.45, s * 1.75, y, y + 2.3, MAT.metal));
    d.decor.push(R.box(t - 0.3, t, -1.45, 1.45, y + 2.4, y + h, MAT.concrete));
  }
  put(H, 'cabinet', 9, -1.55, [0, 1], 0.9, 1.8, 0.4, { id: 'cabinet', zh: '防空洞工具柜', en: 'Shelter tool cabinet', type: 'cabinet', loot: 'workshop', items: [['crowbar', 1]] });
  scrawl(H, 8, 1.42, [0, -1], '防护门 18:00-06:00 关闭  PROTECTIVE DOOR · SHUT 18:00-06:00');
  scrawl(H, 14, 1.78, [0, -1], '18:00后入口附近不准开灯  NO LIGHTS NEAR THE ENTRANCE AFTER 18:00');
  for (const t of [16, 19, 22]) put(H, 'bedroll', t, -1.2, [0, 1], 0.7, 0.1, 1.0);
  put(H, 'bag', 20.5, 1.4, [0, -1], 0.4, 0.4, 0.3);
  // The dormitory hall (east): bedrolls in a row down its far wall, sheets hung between them, the supplies crate, the
  // baby's corner, the roll call on the wall.
  H.space(28, 48, 2.4, 12, y, y + 3);
  lamp(38, 7, y + 3);
  for (const t of [31, 45]) door(H, `dorm${t}`, t, 2.1, 's', 'open', { w: 1.6 });
  for (let t = 29.5; t < 47; t += 1.5) put(H, 'bedroll', t, 11.1, [0, -1], 0.7, 0.1, 1.8);
  for (const t of [33.2, 39.2, 45.2]) d.decor.push(R.box(t - 0.01, t + 0.01, 9.6, 12, y, y + 1.9, MAT.cloth));
  put(H, 'crate', 36, 3.0, [0, 1], 1.0, 0.7, 0.6, { id: 'supplies', zh: '物资箱', en: 'Supplies crate', type: 'crate', loot: 'kitchen' });
  put(H, 'clothes', 46.6, 10.4, [0, -1], 0.5, 0.15, 0.4);
  put(H, 'box', 47.2, 9.6, [0, -1], 0.4, 0.3, 0.4);
  scrawl(H, 38, 2.42, [0, 1], '点名 ROLL CALL · 彭4 曾1 胡+宝宝 孔3 徐 马 = 12');
  scrawl(H, 38, 2.42, [0, 1], '19/9 曾 一个人上去了  ZENG WENT UP ALONE', 1.1);
  // The ventilation hall (west): the hand-cranked fan, its duct up; the students' corner; chairs from the restaurant.
  H.space(56, 82, -14, -2.4, y, y + 3.2);
  lamp(69, -8, y + 3.2);
  door(H, 'vent', 60, -2.1, 's', 'shut', { label: ['通风室', 'Ventilation room'] });
  d.kept.push(R.box(66, 69, -13.6, -11.6, y, y + 1.6, MAT.metal));
  d.decor.push(R.box(67, 68, -13.4, -12.4, y + 1.6, y + 3.2, MAT.tealMetal), R.box(68.9, 69.6, -12.7, -12.5, y + 0.9, y + 1.1, MAT.metal));
  scrawl(H, 67.5, -13.98, [0, 1], '手摇风机 每人半小时  CRANK THE FAN · HALF AN HOUR EACH');
  put(H, 'desk', 76, -13.4, [0, 1], 1.2, 0.76, 0.6);
  put(H, 'books', 75.8, -13.4, [0, 1], 0.3, 0.1, 0.2, { up: 0.76 });
  put(H, 'chair', 76, -12.4, [0, -1], 0.45, 0.9, 0.45, { fallen: true });
  put(H, 'crate', 79, -13.5, [0, 1], 0.8, 0.6, 0.5, { id: 'students', zh: '学生的箱子', en: "The students' crate", type: 'crate', loot: 'office' });
  scrawl(H, 77.5, -13.98, [0, 1], '徐 马 (重大) · 地铁通到外面吗?  XU, MA (CQU) · DOES THE METRO GO OUT?');
  for (const [t, s] of [[58, -12], [58.6, -12.6], [62, -13]]) put(H, 'stool', t, s, [0, 1], 0.35, 0.45, 0.35);
  door(H, 'store', 82.3, -13.1, 't', 'shut');
  // The restaurant's store passage (behind it, west), crates along its wall, to the kitchen's back door.
  H.space(82.6, 134, -14, -12.2, y, y + 2.6);
  for (const t of [88, 96, 104, 116, 122]) put(H, 'crate', t, -13.65, [0, 1], 1.0, 0.8, 0.5);
  put(H, 'crate', 110, -13.65, [0, 1], 1.0, 0.8, 0.5, { id: 'store', zh: '火锅底料箱', en: 'Hotpot base crate', type: 'crate', loot: 'kitchen' });
  scrawl(H, 90, -12.22, [0, -1], '火锅店仓库 → 后厨  HOTPOT STORE → KITCHEN');
  door(H, 'back', 130, -11.9, 's', 'shut', { label: ['后厨门', 'Kitchen back door'] });
  // The Dongdong Shelter Hotpot: two rows of tables, the pots still on them, bedding between; its door buried.
  H.space(98, 124, -11.6, -2.4, y, y + 3);
  for (const t of [104, 116]) lamp(t, -7, y + 3);
  door(H, 'front', 111, -2.1, 's', 'collapsed', { w: 1.6, label: ['火锅店正门', 'Restaurant door'] });
  heap(H, 109.8, 112.2, -3.6, -2.4, y + 3);
  scrawl(H, 113.5, -1.78, [0, 1], '洞洞防空洞火锅 · 冬暖夏凉  DONGDONG SHELTER HOTPOT · 18° ALL SUMMER', 2.4);
  scrawl(H, 108.6, -1.78, [0, 1], '门塌了 走后厨  DOOR\'S DOWN · ROUND THE BACK', 1.3);
  for (const [t, s, f] of [[100, -4, -1], [103.5, -4, -1], [107, -4, -1], [114.5, -4, -1], [118, -4, -1], [121.5, -4, -1], [100, -10, 1], [103.5, -10, 1], [107, -10, 1], [110.5, -10, 1], [114, -10, 1], [117.5, -10, 1], [121, -10, 1]]) {
    put(H, 'table', t, s, [0, f], 1.4, 0.76, 0.8);
    if ((t * 2) % 3 !== 0) put(H, 'dinner', t, s, [0, f], 0.8, 0.1, 0.6, { up: 0.76 });
    put(H, 'stool', t + 1.05, s + f * 0.1, [0, f], 0.35, 0.45, 0.35, { fallen: t % 2 > 0.5 });
  }
  for (const [t, s] of [[101.5, -6.2], [105, -7.8], [113, -6], [116.4, -7.6], [120, -6.4]]) put(H, 'bedroll', t, s, [0, 1], 0.7, 0.1, 1.8);
  put(H, 'clothes', 105.6, -6.6, [0, 1], 0.3, 0.1, 0.3);
  mark(H, 'doc:shelter', 107, -10, 0.76);
  mark(H, 'heart:shelter', 108.8, -7);
  // Its kitchen: the stove, the tap and the bucket under it, the fridge; its door off the gallery locked, its back
  // door onto the store passage.
  H.space(124.6, 134, -11.6, -2.4, y, y + 3);
  door(H, 'pass', 124.3, -7, 't', 'open', { w: 1.6 });
  door(H, 'kitchen', 131, -2.1, 's', 'locked', { label: ['后厨门', 'Kitchen door'] });
  put(H, 'stove', 125.4, -11.2, [0, 1], 1.2, 0.9, 0.7);
  put(H, 'sink', 127.2, -11.25, [0, 1], 1.0, 0.9, 0.6);
  put(H, 'box', 127.4, -10.6, [0, 1], 0.35, 0.35, 0.35);
  put(H, 'counter', 129.5, -6.5, [0, 1], 2.0, 0.9, 0.7);
  put(H, 'fridge', 133.4, -9, [-1, 0], 0.8, 1.8, 0.7, { id: 'fridge', zh: '冰柜', en: 'Fridge', type: 'fridge', loot: 'kitchen' });
  scrawl(H, 127.2, -11.58, [0, 1], '自来水 一家一天一桶  WATER · ONE BUCKET A FAMILY A DAY', 1.6);
  // Its ways in.
  mark(H, 'room:shelter', 38, 7);
  mark(H, 'room:shelter', 108.8, -7);
  mark(H, 'in:shelter:junction', 1, 0);
  mark(H, 'in:shelter:grate', 118, 0);
  mark(H, 'in:shelter:cellar', 140, -1);
  mark(H, 'in:shelter:north', SHELTER.t1 - 0.5, 0);
  const [x, z] = R.pt(108.8, -6.2);
  return { x, y, z };
}
