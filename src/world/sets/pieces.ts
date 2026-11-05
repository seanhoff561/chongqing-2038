// The map editor's pieces (M10-32): each one's name, its group in the palette, its box as first placed (w across x, h
// up, d along z, at yaw 0; local +z is its front), which of those can be changed, its material if it has a choice,
// whether it carries text, and where it goes: standing on whatever's under it (its box centred on that point), on a
// wall ('wall': its back on the face, where it was put; 'foot': the same, standing on the floor under it), or turned
// never (a pool, cut into the ground).
import { FURNITURE } from '../city/rooms';
import { PROP_BOX } from '../../data/props';

export type Group = 'build' | 'climb' | 'furniture' | 'container' | 'prop' | 'sign' | 'spawn';
export const GROUPS: [Group, string][] = [
  ['build', '建造 Build'], ['climb', '攀爬 Climbing'], ['furniture', '家具 Furniture'], ['container', '容器 Containers'],
  ['prop', '道具 Props'], ['sign', '标牌 Signs'], ['spawn', '出生点 Spawn'],
];

export interface PieceDef {
  zh: string; en: string; group: Group; w: number; h: number; d: number;
  /** the sizes that can be changed ('w', 'h', 'd') */
  size?: string;
  on?: 'wall' | 'foot';
  /** its material, a MAT name, if there's a choice */
  mat?: string;
  text?: boolean;
  /** never turned */
  fixed?: boolean;
  /** what its sizes are called, if not width, height and depth */
  axes?: [string, string, string];
}

/** The materials a built piece can be. */
export const MATS = ['concrete', 'block', 'brick', 'plaster', 'stone', 'tile', 'wood', 'metal', 'glass'] as const;

const def = (zh: string, en: string, group: Group, w: number, h: number, d: number, o: Partial<PieceDef> = {}): PieceDef => ({ zh, en, group, w, h, d, ...o });
const NAMES: Record<string, [string, string]> = {
  sofa: ['沙发', 'Sofa'], desk: ['书桌', 'Desk'], chair: ['椅子', 'Chair'], shelf: ['书架', 'Shelf'], counter: ['柜台', 'Counter'],
  stove: ['炉灶', 'Stove'], sink: ['水槽', 'Sink'], rack: ['货架', 'Rack'],
};
const furniture = Object.fromEntries(Object.entries(FURNITURE).map(([k, f]) => {
  const [zh, en] = 'zh' in f ? [f.zh, f.en] : NAMES[k];
  return [k, def(zh, en, 'zh' in f && !('use' in f) ? 'container' : 'furniture', f.w, f.h, f.d, { size: 'whd' })];
}));
/** The props: their boxes the city's (data/props.ts) where it has one. */
const PROPS: [string, string, string, number?, number?, number?, Partial<PieceDef>?][] = [
  ['car', '汽车', 'Car'], ['van', '货车', 'Van'], ['kiosk', '报亭', 'Kiosk'], ['dumpster', '垃圾箱', 'Dumpster'], ['drum', '油桶', 'Drum'],
  ['bin', '垃圾桶', 'Bin'], ['bench', '长椅', 'Bench'], ['bollard', '护柱', 'Bollard'], ['barrier', '路障', 'Barrier'], ['jersey', '水泥隔离墩', 'Jersey barrier'],
  ['sandbags', '沙袋', 'Sandbags'], ['bags', '垃圾袋', 'Rubbish bags'], ['boxes', '纸箱', 'Boxes'], ['tarp', '篷布', 'Tarp shelter'], ['stall', '摊位', 'Stall'],
  ['mahjong', '麻将桌', 'Mahjong table'], ['slab', '水泥板', 'Fallen slab'], ['rubblepile', '瓦砾', 'Rubble', 2, 0.6, 2, { size: 'w' }],
  ['halfwall', '断墙', 'Broken wall', 0.3, 2, 3, { size: 'hd' }], ['lamppost', '路灯', 'Lamppost'], ['campole', '监控杆', 'Camera pole'],
  ['figtree', '黄葛树', 'Fig tree'], ['shrub', '灌木', 'Shrub', 1, 1, 1], ['pot', '花盆', 'Flower pot', 0.5, 0.5, 0.5],
  ['scooter', '电动车', 'Scooter', 0.6, 1, 1.6], ['bike', '自行车', 'Bicycle', 0.6, 1, 1.7], ['weeds', '杂草', 'Weeds', 1, 0.4, 1],
  ['trash', '垃圾', 'Litter', 1, 0.3, 1], ['debris', '碎块', 'Debris', 1.5, 0.3, 1.5], ['dronewreck', '无人机残骸', 'Drone wreck', 1.5, 0.6, 1.5],
  ['antenna', '天线', 'Antenna', 0.5, 2, 0.5], ['dish', '卫星锅', 'Satellite dish', 1, 1, 0.5],
  ['neonsign', '霓虹招牌', 'Neon sign', 3, 4.9, 0.3, { size: 'wh' }], ['flatneon', '霓虹灯', 'Wall neon', 0.1, 1.8, 0.7, { on: 'wall' }],
  ['graffiti', '涂鸦', 'Graffiti', 2, 0.5, 0.02, { on: 'wall', text: true }],
];
const props = Object.fromEntries(PROPS.map(([k, zh, en, w, h, d, o]) => { const b = PROP_BOX[k]; return [k, def(zh, en, 'prop', w ?? b.w, h ?? b.h, d ?? b.d, o)]; }));

export const PIECES: Record<string, PieceDef> = {
  apartment: def('公寓', 'Apartment', 'build', 14, 3, 10, { size: 'whd' }),
  platform: def('平台', 'Platform', 'build', 4, 1, 4, { size: 'whd', mat: 'block' }),
  wall: def('墙', 'Wall', 'build', 4, 3, 0.25, { size: 'whd', mat: 'brick' }),
  pillar: def('柱子', 'Pillar', 'build', 0.5, 3, 0.5, { size: 'whd', mat: 'concrete' }),
  ramp: def('坡道', 'Ramp', 'build', 2, 1.5, 4, { size: 'whd', mat: 'concrete' }),
  stairs: def('楼梯', 'Stairs', 'build', 1.2, 2, 3, { size: 'whd', mat: 'stone' }),
  pool: def('水池', 'Pool', 'build', 6, 2, 4, { size: 'whd', fixed: true, axes: ['宽 W', '深 Depth', '长 D'] }),
  pipe: def('水管', 'Pipe', 'climb', 0.12, 6, 0.12, { size: 'h', on: 'foot' }),
  ladder: def('梯子', 'Ladder', 'climb', 0.6, 4, 0.1, { size: 'h', on: 'foot' }),
  pole: def('杆子', 'Pole', 'climb', 0.12, 4, 0.12, { size: 'h' }),
  rope: def('绳子', 'Rope', 'climb', 1.3, 5, 0.2, { size: 'h' }),
  vine: def('藤蔓', 'Vine', 'climb', 2, 4, 0.3, { size: 'wh', on: 'foot' }),
  tree: def('树', 'Tree', 'climb', 0.4, 3, 0.4),
  ledge: def('窗台', 'Ledge', 'climb', 3, 0.1, 0.15, { size: 'w', on: 'wall' }),
  bar: def('单杠', 'Swing bar', 'climb', 3, 2.2, 0.2, { size: 'wh' }),
  rail: def('栏杆', 'Rail', 'climb', 3, 1, 0.1, { size: 'wh' }),
  zipline: def('滑索', 'Zipline', 'climb', 12, 5, 0.3, { size: 'wh', axes: ['长 Length', '高 Height', '深 D'] }),
  chimney: def('烟囱缝', 'Chimney', 'climb', 3, 6, 1.4, { size: 'whd', mat: 'brick', axes: ['长 Length', '高 Height', '宽 Width'] }),
  hidebox: def('藏身箱', 'Hiding crate', 'climb', 0.9, 0.9, 0.9, { size: 'whd' }),
  ...furniture,
  ...props,
  redsign: def('红牌 (墙)', 'Red sign (wall)', 'sign', 1.2, 0.6, 0.03, { size: 'wh', on: 'wall', text: true }),
  redfloor: def('红牌 (地)', 'Red sign (floor)', 'sign', 1.2, 0.02, 0.8, { size: 'wd', text: true }),
  spawn: def('出生点', 'Spawn point', 'spawn', 0.6, 1.8, 0.6),
};

/** A placed piece's box in its own frame: [x0, y0, z0, x1, y1, z1] (a wall piece from its wall out, a pool down). */
export function boxOf(p: { kind: string; w: number; h: number; d: number }): number[] {
  if (p.kind === 'pool') return [-p.w / 2, -p.h, -p.d / 2, p.w / 2, 0, p.d / 2];
  if (PIECES[p.kind]?.on) return [-p.w / 2, 0, 0, p.w / 2, p.h, p.d];
  return [-p.w / 2, 0, -p.d / 2, p.w / 2, p.h, p.d / 2];
}
