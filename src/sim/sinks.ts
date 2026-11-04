// Running water (M4-96, U-069): a few of the city's sinks still run (kitchens', a few in each district). At one, F fills
// every empty bottle he carries with water, the tap running; with none to fill he drinks from it. A dry one coughs.
import type { SimState } from './types';
import { onInteract } from './interact';

/** How much a drink from the tap quenches. */
export const TAP = { drink: 15 };

onInteract('sink', {
  now: (s: SimState, _w, it) => {
    if (!it.data?.running) { s.events.push({ t: 'msg', text: 'dry' }); return; }
    const empty = s.inv.pack.items.filter(i => i.id === 'bottle');
    s.events.push({ t: 'sfx', id: 'water-run' }, { t: 'noise', x: it.x, y: it.y, z: it.z, r: 4, kind: 'tap' });
    if (!empty.length) { s.body.hydration = Math.min(100, s.body.hydration + TAP.drink); return; }
    let n = 0;
    for (const b of empty) { n += b.n; Object.assign(b, { id: 'water', made: s.time }); }
    s.events.push({ t: 'msg', text: `filled ${n} bottle${n > 1 ? 's' : ''} at the tap` });
  },
});
