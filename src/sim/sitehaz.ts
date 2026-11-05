// The construction site's hazards (M6-10, DESIGN section 9). Its loose scaffold planks: walked over they hold, but
// run onto one and it tips out from under him (loud), down to whatever's below. And the tower crane, left on
// autopilot when the work stopped: round and round its cycle it lifts a skip of rebar off the ground, carries it out
// along the jib and lowers it onto the top slab, and back; in its way, it hits him hard. And the hoist's cage, still
// powered, rides him down from its top landing, loudly.
import type { SimState } from './types';
import type { World, Feature } from '../world/world';
import { damage } from './body';
import { onInteract, START_SOUND } from './interact';
import { SCALE } from './clock';
import { teleport } from './player';

/** Faster than this over a loose plank (m/s, a sprint) and it goes; how far its fall's heard. The crane's load: its
 *  cycle (real seconds: held at the pick-up, up, out, down, held on the slab, up, back, down), its half-size (m: along
 *  the jib, across, up), and what it does to him (hp). */
export const SITEHAZ = { run: 5, noise: 25, /** the hoist's ride down (s) and how far its motor's heard (m) */ ride: 8, hoistNoise: 35, cycle: [12, 10, 14, 8, 12, 8, 14, 10], half: [1.2, 0.6, 0.6], hit: 70 };

/** The load's three points, from the world's features (site.ts): picked up from, carried at, set down on. */
const pts = new WeakMap<World, { pick: Feature; drop: Feature; high: number } | null>();
function crane(w: World) {
  if (!pts.has(w)) {
    const pick = w.features.find(f => f.kind === 'crane:pick'), drop = w.features.find(f => f.kind === 'crane:drop'), high = w.features.find(f => f.kind === 'crane:high');
    pts.set(w, pick && drop && high ? { pick, drop, high: high.y } : null);
  }
  return pts.get(w)!;
}

/** Where the crane's load is at a game time, and whether it's moving. */
export function craneLoad(w: World, time: number) {
  const c = crane(w);
  if (!c) return null;
  const C = SITEHAZ.cycle, T = C.reduce((a, b) => a + b, 0), { pick: a, drop: b, high } = c;
  // (The legs' ends: on the ground, up over it, out over the slab, down on it; then the same back.)
  const ends = [{ x: a.x, y: a.y, z: a.z }, { x: a.x, y: high, z: a.z }, { x: b.x, y: high, z: b.z }, { x: b.x, y: b.y, z: b.z }];
  const legs: [number, number][] = [[0, 0], [0, 1], [1, 2], [2, 3], [3, 3], [3, 2], [2, 1], [1, 0]];
  let t = (((time / SCALE) % T) + T) % T, k = 0;
  while (t >= C[k]) { t -= C[k]; k++; }
  const [i, j] = legs[k], f = t / C[k], e = f * f * (3 - 2 * f), p = ends[i], q = ends[j];
  return { x: p.x + (q.x - p.x) * e, y: p.y + (q.y - p.y) * e, z: p.z + (q.z - p.z) * e, moving: i !== j, yaw: Math.atan2(b.z - a.z, b.x - a.x) };
}

/** Every tick: a loose plank under him at a run, and the crane's load. */
export function stepSite(s: SimState, w: World) {
  if (s.dead) return;
  const p = s.player;
  if (p.onGround && Math.hypot(p.vel.x, p.vel.z) > SITEHAZ.run) {
    for (const it of planks(w)) {
      if (s.wstate.open[it.id]) continue;
      const b = w.index.solids[it.data!.solid as number];
      if (!b || Math.abs(p.pos.y - b.y1) > 0.15 || p.pos.x < b.x0 - 0.2 || p.pos.x > b.x1 + 0.2 || p.pos.z < b.z0 - 0.2 || p.pos.z > b.z1 + 0.2) continue;
      s.wstate.open[it.id] = true;
      w.index.off[it.data!.solid as number] = 1;
      p.onGround = false;
      s.events.push({ t: 'noise', x: it.x, y: it.y, z: it.z, r: SITEHAZ.noise, kind: 'crash' }, { t: 'msg', text: 'a loose plank tipped out from under you' });
    }
  }
  const L = craneLoad(w, s.time);
  if (!L?.moving) return;
  // (In the load's box, turned along the jib: struck.)
  const dx = p.pos.x - L.x, dz = p.pos.z - L.z, c = Math.cos(L.yaw), sn = Math.sin(L.yaw), u = dx * c + dz * sn, v = -dx * sn + dz * c, [hu, hv, hy] = SITEHAZ.half;
  if (Math.abs(u) > hu + 0.3 || Math.abs(v) > hv + 0.3 || p.pos.y > L.y + hy || p.pos.y + 1.7 < L.y - hy) return;
  if ((s.siteHit ?? -Infinity) > s.time - 3 * SCALE) return;
  s.siteHit = s.time;
  damage(s, SITEHAZ.hit, 'crane');
  s.events.push({ t: 'hurt', dmg: SITEHAZ.hit, cause: 'crane' }, { t: 'noise', x: L.x, y: L.y, z: L.z, r: 20, kind: 'crash' }, { t: 'msg', text: "the crane's load swung into you" });
  // Knocked off his feet, away from it.
  const d = Math.hypot(dx, dz) || 1;
  p.vel.x = (dx / d) * 5; p.vel.z = (dz / d) * 5; p.vel.y = 2; p.onGround = false;
}

const plankList = new WeakMap<World, World['inter']>();
const planks = (w: World) => plankList.get(w) ?? (plankList.set(w, w.inter.filter(i => i.kind === 'looseplank' && typeof i.data?.solid === 'number')), plankList.get(w)!);

// (Looked at, a loose plank gives itself away; tried, it knocks. The hoist's cage clanks shut.)
START_SOUND.looseplank = () => 'knock';
START_SOUND.hoist = () => 'latch';
onInteract('looseplank', {
  can: (s, it) => (s.wstate.open[it.id] ? 'gone' : 'it rocks underfoot: walk it, don\'t run'),
});

// The hoist (M6-10): from its top landing, its cage down to the ground, slow, and its motor heard all round.
onInteract('hoist', {
  dur: () => SITEHAZ.ride,
  done: (s, _w, it) => {
    const to = it.data!.to as { x: number; y: number; z: number };
    teleport(s.player, to.x, to.y, to.z);
    s.events.push({ t: 'noise', x: it.x, y: it.y, z: it.z, r: SITEHAZ.hoistNoise, kind: 'hoist' }, { t: 'msg', text: 'the hoist ground its way down: heard all round' });
  },
});
