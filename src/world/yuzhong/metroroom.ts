// Jiefangbei station's concourse and control room (M10-38c, U-104), made by hand over its platform hall (run R
// from the cavern's east wall along the station: t east, s across). The concourse over the hall's west end, level
// with the underground city's deck (its street runs on into it), the stair up to it from the hall, the face-
// recognition gates across it and the dead screens; behind its south wall the staff corridor, come down in the
// middle, the control room (its heart) at its far end behind a card reader, the signal equipment room, the staff
// lockers (the maintenance key that's the card), and behind them all the cable gallery to the control room's back
// door; at the corridor's east end the staff stair down to a door in the hall's wall by the tracks. Its ways in:
// the deck, the cavern's lower concourse into the hall, and the running tunnels from the east.
import { MAT } from '../mats';
import { stair } from '../steps';
import type { Feature, Inter } from '../world';
import type { Dig, run } from './underkit';
import { door, heap, put, scrawl, mark, type Hand } from './handunder';

type Run = ReturnType<typeof run>;

/** Lay it out along the station's run R: the hall's floor at lo, the concourse's at hi; the hall L long. */
export function metroRoom(d: Dig, R: Run, lo: number, hi: number, L: number, inter: Inter[], features: Feature[]) {
  const H: Hand = { pre: 'metro', y: hi, space: (t0, t1, s0, s1, y0, y1, mat = MAT.concrete) => d.space(...R.rect(t0, t1, s0, s1), y0, y1, mat, false, true), box: R.box, pt: R.pt, kept: d.kept, decor: d.decor, props: d.props, inter, features };
  const B: Hand = { ...H, y: lo };
  // The concourse, open at its west end onto the deck; the stair up to it from the hall along its north wall, the
  // well over it railed.
  H.space(-0.5, 36, -8, 9, hi, hi + 4.2);
  d.decor.push(R.box(2, 34, -0.2, 0.2, hi + 4.12, hi + 4.2, MAT.glare));
  stair(...R.rect(1, 11, 6.4, 8.9), lo, hi, R.up, d.kept, d.decor);
  const [wx0, wz0, wx1, wz1] = R.rect(1, 11, 6.4, 8.9);
  d.bores.push({ x0: wx0, y0: lo + 3, z0: wz0, x1: wx1, y1: hi + 0.3, z1: wz1 });
  d.kept.push(R.box(1, 10.6, 6.25, 6.35, hi, hi + 1.1, MAT.metal), R.box(0.85, 0.95, 6.25, 8.9, hi, hi + 1.1, MAT.metal));
  // The face-recognition gates across it, the wide one smashed open; the ticket machines; the dead screens.
  for (let s = -7.6; s < 8.6; s += 0.9) if (Math.abs(s + 0.125) > 1) { d.kept.push(R.box(15.4, 16.6, s, s + 0.25, hi, hi + 1.0, MAT.metal)); d.decor.push(R.box(15.5, 15.7, s + 0.05, s + 0.2, hi + 1.0, hi + 1.12, MAT.screen)); }
  for (const t of [21, 23, 25, 27]) { d.kept.push(R.box(t - 0.6, t + 0.6, 8.3, 9, hi, hi + 1.8, MAT.metal)); d.decor.push(R.box(t - 0.4, t + 0.4, 8.27, 8.3, hi + 1.0, hi + 1.5, MAT.screen)); }
  for (const t of [6, 30]) d.decor.push(R.box(t - 1.5, t + 1.5, -7.98, -7.94, hi + 2.2, hi + 3.2, MAT.screen));
  scrawl(H, 14.6, 8.98, [0, -1], '人脸识别通道  FACE RECOGNITION GATES', 2.2);
  scrawl(H, 30, -7.92, [0, 1], '暂停服务 请等待接收  SERVICE SUSPENDED · WAIT TO BE COLLECTED', 3.4);
  put(H, 'counter', 31, 4.5, [-1, 0], 2.4, 1.0, 0.7);
  for (const [t, s] of [[19, 2], [22.5, -3], [27, 5.5], [8, -5]]) put(H, 'bag', t, s, [1, 0], 0.4, 0.4, 0.3);
  put(H, 'box', 23.2, -2.4, [1, 0], 0.5, 0.35, 0.4);
  // The staff corridor behind its south wall, come down between the control room and the rest.
  door(H, 'staff', 33, -8.3, 's', 'shut', { label: ['员工通道', 'Staff only'] });
  H.space(4, 40.4, -10.4, -8.6, hi, hi + 3);
  heap(H, 18, 21, -10.4, -8.6, hi + 3);
  // The control room: the console under the camera wall, the desk, its drawers out and papers everywhere; its
  // cabinet; the whiteboard. Its doors off the corridor and off the cable gallery both behind the card.
  H.space(4, 12.4, -17, -11, hi, hi + 3);
  door(H, 'control', 8, -10.7, 's', 'locked', { key: 'metrokey', label: ['车站控制室', 'Station control room'] });
  put(H, 'counter', 10.9, -11.6, [0, -1], 2.6, 0.9, 0.7);
  for (const t of [10.2, 11.6]) d.decor.push(R.box(t - 0.6, t + 0.6, -11.3, -11.25, hi + 0.9, hi + 1.4, MAT.screen));
  for (const [a, b] of [[-16.4, -15.2], [-14.9, -13.7], [-13.4, -12.2]]) d.decor.push(R.box(4.0, 4.05, a, b, hi + 1.2, hi + 2.6, MAT.screen));
  put(H, 'desk', 10.6, -16.5, [0, 1], 1.4, 0.76, 0.7, { id: 'drawers', zh: '控制室抽屉', en: 'Control room drawers', type: 'drawer', tier: 3 });
  put(H, 'cabinet', 4.4, -15.6, [1, 0], 0.9, 1.8, 0.45, { id: 'cabinet', zh: '控制室柜子', en: 'Control room cabinet', type: 'cabinet', tier: 3 });
  put(H, 'chair', 9.4, -15.6, [0, 1], 0.45, 0.9, 0.45, { fallen: true });
  for (const [t, s] of [[7.4, -14.6], [9.2, -13.4], [11.4, -14.2], [6.2, -16.2]]) put(H, 'papers', t, s, [1, 0], 0.5, 0.02, 0.4);
  scrawl(H, 12.38, -14, [-1, 0], '1号线防护门 · 卡在抽屉里  LINE 1 PROTECTIVE DOOR · CARD IN THE DRAWER', 1.7);
  scrawl(H, 12.38, -14, [-1, 0], '(没有了 GONE)', 1.3);
  mark(H, 'doc:metro', 10.6, -16.5, 0.76);
  mark(H, 'heart:metro', 8, -13.6);
  // The signal equipment room: its relay racks, where the sensors' feed goes now.
  H.space(13, 27.4, -17, -11, hi, hi + 3);
  door(H, 'signals', 24, -10.7, 's', 'shut', { label: ['信号设备室', 'Signal equipment room'] });
  for (let t = 14; t < 26; t += 1.6) put(H, 'rack', t, -16.6, [0, 1], 1.2, 2.0, 0.6);
  scrawl(H, 20, -11.02, [0, -1], '地震传感器数据 → 外部 13:40  SEISMIC SENSORS → REMOTE · 13:40');
  // The staff lockers: the duty assistant's with the maintenance key in it.
  H.space(28, 35.4, -17, -11, hi, hi + 3);
  door(H, 'lockers', 30, -10.7, 's', 'shut', { label: ['更衣室', 'Staff lockers'] });
  for (const t of [28.6, 29.3, 33.3, 34.0, 34.7]) put(H, 'locker', t, -16.7, [0, 1], 0.6, 1.9, 0.5, { id: `locker${Math.round(t * 10)}`, zh: '员工储物柜', en: 'Staff locker', type: 'locker', loot: 'bedroom', ...(t === 34.0 ? { items: [['metrokey', 1]] as [string, number][] } : {}) });
  put(H, 'clothes', 32.2, -12, [0, 1], 0.5, 0.15, 0.4);
  // The cable gallery behind them all, from the lockers to the control room's back door.
  H.space(4, 35, -19.6, -17.6, hi, hi + 2.2);
  door(H, 'cable', 31.5, -17.3, 's', 'jammed', { label: ['电缆通道', 'Cable gallery'] });
  door(H, 'back', 6, -17.3, 's', 'locked', { key: 'metrokey', label: ['控制室后门', 'Control room back door'] });
  for (let t = 5; t < 35; t += 3) d.decor.push(R.box(t, t + 2.9, -19.55, -19.3, hi + 1.4, hi + 1.5, MAT.metal), R.box(t, t + 2.9, -19.5, -19.35, hi + 1.5, hi + 1.6, MAT.cloth));
  // The staff stair: from the corridor's east end down to the hall's floor, out by a door in its wall by the tracks.
  H.space(36.6, 40.4, -13, -8.6, hi, hi + 3);
  H.space(40, 50, -13, -11, lo, hi + 3);
  stair(...R.rect(40, 50, -13, -11), lo, hi, R.down, d.kept, d.decor);
  B.space(49.6, 52.6, -13, -11, lo, lo + 3);
  B.space(50.8, 52, -11.2, -8.8, lo, lo + 2.1);
  door(B, 'track', 51.4, -10, 's', 'jammed', { label: ['员工楼梯', 'Staff stair'] });
  // Its ways in.
  mark(H, 'in:metro:deck', -1.5, 0);
  mark(B, 'in:metro:hall', 1, -7);
  mark(B, 'in:metro:tracks', L + 2, -4.5);
}
