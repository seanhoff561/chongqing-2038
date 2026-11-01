// Crafting at a workbench (M5-15): at the bench (his hideout's, or a table he's put a toolbox on), the bench's list
// opens; a recipe he has every part for takes its time while he stays at the bench, then the parts are used up and
// what it makes goes into his backpack (on the floor if it won't fit).
import type { SimState } from './types';
import type { World } from '../world/world';
import { DT } from './types';
import { recipe, type Recipe } from '../data/recipes';
import { item } from '../data/items';
import { onInteract, allInters } from './interact';
import { onCmd } from './commands';
import { addItem, takeStack, newUid } from './inventory';
import { isBench, shelterAt } from './shelter';
import { powered, POWER } from './power';

/** How near the bench he has to stay (m). */
export const CRAFT = { reach: 2.5 };

/** How many of an item he has in the backpack. */
export const countOf = (s: SimState, id: string) => s.inv.pack.items.filter(i => i.id === id).reduce((a, i) => a + i.n, 0);
/** The parts he's short of for a recipe, and how many of each. */
export const missing = (s: SimState, r: Recipe) => r.parts.flatMap(([id, n]) => (countOf(s, id) < n ? [[id, n - countOf(s, id)] as [string, number]] : []));
/** The workbench he's at, if any. */
/** The hideout the bench he's at is in, if any. */
const benchShelter = (s: SimState, w: World) => { const b = benchNear(s, w); return b ? shelterAt(s, b.x, b.y, b.z) : null; };
export const benchNear = (s: SimState, w: World) => allInters(s, w).find(i => isBench(s, i) && Math.hypot(i.x - s.player.pos.x, i.z - s.player.pos.z) < CRAFT.reach && Math.abs(i.y - s.player.pos.y) < 2);

onInteract('bench', { now: (s, _w, it) => { s.events.push({ t: 'bench', id: it.id }); } });

onCmd((s, c, w) => {
  if (c.c !== 'act' || c.name !== 'craft' || typeof c.arg !== 'string' || s.task) return;
  const r = recipe(c.arg);
  if (!r || !benchNear(s, w)) return;
  if (missing(s, r).length) { s.events.push({ t: 'msg', text: `missing parts for the ${item(r.id).en.toLowerCase()}` }); return; }
  if (r.power && !powered(benchShelter(s, w), POWER.job)) { s.events.push({ t: 'msg', text: 'it needs soldering: power at the bench (a car battery and an inverter in this hideout)' }); return; }
  s.task = { id: `craft:${r.id}`, t: 0, dur: r.secs };
});

function take(s: SimState, id: string, n: number) {
  for (const st of s.inv.pack.items.filter(i => i.id === id)) {
    const k = Math.min(n, st.n);
    st.n -= k; n -= k;
    if (st.n <= 0) takeStack(s.inv.pack, st.uid);
    if (n <= 0) return;
  }
}

/** Every tick: the making, while he's at the bench. */
export function stepCraft(s: SimState, w: World) {
  if (!s.task?.id.startsWith('craft:')) return;
  const r = recipe(s.task.id.slice(6))!;
  if (!benchNear(s, w)) { s.task = null; s.events.push({ t: 'msg', text: 'you left the bench: nothing made' }); return; }
  s.task.t += DT;
  if (s.task.t < s.task.dur) return;
  s.task = null;
  if (missing(s, r).length) return;
  for (const [id, n] of r.parts) take(s, id, n);
  if (r.power) { const h = benchShelter(s, w); if (h) h.battery = Math.max(0, h.battery - POWER.job); }
  const extra = r.charge ? { charge: r.charge } : {};
  if (addItem(s, s.inv.pack, r.id, 1, extra) > 0) { const p = s.player.pos; s.dropped.push({ stack: { uid: newUid(s), id: r.id, n: 1, x: 0, y: 0, rot: false, ...extra }, x: p.x, y: p.y, z: p.z }); }
  s.events.push({ t: 'msg', text: `made: ${item(r.id).en.toLowerCase()}` });
}

