// Doors: open and close with E; their collision solid switches with them. Locked doors need their key; a lock is
// forced with the crowbar and a jammed door shouldered, held and loud; a chain is prised or cut with the crowbar or
// bolt cutters; a collapsed doorway holds (M3-36, U-066). Windows' glass breaks out the same.
import type { SimState } from './types';
import type { World, Inter } from '../world/world';
import { onInteract } from './interact';
import { has } from './inventory';
import { lockWay, lockDone } from './locks';
import { overlaps } from '../world/geom';
import { boxAt } from './physics';
import { movement as M } from '../data/movement';

export const doorSolid = (it: Inter) => it.data?.solid as number;

/** Make the collision index match the dynamic world state (after load, or after a change): doors open, windows
 *  broken (M3-36), grates up (M3-72), rubble cleared (M4-24), fences cut (M5-25b), the site's loose planks fallen (M6-10). */
export function syncWorld(s: SimState, w: World) {
  for (const it of w.inter) {
    if (it.kind !== 'door' && it.kind !== 'window' && it.kind !== 'grate' && it.kind !== 'rubble' && it.kind !== 'fence' && it.kind !== 'looseplank') continue;
    if (it.data?.shutter) { raiseShutter(s, w, it); continue; }
    if (doorSolid(it) >= 0) w.index.off[doorSolid(it)] = s.wstate.open[it.id] ? 1 : 0;
  }
}

/** A roller shutter (M5-23b): prised up with the crowbar, slowly and loudly, enough to crawl under (its solid starting
 *  that far off the ground); bent, it goes no further and won't come down. */
export const SHUTTER = { pry: 3.5, gap: 0.7, noise: 20 };
function raiseShutter(s: SimState, w: World, it: Inter) {
  const b = w.index.solids[doorSolid(it)];
  if (!b) return;
  const y0 = ((it.data!.y0 as number | undefined) ??= b.y0);
  b.y0 = y0 + (s.wstate.open[it.id] ? SHUTTER.gap : 0);
  w.index.off[doorSolid(it)] = 0;
}

/** Seconds to shoulder a jammed door (M3-36), or prise one nailed shut (M5-18); locks and chains: locks.ts. */
const FORCE: Record<string, number> = { jammed: 1, pinned: 2 };
const lockOf = (s: SimState, it: Inter) => (s.wstate.pinned?.[it.id] ? 'pinned' : s.wstate.unlocked?.[it.id] ? undefined : (it.data?.lock as string | undefined));

function swing(s: SimState, w: World, it: Inter, loud = false) {
  const open = !s.wstate.open[it.id], lock = lockOf(s, it);
  if (!open) {
    // Don't shut a door on him.
    w.index.off[doorSolid(it)] = 0;
    const p = s.player;
    if (overlaps(w.index, boxAt(p.pos.x, p.pos.y, p.pos.z, M.height[p.posture]))) { w.index.off[doorSolid(it)] = 1; return; }
  }
  s.wstate.open[it.id] = open;
  if (open && s.wstate.pinned) delete s.wstate.pinned[it.id];
  if (it.data?.key || it.data?.lock) (s.wstate.unlocked ??= {})[it.id] = true;
  w.index.off[doorSolid(it)] = open ? 1 : 0;
  s.events.push({ t: 'sfx', id: loud ? 'force' : open ? 'door-open' : 'door-close' });
  // (Forced: 20 m with the crowbar, M5-23; a jammed door shouldered, 14.)
  s.events.push({ t: 'noise', x: it.x, y: it.y, z: it.z, r: loud ? (lock === 'jammed' ? 14 : 20) : 4, kind: loud ? 'force' : 'door' });
}

onInteract('door', {
  can: (s, it) => {
    if (it.data?.shutter) return s.wstate.open[it.id] ? 'prised up: crawl under it' : has(s.inv.pack, 'crowbar') ? null : 'a roller shutter, locked down: prise it up with a crowbar';
    if (s.wstate.open[it.id]) return null;
    const lock = lockOf(s, it);
    if (lock === 'collapsed') return 'collapsed';
    // Nailed shut (M5-18): prised with the crowbar.
    if (lock === 'pinned') return has(s.inv.pack, 'crowbar') ? null : 'nailed shut';
    // Its lock by its grade (M5-24): a card, the cloner, picks, the crowbar or bolt cutters.
    const way = lockWay(s, it, lock);
    return typeof way === 'string' ? way : null;
  },
  // Forced, picked or cloned: held; forced is loud.
  dur: (s, it) => {
    if (it.data?.shutter) return SHUTTER.pry;
    if (s.wstate.open[it.id]) return 0;
    const lock = lockOf(s, it), way = lockWay(s, it, lock);
    return lock === 'jammed' || lock === 'pinned' ? FORCE[lock] : typeof way === 'string' ? 0 : way.secs;
  },
  done: (s, w, it) => {
    if (it.data?.shutter) {
      s.wstate.open[it.id] = true;
      raiseShutter(s, w, it);
      s.events.push({ t: 'sfx', id: 'force' }, { t: 'noise', x: it.x, y: it.y, z: it.z, r: SHUTTER.noise, kind: 'force' });
      return;
    }
    const lock = lockOf(s, it), way = lockWay(s, it, lock), quiet = typeof way !== 'string' && !way.loud && lock !== 'jammed' && lock !== 'pinned';
    if (typeof way !== 'string') lockDone(s, it, way.how);
    swing(s, w, it, !quiet);
  },
  now: (s, w, it) => swing(s, w, it),
});

// A window's glass (M3-36): broken out, held, loud; bars hold.
onInteract('window', {
  can: (s, it) => (s.wstate.open[it.id] ? 'broken' : null),
  dur: () => 0.5,
  done: (s, w, it) => {
    s.wstate.open[it.id] = true;
    w.index.off[doorSolid(it)] = 1;
    s.events.push({ t: 'sfx', id: 'glass' });
    s.events.push({ t: 'noise', x: it.x, y: it.y, z: it.z, r: 18, kind: 'glass' });
  },
});

/** A rubble fall (the start hideout's passage stub east): how long a crowbar takes to clear it (s), how far it's heard. */
export const RUBBLE = { clear: 6, noise: 20 };

// Cleared with a crowbar, slowly and loudly, a way on past it.
onInteract('rubble', {
  can: (s, it) => (s.wstate.open[it.id] ? 'cleared already' : has(s.inv.pack, 'crowbar') ? null : 'it needs a crowbar'),
  dur: () => RUBBLE.clear,
  done: (s, w, it) => {
    s.wstate.open[it.id] = true;
    if (doorSolid(it) >= 0) w.index.off[doorSolid(it)] = 1;
    s.events.push({ t: 'msg', text: 'the rubble cleared: the old passage runs on' }, { t: 'noise', x: it.x, y: it.y, z: it.z, r: RUBBLE.noise, kind: 'crowbar' });
  },
});
