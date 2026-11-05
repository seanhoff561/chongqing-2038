// The key places' own insides (M10-38b, U-104), made by hand in their buildings' frames (city/handmade.ts: u along
// the long side from the stairwell's end, v across from its side; the street door at u = U). Each is laid out for
// what it was, its heart where what it's for is, ways round what came down, locks that want the right tool or a card
// found inside, and what's left in it telling what happened there in the takeover (its story document, data/
// documents.ts, in the container marked for it). The hospital, the police station and the electronics market here;
// the telecom exchange and the substation in insides2.ts.
import { handmade } from '../city/handmade';
import type { Lot } from '../city/buildings';

/** Yuzhong Hospital (23.6 x 11.2 m, 13 floors). The ground floor's A&E, its corridor come down in the middle, round
 *  it by the laundry corridor the staff left by or through the treatment rooms; the staff stair up from A&E to the
 *  wards floor, its corridor come down too, round it through Ward 4 under its motion sensor; the charge nurse's
 *  locker in the nurses' station holds her card and her night report; the card opens the pharmacy store (the
 *  heart) behind the dispensing counter, the weight plate across the floor in front of it, the way round it down the
 *  wall and behind the counter.
 *  The landing door onto the wards floor is buried; the mortuary stair comes up from the cellar into A&E. */
export const hospital: Lot['inside'] = (fr, from, out, look) => {
  const K = handmade(fr, from, out, look), { U, V } = K;
  // Ground floor.
  K.room(0, 0, 2.6, 6.1, 5.5, 'lobby'); // stair hall
  K.room(0, 0, 5.8, 6.1, V, 'store'); // porters' room, the cellar hatch in its floor
  K.room(0, 6.4, 2.7, 13.7, 5.5, 'corridor');
  K.heap(0, 9.0, 2.7, 11.0, 5.5);
  K.room(0, 6.4, 0, 16.7, 2.4, 'corridor'); // the laundry corridor
  K.room(0, 17.0, 0, U, 4.1, 'store'); // laundry
  K.room(0, 6.4, 5.8, 10.0, V, 'clinic');
  K.room(0, 10.3, 5.8, 13.7, V, 'clinic');
  K.room(0, 14.0, 4.4, U, V); // A&E
  K.flight(0, 18.6, V - 1.4, 23.2, V, '+u'); // the staff stair
  K.cellarStair(14.3, 6.8, 19.1, 8.1, '-u'); // up from the mortuary
  K.door(0, 6.25, 4.2, 'u', 'open');
  K.door(0, 1.5, 5.65, 'v', 'shut');
  K.door(0, 7.7, 5.65, 'v', 'shut');
  K.door(0, 10.15, 8.5, 'u', 'jammed');
  K.door(0, 12.4, 5.65, 'v', 'shut');
  K.door(0, 7.7, 2.55, 'v', 'open');
  K.door(0, 12.4, 2.55, 'v', 'shut');
  K.door(0, 16.85, 1.2, 'u', 'open');
  K.door(0, 19.0, 4.25, 'v', 'jammed');
  K.door(0, 13.85, 4.95, 'u', 'open');
  K.door(0, 13.85, 9.5, 'u', 'shut');
  K.vent(0, U + 0.12, 2.0, 'u', 'jammed', ['洗衣房通风口', 'Laundry vent'], 'vent');
  for (const u of [8.2, 12.0]) K.window(0, 'v1', u);
  K.window(0, 'v0', 20.3);
  // A&E: the desk by the door, the trolleys they came in on, empty, the chairs gone over.
  K.block(0, 'counter', 19.8, 5.2, 21.6, 5.8, 0.95, [0, 1]);
  for (const [u, v, down] of [[15.4, 10.4, 0], [17.0, 9.2, 1], [21.5, 8.6, 0]]) K.prop(0, 'bed', u, v, [1, 0], 2.0, 0.5, 1.0, !!down);
  for (const [u, v] of [[17.4, 5.6], [18.2, 5.0], [15.0, 9.0]]) K.prop(0, 'chair', u, v, [0, 1], 0.45, 0.9, 0.45, true);
  K.prop(0, 'papers', 20.4, 6.3, [1, 0], 0.5, 0.02, 0.4);
  K.scrawl(0, 14.02, 6.3, [1, 0], '不走救护车通道 → 洗衣房  NOT THE BAY · LAUNDRY WAY');
  // The laundry: bins and racks of sheets; what the staff dropped on the way out.
  K.put(0, 'crate', 18.2, 0.45, [0, 1], { zh: '布草箱', en: 'Linen bin' });
  K.put(0, 'rack', 21.4, 0.3, [0, 1]);
  for (const [u, v] of [[22.6, 3.2], [21.9, 2.6], [17.8, 3.4]]) K.prop(0, 'clothes', u, v, [1, 0], 0.6, 0.15, 0.5);
  K.prop(0, 'bag', 22.4, 1.2, [1, 0], 0.4, 0.4, 0.3);
  // Wards floor.
  K.room(1, 0, 2.9, 6.1, 5.5); // nurses' station
  K.room(1, 6.4, 4.4, U, 5.5, 'corridor');
  K.heap(1, 14.3, 4.4, 16.5, 5.5);
  K.room(1, 6.4, 5.8, 16.7, V, 'ward'); // Ward 4
  K.room(1, 0, 5.8, 6.1, V, 'ward'); // Ward 5
  K.room(1, 17.0, 5.8, U, V); // the stair's head
  K.room(1, 6.4, 0, 13.7, 4.1); // pharmacy
  K.room(1, 14.0, 0, 16.7, 4.1); // its store
  K.room(1, 17.0, 0, U, 4.1, 'store'); // records
  K.door(1, 0.6, 2.75, 'v', 'collapsed'); // off the stairwell's landing
  K.door(1, 6.25, 4.95, 'u', 'open');
  K.door(1, 3.0, 5.65, 'v', 'shut');
  K.door(1, 6.25, 8.5, 'u', 'shut');
  K.door(1, 8.0, 5.65, 'v', 'shut');
  K.door(1, 16.85, 8.5, 'u', 'jammed');
  K.door(1, 20.0, 5.65, 'v', 'open');
  K.door(1, 7.0, 4.25, 'v', 'shut');
  K.door(1, 13.85, 0.65, 'u', 'locked', { key: 'hospcard', label: ['药房库房', 'Pharmacy store'] });
  K.door(1, 20.0, 4.25, 'v', 'locked');
  for (const u of [9.0, 14.0]) K.window(1, 'v1', u);
  K.window(1, 'v1', 3.0);
  K.mark('pir', 1, 11.5, 8.5);
  K.mark('pir', 1, 3.0, 8.5);
  // The nurses' station: her desk, the night report and her card in her locker.
  K.put(1, 'desk', 3.0, 5.1, [0, -1]);
  K.prop(1, 'chair', 3.0, 4.4, [0, 1], 0.45, 0.9, 0.45, true);
  K.put(1, 'locker', 5.8, 3.6, [-1, 0], { zh: '护士长储物柜', en: "Charge nurse's locker", items: [['hospcard', 1]], doc: true });
  K.prop(1, 'papers', 2.2, 3.8, [1, 0], 0.5, 0.02, 0.4);
  // The pharmacy: the dispensing counter, the plate across the floor before it, the way round it by the wall; the
  // store behind.
  K.block(1, 'counter', 7.9, 1.3, 12.2, 1.9, 0.95, [0, 1]);
  K.mark('plate', 1, 10.0, 2.7, [1, 0]);
  K.scrawl(1, 6.42, 3.6, [1, 0], '靠墙走  KEEP TO THE WALL');
  K.put(1, 'shelf', 9.0, 0.2, [0, 1], { zh: '配药架', en: 'Dispensary shelf' });
  for (const v of [1.0, 2.8]) K.put(1, 'locker', 16.4, v, [-1, 0], { zh: '药柜', en: 'Drug cabinet' });
  K.put(1, 'shelf', 15.3, 3.9, [0, -1], { zh: '药品架', en: 'Pharmacy shelf' });
  K.mark('heart', 1, 15.3, 2.0);
  K.entry([[U - 0.8, 6.9], [14.4, 4.95], [12.4, 4.0], [12.4, 1.2], [7.7, 1.2], [7.7, 3.4], [5.6, 4.2]]);
  K.build();
};


/** The police station (20.2 x 11.9 m, 12 floors). The street door into the front office, the duty desk across it;
 *  the corridor behind come down in the middle, round it through the two interview rooms; the cell corridor along
 *  the back, its four cells standing open, the bars at its end onto the alley; the garage, its shutter onto the side
 *  street. Upstairs the corridor's come down too, round it through the dormitory and the duty sergeant's office,
 *  whose locker holds his card and the incident book; the card opens the armoury (the heart), its ceiling turret
 *  armed; the evidence room keeps the river police's boat key in its key cabinet. The stairwell came down between
 *  two upper floors: round it by two flights through the old files. */
export const police: Lot['inside'] = (fr, from, out, look) => {
  const K = handmade(fr, from, out, look), { U, V } = K;
  // Ground floor.
  K.room(0, 0, 2.6, 6.1, 5.5, 'lobby'); // stair hall
  K.room(0, 6.4, 4.4, 13.7, 5.5, 'corridor');
  K.heap(0, 9.2, 4.4, 11.0, 5.5);
  K.room(0, 6.4, 0, 9.9, 4.1); // interview 1
  K.room(0, 10.2, 0, 13.7, 4.1); // interview 2
  K.room(0, 14.0, 0, U, 4.1, 'workshop'); // garage
  K.room(0, 14.0, 4.4, U, V, 'office'); // front office
  K.room(0, 0, 5.8, 13.7, 8.2, 'corridor'); // cell corridor, the cellar hatch in its floor
  for (const u of [0, 3.5, 7.0, 10.5]) K.room(0, u, 8.5, u + 3.2, V); // cells
  K.cellarStair(8.6, 5.8, 13.4, 7.2, '-u');
  K.door(0, 6.25, 5.0, 'u', 'open');
  K.door(0, 3.0, 5.65, 'v', 'shut');
  K.door(0, 8.0, 4.25, 'v', 'shut');
  K.door(0, 12.0, 4.25, 'v', 'shut');
  K.door(0, 10.05, 2.0, 'u', 'jammed');
  K.door(0, 13.85, 5.0, 'u', 'open');
  K.door(0, 17.0, 4.25, 'v', 'shut');
  K.door(0, 13.85, 7.7, 'u', 'locked', { key: 'policecard', label: ['羁押区门', 'Custody door'] });
  for (const [u, lock] of [[1.6, 'open'], [5.1, 'shut'], [8.6, 'open'], [12.1, 'jammed']] as const) K.door(0, u, 8.35, 'v', lock, { label: ['牢门', 'Cell door'] });
  K.door(0, 17.0, -0.12, 'v', 'locked', { w: 2.4, h: 2.4, label: ['车库卷帘门', 'Garage shutter'], way: 'shutter', shutter: true });
  K.door(0, -0.12, 6.8, 'u', 'chained', { label: ['牢房铁栏', 'Cell-block bars'], way: 'bars' });
  for (const u of [8.0, 12.0]) K.window(0, 'v0', u);
  // The front office: the duty desk, the missing-person reports in heaps on it and under it.
  K.block(0, 'counter', 15.8, 6.6, 16.4, 11.6, 0.95, [1, 0]);
  K.prop(0, 'papers', 16.1, 8.0, [1, 0], 0.5, 0.02, 0.4, false, 0.95);
  for (const [u, v] of [[15.0, 9.4], [17.6, 5.2], [19.2, 10.8]]) K.prop(0, 'papers', u, v, [1, 0], 0.5, 0.02, 0.4);
  K.prop(0, 'chair', 15.0, 8.2, [1, 0], 0.45, 0.9, 0.45, true);
  K.scrawl(0, U - 0.02, 10.5, [-1, 0], '今日寻人 31  MISSING TODAY: 31');
  // The interview rooms: a table, two chairs, registration forms; the cells open, their bunks slept in.
  for (const u of [8.15, 11.95]) { K.block(0, 'table', u - 0.6, 1.65, u + 0.6, 2.35, 0.78, [0, 1]); K.prop(0, 'chair', u, 1.2, [0, 1], 0.45, 0.9, 0.45); K.prop(0, 'chair', u, 2.8, [0, -1], 0.45, 0.9, 0.45, true); K.prop(0, 'papers', u, 2.0, [1, 0], 0.4, 0.02, 0.3, false, 0.78); }
  for (const u of [1.6, 5.1, 8.6, 12.1]) { K.prop(0, 'bed', u, V - 0.55, [0, -1], 2.0, 0.45, 0.9); K.prop(0, 'bedroll', u, V - 0.55, [0, -1], 1.8, 0.1, 0.7, false, 0.45); }
  K.scrawl(0, 3.6, V - 0.02, [0, -1], '他们连警察也带走了  THEY TOOK US TOO');
  K.put(0, 'crate', 15.0, 0.4, [0, 1], { zh: '巡逻装备箱', en: 'Patrol kit crate' });
  // First floor.
  K.room(1, 0, 2.9, 6.1, 5.5, 'barracks'); // locker room
  K.room(1, 6.4, 4.4, U, 5.5, 'corridor');
  K.heap(1, 13.9, 4.4, 15.4, 5.5);
  K.room(1, 0, 5.8, 13.7, V, 'barracks'); // dormitory
  K.room(1, 6.4, 0, 9.9, 4.1, 'command'); // muster room
  K.room(1, 10.2, 0, 13.7, 4.1); // evidence room
  K.room(1, 14.0, 0, U, 4.1); // armoury
  K.room(1, 14.0, 5.8, U, V, 'command'); // duty sergeant's office
  K.door(1, 0.6, 2.75, 'v', 'shut');
  K.door(1, 6.25, 5.0, 'u', 'open');
  K.door(1, 3.0, 5.65, 'v', 'shut');
  K.door(1, 10.0, 5.65, 'v', 'shut');
  K.door(1, 8.0, 4.25, 'v', 'open');
  K.door(1, 12.0, 4.25, 'v', 'locked', { label: ['证物室', 'Evidence room'] });
  K.door(1, 13.85, 8.5, 'u', 'shut');
  K.door(1, 16.6, 5.65, 'v', 'jammed');
  K.door(1, 17.6, 4.25, 'v', 'locked', { key: 'policecard', label: ['枪械库', 'Armoury'] });
  K.scrawl(1, 6.42, 2.0, [1, 0], '奉命: 枪支一律交回枪械库  ORDER: ALL FIREARMS TO THE ARMOURY');
  K.put(1, 'desk', 17.0, V - 0.35, [0, -1]);
  K.put(1, 'locker', U - 0.25, 7.4, [-1, 0], { zh: '值班所长储物柜', en: "Duty sergeant's locker", items: [['policecard', 1]], doc: true });
  K.prop(1, 'chair', 17.0, V - 1.1, [0, 1], 0.45, 0.9, 0.45, true);
  K.put(1, 'cabinet', 11.95, 0.25, [0, 1], { zh: '钥匙柜', en: 'Key cabinet', items: [['boatkey', 1]] });
  for (const v of [1.4, 2.8]) K.put(1, 'crate', 13.3, v, [-1, 0], { zh: '证物箱', en: 'Evidence box' });
  for (const u of [15.2, 19.0]) K.put(1, 'rack', u, 0.25, [0, 1], { zh: '枪架', en: 'Gun rack' });
  K.put(1, 'locker', U - 0.25, 2.6, [-1, 0], { zh: '弹药柜', en: 'Ammunition locker' });
  K.mark('turret', 1, 17.1, 2.0);
  K.mark('heart', 1, 17.1, 2.0);
  // Round the stairwell where it came down (U-069): from the landing over it into the old files, down a flight, across,
  // down another, out onto the landing under it.
  const kb = fr.l.blocked;
  if (kb !== undefined && kb >= 3) {
    for (const k of [kb - 1, kb, kb + 1]) K.room(k, 0, 2.9, 6.1, V, 'store');
    K.door(kb + 1, 0.6, 2.75, 'v', 'shut');
    K.door(kb - 1, 0.6, 2.75, 'v', 'shut');
    K.flight(kb - 1, 0.9, 6.0, 5.6, 7.4, '+u');
    K.flight(kb, 0.4, 9.0, 5.1, 10.4, '-u');
    K.scrawl(kb + 1, 3.0, 2.92, [0, 1], '楼梯塌了 → 档案室  STAIRS GONE · THROUGH THE FILES');
  }
  K.entry([[U - 0.8, 7.2], [17.5, 5.5], [14.4, 5.0], [12.0, 5.0], [12.0, 2.0], [8.0, 2.0], [8.0, 5.0], [5.6, 5.0]]);
  K.build();
};

/** The electronics market (20.8 x 15.1 m, 18 floors). The ground floor a hall of stalls in rows, the street door at
 *  its end, the loading dock and its store behind, the escalator up stopped; the market office off the stairwell's
 *  first landing. Upstairs the floor's come down across the hall, cutting the stalls by the stairwell off from the
 *  escalator's head: stall 2-117 (the drone buyer, his notice in his crate) and the repair stall (its bolt cutters)
 *  on one side, the cold store the traders locked their stock in (the heart) on the other, its door chained. The
 *  "smoke detectors" in its ceilings are microphones. */
export const market: Lot['inside'] = (fr, from, out, look) => {
  const K = handmade(fr, from, out, look), { U, V } = K;
  // Ground floor.
  K.room(0, 0, 2.6, 6.1, 5.5, 'lobby'); // stair hall
  K.room(0, 0, 5.8, 6.1, V, 'store'); // the dock store, the cellar hatch in its floor
  K.room(0, 6.4, 0, U, V, 'shop'); // the hall of stalls
  K.cellarStair(8.0, 6.0, 12.8, 7.3, '-u');
  K.flight(0, 15.0, 12.6, 20.4, 14.0, '+u'); // the escalator, stopped
  for (const [u0, v0, u1, v1] of [[8.0, 3.4, 12.0, 4.0], [13.0, 3.4, 18.5, 4.0], [8.0, 10.8, 11.5, 11.4], [12.5, 10.8, 18.5, 11.4]]) K.block(0, 'counter', u0, v0, u1, v1, 0.95, [0, 1]);
  K.door(0, 6.25, 4.0, 'u', 'open');
  K.door(0, 3.0, 5.65, 'v', 'shut');
  K.door(0, 6.25, 10.0, 'u', 'shut');
  K.door(0, 1.5, V + 0.12, 'v', 'jammed', { w: 1.6, label: ['卸货口', 'Loading dock door'], way: 'dock' });
  for (const u of [10.0, 16.0]) K.window(0, 'v0', u);
  for (const [u, v] of [[9.0, 2.6], [14.5, 5.0], [17.2, 9.6], [10.4, 12.6]]) K.prop(0, 'box', u, v, [1, 0], 0.5, 0.35, 0.4);
  K.mark('acoustic', 0, 13.0, 8.0);
  // First floor.
  K.room(1, 0, 2.9, 6.1, V, 'office'); // the market office
  K.room(1, 6.4, 4.4, U, V, 'shop');
  K.heap(1, 13.2, 4.4, 15.0, V);
  K.room(1, 6.4, 0, 10.0, 4.1, 'shop'); // stall 2-117
  K.room(1, 10.3, 0, 13.9, 4.1, 'workshop'); // the repair stall
  K.room(1, 14.2, 0, U, 4.1); // the cold store
  K.door(1, 0.6, 2.75, 'v', 'shut');
  K.door(1, 6.25, 8.0, 'u', 'open');
  K.door(1, 8.2, 4.25, 'v', 'shut');
  K.door(1, 12.1, 4.25, 'v', 'shut');
  K.door(1, 10.15, 2.0, 'u', 'jammed');
  K.door(1, 18.0, 4.25, 'v', 'chained', { label: ['冷库', 'Cold store'] });
  K.put(1, 'crate', 8.2, 0.4, [0, 1], { zh: '2-117摊位货箱', en: 'Stall 2-117 crate', doc: true });
  K.prop(1, 'box', 7.2, 2.4, [1, 0], 0.5, 0.35, 0.4, true);
  K.put(1, 'crate', 12.1, 0.4, [0, 1], { zh: '修理摊工具箱', en: "Repair stall's tool crate", items: [['boltcutters', 1]] });
  for (const u of [15.4, 19.4]) K.put(1, 'rack', u, 0.25, [0, 1], { zh: '货架', en: 'Stock rack' });
  K.put(1, 'crate', U - 0.4, 2.6, [-1, 0], { zh: '货箱', en: 'Stock crate' });
  K.scrawl(1, 6.42, 6.0, [1, 0], '小声说话 轻轻走路  TALK QUIETLY · WALK QUIETLY');
  K.scrawl(1, 17.4, 4.08, [0, -1], '各摊存货 锁好  STALL STOCK · KEEP IT LOCKED');
  K.mark('acoustic', 1, 10.0, 9.0);
  K.mark('acoustic', 1, 18.0, 9.0);
  K.mark('heart', 1, 17.5, 2.0);
  K.entry([[U - 0.8, 8.86], [7.0, 8.86], [7.0, 4.0], [5.6, 4.0]]);
  K.build();
};
