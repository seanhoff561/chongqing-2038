// The key places' own insides, continued (M10-38b, insides.ts): the telecom exchange and the substation.
import { handmade } from '../city/handmade';
import { FLOOR } from '../city/rooms';
import type { Lot } from '../city/buildings';

/** The telecom exchange (36.7 x 30.0 m, 13 floors; its stairwell came down over the first floor, so the stairwell
 *  reaches neither it nor anything over it from below). The street door into the gate hall, the turnstiles across
 *  it, the exchange's own stair up from it; the plant corridor west to the stairwell come down in the middle, round
 *  it through the generator room (its vent onto the yard; its diesel in the old fuel store), the battery room (a
 *  spare inverter) and the workshop. Upstairs the server hall (the heart: its gas, its terminal, the district's
 *  relay) between the upper hall and the cable gallery, both its doors on the card; Engineer Gao's locker in the
 *  duty room holds the spare card and his shift log. From the roof the stairwell ends at the second floor: the cable
 *  floor there, a flight down to the gallery, come down in the middle too, round it through the cable vault. */
export const telecom: Lot['inside'] = (fr, from, out, look) => {
  const K = handmade(fr, from, out, look), { U } = K;
  // Ground floor.
  K.room(0, 0, 2.6, 6.1, 5.5, 'lobby'); // stair hall
  K.room(0, 6.4, 4.4, 29.7, 5.5, 'corridor');
  K.heap(0, 17.0, 4.4, 19.0, 5.5);
  K.room(0, 6.4, 0, 14.0, 4.1, 'workshop'); // generator room
  K.room(0, 14.3, 0, 21.5, 4.1, 'store'); // battery room
  K.room(0, 21.8, 0, 29.7, 4.1, 'workshop');
  K.room(0, 30.0, 4.4, U, 19.6, 'lobby'); // gate hall
  K.room(0, 0, 14.6, 6.1, 18.2, 'store'); // the old fuel store, the cellar hatch in its floor
  K.flight(0, 30.1, 13.0, 31.5, 18.0, '+v');
  K.cellarStair(32.0, 6.0, 33.4, 10.8, '-v');
  K.block(0, 'counter', 30.0, 11.5, 35.0, 12.1, 1.0, [0, 1]); // the turnstiles
  K.door(0, 6.25, 5.0, 'u', 'open');
  K.door(0, 10.0, 4.25, 'v', 'shut');
  K.door(0, 14.15, 2.0, 'u', 'shut');
  K.door(0, 21.65, 2.0, 'u', 'jammed');
  K.door(0, 26.0, 4.25, 'v', 'open');
  K.door(0, 29.85, 5.0, 'u', 'shut');
  K.vent(0, 8.0, -0.12, 'v', 'jammed', ['发电机房通风口', 'Generator-room vent'], 'vent');
  for (const u of [18.0, 25.0]) K.window(0, 'v0', u);
  K.block(0, 'cabinet', 10.4, 1.6, 12.8, 3.0, 1.8, [0, 1]); // the generator
  K.prop(0, 'papers', 33.5, 15.0, [1, 0], 0.5, 0.02, 0.4);
  K.scrawl(0, U - 0.02, 8.0, [-1, 0], '出城流量: 0  OUTBOUND: ZERO');
  // First floor.
  K.room(1, 0, 2.9, 19.7, 7.0, 'store'); // the cable gallery
  K.heap(1, 9.0, 2.9, 10.6, 7.0);
  K.room(1, 0, 7.3, 19.7, 9.5, 'store'); // the cable vault behind it
  K.flight(1, 1.0, 5.4, 6.0, 6.8, '+u');
  K.door(1, 7.5, 7.15, 'v', 'shut');
  K.door(1, 16.0, 7.15, 'v', 'jammed');
  K.room(1, 20.0, 2.9, 29.7, 4.6, 'corridor');
  K.room(1, 30.0, 0, U, 4.6, 'office'); // the duty room
  K.room(1, 30.0, 4.9, U, 19.6, 'corridor'); // the upper hall
  K.room(1, 20.0, 4.9, 29.7, 17.0); // the server hall
  K.door(1, 19.85, 3.75, 'u', 'shut');
  K.door(1, 29.85, 3.75, 'u', 'open');
  K.door(1, 33.5, 4.75, 'v', 'shut');
  K.door(1, 25.0, 4.75, 'v', 'locked', { key: 'telcard', label: ['机房', 'Server hall'] });
  K.door(1, 29.85, 12.0, 'u', 'locked', { key: 'telcard', label: ['机房', 'Server hall'] });
  K.scrawl(1, 23.0, 4.58, [0, -1], '门一开 8秒放气  GAS 8 SECONDS AFTER THE DOOR');
  for (const v of [6.0, 8.3, 13.7, 16.0]) for (const u of [20.6, 28.5]) K.block(1, 'cabinet', u, v - 0.9, u + 0.6, v + 0.9, 2.0, [u < 25 ? 1 : -1, 0]);
  K.put(1, 'locker', U - 0.25, 2.0, [-1, 0], { zh: '高工的储物柜', en: "Engineer Gao's locker", items: [['telcard', 1]], doc: true });
  K.put(1, 'desk', 32.5, 0.35, [0, 1]);
  K.prop(1, 'chair', 32.5, 1.1, [0, -1], 0.45, 0.9, 0.45, true);
  K.prop(1, 'papers', 31.2, 2.8, [1, 0], 0.5, 0.02, 0.4);
  K.mark('hall', 1, 24.85, 11.0);
  K.mark('heart', 1, 24.85, 11.0);
  // The cable floor over it, off the stairwell's lowest landing from the roof.
  K.room(2, 0, 2.9, 8.0, 9.0, 'store');
  K.door(2, 0.6, 2.75, 'v', 'shut');
  // (Set out last, so the rest keep their ids: the generator's diesel in the old fuel store and a spare inverter in
  // the battery room, so every city has one of each where he can get to them, M7-14.)
  K.put(0, 'crate', 0.5, 16.4, [1, 0], { zh: '柴油桶箱', en: 'Fuel crate', items: [['jerrycan', 1]] });
  K.put(0, 'locker', 17.0, 3.85, [0, -1], { zh: '备件柜', en: 'Spares locker', items: [['inverter', 1]] });
  K.entry([[U - 0.8, 16.32], [35.8, 12.0], [34.5, 5.0], [30.6, 5.0], [27.0, 5.0], [26.0, 2.0], [18.0, 2.0], [10.0, 2.0], [10.0, 5.0], [5.6, 5.0]]);
  K.build();
};

/** Xinhua Road substation (44.9 x 19.9 m, 8 floors). The street door into the gatehouse; the transformer hall two
 *  floors high, the live busbars across it at 2.6 m, its steel stair up to the control room; its back fence gate
 *  chained; its roof come down at the east end, between the gatehouse and the stair, so round it past the busbars.
 *  The rest room's door onto the hall buried, round by the workshop (its tool crate, the bolt cutters) and the cable
 *  store, his father's locker there (his spare insulated gloves). Over the gatehouse the control room, the duty log
 *  in its desk, the Dongshuimen Bridge's sensor bus relay on its east wall (M7-02); behind it store cage B, chained,
 *  the relay cabinet in it holding the one spare HV fuse (the heart). */
export const substation: Lot['inside'] = (fr, from, out, look) => {
  const K = handmade(fr, from, out, look), { U, V } = K;
  // Ground floor.
  K.room(0, 0, 2.6, 6.1, 5.5, 'lobby'); // stair hall
  K.room(0, 0, 5.8, 6.1, V, 'store'); // battery room, the cellar hatch in its floor
  K.room(0, 6.4, 4.4, 13.7, V, 'office'); // rest room
  K.room(0, 6.4, 0, 13.7, 4.1, 'workshop');
  K.room(0, 14.0, 0, 24.0, 4.1, 'store'); // cable store
  K.room(0, 24.3, 0, 36.0, 4.1, 'workshop'); // switch room
  K.room(0, 14.0, 4.4, 36.0, V, null, { floors: 2 }); // the transformer hall
  K.room(0, 36.3, 8.0, U, V, 'office'); // gatehouse
  K.heap(0, 31.0, 11.0, 36.0, 12.6); // the hall's roof come down at its east end
  K.flight(0, 34.6, 5.0, 36.0, 10.0, '+v'); // the steel stair up to the control room
  K.cellarStair(36.5, 13.0, 41.3, 14.4, '+u');
  K.door(0, 6.25, 5.0, 'u', 'open');
  K.door(0, 3.0, 5.65, 'v', 'shut');
  K.door(0, 10.0, 4.25, 'v', 'shut');
  K.door(0, 13.85, 12.0, 'u', 'collapsed');
  K.door(0, 13.85, 2.0, 'u', 'jammed');
  K.door(0, 19.0, 4.25, 'v', 'shut');
  K.door(0, 24.15, 2.0, 'u', 'shut');
  K.door(0, 30.0, 4.25, 'v', 'shut');
  K.door(0, 36.15, 17.0, 'u', 'shut');
  K.door(0, 30.0, V + 0.12, 'v', 'chained', { w: 1.6, label: ['后围栏门', 'Back fence gate'], way: 'gate' });
  K.put(0, 'crate', 8.0, 0.4, [0, 1], { zh: '工具箱', en: 'Tool crate', items: [['boltcutters', 1]] });
  for (const v of [9.0, 12.4]) K.block(0, 'cabinet', 18.0, v, 20.4, v + 2.6, 2.2, [1, 0]); // transformers
  for (const u of [22.0, 22.6, 23.2]) K.put(0, 'locker', u, 4.65, [0, 1], { zh: '馈线柜', en: 'Feeder panel' });
  // The last of them the cableway's, the first the metro's (its pumps: M7-11): each its fuse carrier, the blown
  // cartridge in it (the spare fitted, sim/cablecar.ts).
  for (const [u, id, zh, en, sign, route] of [[23.2, 'cable-feeder', '索道馈线熔断器', 'Cableway feeder fuse', '索道 10kV  CABLEWAY 10 kV', 'cable'], [22.0, 'metro-feeder', '地铁馈线熔断器', 'Metro feeder fuse', '地铁 10kV  METRO 10 kV', 'tunnel']] as const) {
    const [fx, fz] = fr.at(u, 5.0);
    out.inter.push({ id, kind: 'feeder', x: fx, y: fr.base + 1.5, z: fz, r: 0.3, zh, en, data: { route, live: id } });
    K.scrawl(0, u, 4.92, [0, 1], sign, 1.85);
  }
  K.mark('busbar', 0, 27.0, 13.0);
  K.scrawl(0, 19.0, 4.42, [0, 1], '母线带电 弯腰过  BUSBAR LIVE · KEEP LOW');
  K.prop(0, 'bag', 31.0, V - 0.6, [0, -1], 0.4, 0.4, 0.3);
  // First floor, over the gatehouse.
  K.room(1, 36.3, 4.4, U, V, 'command'); // the control room
  K.room(1, 36.3, 0, U, 4.1, 'store'); // store cage B
  K.door(1, 36.15, 9.5, 'u', 'shut');
  K.door(1, 40.5, 4.25, 'v', 'chained', { label: ['B号库笼', 'Store cage B'] });
  K.put(1, 'drawer', 39.0, V - 0.25, [0, -1], { zh: '值班台抽屉', en: 'Duty desk drawer', doc: true });
  K.put(1, 'cabinet', 42.5, 0.25, [0, 1], { zh: '继电保护柜', en: 'Relay cabinet', items: [['hvfuse', 1]] });
  // Li Guorong's locker in the rest room, his name on it, his spare gloves on the hook (M7-02).
  K.put(0, 'locker', 13.45, 7.0, [-1, 0], { zh: '李国荣的储物柜', en: "Li Guorong's locker", items: [['insgloves', 1]] });
  K.scrawl(0, 13.68, 7.0, [-1, 0], '李国荣  LI GUORONG', 2.05);
  // The bridge's sensor bus comes in here: its relay cabinet, live (sim/bridge.ts).
  K.block(1, 'cabinet', U - 0.6, 6.0, U, 7.4, 2.0, [-1, 0]);
  K.scrawl(1, U - 0.62, 6.7, [-1, 0], '东水门大桥 传感总线  DONGSHUIMEN BRIDGE SENSOR BUS', 2.3);
  const [rx, rz] = fr.at(U - 0.8, 6.7);
  out.inter.push({ id: 'bridge-relay', kind: 'busrelay', x: rx, y: fr.base + FLOOR + 1.3, z: rz, r: 0.5, zh: '桥梁传感总线继电器', en: 'Bridge sensor bus relay' });
  K.mark('heart', 1, 40.6, 2.0);
  K.entry([[U - 0.8, 11.26], [42.5, 16.0], [37.0, 17.0], [35.2, 17.0], [33.0, 6.0], [19.0, 5.2], [19.0, 2.0], [10.0, 2.0], [10.0, 5.0], [5.6, 5.0]]);
  K.build();
};
