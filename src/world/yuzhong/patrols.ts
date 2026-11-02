// The machines' beats as walked (M4-01, U-024, U-028): the street patrols the network laid along the main roads
// (M3-37) and each district's own along its main streets, each given its walker (delivery robots on the flat ones, quadrupeds and humanoids on the rest) and its
// detours off the clear street: into an alley to look behind the bins, in at a street door to a building's ground
// floor, pausing there before coming back out; the drones drop into alleys off their lines. And beats under the
// ground: a quadruped through the underground city's halls and passages, a humanoid along the Grand Tunnel past the
// friends' stub, waiting at the metro's end.
import { raycast, overlaps } from '../geom';
import { DWELL, ALIVE } from '../../data/units';
import type { World, Patrol, Camera, Plot } from '../world';
import { districtAt } from './lots';
import { heightAt } from '../heightfield';
import { GEO } from '../geo';
import { navPath } from '../../sim/nav';

/** The districts given beats of their own, the streets those run, and the side streets beats break off along. */
const DISTRICTS = ['jiefangbei', 'jiaochangkou', 'shibati', 'xiaoshizi', 'hongyadong', 'chaotianmen'];
const MAIN = new Set(['primary', 'secondary', 'tertiary']);
const SIDE = new Set(['residential', 'service', 'footway', 'path', 'pedestrian', 'living_street', 'steps', 'unclassified', 'tertiary']);
const SIDE_ONLY = new Set([...SIDE].filter(k => !MAIN.has(k)));

type V3 = { x: number; y: number; z: number };

/** How thick the machines are (M4-57, U-051: the main streets all but certain death, the side streets as busy as the
 *  main streets were): on a main street a pair every `main` metres round its beat (a squad of three on each district's
 *  longest), on a side street one walker every `side` metres; side streets within `sideR` of a district's centre and
 *  longer than `sideMin`, up to `sides` of them a district; a turret on the lamppost at each main junction there. */
const CROWD = { main: 120, side: 300, squad: 3, sideMin: 50, sideR: 250, sides: 12, turretGap: 60, /** the steepest a side street a delivery robot takes may be */ wheels: 0.12 };
/** How many colossi walk the city (U-050). */
const GIANTS = { colossi: 3 };
/** How many spider robots live in each district's sewers, and how far out from its centre (U-069). */
const CRAWLERS = { per: 6, r: 450 };
/** The drones everywhere (U-065): how many more a district, how far out, how many stops a loop, how long each scan (s). */
/** The roaming drones (U-065, U-103): how many a district, how far out, stops on a loop, seconds scanning at each;
 *  the street drones' height over the street; the tallest roof (over its ground) they stop over; how high in a gap. */
/** The tallest a roof a drone's dock goes on (over its ground, U-103). */
const DOCK_ROOF = 40;
const SKY = { per: 12, r: 350, stops: 8, scan: 5, street: 9, roof: 28, gap: [7, 12] };

/** A building's middle. */
const centre = (q: { corners: [number, number][] }) => ({ x: q.corners.reduce((a, c) => a + c[0], 0) / q.corners.length, z: q.corners.reduce((a, c) => a + c[1], 0) / q.corners.length });

/** Whether nothing stands between a and b, up off them by `up`. */
function clear(w: World, a: V3, b: V3, up: number) {
  const d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  return d < 0.1 || !raycast(w.index, a.x, a.y + up, a.z, (b.x - a.x) / d, (b.y - a.y) / d, (b.z - a.z) / d, d);
}

/** A drone's leg clear for its whole body (U-103: flown low among the buildings): five lines a drone's width apart
 *  through nothing, and 2 m or more over the ground all along. */
function airway(w: World, a: V3, b: V3) {
  const d = Math.hypot(b.x - a.x, b.z - a.z) || 1, nx = -(b.z - a.z) / d, nz = (b.x - a.x) / d, g = w.ground!;
  for (const [o, up] of [[0, 0], [0.6, 0], [-0.6, 0], [0, 0.5], [0, -0.5]]) if (!clear(w, { x: a.x + nx * o, y: a.y, z: a.z + nz * o }, { x: b.x + nx * o, y: b.y, z: b.z + nz * o }, up)) return false;
  for (let k = 0, n = Math.ceil(d / 4); k <= n; k++) { const t = k / n, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t; if (a.y + (b.y - a.y) * t < (heightAt(g, x, z) ?? -Infinity) + 2) return false; }
  return true;
}

/** A point ALIVE.face m out from the nearest building wall within 40 m of q, at the wall's middle height, and the way
 *  back to the wall from there. */
function faceNear(w: World, q: V3): { at: V3; yaw: number } | null {
  let best: { at: V3; yaw: number } | null = null, bd = 40;
  for (const p of w.plots) {
    if (p.far) continue;
    const c = centre(p), n = p.corners.length;
    if (Math.hypot(c.x - q.x, c.z - q.z) > 120) continue;
    for (let k = 0; k < n; k++) {
      const [ax, az] = p.corners[k], [bx, bz] = p.corners[(k + 1) % n], l = Math.hypot(bx - ax, bz - az);
      if (l < 6) continue;
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, d = Math.hypot(mx - q.x, mz - q.z);
      if (d >= bd) continue;
      let nx = (bz - az) / l, nz = -(bx - ax) / l;
      if (nx * (mx - c.x) + nz * (mz - c.z) < 0) { nx = -nx; nz = -nz; }
      const gy = heightAt(w.ground!, mx + nx * ALIVE.face, mz + nz * ALIVE.face) ?? q.y - 20;
      if (p.top - gy < 8) continue;
      bd = d; best = { at: { x: mx + nx * ALIVE.face, y: Math.min(p.top - 2, Math.max(gy + 6, (gy + p.top) / 2)), z: mz + nz * ALIVE.face }, yaw: Math.atan2(-nx, -nz) };
    }
  }
  return best;
}

/** Whether a walker can go straight from a to b: nothing in the way at 1 m up, and ground under b. */
function straight(w: World, a: V3, b: V3) {
  if (!clear(w, a, b, 1)) return false;
  const down = raycast(w.index, b.x, b.y + 1, b.z, 0, -1, 0, 3);
  return !!down && Math.abs(down.t - 1) < 0.6;
}

/** Whether a walker can walk straight from a to b: straight (above), no steeper than a stair, and floor under its
 *  line every 4 m. */
function walkable(w: World, a: V3, b: V3) {
  // (No steeper than a stair, 0.8 up a metre along, and its middle looked under at least.)
  const run = Math.hypot(b.x - a.x, b.z - a.z);
  if (Math.abs(b.y - a.y) > 0.8 * run + 0.5 || !straight(w, a, b)) return false;
  const n = Math.max(2, Math.floor(run / 4));
  for (let k = 1; k < n; k++) {
    const f = k / n, x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f, z = a.z + (b.z - a.z) * f, h = raycast(w.index, x, y + 1.5, z, 0, -1, 0, 3);
    if (!h) return false;
  }
  return true;
}

/** A walker's spot out of anything solid it's sunk into (a plaza's or a podium's deck over the ground the street was
 *  drawn on): up to the first clear height within 4 m, on the floor there; else as it was. */
function lift(w: World, q: V3): V3 {
  const body = (y: number) => overlaps(w.index, { x0: q.x - 0.15, y0: y + 0.3, z0: q.z - 0.15, x1: q.x + 0.15, y1: y + 1.5, z1: q.z + 0.15 });
  if (!body(q.y)) return q;
  for (let dy = 0.25; dy <= 4; dy += 0.25) if (!body(q.y + dy)) { const h = raycast(w.index, q.x, q.y + dy + 0.3, q.z, 0, -1, 0, dy + 0.6); return { ...q, y: h ? q.y + dy + 0.3 - h.t : q.y + dy }; }
  return q;
}

/** A spot set down on the floor under it (within 2.5 m). */
const onFloor = (w: World, q: V3) => { const h = raycast(w.index, q.x, q.y + 1.5, q.z, 0, -1, 0, 4); return h ? { ...q, y: q.y + 1.5 - h.t } : q; };

/** Of a walker's line, the longest stretch it can walk: each point clear of anything, each step between them open
 *  (where a street as drawn runs into a block's base, or a route underground cuts through the rock at a bend, the beat
 *  stops short of it). Its first and last index, or null if there's none. */
function longest(w: World, line: V3[]): [number, number] | null {
  const ok = line.map(q => !overlaps(w.index, { x0: q.x - 0.15, y0: q.y + 0.3, z0: q.z - 0.15, x1: q.x + 0.15, y1: q.y + 1.5, z1: q.z + 0.15 }));
  let best: [number, number] = [0, -1];
  for (let i = 0; i < line.length;) {
    if (!ok[i]) { i++; continue; }
    let j = i;
    while (j + 1 < line.length && ok[j + 1] && clear(w, line[j], line[j + 1], 1)) j++;
    if (j - i > best[1] - best[0]) best = [i, j];
    i = j + 1;
  }
  return best[1] > best[0] ? best : null;
}

/** A walker's way along points (underground), set down every 5 m and cut to its longest walkable stretch. */
function walkedLine(w: World, r: V3[]): V3[] {
  const line: V3[] = [];
  r.forEach((q, i) => {
    if (i) { const a = r[i - 1], n = Math.floor(Math.hypot(q.x - a.x, q.z - a.z) / 5); for (let k = 1; k < n; k++) line.push(onFloor(w, { x: a.x + ((q.x - a.x) * k) / n, y: a.y + ((q.y - a.y) * k) / n, z: a.z + ((q.z - a.z) * k) / n })); }
    line.push(q);
  });
  const b = longest(w, line);
  return b ? line.slice(b[0], b[1] + 1) : [];
}

/** A flyer's beat with every leg through something (a tower in its way) taken over the top instead: up 6 m over the
 *  highest roof under the leg, across, and down again (M4-29). */
function flyOver(w: World, p: Patrol): Patrol {
  const pts: V3[] = [], dwell: number[] = [], look: Record<number, number> = {};
  // (A stop inside something, a street running under a building, is held over its roof instead.)
  // (The highest thing within a drone's width of the point: one at a building's very edge goes over it, M6-22.)
  const top1 = (x: number, z: number) => { const h = raycast(w.index, x, 600, z, 0, -1, 0, 600); return h ? 600 - h.t : -Infinity; };
  const top = (x: number, z: number) => Math.max(top1(x, z), top1(x - 0.6, z - 0.6), top1(x + 0.6, z - 0.6), top1(x - 0.6, z + 0.6), top1(x + 0.6, z + 0.6));
  const stops = p.pts.map(q => (overlaps(w.index, { x0: q.x - 0.3, y0: q.y - 0.3, z0: q.z - 0.3, x1: q.x + 0.3, y1: q.y + 0.3, z1: q.z + 0.3 }) ? { ...q, y: top(q.x, q.z) + 6 } : q));
  stops.forEach((q, i) => {
    const a = stops[i - 1];
    if (a && !clear(w, a, q, 0)) {
      let y = Math.max(a.y, q.y);
      for (let k = 0, n = Math.max(2, Math.ceil(Math.hypot(q.x - a.x, q.z - a.z) / 8)); k <= n; k++) y = Math.max(y, top(a.x + ((q.x - a.x) * k) / n, a.z + ((q.z - a.z) * k) / n) + 6);
      pts.push({ ...a, y }, { ...q, y }); dwell.push(0, 0);
    }
    pts.push(q); dwell.push(p.dwell[i]);
    if (p.look?.[i] !== undefined) look[pts.length - 1] = p.look[i];
  });
  return { ...p, pts, dwell, ...(p.look ? { look } : {}) };
}

export function walkedBeats(w: World, base: Patrol[], tunnel: [V3, V3]): Patrol[] {
  // The bins and crates to look behind: the alleys' and the streets' (their hiding spots, M3-47).
  const hides = w.hides.filter(h => h.kind === 'crate' || h.kind === 'dumpster' || h.kind === 'drum').map(h => ({ x: (h.inner.x0 + h.inner.x1) / 2, y: h.inner.y0, z: (h.inner.z0 + h.inner.z1) / 2 }));
  const doors = w.plots.filter(p => !p.far && p.route && p.route.length > 1).map(p => [p.route![0], p.route![1]] as [V3, V3]);
  const g = w.ground!, sides = w.streets.filter(st => SIDE.has(st.kind));
  /** What a walker stops to look at: the bins, the street doors, and down the side streets where they leave it. */
  const sights = hides.concat(doors.map(([door]) => door), sides.flatMap(st => [st.pts[Math.min(1, st.pts.length - 1)], st.pts[Math.max(0, st.pts.length - 2)]]).map(([x, z]) => ({ x, y: heightAt(g, x, z) ?? 0, z })));
  /** From a point on a side street: beside the bins in an alley within 15 m, or in at a door within 20 m. */
  const toAlley = (q: V3): V3[] | null => {
    for (const h of hides) {
      const d = Math.hypot(q.x - h.x, q.z - h.z);
      if (d > 15 || d < 1.5) continue;
      const by = { x: h.x + ((q.x - h.x) / d) * 1.2, y: h.y, z: h.z + ((q.z - h.z) / d) * 1.2 };
      if (walkable(w, q, by)) return [by];
    }
    return null;
  };
  const toDoor = (q: V3): V3[] | null => { for (const [door, inside] of doors) if (Math.hypot(door.x - q.x, door.z - q.z) < 20 && walkable(w, q, door) && walkable(w, door, inside)) return [door, inside]; return null; };
  // The districts' own beats (M4-57): every main street within 300 m of their centres walked by pairs, a squad on the
  // longest, a drone over it; and their side streets within 250 m by walkers on their own. (A street's stretch is
  // walked once, by the first district to take it.)
  const district: Patrol[] = [], heavies: Patrol[] = [], giants: Patrol[] = [], taken = new Set<string>();
  const len = (r: V3[]) => r.slice(1).reduce((a, q, i) => a + Math.hypot(q.x - r[i].x, q.z - r[i].z), 0);
  const beat = (r: V3[], unit: Patrol['unit'], every: number, size: number): Patrol =>
    ({ kind: 'street', unit, pts: r, dwell: r.map((_, i) => (i === 0 || i === r.length - 1 ? DWELL.end : 0)), hours: [0, 24], crowd: { n: Math.max(1, Math.round((2 * len(r)) / every)), size } });
  const colossi: V3[][] = [];
  /** A street's line with a point every 10 m on the ground, so a giant's feet keep to it over the rises. */
  const along = (r: V3[]) => r.flatMap((q, i) => {
    if (!i) return [q];
    const a = r[i - 1], n = Math.max(1, Math.round(Math.hypot(q.x - a.x, q.z - a.z) / 10));
    return Array.from({ length: n }, (_, k) => { const x = a.x + ((q.x - a.x) * (k + 1)) / n, z = a.z + ((q.z - a.z) * (k + 1)) / n; return { x, y: heightAt(g, x, z) ?? q.y, z }; });
  });
  const giant = (r: V3[], unit: Patrol['unit'], wait: number): Patrol => { const pts = along(r); return { kind: 'street', unit, pts, dwell: pts.map((_, i) => (i === 0 || i === pts.length - 1 ? DWELL.end * wait : 0)), hours: [0, 24] }; };
  for (const k of DISTRICTS) {
    const L = GEO.landmarks[k];
    /** The district's stretches of these kinds of street within r of its centre, not yet taken, longest first. */
    const stretches = (kinds: Set<string>, r: number, min: number) => {
      const runs: { pts: V3[]; keys: string[] }[] = [];
      w.streets.forEach((st, si) => {
        if (!kinds.has(st.kind)) return;
        let run: V3[] = [], keys: string[] = [];
        [...st.pts, [Infinity, Infinity] as [number, number]].forEach(([x, z], j) => {
          if (Math.hypot(x - L.x, z - L.z) < r && !taken.has(`${si}:${j}`)) { run.push({ x, y: heightAt(g, x, z) ?? 0, z }); keys.push(`${si}:${j}`); }
          else { if (run.length > 1) runs.push({ pts: run, keys }); run = []; keys = []; }
        });
      });
      const out = runs.filter(q => len(q.pts) > min).sort((a, b) => len(b.pts) - len(a.pts));
      for (const q of out) for (const key of q.keys) taken.add(key);
      return out.map(q => q.pts);
    };
    const mains = stretches(MAIN, 300, 60);
    mains.forEach((r, i) => district.push(beat(r, 'quadruped', CROWD.main, i === 0 ? CROWD.squad : 2)));
    // A street heavy (U-038) up and down the longest, day and night: too big for alleys and doors, it keeps to the road.
    const long = mains[0];
    if (long && len(long) > 120) heavies.push({ kind: 'street', unit: 'heavy', pts: long, dwell: long.map((_, i) => (i === 0 || i === long.length - 1 ? DWELL.end * 2 : 0)), hours: [0, 24] });
    // A giant spider (U-050) picking its way up and down the next longest, day and night, keeping to the road.
    const next = mains[1];
    if (next && len(next) > 80) giants.push(giant(next, 'spider', 2));
    if (long && len(long) > 200) colossi.push(long);
    // A drone up and down it, day and night, down among the buildings 9 m over the street (U-103).
    if (long) district.push({ kind: 'drone', unit: 'drone', pts: long.map(q => ({ ...q, y: q.y + SKY.street })), dwell: long.map(() => 0), hours: [0, 24], crowd: { n: 2, size: 1 } });
    // (Its flattest side street, gentle enough for wheels, a delivery robot's: M4-29, M4-34.)
    const sides = stretches(SIDE_ONLY, CROWD.sideR, CROWD.sideMin).slice(0, CROWD.sides);
    // (Its steepest over any 8 m of it: close-set points make a bump look like a cliff.)
    const grade = (r: V3[]) => Math.max(0, ...r.map((a, i) => { let d = 0, j = i; while (j + 1 < r.length && d < 8) { d += Math.hypot(r[j + 1].x - r[j].x, r[j + 1].z - r[j].z); j++; } return d >= 8 ? Math.abs(r[j].y - a.y) / d : 0; }));
    const flat = sides.filter(r => grade(r) <= CROWD.wheels).sort((a, b) => grade(a) - grade(b))[0];
    for (const r of sides) district.push(r === flat ? { kind: 'street', unit: 'delivery', pts: r, dwell: r.map((_, i) => (i === 0 || i === r.length - 1 ? DWELL.end : 0)), hours: [0, 24] } : beat(r, 'quadruped', CROWD.side, 1));
  }
  // And the three longest main streets in the city each walked by a colossus (U-050), slow, nine metres tall.
  for (const r of colossi.sort((a, b) => len(b) - len(a)).slice(0, GIANTS.colossi)) giants.push(giant(r, 'colossus', 3));
  let street = 0;
  const out = base.concat(district).map((p): Patrol => {
    // A drone drops into an alley now and then, to 6 m over the bins, hangs there, and climbs back to its line. It
    // charges on a dock on a roof within 150 m of where its beat starts (M4-08), in its own district: the tallest of the low ones, not up on
    // a tower (U-103).
    if (p.kind === 'drone') {
      // (Its own district's first; then a low roof, the tallest; else the lowest tower.)
      const s0 = p.pts[0], home = districtAt(s0.x, s0.z).district, score = (q: Plot) => (districtAt(centre(q).x, centre(q).z).district === home ? 1e4 : 0) + (q.top - q.base <= DOCK_ROOF ? q.top : -q.top);
      const roof = w.plots.filter(q => !q.far && Math.hypot(centre(q).x - s0.x, centre(q).z - s0.z) < 150).sort((a, b) => score(b) - score(a))[0];
      let dock: number | undefined;
      if (roof) { const c = centre(roof); dock = w.docks.length; w.docks.push({ x: c.x, y: roof.top + 2.3, z: c.z }); w.props.push({ kind: 'dronedock', x: c.x, y: roof.top, z: c.z, yaw: 0 }); }
      const pts: V3[] = [], dwell: number[] = [], look: Record<number, number> = {};
      let dips = 0, faces = 0;
      p.pts.forEach((q, i) => {
        pts.push(q); dwell.push(p.dwell[i]);
        // Down to look over a building's face now and then (M4-59): out from its nearest wall, at its middle height.
        const f = i % 3 === 2 && faces < ALIVE.faces ? faceNear(w, q) : null;
        // (Clear of the wall by more than its own width, as the dips below: M6-22 found one brushing a tower's corner.)
        if (f && clear(w, q, f.at, 0) && !overlaps(w.index, { x0: f.at.x - 0.6, y0: f.at.y - 0.6, z0: f.at.z - 0.6, x1: f.at.x + 0.6, y1: f.at.y + 0.6, z1: f.at.z + 0.6 })) { pts.push(f.at); dwell.push(ALIVE.faceLook); look[pts.length - 1] = f.yaw; pts.push(q); dwell.push(0); faces++; }
        if (i % 3 !== 1 || dips >= 4) return;
        const h = hides.find(f => Math.hypot(f.x - q.x, f.z - q.z) < 30 && clear(w, q, { x: f.x, y: f.y + 6, z: f.z }, 0) && !overlaps(w.index, { x0: f.x - 0.6, y0: f.y + 5.4, z0: f.z - 0.6, x1: f.x + 0.6, y1: f.y + 6.6, z1: f.z + 0.6 }));
        if (!h) return;
        pts.push({ x: h.x, y: h.y + 6, z: h.z }, q); dwell.push(DWELL.alley, 0);
        dips++;
      });
      return { ...p, pts, dwell, dock, look };
    }
    if (p.kind !== 'street') return p;
    // Flat and long: a delivery robot's (no stairs, no detours). Otherwise quadrupeds and humanoids by turns. (The
    // districts' crowded beats are the patrols' own.)
    const steep = p.pts.slice(1).some((q, i) => Math.abs(q.y - p.pts[i].y) > 0.06 * Math.hypot(q.x - p.pts[i].x, q.z - p.pts[i].z) + 0.2);
    const wheels = (!steep && p.pts.length > 2 && !p.crowd) || p.unit === 'delivery';
    const unit: Patrol['unit'] = wheels ? 'delivery' : street++ % 2 ? 'humanoid' : 'quadruped', pts: V3[] = [], dwell: number[] = [];
    // (Looked along every 5 m or so for a side street, and set down on the ground there.)
    const line: V3[] = [], rest: number[] = [];
    // (Walked, not flown, M4-29: a leg that's no straight walk, a wall in the way or no ground at its end, goes the way
    // the nav graph takes this walker; and every point along it set down on the floor under it.)
    p.pts.forEach((q, i) => {
      if (i) {
        const a = p.pts[i - 1], via = walkable(w, a, q) || !w.nav ? [] : navPath(w.nav, a, q, unit)?.pts ?? [];
        let from = a;
        for (const m of [...via, q]) {
          const n = Math.floor(Math.hypot(m.x - from.x, m.z - from.z) / 5);
          for (let k = 1; k < n; k++) { line.push(onFloor(w, { x: from.x + ((m.x - from.x) * k) / n, y: from.y + ((m.y - from.y) * k) / n, z: from.z + ((m.z - from.z) * k) / n })); rest.push(0); }
          if (m !== q) { line.push(m); rest.push(0); }
          from = m;
        }
      }
      line.push(q); rest.push(p.dwell[i]);
    });
    for (let i = 0; i < line.length; i++) line[i] = lift(w, line[i]);
    const best = longest(w, line);
    if (!best) return { ...p, unit, hours: [0, 0] as [number, number] }; // (none at all: it never goes out)
    line.splice(best[1] + 1); line.splice(0, best[0]); rest.splice(best[1] + 1); rest.splice(0, best[0]);
    rest[0] ||= DWELL.end; rest[rest.length - 1] ||= DWELL.end;
    // (A delivery robot keeps to its street, no stops or turnings off.)
    if (wheels) return { ...p, unit, pts: line, dwell: rest };
    let since = 60, spurs = 0, looked = 0;
    const look: Record<number, number> = {};
    line.forEach((q, i) => {
      pts.push(q); dwell.push(rest[i]);
      const step = i ? Math.hypot(q.x - line[i - 1].x, q.z - line[i - 1].z) : 0;
      since += step; looked += step;
      // Stopping now and then to look at a door or a bin beside its way, or down a side street (M4-59), its head turning.
      if (looked >= ALIVE.every && !rest[i] && i < line.length - 1) {
        const t = sights.find(f => { const d = Math.hypot(f.x - q.x, f.z - q.z); return d < ALIVE.near && d > 1 && clear(w, q, f, 1); });
        // (With nothing to look at for a while, it stops and looks out to one side all the same.)
        const out = !t && looked >= 2 * ALIVE.every ? Math.atan2(line[i + 1].x - q.x, line[i + 1].z - q.z) + ((spurs + i) % 2 ? Math.PI / 2 : -Math.PI / 2) : null;
        if (t || out !== null) { dwell[dwell.length - 1] = ALIVE.look; look[pts.length - 1] = t ? Math.atan2(t.x - q.x, t.z - q.z) : out!; looked = 0; }
      }
      if (since < 80 || spurs >= 5 || i === line.length - 1) return;
      // Off along a side street (up to 60 m of it), into an alley beside the bins or in at a door to the floor
      // inside, by turns (the other if there's none of the one); out the same way.
      const near = (x: number, z: number, r: number) => Math.hypot(x - q.x, z - q.z) < r;
      // (Looked for all along first, the other only where there's none of it.)
      const find = (go: typeof toAlley): V3[] | null => {
        for (const side of sides) {
          const k = side.pts.findIndex(([x, z]) => near(x, z, 12));
          if (k < 0) continue;
          for (const dir of [1, -1]) {
            const walk: V3[] = [];
            let from = q;
            for (let j = k, run = 0; j >= 0 && j < side.pts.length && run < 60; j += dir) {
              const [x, z] = side.pts[j], v = { x, y: heightAt(g, x, z) ?? q.y, z };
              if (Math.hypot(v.x - from.x, v.z - from.z) > 25 || !walkable(w, from, v)) break;
              run += Math.hypot(v.x - from.x, v.z - from.z); walk.push(v); from = v;
              const t = go(from);
              if (t) return [...walk, ...t];
            }
          }
        }
        return null;
      };
      const [first, then] = spurs % 2 === 0 ? [toAlley, toDoor] : [toDoor, toAlley];
      let way = find(first), alley = first === toAlley;
      if (!way) { way = find(then); alley = then === toAlley; }
      if (!way) return;
      way.forEach((v, k) => { pts.push(v); dwell.push(k === way.length - 1 ? (alley ? DWELL.alley : DWELL.inside) : 0); });
      for (let k = way.length - 2; k >= 0; k--) { pts.push(way[k]); dwell.push(0); }
      pts.push(q); dwell.push(0);
      since = 0; spurs++;
    });
    // (Its turnings off, into alleys and doors, set down out of anything too.)
    return { ...p, unit, pts: pts.map(q => lift(w, q)), dwell, look };
  });
  // Under the ground: the underground city's route end to end, and the Grand Tunnel from the friends' stub to the
  // metro's, a long wait at the metro end.
  const under = w.features.filter(f => f.kind === 'underRoute').sort((a, b) => a.group - b.group).map(f => ({ x: f.x, y: f.y, z: f.z }));
  const way = walkedLine(w, under);
  if (way.length > 1) out.push({ kind: 'under', unit: 'quadruped', pts: way, dwell: way.map((_, i) => (i === 0 || i === way.length - 1 ? DWELL.end * 3 : 0)), hours: [0, 24] });
  out.push({ kind: 'under', unit: 'humanoid', pts: tunnel, dwell: [DWELL.end, DWELL.tunnel], hours: [0, 24] });
  return out.concat(heavies, giants, lurkers(w, hides), sewerCrawlers(w), skyDrones(w)).map(p => (p.unit === 'drone' ? flyOver(w, p) : p));
}

/** Drones everywhere (M4-87, U-065): a dozen more in each district, slow, wandering a loop of their own over the low
 *  roofs and down between the blocks, stopping over a roof or in a gap to turn and scan it. They keep down at the
 *  buildings' level (U-103): a leg blocked by a tower goes round it, to one side, if it can, and the stop's left out
 *  if it can't (never up over the top). */
function skyDrones(w: World): Patrol[] {
  const out: Patrol[] = [], g = w.ground!;
  for (const k of DISTRICTS) {
    const L = GEO.landmarks[k], roofs = w.plots.filter(p => !p.far && Math.hypot(centre(p).x - L.x, centre(p).z - L.z) < SKY.r);
    if (roofs.length < 8) continue;
    for (let d = 0; d < SKY.per; d++) {
      const pts: V3[] = [], dwell: number[] = [], look: Record<number, number> = {};
      for (let j = 0, tries = 0; j < SKY.stops && tries < SKY.stops * 8; tries++) {
        // (Each stop a short hop from the last, 30 to 130 m: a wander down the streets, not across the sky.)
        const last = pts[pts.length - 1], near = last ? roofs.filter(r => { const m = Math.hypot(centre(r).x - last.x, centre(r).z - last.z); return m > 30 && m < 130; }) : roofs;
        if (!near.length) break;
        const p = near[(d * 7919 + tries * 104729) % near.length], c = centre(p);
        // Over a low roof, or down in the gap beside a block (out past its side, at half its height or lower); a
        // tower's only ever looked at from the gap beside it, not from over its top (U-103).
        const gap = j % 2 === 1 || p.top - p.base > SKY.roof, a = ((d * 5 + tries * 3) % 8) * (Math.PI / 4), ca = Math.cos(a), sa = Math.sin(a);
        const off = gap ? Math.max(...p.corners.map(([x, z]) => (x - c.x) * ca + (z - c.z) * sa)) + 5 : 0;
        const x = c.x + ca * off, z = c.z + sa * off, ground = heightAt(g, x, z) ?? p.base;
        const q: V3 = { x, y: gap ? Math.max(ground + SKY.gap[0], Math.min(p.top - 4, ground + SKY.gap[1])) : p.top + 5, z };
        if (overlaps(w.index, { x0: q.x - 0.6, y0: q.y - 0.6, z0: q.z - 0.6, x1: q.x + 0.6, y1: q.y + 0.6, z1: q.z + 0.6 })) continue;
        if (last && !airway(w, last, q)) {
          // (Round what's in the way: through a point off to one side of the leg, at the higher of its two ends.)
          const dx = q.x - last.x, dz = q.z - last.z, l = Math.hypot(dx, dz) || 1, y = Math.max(last.y, q.y);
          const via = [15, -15, 30, -30, 50, -50].map(o => ({ x: (last.x + q.x) / 2 - (dz / l) * o, y, z: (last.z + q.z) / 2 + (dx / l) * o })).find(m => airway(w, last, m) && airway(w, m, q));
          if (!via) continue;
          pts.push(via); dwell.push(0);
        }
        pts.push(q); dwell.push(SKY.scan); look[pts.length - 1] = a + Math.PI;
        j++;
      }
      // (And round, back to the start, the same way.)
      const e = pts[pts.length - 1], f = pts[0];
      if (pts.length > 2 && !airway(w, e, f)) {
        const dx = f.x - e.x, dz = f.z - e.z, l = Math.hypot(dx, dz) || 1, y = Math.max(e.y, f.y);
        const via = [15, -15, 30, -30, 50, -50].map(o => ({ x: (e.x + f.x) / 2 - (dz / l) * o, y, z: (e.z + f.z) / 2 + (dx / l) * o })).find(m => airway(w, e, m) && airway(w, m, f));
        if (via) { pts.push(via); dwell.push(0); }
        // (No way round: back the way it came.)
        else for (let i = pts.length - 2, n = pts.length; i > 0; i--) { pts.push(pts[i]); dwell.push(dwell[i]); if (look[i] !== undefined) look[pts.length - 1] = look[i]; if (pts.length > 2 * n) break; }
      }
      // (Charging on the nearest roof dock, like the rest: M4-08.)
      const dock = w.docks.reduce((b, q, i) => (b < 0 || Math.hypot(q.x - pts[0].x, q.z - pts[0].z) < Math.hypot(w.docks[b].x - pts[0].x, w.docks[b].z - pts[0].z) ? i : b), -1);
      if (pts.length > 2) out.push({ kind: 'drone', unit: 'drone', pts, dwell, hours: [0, 24], look, ...(dock >= 0 ? { dock } : {}) });
    }
  }
  return out;
}

/** Spider robots living in the sewers (M4-95, U-069): each up and down a run (its two legs, square to the map), a
 *  handful in every district's sewers, day and night. */
function sewerCrawlers(w: World): Patrol[] {
  const runs = new Map<number, V3[]>(), out: Patrol[] = [], used = new Set<number>();
  for (const f of w.features) if (f.kind === 'drain') (runs.get(f.group) ?? runs.set(f.group, []).get(f.group)!).push({ x: f.x, y: f.y, z: f.z });
  for (const k of DISTRICTS) {
    const L = GEO.landmarks[k];
    let n = 0;
    for (const [g, r] of runs) {
      if (n >= CRAWLERS.per || used.has(g) || r.length !== 2 || Math.hypot(r[0].x - L.x, r[0].z - L.z) > CRAWLERS.r) continue;
      // Straight along it if it runs straight, else round its corner, whichever way is open (not through the rock).
      const [a, b] = r, way = [[a, b], [a, { x: b.x, y: a.y, z: a.z }, b], [a, { x: a.x, y: a.y, z: b.z }, b]].find(ps => ps.every((q, i) => !i || clear(w, ps[i - 1], q, 0.3)));
      if (!way) continue;
      used.add(g); n++;
      out.push({ kind: 'under', unit: 'crawler', pts: way, dwell: way.map((_, i) => (i === 0 || i === way.length - 1 ? 6 : 0)), hours: [0, 24] });
    }
  }
  return out;
}

/** Where he doesn't look for them (M4-53, U-051): in each district a dozen machines that wait for an hour or three at a
 *  time somewhere out of the way, at hours of their own through the day: just inside a room he might step into,
 *  inside a building's door at the foot of its stairs, on its roof, in an alley behind the bins; still, their heads
 *  turning. */
function lurkers(w: World, hides: V3[]): Patrol[] {
  const out: Patrol[] = [], near = (x: number, z: number, k: string) => Math.hypot(x - GEO.landmarks[k].x, z - GEO.landmarks[k].z) < 300;
  /** A machine waiting at a spot, facing `yaw`, `n`th of its kind in the district: its hours from n. */
  const wait = (unit: Patrol['unit'], at: V3, yaw: number, n: number) => {
    // (Nowhere it would stand inside a wall, a stair's fill or a bin: M4-29.)
    if (unit !== 'drone' && overlaps(w.index, { x0: at.x - 0.15, y0: at.y + 0.3, z0: at.z - 0.15, x1: at.x + 0.15, y1: at.y + 1.5, z1: at.z + 0.15 })) return;
    const from = (n * 7 + Math.floor(at.x + at.z)) % 24, long = 1 + (n % 3);
    out.push({ kind: 'lurk', unit, pts: [at, { ...at, x: at.x + 0.01 }], dwell: [600, 600], hours: [from, (from + long) % 24], look: { 0: yaw, 1: yaw } });
  };
  for (const k of DISTRICTS) {
    const rooms = w.features.filter(f => f.kind.startsWith('inside:') && near(f.x, f.z, k));
    rooms.filter((_, i) => i % Math.max(1, Math.floor(rooms.length / 3)) === 0).slice(0, 3).forEach((f, n) => {
      const l = Math.hypot(f.nx ?? 0, f.nz ?? 0) || 1, nx = (f.nx ?? 0) / l, nz = (f.nz ?? 1) / l;
      wait(n % 2 ? 'quadruped' : 'humanoid', { x: f.x + nx * 1.5, y: f.y, z: f.z + nz * 1.5 }, Math.atan2(-nx, -nz), n);
    });
    const lots = w.plots.filter(p => !p.far && p.route && p.route.length > 2 && near(p.route[0].x, p.route[0].z, k));
    lots.filter((_, i) => i % Math.max(1, Math.floor(lots.length / 3)) === 0).slice(0, 3).forEach((p, n) => {
      const [door, foot] = p.route!, top = p.route![p.route!.length - 1];
      wait('humanoid', foot, Math.atan2(door.x - foot.x, door.z - foot.z), n + 3);
      wait(n % 2 ? 'drone' : 'quadruped', n % 2 ? { ...top, y: top.y + 1.6 } : top, (n * 2.1) % 6.28, n + 6);
    });
    hides.filter(h => near(h.x, h.z, k)).filter((_, i) => i % 7 === 3).slice(0, 3).forEach((h, n) => {
      // Beside the bins, on whichever side there's room, looking out from them.
      const by = [[1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2]].map(([dx, dz]) => ({ x: h.x + dx, y: h.y, z: h.z + dz })).find(q => !overlaps(w.index, { x0: q.x - 0.15, y0: q.y + 0.3, z0: q.z - 0.15, x1: q.x + 0.15, y1: q.y + 1.5, z1: q.z + 0.15 }));
      if (by) wait('quadruped', by, Math.atan2(by.x - h.x, by.z - h.z), n + 9);
    });
  }
  return out;
}

/** Where a column's pair peels off (M4-01b): beside the bins in alleys within 20 m of its way, one every 150 m or so,
 *  reached straight from it. */
export function columnSpurs(w: World, pts: V3[]): { s: number; at: V3 }[] {
  const hides = w.features.filter(f => f.kind === 'crate' || f.kind === 'dumpster'), out: { s: number; at: V3 }[] = [];
  let s = 0, last = -100;
  pts.forEach((q, i) => {
    if (i) s += Math.hypot(q.x - pts[i - 1].x, q.z - pts[i - 1].z);
    if (s - last < 150) return;
    for (const h of hides) {
      const d = Math.hypot(q.x - h.x, q.z - h.z);
      if (d > 20 || d < 2) continue;
      const by = { x: h.x + ((q.x - h.x) / d) * 1.2, y: h.y, z: h.z + ((q.z - h.z) / d) * 1.2 };
      if (straight(w, q, by)) { out.push({ s, at: by }); last = s; break; }
    }
  });
  return out;
}

/** The cameras (M4-07, U-038: commonplace, so he's always on edge): every smart lamppost's, looking along its street;
 *  every camera pole's at the junctions; one over every third street door in the districts, looking out from it (one
 *  in four of those idle until the district's Heightened); and
 *  at each district's centre a sweeper, on the lamppost nearest it. */
export function placeCameras(w: World): Camera[] {
  const out: Camera[] = [];
  for (const p of w.props) {
    // (Each with its junction box low on the pole, on the side it looks: M5-09.)
    const box = { x: p.x + Math.sin(p.yaw) * 0.16, y: p.y + 1.25, z: p.z + Math.cos(p.yaw) * 0.16, yaw: p.yaw };
    if (p.kind === 'lamppost') out.push({ kind: 'lamppost', x: p.x + Math.sin(p.yaw) * 0.25, y: p.y + 6.2, z: p.z + Math.cos(p.yaw) * 0.25, yaw: p.yaw, box });
    else if (p.kind === 'campole') out.push({ kind: 'camera', x: p.x + Math.sin(p.yaw) * 0.2, y: p.y + 4.4, z: p.z + Math.cos(p.yaw) * 0.2, yaw: p.yaw, box });
  }
  const near = (x: number, z: number) => DISTRICTS.some(k => Math.hypot(x - GEO.landmarks[k].x, z - GEO.landmarks[k].z) < 400);
  w.plots.filter(p => !p.far && p.route && p.route.length > 1 && (near(p.route[0].x, p.route[0].z) || p.type === 'military')).forEach((p, i) => {
    // (A military post's door always watched, its camera never idle: M5-35.)
    const post = p.type === 'military';
    if (i % 3 && !post) return;
    const [door, inside] = p.route!, dx = door.x - inside.x, dz = door.z - inside.z, d = Math.hypot(dx, dz) || 1;
    // (One in four idle, its light off, until the district's Heightened: M4-16.)
    // (Outside, on the wall over the door: just out from its face, so it watches the street and never the room behind:
    // U-084, it sat 0.6 m inside and saw into the building.)
    let k = 0.15;
    while (k < 1.5 && overlaps(w.index, { x0: door.x + (dx / d) * k - 0.08, y0: door.y + 2.6, z0: door.z + (dz / d) * k - 0.08, x1: door.x + (dx / d) * k + 0.08, y1: door.y + 2.9, z1: door.z + (dz / d) * k + 0.08 })) k += 0.1;
    // (Its junction box on the wall beside the door, at his chest: M5-09.)
    const box = { x: door.x + (dx / d) * 0.1 + (dz / d) * 1.15, y: door.y + 1.4, z: door.z + (dz / d) * 0.1 - (dx / d) * 1.15, yaw: Math.atan2(dx, dz) };
    out.push({ kind: 'camera', x: door.x + (dx / d) * k, y: door.y + 2.75, z: door.z + (dz / d) * k, yaw: Math.atan2(dx, dz), box, ...(i % 12 === 6 && !post ? { dark: true } : {}) });
  });
  // A turret at each main junction in the districts (M4-57), on the lamppost nearest it within 20 m, over its lamp,
  // looking along its street; none within 60 m of another.
  const at = new Map<string, Set<number>>();
  w.streets.forEach((st, si) => { if (MAIN.has(st.kind)) for (const [x, z] of st.pts) { const key = `${Math.round(x / 3)},${Math.round(z / 3)}`; (at.get(key) ?? at.set(key, new Set()).get(key)!).add(si); } });
  const posts = w.props.filter(p => p.kind === 'lamppost'), turrets: Camera[] = [];
  for (const [key, sts] of at) {
    if (sts.size < 2) continue;
    const [x, z] = key.split(',').map(v => Number(v) * 3);
    if (!DISTRICTS.some(k => Math.hypot(x - GEO.landmarks[k].x, z - GEO.landmarks[k].z) < 300) || turrets.some(t => Math.hypot(t.x - x, t.z - z) < CROWD.turretGap)) continue;
    let post = null as (typeof posts)[number] | null, pd = 20;
    for (const p of posts) { const d = Math.hypot(p.x - x, p.z - z); if (d < pd) { pd = d; post = p; } }
    if (post) turrets.push({ kind: 'turret', x: post.x, y: post.y + 7, z: post.z, yaw: post.yaw });
  }
  out.push(...turrets);
  for (const k of DISTRICTS) {
    const L = GEO.landmarks[k];
    let best = -1, bd = 150;
    out.forEach((c, i) => { const d = Math.hypot(c.x - L.x, c.z - L.z); if (c.kind === 'lamppost' && d < bd) { bd = d; best = i; } });
    if (best >= 0) out[best] = { ...out[best], kind: 'sweeper' };
  }
  return out;
}

/** Each district's machine garage (M4-14): the street door nearest its centre (none within 150 m of the friends'
 *  hideout, `home`: they'd have found it), where its squad of humanoids waits. */
export function placeGarages(w: World, home: V3): V3[] {
  const out: V3[] = [];
  for (const k of DISTRICTS) {
    const L = GEO.landmarks[k];
    let best: V3 | null = null, bd = Infinity;
    for (const p of w.plots) {
      if (p.far || !p.route || p.route.length < 2 || Math.hypot(p.route[0].x - home.x, p.route[0].z - home.z) < 150) continue;
      const d = Math.hypot(p.route[0].x - L.x, p.route[0].z - L.z);
      if (d < bd) { bd = d; best = p.route[0]; }
    }
    if (best) out.push({ x: best.x, y: best.y, z: best.z });
  }
  return out;
}
