// Chalk (U-053, in place of climbing gloves): with chalk in a bag in his pack his hands hold longer, hanging and pipes
// costing half; the bag runs down with every second he hangs (a full one lasts 10 minutes of it) and a chalk block
// crumbled in fills it again.
import { DT, type SimState } from './types';
import { onUseId, heldStack } from './use';
import { takeStack, type Stack } from './inventory';
import { movement as M } from '../data/movement';

/** The bag he's using: the emptiest one with chalk left, if any. */
function bag(s: SimState): Stack | null {
  let best: Stack | null = null;
  for (const st of s.inv.pack.items) if (st.id === 'chalk' && (st.charge ?? 100) > 0 && (!best || (st.charge ?? 100) < (best.charge ?? 100))) best = st;
  return best;
}

/** A tick hanging: the drain's share with chalked hands (1 without), the chalk used. */
export function chalkHands(s: SimState): number {
  const b = bag(s);
  if (!b) return 1;
  b.charge = Math.max(0, (b.charge ?? 100) - (100 / M.grip.chalkSecs) * DT);
  if (b.charge === 0) s.events.push({ t: 'msg', text: 'out of chalk' });
  return M.grip.chalk;
}

onUseId('chalkblock', s => {
  const st = heldStack(s)!, b = s.inv.pack.items.filter(i => i.id === 'chalk').sort((x, y) => (x.charge ?? 100) - (y.charge ?? 100))[0];
  if (!b) { return; }
  if ((b.charge ?? 100) >= 100) { return; }
  b.charge = 100;
  if (--st.n <= 0) takeStack(s.inv.pack, st.uid);
  s.events.push({ t: 'msg', text: 'chalk bag filled' });
});
