// The machines' beats as walked (M4-01, U-024, U-028): the street patrols the network laid along the main roads
// (M3-37) and each district's own along its main streets, each given its walker (delivery robots on the flat ones, quadrupeds and humanoids on the rest) and its
// detours off the clear street: into an alley to look behind the bins, in at a street door to a building's ground
// floor, pausing there before coming back out; the drones drop into alleys off their lines. And beats under the
// ground: a quadruped through the underground city's halls and passages, a humanoid along the Grand Tunnel past the
// friends' stub, waiting at the metro's end.
import { raycast } from '../geom';
import { DWELL, ALIVE } from '../../data/units';
import type { World, Patrol, Camera } from '../world';
import { heightAt } from '../heightfield';
import { GEO } from '../geo';

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
const CROWD = { main: 120, side: 300, squad: 3, sideMin: 50, sideR: 250, sides: 12, turretGap: 60 };
/** How many colossi walk the city (U-050). */
const GIANTS = { colossi: 3 };

/** A building's middle. */
const centre = (q: { corners: [number, number][] }) => ({ x: q.corners.reduce((a, c) => a + c[0], 0) / q.corners.length, z: q.corners.reduce((a, c) => a + c[1], 0) / q.corners.length });

/** Whether nothing stands between a and b, up off them by `up`. */
function clear(w: World, a: V3, b: V3, up: number) {
  const d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  return d < 0.1 || !raycast(w.index, a.x, a.y + up, a.z, (b.x - a.x) / d, (b.y - a.y) / d, (b.z - a.z) / d, d);
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
      if (straight(w, q, by)) return [by];
    }
    return null;
  };
  const toDoor = (q: V3): V3[] | null => { for (const [door, inside] of doors) if (Math.hypot(door.x - q.x, door.z - q.z) < 20 && straight(w, q, door) && straight(w, door, inside)) return [door, inside]; return null; };
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
    // A drone up and down it, day and night, 16 m over the street.
    if (long) district.push({ kind: 'drone', unit: 'drone', pts: long.map(q => ({ ...q, y: q.y + 16 })), dwell: long.map(() => 0), hours: [0, 24], crowd: { n: 2, size: 1 } });
    for (const r of stretches(SIDE_ONLY, CROWD.sideR, CROWD.sideMin).slice(0, CROWD.sides)) district.push(beat(r, 'quadruped', CROWD.side, 1));
  }
  // And the three longest main streets in the city each walked by a colossus (U-050), slow, nine metres tall.
  for (const r of colossi.sort((a, b) => len(b) - len(a)).slice(0, GIANTS.colossi)) giants.push(giant(r, 'colossus', 3));
  let street = 0;
  const out = base.concat(district).map((p): Patrol => {
    // A drone drops into an alley now and then, to 6 m over the bins, hangs there, and climbs back to its line. It
    // charges on a dock on the tallest roof within 150 m of where its beat starts (M4-08).
    if (p.kind === 'drone') {
      const s0 = p.pts[0], roof = w.plots.filter(q => !q.far && Math.hypot(centre(q).x - s0.x, centre(q).z - s0.z) < 150).sort((a, b) => b.top - a.top)[0];
      let dock: number | undefined;
      if (roof) { const c = centre(roof); dock = w.docks.length; w.docks.push({ x: c.x, y: roof.top + 2.3, z: c.z }); w.props.push({ kind: 'dronedock', x: c.x, y: roof.top, z: c.z, yaw: 0 }); }
      const pts: V3[] = [], dwell: number[] = [], look: Record<number, number> = {};
      let dips = 0, faces = 0;
      p.pts.forEach((q, i) => {
        pts.push(q); dwell.push(p.dwell[i]);
        // Down to look over a building's face now and then (M4-59): out from its nearest wall, at its middle height.
        const f = i % 3 === 2 && faces < ALIVE.faces ? faceNear(w, q) : null;
        if (f && clear(w, q, f.at, 0)) { pts.push(f.at); dwell.push(ALIVE.faceLook); look[pts.length - 1] = f.yaw; pts.push(q); dwell.push(0); faces++; }
        if (i % 3 !== 1 || dips >= 4) return;
        const h = hides.find(f => Math.hypot(f.x - q.x, f.z - q.z) < 30 && clear(w, q, { x: f.x, y: f.y + 6, z: f.z }, 0));
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
    if (!steep && p.pts.length > 2 && !p.crowd) return { ...p, unit: 'delivery' };
    const unit = street++ % 2 ? 'humanoid' : 'quadruped', pts: V3[] = [], dwell: number[] = [];
    // (Looked along every 10 m or so for a side street.)
    const line: V3[] = [], rest: number[] = [];
    p.pts.forEach((q, i) => {
      if (i) { const a = p.pts[i - 1], n = Math.floor(Math.hypot(q.x - a.x, q.z - a.z) / 10); for (let k = 1; k < n; k++) { line.push({ x: a.x + ((q.x - a.x) * k) / n, y: a.y + ((q.y - a.y) * k) / n, z: a.z + ((q.z - a.z) * k) / n }); rest.push(0); } }
      line.push(q); rest.push(p.dwell[i]);
    });
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
              if (!straight(w, from, v)) break;
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
    return { ...p, unit, pts, dwell, look };
  });
  // Under the ground: the underground city's route end to end, and the Grand Tunnel from the friends' stub to the
  // metro's, a long wait at the metro end.
  const under = w.features.filter(f => f.kind === 'underRoute').sort((a, b) => a.group - b.group).map(f => ({ x: f.x, y: f.y, z: f.z }));
  if (under.length > 1) out.push({ kind: 'under', unit: 'quadruped', pts: under, dwell: under.map((_, i) => (i === 0 || i === under.length - 1 ? DWELL.end * 3 : 0)), hours: [0, 24] });
  out.push({ kind: 'under', unit: 'humanoid', pts: tunnel, dwell: [DWELL.end, DWELL.tunnel], hours: [0, 24] });
  return out.concat(heavies, giants, lurkers(w, hides));
}

/** Where he doesn't look for them (M4-53, U-051): in each district a dozen machines that wait for an hour or three at a
 *  time somewhere out of the way, at hours of their own through the day: just inside a room he might step into,
 *  inside a building's door at the foot of its stairs, on its roof, in an alley behind the bins; still, their heads
 *  turning. */
function lurkers(w: World, hides: V3[]): Patrol[] {
  const out: Patrol[] = [], near = (x: number, z: number, k: string) => Math.hypot(x - GEO.landmarks[k].x, z - GEO.landmarks[k].z) < 300;
  /** A machine waiting at a spot, facing `yaw`, `n`th of its kind in the district: its hours from n. */
  const wait = (unit: Patrol['unit'], at: V3, yaw: number, n: number) => {
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
    hides.filter(h => near(h.x, h.z, k)).filter((_, i) => i % 7 === 3).slice(0, 3).forEach((h, n) => wait('quadruped', { x: h.x + 1.2, y: h.y, z: h.z }, -Math.PI / 2, n + 9));
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
    if (p.kind === 'lamppost') out.push({ kind: 'lamppost', x: p.x + Math.sin(p.yaw) * 0.25, y: p.y + 6.2, z: p.z + Math.cos(p.yaw) * 0.25, yaw: p.yaw });
    else if (p.kind === 'campole') out.push({ kind: 'camera', x: p.x + Math.sin(p.yaw) * 0.2, y: p.y + 4.4, z: p.z + Math.cos(p.yaw) * 0.2, yaw: p.yaw });
  }
  const near = (x: number, z: number) => DISTRICTS.some(k => Math.hypot(x - GEO.landmarks[k].x, z - GEO.landmarks[k].z) < 400);
  w.plots.filter(p => !p.far && p.route && p.route.length > 1 && near(p.route[0].x, p.route[0].z)).forEach((p, i) => {
    if (i % 3) return;
    const [door, inside] = p.route!, dx = door.x - inside.x, dz = door.z - inside.z, d = Math.hypot(dx, dz) || 1;
    // (One in four idle, its light off, until the district's Heightened: M4-16.)
    out.push({ kind: 'camera', x: door.x - (dx / d) * 0.6, y: door.y + 2.8, z: door.z - (dz / d) * 0.6, yaw: Math.atan2(dx, dz), ...(i % 12 === 6 ? { dark: true } : {}) });
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
