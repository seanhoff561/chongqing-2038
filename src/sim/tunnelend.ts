// Route D under the city (M7-11, DESIGN section 10): Line 1's extension past the crossover (world/yuzhong/lineend.ts).
// Its protective door opens to its card (or a clone of it) quietly, to the angle grinder slowly and loudly, or to a
// breaching charge set against it, which goes off ten seconds later. Past it the water stands over the roof of the
// dip; once the station's pumps run (their panel, with the metro's feeder live: sim/metro.ts) it goes down, dry in two
// minutes. The seismic sensors on the track bed from Jiefangbei's hall to the end feel anything faster than a slow
// walk: his footfall gives him away.
import type { SimState } from './types';
import type { World, Inter } from '../world/world';
import { onInteract, START_SOUND } from './interact';
import { has, consume } from './inventory';
import { heldStack } from './use';
import { hasCard, LOCKS, lockDone } from './locks';
import { doorSolid } from './doors';
import { stepDone } from './escape';
import { blast } from './strike';
import { giveAway } from './district';
import { SCALE } from './clock';

/** The door: seconds with the card, the grinder, setting the charge; the charge's fuse (s), its blast's reach (m) and
 *  harm, how far it and the grinder are heard (m). */
export const BLAST = { card: 2, grind: 30, set: 5, fuse: 10, reach: 6, damage: 200, noise: 250, grinder: 60 };
/** Real seconds the pumps take to clear the water. */
export const PUMPS = { drain: 120 };
/** The sensors: faster than this on his feet (m/s) is felt; how often they're read (ticks). */
export const SEISMIC = { fast: 2.0, every: 20 };

/** How he'd open the door now: its card, the cloner held, the grinder or the charge held, else either in his pack. */
function way(s: SimState, it: Inter): 'card' | 'clone' | 'grind' | 'charge' | null {
  const held = heldStack(s)?.id;
  if (hasCard(s, it.data!.key as string)) return 'card';
  if (held === 'cloner') return 'clone';
  if (held === 'grinder' || held === 'breach') return held === 'grinder' ? 'grind' : 'charge';
  return has(s.inv.pack, 'grinder') ? 'grind' : has(s.inv.pack, 'breach') ? 'charge' : null;
}

function open(s: SimState, w: World, it: Inter) {
  s.wstate.open[it.id] = true;
  if (doorSolid(it) >= 0) w.index.off[doorSolid(it)] = 1;
  stepDone(s, 'tunnel', 'door');
}

START_SOUND.blastdoor = () => 'latch';
onInteract('blastdoor', {
  can: (s, it) => (s.wstate.open[it.id] ? 'open' : s.escape?.tunnel?.charge !== undefined ? 'the charge is set' : way(s, it) ? null : 'a protective door: its card reader'),
  dur: (s, it) => ({ card: BLAST.card, clone: LOCKS.clone, grind: BLAST.grind, charge: BLAST.set })[way(s, it) ?? 'card'],
  done: (s, w, it) => {
    const how = way(s, it);
    if (how === 'charge') {
      consume(s.inv.pack, 'breach');
      stepDone(s, 'tunnel', 'charge');
      s.events.push({ t: 'msg', text: 'the charge is set: get clear' });
      return;
    }
    if (how === 'clone') lockDone(s, it, 'clone');
    open(s, w, it);
    s.events.push({ t: 'sfx', id: how === 'grind' ? 'force' : 'door-open' }, { t: 'noise', x: it.x, y: it.y, z: it.z, r: how === 'grind' ? BLAST.grinder : 8, kind: how === 'grind' ? 'grinder' : 'door' });
  },
});

const doors = new WeakMap<World, Inter | null>(), seismic = new WeakMap<World, World['zones']>();

/** The water's top now: full, or going down since the pumps started. */
export function floodLevel(s: SimState, w: World): number {
  const F = w.flood!, t = s.escape?.tunnel?.pumps;
  return t === undefined ? F.top : Math.max(F.bottom, F.top - ((F.top - F.bottom) * (s.time - t)) / SCALE / PUMPS.drain);
}

/** Every tick, before he moves: the water where this run has it; the charge going off; the sensors read. */
export function stepTunnelEnd(s: SimState, w: World) {
  if (!w.flood) return;
  const y = floodLevel(s, w);
  for (const b of w.flood.boxes) b.y1 = y;
  if (y <= w.flood.bottom) stepDone(s, 'tunnel', 'drained');
  if (!doors.has(w)) doors.set(w, w.inter.find(i => i.kind === 'blastdoor') ?? null);
  const it = doors.get(w), set = s.escape?.tunnel?.charge;
  if (it && set !== undefined && !s.wstate.open[it.id] && (s.time - set) / SCALE >= BLAST.fuse) {
    open(s, w, it);
    blast(s, w, { x: it.x, y: it.y, z: it.z }, BLAST, BLAST.noise);
  }
  const p = s.player;
  if (s.tick % SEISMIC.every || s.dead || p.mode !== 'ground' || Math.hypot(p.vel.x, p.vel.z) <= SEISMIC.fast) return;
  if (!seismic.has(w)) seismic.set(w, w.zones.filter(z => z.kind === 'seismic'));
  const q = p.pos;
  if (seismic.get(w)!.some(({ box: b }) => q.x >= b.x0 && q.x <= b.x1 && q.y >= b.y0 && q.y <= b.y1 && q.z >= b.z0 && q.z <= b.z1)) giveAway(s, w, { x: q.x, y: q.y, z: q.z });
}
