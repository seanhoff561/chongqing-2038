// Escapes and endings (M7-01, M10-51, DESIGN sections 2 and 10): the routes' progress kept in the run (each step he's
// done, and when); an ending zone at a route's far end (world/yuzhong/exits.ts) ends the run with that route, his
// sister with him or not; and the run's tally for the ending's summary (days survived, how far he went, the machines
// he destroyed, the times they had him, the sites he got into, the documents he found, whether she came).
import type { SimState } from './types';
import type { World } from '../world/world';
import { dayOf } from './clock';
import { deleteSave, type Storage } from './save';
import { docById } from '../data/documents';
import { NOTES } from '../data/sister';

/** Every document's and note's id, for the tally. */
const PAPERS = new Set([...docById.keys(), ...NOTES.map(n => n.id)]);
/** The furthest he goes in half a second on his own (m): more is a teleport, not walked. */
const STRIDE = 25;

/** A route's step done (the routes' own features mark them). */
export function stepDone(s: SimState, route: string, step: string) {
  const r = ((s.escape ??= {})[route] ??= {});
  if (r[step] === undefined) r[step] = s.time;
}

/** The run ends on a route: with his sister if it's her exit and she said she'd come (M10-39); by the river, if she
 *  came down into the boat (M7-09); by the cableway, if she rode the cabin with him (M7-05); under the ground, if the
 *  water was pumped out (one oxygen kit: she can't swim it, M7-11). */
export function endRun(s: SimState, route: string) {
  if (s.ended || s.dead) return;
  const came = route === 'boat' || route === 'cable' ? !!s.sister?.aboard : route === 'tunnel' ? s.escape?.tunnel?.drained !== undefined : true;
  const sister = s.sister?.route === route && !!s.sister.with && came;
  s.ended = { route, t: s.time, sister };
  s.events.push({ t: 'ending', route, sister });
}

/** The run's tally: days survived, km gone, machines destroyed, times seen, sites got into, documents found, and
 *  whether his sister left with him. */
export const summary = (s: SimState) => ({
  days: dayOf(s.time) - 1, km: Math.round((s.stats?.dist ?? 0) / 100) / 10, kills: s.stats?.kills ?? 0, seen: s.stats?.seen ?? 0,
  sites: Object.keys(s.stats?.sites ?? {}).length, docs: Object.keys(s.stats?.docs ?? {}).length, sister: !!s.ended?.sister,
});

/** The run's tally, begun as needed. */
export const tally = (s: SimState) => (s.stats ??= { sites: {}, seen: 0, engaged: {} });

/** An ended run's save is gone, as a dead one's is. */
export function closeRun(st: Storage, s: SimState) { if (s.ended) deleteSave(st); }

const inBox = (b: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number }, p: { x: number; y: number; z: number }) => p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1 && p.z >= b.z0 && p.z <= b.z1;

/** Twice a second: an ending zone reached; a site got into; a district newly after him counted as a time seen; how far
 *  he's gone; a document he has. */
export function stepEscape(s: SimState, w: World) {
  if (s.tick % 30 || s.ended || s.dead) return;
  const p = s.player.pos, st = tally(s), d = st.at ? Math.hypot(p.x - st.at.x, p.y - st.at.y, p.z - st.at.z) : 0;
  if (d < STRIDE) st.dist = (st.dist ?? 0) + d;
  st.at = { x: p.x, y: p.y, z: p.z };
  for (const it of s.inv.pack.items) if (PAPERS.has(it.id)) (st.docs ??= {})[it.id] = true;
  for (const z of w.zones) {
    if (!inBox(z.box, p)) continue;
    if (z.kind.startsWith('ending:')) { endRun(s, z.kind.slice(7)); return; }
    if (z.kind.startsWith('site:')) st.sites[z.kind.slice(5)] = true;
  }
  for (const [d, D] of Object.entries(s.hive.districts)) {
    const on = D.state === 'engaged';
    if (on && !st.engaged[d]) st.seen++;
    st.engaged[d] = on;
  }
}
