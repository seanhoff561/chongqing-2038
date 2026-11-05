// Escapes and endings (M7-01, DESIGN sections 11 and 13): the routes' progress kept in the run (each step he's done,
// and when); an ending zone at a route's far end ends the run with that route; and the run's summary (days survived,
// the sites he got into, the times the machines had him), for the ending's screen and death's.
import type { SimState } from './types';
import type { World } from '../world/world';
import { dayOf } from './clock';
import { deleteSave, type Storage } from './save';

/** The four endings: each route's id, its name, and where it leaves him. */
export const ENDINGS: Record<string, { zh: string; en: string }> = {
  bridge: { zh: '桥下', en: 'Beneath the Bridge' }, cable: { zh: '索道', en: 'The Cable' },
  boat: { zh: '雾中', en: 'Into the Fog' }, tunnel: { zh: '隧道尽头', en: "Tunnel's End" },
};

/** A route's step done (the routes' own features mark them). */
export function stepDone(s: SimState, route: string, step: string) {
  const r = ((s.escape ??= {})[route] ??= {});
  if (r[step] === undefined) r[step] = s.time;
}

/** The run ends on a route: with his sister if it's her exit and she said she'd come (M10-39). */
export function endRun(s: SimState, route: string) {
  if (s.ended || s.dead) return;
  const sister = s.sister?.route === route && !!s.sister.with;
  s.ended = { route, t: s.time, sister };
  s.events.push({ t: 'ending', route, sister });
}

/** Days survived, sites got into, times seen. */
export const summary = (s: SimState) => ({ days: dayOf(s.time) - 1, sites: Object.keys(s.stats?.sites ?? {}).length, seen: s.stats?.seen ?? 0 });

/** An ended run's save is gone, as a dead one's is. */
export function closeRun(st: Storage, s: SimState) { if (s.ended) deleteSave(st); }

const inBox = (b: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number }, p: { x: number; y: number; z: number }) => p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1 && p.z >= b.z0 && p.z <= b.z1;

/** Twice a second: an ending zone reached; a site got into; a district newly after him counted as a time seen. */
export function stepEscape(s: SimState, w: World) {
  if (s.tick % 30 || s.ended || s.dead) return;
  const p = s.player.pos, st = (s.stats ??= { sites: {}, seen: 0, engaged: {} });
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
