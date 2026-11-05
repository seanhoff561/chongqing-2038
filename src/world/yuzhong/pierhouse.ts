// The river police's deckhouse on their pier (M10-38d, U-104), made by hand on the pontoon (pier.ts's frame: t along
// it, s across, toward the bank +; the gangway lands at t = 0). Two decks of white steel. Below, the corridor from the
// front door (the gangway's end) to the back door (the ladder's), come down in the middle where a drone came through
// the deck over it; off it the duty office and the equipment store (the tool locker: a crowbar) at the front, the
// mess and the crew's bunks behind the fall, and the stair room on the river side (its own door onto the deck there,
// locked), its stair up. Above, the gallery along the river side, come down too, round it through the radio room and
// the captain's cabin (its door to the watch room locked) to the watch room at the front (the heart): the duty desk,
// the boat 3 log on it, the key board with its hooks empty. Its ways on: the gangway, the ladder out of the water,
// the crane's jib.
import { solid, turn, type Solid } from '../geom';
import { MAT } from '../mats';
import { stair } from '../steps';
import type { Feature, Inter, Prop } from '../world';
import type { Obb } from './shapes';
import { built } from './handbuilt';
import { door, heap, put, scrawl, mark } from './handunder';

/** The deckhouse along the pontoon (t), its half-depth across it (s), each deck's height, its slab. */
export const HOUSE = { t0: 3, t1: 19, hs: 4.2, deck: 2.8, slab: 0.3 };

export function pierHouse(o: Obb, side: number, top: number): { solids: Solid[]; decor: Solid[]; props: Prop[]; inter: Inter[]; features: Feature[] } {
  const c = Math.cos(o.yaw), sn = Math.sin(o.yaw);
  const box = (t0: number, t1: number, s0: number, s1: number, y0: number, y1: number, mat: number): Solid =>
    solid(o.cx + Math.min(t0, t1), y0, o.cz + Math.min(s0 * side, s1 * side), o.cx + Math.max(t0, t1), y1, o.cz + Math.max(s0 * side, s1 * side), mat);
  const pt = (t: number, s: number): [number, number] => [o.cx + c * t - sn * s * side, o.cz + sn * t + c * s * side];
  const { t0, t1, hs, deck, slab } = HOUSE, up = top + deck + slab, b = built('pier', top, box, pt), H = b.H, U = b.on(up), white = 0xd8dcd6;
  b.shell(t0, t1, -hs, hs, top, up + deck + 0.3, MAT.metal, white);
  // Below: the corridor, the drone's fall across it; the rooms off it.
  H.space(t0 + 0.3, t1 - 0.3, -0.6, 0.6, top, top + deck);
  heap(H, 9, 11, -0.6, 0.6, top + deck);
  H.space(t0 + 0.3, 8.5, 0.9, hs - 0.3, top, top + deck); // duty office
  H.space(8.8, 12.7, 0.9, hs - 0.3, top, top + deck); // mess
  H.space(13.0, t1 - 0.3, 0.9, hs - 0.3, top, top + deck); // bunks
  H.space(t0 + 0.3, 8.0, -hs + 0.3, -0.9, top, top + deck); // equipment store
  H.space(8.3, 13.5, -hs + 0.3, -0.9, top, top + deck); // battery room
  H.space(13.8, t1 - 0.3, -hs + 0.3, -0.9, top, top + deck); // stair room
  door(H, 'front', t0 + 0.15, 0, 't', 'shut', { label: ['值班室', 'River police'] });
  door(H, 'back', t1 - 0.15, 0, 't', 'shut');
  door(H, 'river', 16.0, -hs + 0.15, 's', 'locked');
  door(H, 'office', 6.0, 0.75, 's', 'shut');
  door(H, 'store', 5.5, -0.75, 's', 'shut');
  door(H, 'mess', 11.8, 0.75, 's', 'shut');
  door(H, 'bunks', 16.0, 0.75, 's', 'jammed');
  door(H, 'battery', 12.0, -0.75, 's', 'shut');
  door(H, 'stairs', 16.0, -0.75, 's', 'shut');
  // The stair up from the stair room, the deck over it open.
  const [sx0, sz0] = [o.cx + 14.2, o.cz + Math.min(-3.7 * side, -2.3 * side)], [sx1, sz1] = [o.cx + 18.2, o.cz + Math.max(-3.7 * side, -2.3 * side)];
  stair(sx0, sz0, sx1, sz1, top, up, 1, H.kept, H.decor);
  H.space(14.2, 18.4, -3.7, -2.3, top + deck, up);
  // Above: the gallery on the river side, come down in the middle; the watch room, the captain's cabin and the radio
  // room along the bank side.
  U.space(t0 + 0.3, t1 - 0.3, -hs + 0.3, -0.9, up, up + deck);
  heap(U, 9.5, 11.5, -hs + 0.3, -0.9, up + deck);
  U.space(t0 + 0.3, 9.5, -0.6, hs - 0.3, up, up + deck); // watch room
  U.space(9.8, 14.0, -0.6, hs - 0.3, up, up + deck); // captain's cabin
  U.space(14.3, t1 - 0.3, -0.6, hs - 0.3, up, up + deck); // radio room
  door(U, 'watch', 6.0, -0.75, 's', 'shut');
  door(U, 'radio', 16.5, -0.75, 's', 'shut');
  door(U, 'cabin', 14.15, 1.5, 't', 'shut');
  door(U, 'captain', 9.65, 1.5, 't', 'locked', { label: ['值班驾驶室', 'Watch room'] });
  // What's left: the duty office's board, the store's tool locker, the mess, the empty battery racks, the bunks.
  put(H, 'desk', 4.2, 2.5, [1, 0], 1.3, 0.76, 0.7);
  put(H, 'locker', 7.6, -2.4, [-1, 0], 0.5, 1.9, 0.5, { id: 'tools', zh: '工具柜', en: 'Tool locker', type: 'locker', loot: 'workshop', items: [['crowbar', 1]] });
  put(H, 'shelf', 4.0, -3.6, [0, 1], 1.0, 1.9, 0.35);
  put(H, 'table', 10.7, 2.4, [0, -1], 1.2, 0.78, 0.7);
  put(H, 'bedroll', 9.6, 3.4, [0, -1], 0.7, 0.1, 1.8);
  put(H, 'rack', 11.0, -3.6, [0, 1], 1.6, 2.0, 0.5);
  for (const t of [14.2, 16.2]) put(H, 'bed', t + 0.5, 3.2, [0, -1], 2.0, 0.5, 1.0);
  put(H, 'locker', 18.3, 1.3, [-1, 0], 0.5, 1.9, 0.5, { id: 'crew', zh: '船员柜', en: 'Crew locker', type: 'locker', loot: 'bedroom' });
  scrawl(H, t0 + 0.32, 2.6, [1, 0], '全部回港 钥匙交派出所  ALL BOATS TO DOCK · KEYS TO THE STATION');
  scrawl(H, 11.0, -hs + 0.32, [0, 1], '电瓶已送仓库 · 油箱已抽空  BATTERIES TO THE DEPOT · TANKS DRAINED');
  scrawl(H, 10.0, 0.62, [0, -1], '无人机 从顶上下来的  THE DRONE CAME DOWN THROUGH THE ROOF');
  scrawl(H, 9.0, hs - 0.32, [0, -1], '老康睡这 等雾  OLD KANG SLEPT HERE · WAITING FOR FOG');
  // The watch room: the duty desk, the log on it; the key board, its hooks empty; the chart of the buoy line.
  put(U, 'desk', 4.0, 1.0, [1, 0], 1.3, 0.76, 0.7);
  put(U, 'drawer', 8.6, hs - 0.6, [0, -1], 0.9, 0.8, 0.5, { id: 'duty', zh: '值班台抽屉', en: 'Duty desk drawer', type: 'drawer', loot: 'office' });
  put(U, 'cabinet', 12.0, hs - 0.6, [0, -1], 1.0, 1.8, 0.5, { id: 'captain', zh: '船长的柜子', en: "Captain's cabinet", type: 'cabinet', loot: 'office' });
  put(U, 'shelf', 17.5, hs - 0.5, [0, -1], 1.0, 1.9, 0.35);
  scrawl(U, 6.0, -0.62, [0, 1], '1号 2号 3号艇钥匙 → 派出所 邓  KEYS BOATS 1 2 3 → THE STATION · DENG', 1.6);
  scrawl(U, t0 + 0.32, -2.0, [1, 0], '浮标线 · 听螺旋桨 不听漂流  BUOY LINE · THEY HEAR PROPELLERS, NOT DRIFT');
  scrawl(U, 15.0, -hs + 0.32, [0, 1], '电台没信号 20:40  RADIO DEAD 20:40');
  mark(U, 'doc:pier', 4.2, 1.0, 0.78);
  mark(U, 'heart:pier', 5.5, 1.5);
  // Its windows: the watch room's all round the front, the rest along both sides.
  for (const s of [-1, 1]) for (let t = 4; t < t1 - 1; t += 3) H.decor.push(box(t, t + 1.6, s * (hs + 0.01), s * (hs + 0.04), up + 0.9, up + 2.1, MAT.glass), box(t, t + 1.2, s * (hs + 0.01), s * (hs + 0.04), top + 1.0, top + 2.0, MAT.glass));
  H.decor.push(box(t0 - 0.04, t0 - 0.01, -3.5, 3.5, up + 0.9, up + 2.2, MAT.glass));
  return { solids: turn(b.solids(), o.yaw, o.cx, o.cz), decor: turn(H.decor, o.yaw, o.cx, o.cz), props: H.props, inter: H.inter, features: H.features };
}
