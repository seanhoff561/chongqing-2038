// The district relay node (M6-14): the telecom exchange's rack carries its district's machines' word to each other
// and the hive. Its fibre cut (bolt cutters, held, loud), for two game hours the district's machines can't pass on
// what they've seen: one that has him still has him, but the rest aren't told (sim/district.ts).
import type { SimState } from './types';
import { onInteract, START_SOUND } from './interact';
import { has } from './inventory';
import { districtOf } from './district';

/** Seconds to cut it; game hours it's down; how far the cutting's heard (m). */
export const RELAY = { cut: 4, down: 2, noise: 15 };

export const relayDown = (s: SimState, district: string) => (s.relayDown?.[district] ?? -1) > s.time;

START_SOUND.relay = () => 'latch';
onInteract('relay', {
  can: (s, it) => (relayDown(s, districtOf(it.x, it.z)) ? 'cut' : has(s.inv.pack, 'boltcutters') ? null : 'its fibre: cut with bolt cutters'),
  dur: () => RELAY.cut,
  done: (s, _w, it) => {
    (s.relayDown ??= {})[districtOf(it.x, it.z)] = s.time + RELAY.down * 3600;
    s.events.push({ t: 'sfx', id: 'force' }, { t: 'noise', x: it.x, y: it.y, z: it.z, r: RELAY.noise, kind: 'force' }, { t: 'msg', text: "Anna: the relay's down. They can't talk to each other here for a while" });
  },
});
