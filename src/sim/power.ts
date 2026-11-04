// A hideout's power (M5-27, DESIGN section 9): a car battery (out of an abandoned car, with what charge it still holds)
// wired in there, and an inverter, charge the laptop (laptop.ts) and run the bench's soldering iron for the electronics
// (craft.ts), each drawing the battery down; a solar charger set up there puts 5% a day back. Used in a hideout, each
// goes in; elsewhere they say where they go. A battery pack, used anywhere (U-104, M10-28), charges the laptop and
// everything he carries that takes a charge full, and is used up doing it.
import type { SimState, Shelter } from './types';
import { GAME_PER_TICK } from './clock';
import { onUseId, heldStack } from './use';
import { takeStack, type Stack } from './inventory';
import { item } from '../data/items';
import { shelterAt } from './shelter';

/** What the solar charger puts back a game day (percent); what an electronics job at the bench draws. */
export const POWER = { solar: 5, job: 5 };

/** Whether a hideout can power things: an inverter, and charge in its battery. */
export const powered = (h: Shelter | null, need = 0) => !!h && !!h.inverter && h.battery > need;

function fit(id: string, put: (h: Shelter, st: Stack) => string) {
  onUseId(id, (s, _w, st) => {
    const p = s.player.pos, h = shelterAt(s, p.x, p.y, p.z);
    if (!h) { return; }
    const text = put(h, st);
    takeStack(s.inv.pack, st.uid); s.inv.held = 0;
    s.events.push({ t: 'msg', text });
  });
}
fit('carbattery', (h, st) => { h.battery = Math.min(100, h.battery + (st.charge ?? 100)); return `car battery wired in: ${Math.round(h.battery)}%`; });
fit('inverter', h => { h.inverter = true; return 'inverter wired in: the battery can run things now'; });
fit('solar', h => { h.solar = true; return 'solar charger up: it trickles the battery back'; });

/** What carries a battery a pack charges, and what its charge reads as when it has never been set (percent). */
const CELLS: Record<string, number> = { headlamp: 100, phone: 0, jammer: 100, drone: 100 };

onUseId('battpack', (s, _w, st) => {
  const L = s.laptop, flat = s.inv.pack.items.filter(o => o.id in CELLS && (o.charge ?? CELLS[o.id]) < 100);
  if (!(L && L.charge < 1) && !flat.length) { s.events.push({ t: 'blocked', why: 'nothing needs charging' }); return; }
  const names = [...(L && L.charge < 1 ? ['laptop'] : []), ...new Set(flat.map(o => item(o.id).en.toLowerCase()))];
  if (L) L.charge = 1;
  for (const o of flat) o.charge = 100;
  const held = heldStack(s) === st;
  if (--st.n <= 0) { takeStack(s.inv.pack, st.uid); if (held) s.inv.held = 0; }
  s.events.push({ t: 'msg', text: `charged: ${names.join(', ')}` });
});

/** Every game minute: the solar chargers' trickle. */
export function stepPower(s: SimState) {
  if (s.tick % 60) return;
  for (const h of s.shelters) if (h.solar) h.battery = Math.min(100, h.battery + (POWER.solar * GAME_PER_TICK * 60) / 86400);
}
