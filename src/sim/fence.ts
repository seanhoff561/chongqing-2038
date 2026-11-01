// Chain-link fences (M5-25b, DESIGN section 8): bolt cutters, held to its bottom a few seconds, cut a gap through the
// mesh low enough to crawl through, quietly (the snips heard close by). Without them it's a climb.
import { onInteract } from './interact';
import { has } from './inventory';
import { doorSolid } from './doors';

/** Seconds to cut the gap, and how far the snipping's heard (m). */
export const FENCE = { cut: 4, noise: 6 };

onInteract('fence', {
  label: (s, it) => (s.wstate.open[it.id] ? ['铁丝网（已剪开）', 'Chain-link fence (cut)'] : ['剪开铁丝网', 'Cut through the fence']),
  can: (s, it) => (s.wstate.open[it.id] ? 'cut already: crawl through' : has(s.inv.pack, 'boltcutters') ? null : 'chain-link: bolt cutters would cut it'),
  dur: () => FENCE.cut,
  done: (s, w, it) => {
    s.wstate.open[it.id] = true;
    if (doorSolid(it) >= 0) w.index.off[doorSolid(it)] = 1;
    s.events.push({ t: 'noise', x: it.x, y: it.y, z: it.z, r: FENCE.noise, kind: 'cut' }, { t: 'msg', text: 'a gap cut: crawl through' });
  },
});
