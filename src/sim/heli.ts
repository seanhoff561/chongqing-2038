// The helicopter drop (M4-92, U-067). Seen by three machines or more in the last half minute and then gone into a
// building, he brings the troop helicopter: up from its garage it flies in over the roofs and hovers over that
// building, drops its squad of four humanoids onto the roof and circles with its searchlight while they sweep down
// the stairs floor by floor, every landing looked over; the robot dogs and crawler drones it brings go into the
// sewers and tunnels near it. The sweep done, or three minutes on, it flies off, and its squad is taken home.
import type { SimState } from './types';
import type { World } from '../world/world';
import { leave } from './alert';
import { unitPose } from './units';
import { raycast } from '../world/geom';
import { SCALE } from './clock';

type V3 = { x: number; y: number; z: number };
/** How many machines must have seen him, within how long (s); how high it hovers over the roof and how wide it
 *  circles (m); the longest sweep and the shortest time before it comes again (s); how far round the building the
 *  dogs and crawlers search underground (m). */
export const HELI = { seen: 3, within: 30, hover: 18, circle: 16, sweep: 330, again: 600, under: 300, /** s a floor's landing is looked over */ look: 3 };

/** The enterable building he's inside, if any: in its footprint, under its roof. */
export function buildingAt(w: World, at: V3): number {
  if (!raycast(w.index, at.x, at.y + 1.6, at.z, 0, 1, 0, 40)) return -1;
  return w.plots.findIndex(p => {
    if (p.far || !p.route || p.route.length < 2 || at.y < p.base - 1 || at.y > p.top) return false;
    const c = p.corners, side = (i: number) => { const a = c[i], b = c[(i + 1) % c.length]; return (b[0] - a[0]) * (at.z - a[1]) - (b[1] - a[1]) * (at.x - a[0]); };
    return c.every((_, i) => side(i) >= 0) || c.every((_, i) => side(i) <= 0);
  });
}

/** The stops down a building's way, one a floor: where it comes onto each new level. */
export function floorsOf(down: V3[]): number[] {
  const out: number[] = [];
  down.forEach((q, j) => { if (j && !out.some(k => Math.abs(down[k].y - q.y) < 1) && Math.abs(down[j - 1].y - q.y) < 0.3) out.push(j); });
  return out;
}

/** Ten times a second. */
export function stepHeli(s: SimState, w: World) {
  if (s.tick % 6) return;
  const team = s.units.filter(u => u.reserve?.drop), heli = team.find(u => u.kind === 'heli');
  if (!heli) return;
  const H = s.hive.heli;
  if (!H) {
    if (heli.dead || (s.hive.heliAt !== undefined && (s.time - s.hive.heliAt) / SCALE < HELI.again)) return;
    if (s.units.filter(u => !u.dead && u.saw !== undefined && (s.time - u.saw) / SCALE < HELI.within).length < HELI.seen) return;
    const b = buildingAt(w, s.player.pos);
    if (b < 0) return;
    const route = w.plots[b].route!, roof = route[route.length - 1];
    leave(s, w, heli, 'hunt', roof);
    const t = heli.trip!;
    t.path = [{ x: t.pos.x, y: t.pos.y + 60, z: t.pos.z }, { x: roof.x, y: roof.y + HELI.hover + 10, z: roof.z }, { x: roof.x, y: roof.y + HELI.hover, z: roof.z }];
    heli.sent = s.time;
    s.hive.heli = { plot: b, t: s.time, phase: 'fly' };
    s.hive.heliAt = s.time;
    return;
  }
  const route = w.plots[H.plot].route!, roof = route[route.length - 1], t = heli.trip;
  if (H.phase === 'fly') {
    if (heli.dead) { s.hive.heli = undefined; return; }
    if (!t || t.i < t.path.length) return;
    // Over the roof: the squad down the ropes onto it, then down the stairs, every landing looked over.
    H.phase = 'sweep'; H.from = s.time;
    team.filter(u => u.kind === 'humanoid' && !u.dead).forEach((u, k) => {
      const at = { x: roof.x + (k % 2 ? 1 : -1), y: roof.y, z: roof.z + (k < 2 ? 1 : -1) };
      // (Down the building's own way floor by floor, below, a look at each landing shorter than a search's 8 s: its
      // stairs aren't on the streets' graph.)
      u.trip = { kind: 'look', path: [{ ...roof }], i: 0, pos: at, yaw: 0, scan: 0, back: false, left: { ...roof }, leftAt: s.time };
      Object.assign(u, { state: 'suspicious', aware: 0.4, seen: undefined, sent: s.time });
    });
    // The dogs and crawlers into the sewers and tunnels round it, each from a drain to a few more.
    const below = w.features.filter(f => (f.kind === 'drain' || f.kind === 'underRoute' || f.kind === 'sump') && Math.hypot(f.x - roof.x, f.z - roof.z) < HELI.under)
      .sort((a, b) => Math.hypot(a.x - roof.x, a.z - roof.z) - Math.hypot(b.x - roof.x, b.z - roof.z));
    team.filter(u => (u.kind === 'quadruped' || u.kind === 'crawler') && !u.dead).forEach((u, k) => {
      const go = below.filter((_, i) => i % 6 === k % 6).slice(0, 4).map(f => ({ x: f.x, y: f.y, z: f.z }));
      if (!go.length) return;
      u.trip = { kind: 'look', path: [go[0]], i: 1, pos: { ...go[0] }, yaw: 0, scan: 0, back: false, left: { ...go[0] }, leftAt: s.time, visits: go.slice(1) };
      Object.assign(u, { state: 'suspicious', aware: 0.5, sent: s.time });
    });
    return;
  }
  if (H.phase === 'sweep') {
    const squad = team.filter(u => u.kind === 'humanoid');
    if (heli.dead || (s.time - H.from!) / SCALE > HELI.sweep || squad.every(u => u.dead || !u.trip || u.trip.back)) {
      H.phase = 'leave';
      if (t && !heli.dead) { const home = unitPose(w, { ...heli, trip: undefined }, s.time); Object.assign(t, { back: true, i: 0, path: [{ x: t.pos.x, y: t.pos.y + 30, z: t.pos.z }, { x: home.x, y: home.y + 60, z: home.z }, { ...t.left }] }); }
      return;
    }
    // The squad: each floor's landing looked over, then on down the stairs to the next.
    const down = route.slice().reverse(), stops = floorsOf(down);
    for (const u of squad) {
      const ut = u.trip;
      if (!ut || ut.back || ut.i < ut.path.length || ut.scan < HELI.look) continue;
      const at = down.findIndex(q => Math.hypot(q.x - ut.pos.x, q.z - ut.pos.z) < 1 && Math.abs(q.y - ut.pos.y) < 0.6), next = stops.find(j => j > Math.max(0, at));
      if (next === undefined) continue;
      Object.assign(ut, { path: down.slice(Math.max(0, at) + 1, next + 1).map(q => ({ ...q })), i: 0, scan: 0 });
    }
    // Circling the building with its searchlight down on it, a quarter turn every few seconds.
    if (t) {
      const a = ((s.time - H.from!) / SCALE) * 0.12;
      t.path = [{ x: roof.x + Math.cos(a) * HELI.circle, y: roof.y + HELI.hover, z: roof.z + Math.sin(a) * HELI.circle }]; t.i = 0;
      t.yaw = Math.atan2(roof.x - t.pos.x, roof.z - t.pos.z);
    }
    return;
  }
  // Gone home: it can come again later.
  if (!heli.trip) s.hive.heli = undefined;
}
