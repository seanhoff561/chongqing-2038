// The construction site's office compound (M10-38d, U-104), made by hand inside the hoarding (site.ts's own frame,
// from the compound's corner: t along x, s along z). A fenced yard, its gate chained (a crowbar's in the site's tool
// containers); the two-storey site office along its back: the canteen, the changing room (Li Wei's
// locker among the rest) and the store (the tool locker: bolt cutters) below; the site manager's office (the heart: the
// site diary on his desk), the plan room and the engineers' office above, off a walkway along the front. Its main
// stair buried where the formwork stack came down on it, so up by the fire stair at the far end and back along the
// walkway; the manager's door locked.
import { solid, type Solid } from '../geom';
import { MAT } from '../mats';
import { stair } from '../steps';
import type { Feature, Inter, Prop } from '../world';
import type { P2 } from './shapes';
import { built } from './handbuilt';
import { door, heap, put, scrawl, mark } from './handunder';

/** The compound's size (t, s); the office along its back (s0, s1); each floor's height, the slab. */
export const OFFICE = { T: 24, S: 15, s0: 8.5, s1: 14.5, floor: 2.8, slab: 0.3 };

export function siteOffice(ox: number, oz: number, base: number, P: (x: number, z: number) => P2): { solids: Solid[]; decor: Solid[]; props: Prop[]; inter: Inter[]; features: Feature[] } {
  const box = (t0: number, t1: number, s0: number, s1: number, y0: number, y1: number, mat: number): Solid => solid(ox + t0, y0, oz + s0, ox + t1, y1, oz + s1, mat);
  const { T, S, s0, s1, floor, slab } = OFFICE, up = base + floor + slab, b = built('siteoffice', base, box, (t, s) => P(ox + t, oz + s)), H = b.H, U = b.on(up);
  // The yard's fence, its gate on the north side.
  for (const [t0, t1, q0, q1] of [[0, T, 0, 0.1], [0, T, S - 0.1, S], [0, 0.1, 0, S], [T - 0.1, T, 0, S]]) b.shell(t0, t1, q0, q1, base, base + 2.2, MAT.metal, 0x2a5a9a);
  door(H, 'gate', 8, 0.05, 's', 'chained', { w: 1.6, label: ['项目部大门', 'Site office gate'] });
  scrawl(H, 11, -0.02, [0, -1], '项目部 闲人免进  SITE OFFICE · NO ENTRY');
  // The office: two floors of site cabins, rooms carved out.
  b.shell(3, 21, s0, s1, base, up + floor + 0.3, MAT.metal, 0xdfe4e8);
  H.space(3.3, 9, s0 + 0.3, s1 - 0.3, base, base + floor); // canteen
  H.space(9.3, 15, s0 + 0.3, s1 - 0.3, base, base + floor); // changing room
  H.space(15.3, 20.7, s0 + 0.3, s1 - 0.3, base, base + floor); // store
  U.space(3.3, 9, s0 + 0.3, s1 - 0.3, up, up + floor); // the site manager's office
  U.space(9.3, 15, s0 + 0.3, s1 - 0.3, up, up + floor); // plan room
  U.space(15.3, 20.7, s0 + 0.3, s1 - 0.3, up, up + floor); // engineers' office
  for (const [t, lock] of [[6, 'shut'], [12, 'shut'], [18, 'shut']] as const) door(H, `g${t}`, t, s0 + 0.15, 's', lock);
  door(U, 'manager', 6, s0 + 0.15, 's', 'locked', { label: ['项目经理室', "Site manager's office"] });
  door(U, 'plans', 12, s0 + 0.15, 's', 'shut');
  door(U, 'engineers', 18, s0 + 0.15, 's', 'shut');
  door(U, 'between', 9.15, 11.5, 't', 'shut');
  door(U, 'between2', 15.15, 11.5, 't', 'jammed');
  // The stairs up at either end to the walkway along the front; the main one buried at its foot.
  // (Each set a little into the ground at its foot.)
  const ys = up;
  for (const t of [0.8, 21.6]) {
    stair(ox + t, oz + 2.3, ox + t + 1.6, oz + 7.2, base - 0.2, ys, 3, H.kept, H.decor);
    // (Its stringers and rails, both sides: on only from its foot.)
    for (const e of [t - 0.06, t + 1.6]) H.kept.push(box(e, e + 0.06, 2.3, 7.2, base, ys + 1, MAT.metal));
    H.kept.push(box(t, t + 2.2, 7.2, s0, ys - 0.1, ys, MAT.metal));
  }
  H.kept.push(box(3, 21.6, 7.2, s0, ys - 0.1, ys, MAT.metal), box(2.4, 21.6, 7.15, 7.25, ys, ys + 1.0, MAT.metal));
  heap(H, 0.5, 2.8, 1.2, 4.4, base + 2.6);
  // What's in it: the canteen's table, the changing room's lockers, the store's tools; upstairs the desks and plans.
  put(H, 'table', 6, 12.5, [0, -1], 1.2, 0.78, 0.7);
  put(H, 'fridge', 3.75, 13.6, [1, 0], 0.7, 1.7, 0.7);
  for (const [k, t] of [10.0, 10.6, 11.2, 11.8, 12.4, 13.0].entries()) put(H, 'locker', t, s1 - 0.55, [0, -1], 0.5, 1.9, 0.5, k === 3 ? { id: 'liwei', zh: '李伟的储物柜', en: "Li Wei's locker", type: 'locker', loot: 'bedroom' } : { id: `locker${k}`, zh: '储物柜', en: 'Locker', type: 'locker', loot: 'bedroom' });
  put(H, 'locker', 20.2, 11.0, [-1, 0], 0.5, 1.9, 0.5, { id: 'tools', zh: '工具柜', en: 'Tool locker', type: 'locker', loot: 'construction', items: [['boltcutters', 1]] });
  put(H, 'rack', 17.5, s1 - 0.55, [0, -1], 1.6, 2.0, 0.5);
  put(U, 'desk', 4.0, 12.0, [1, 0], 1.3, 0.76, 0.7);
  put(U, 'drawer', 7.5, s1 - 0.55, [0, -1], 0.9, 0.8, 0.5, { id: 'manager', zh: '经理的抽屉', en: "Manager's drawers", type: 'drawer', loot: 'office' });
  put(U, 'table', 12, 12, [0, -1], 1.2, 0.78, 0.7);
  for (const t of [16.5, 19.5]) put(U, 'desk', t, s1 - 0.65, [0, -1], 1.3, 0.76, 0.7);
  put(U, 'drawer', 16.0, s0 + 0.85, [0, 1], 0.9, 0.8, 0.5, { id: 'engineers', zh: '抽屉', en: 'Drawers', type: 'drawer', loot: 'office' });
  scrawl(H, 12.4, s1 - 0.32, [0, -1], '李伟', 2.0);
  scrawl(H, 12, s0 + 0.32, [0, 1], '六层跳板未绑 禁止奔跑  LEVEL 6 PLANKS NOT TIED · NO RUNNING');
  scrawl(H, 6, s0 + 0.32, [0, 1], '东边水沟又淹了  THE EAST DITCH FLOODED AGAIN');
  scrawl(U, 3.32, 10.5, [1, 0], "塔吊远程程序 不是宋的  THE CRANE'S REMOTE PROGRAM ISN'T SONG'S");
  scrawl(U, 12, s1 - 0.32, [0, -1], '14:15 全体下塔  14:15 EVERYONE OFF THE TOWER');
  mark(U, 'doc:site', 4.0, 12.0, 0.78);
  mark(U, 'heart:site', 6, 11.5);
  // Its windows along the front, both floors.
  for (let t = 4; t < 20; t += 3) for (const y of [base, up]) H.decor.push(box(t, t + 1.4, s0 - 0.04, s0 - 0.01, y + 1.0, y + 2.0, MAT.glass));
  return { solids: b.solids(), decor: H.decor, props: H.props, inter: H.inter, features: H.features };
}
