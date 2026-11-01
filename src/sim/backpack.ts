// The hiking pack (M5-30): used, he swaps his school-bag backpack for it: a 10 x 7 grid, everything he carried moved
// across where it was (the new grid's bigger every way, so it all still fits).
import { onUseId } from './use';
import { takeStack } from './inventory';

/** The hiking pack's grid. */
export const HIKING = { w: 10, h: 7 };

onUseId('hikingpack', (s, _w, st) => {
  const g = s.inv.pack;
  if (g.w >= HIKING.w && g.h >= HIKING.h) { s.events.push({ t: 'msg', text: 'already carrying the hiking pack' }); return; }
  takeStack(g, st.uid);
  if (s.inv.held && s.inv.hotbar[s.inv.held - 1] === st.uid) s.inv.held = 0;
  g.w = HIKING.w; g.h = HIKING.h;
  s.events.push({ t: 'msg', text: 'everything moved into the hiking pack: 10 x 7' });
});
