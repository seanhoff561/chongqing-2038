// Prising with the crowbar (M5-23, DESIGN section 8): a parked scooter's battery cells out from under its deck, a few
// seconds' work heard 20 m round. (Doors, vent covers and an armoury's locked lockers and crates are prised in
// doors.ts and containers.ts.)
import { onInteract } from './interact';
import { addItem } from './inventory';
import { PRY } from './containers';

/** Seconds to prise a scooter's cells out. */
export const SCOOTER = { secs: 4 };

onInteract('scooter', {
  can: (s, it) => (s.wstate.searched[it.id] ? 'its battery is gone' : s.inv.pack.items.some(i => i.id === 'crowbar') ? null : 'its battery needs a crowbar to prise out'),
  dur: () => SCOOTER.secs,
  done: (s, _w, it) => {
    s.wstate.searched[it.id] = true;
    addItem(s, s.inv.pack, 'scootercells', 1);
    s.events.push({ t: 'noise', x: it.x, y: it.y, z: it.z, r: PRY.noise, kind: 'crowbar' }, { t: 'sfx', id: 'force' }, { t: 'msg', text: 'scooter cells out' });
  },
});
