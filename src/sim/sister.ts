// His sister's trail (M10-39, U-104, DESIGN section 2): as a run starts its seed picks the exit Xiaoyu has gone to (on
// a stream of its own, so no other draw moves), her notes are laid at the places on her way there (data/sister.ts),
// and she waits at the exit. E on her turns whether she'll leave with him; the run's ending says if she did
// (sim/escape.ts).
import type { SimState } from './types';
import type { World } from '../world/world';
import { TRAILS } from '../data/sister';
import { raycast } from '../world/geom';
import { free } from './physics';
import { makeRng, randInt, hashString } from './rng';
import { newUid } from './inventory';
import { extraInters, onInteract, START_SOUND } from './interact';

export const ROUTES = Object.keys(TRAILS);

/** The exit she's gone to in a run of this seed. */
export const sisterRoute = (seed: number) => ROUTES[randInt(makeRng(hashString(`${seed}:sister`)), ROUTES.length)];

/** A place by name: a world teleport's spot, or 'kind@name' the feature of that kind nearest it (facing out of its
 *  wall). */
export function place(w: World, at: string): { x: number; y: number; z: number; yaw: number } | undefined {
  const [kind, name] = at.includes('@') ? at.split('@') : ['', at], t = w.teleports.find(q => q.name === name);
  if (!t || !kind) return t;
  const f = w.features.filter(q => q.kind === kind).sort((a, b) => Math.hypot(a.x - t.x, a.z - t.z) - Math.hypot(b.x - t.x, b.z - t.z))[0];
  return f && { x: f.x, y: f.y, z: f.z, yaw: Math.atan2(f.nx ?? 0, f.nz ?? 0) };
}

/** Where something of hers is at a place: on her desk in the flat; else on the floor a step into the place from its
 *  spot (clear of what else lies there), or at the spot itself. */
export function trailSpot(w: World, at: string): { x: number; y: number; z: number; yaw: number } | undefined {
  const desk = at === 'desk' ? w.features.find(f => f.kind === 'xiaoyu:desk') : undefined;
  if (desk) return { x: desk.x, y: desk.y, z: desk.z, yaw: 0 };
  const t = place(w, at === 'desk' ? 'Li family flat' : at);
  if (!t) return undefined;
  const floor = (x: number, z: number) => { const h = raycast(w.index, x, t.y + 0.2, z, 0, -1, 0, 60); return h ? t.y + 0.2 - h.t : undefined; };
  const base = floor(t.x, t.z) ?? t.y, fx = -Math.sin(t.yaw), fz = -Math.cos(t.yaw);
  for (const [a, b] of [[0.8, 0], [0, 0.8], [0, -0.8]]) {
    const x = t.x + fx * a - fz * b, z = t.z + fz * a + fx * b, y = floor(x, z), d = Math.hypot(x - t.x, z - t.z);
    if (y === undefined || Math.abs(y - base) > 0.3 || !free(w.index, x, y + 0.05, z, 1.2)) continue;
    if (raycast(w.index, t.x, base + 0.5, t.z, (x - t.x) / d, 0, (z - t.z) / d, d)) continue;
    return { x, y, z, yaw: t.yaw };
  }
  return { x: t.x, y: base, z: t.z, yaw: t.yaw };
}

/** Lays her trail for the run: each note lying at its place (loose: not a trace of him), and her at the exit. */
export function layTrail(s: SimState, w: World, route = sisterRoute(s.seed)) {
  const T = TRAILS[route];
  for (const n of T.notes) {
    const q = trailSpot(w, n.at);
    if (q) s.dropped.push({ stack: { uid: newUid(s), id: n.id, n: 1, x: 0, y: 0, rot: false }, x: q.x, y: q.y, z: q.z, loose: true });
  }
  const q = trailSpot(w, T.waits);
  if (q) s.sister = { route, x: q.x, y: q.y, z: q.z, yaw: q.yaw + Math.PI };
}

/** Her, where she waits, sitting (standing once she'll come); in the boat, not there (M7-09). */
extraInters.push((s: SimState) => (s.sister && !s.sister.aboard ? [{ id: 'sister', kind: 'sister', x: s.sister.x, y: s.sister.y + 0.7, z: s.sister.z, r: 0.6, zh: '小雨', en: 'Xiaoyu' }] : []));

// (Turning to her: a rustle of her coat.)
START_SOUND.sister = () => 'rustle';

/** E on her: she'll leave with him, or (again) she won't. */
onInteract('sister', {
  now: s => {
    const x = s.sister;
    if (!x) return;
    x.with = !x.with;
    s.events.push({ t: 'msg', text: x.with ? 'Xiaoyu will come' : 'Xiaoyu stays' });
  },
});
