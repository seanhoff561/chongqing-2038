// The two bridges off the peninsula (M6-07, DESIGN section 9): the Dongshuimen over the Yangtze to Nan'an and the
// Qiansimen over the Jialing to Jiangbei, twins: an orange-red steel Warren truss, the road deck on its top and Line
// 6's rail deck inside it, on white spindle pylons (two for the Dongshuimen, one by the Jiangbei bank for the
// Qiansimen), fans of stay cables to the truss. Each runs straight along its main span's line; its road falls evenly
// from its Yuzhong end (where it comes out of the Qiansimen tunnel) to its far bank, the approach roads (the map's own
// lines) on that grade, the truss from where the ground drops away under its rail deck to where the far bank comes up
// to it, on piers where the ground's clear. The Qiansimen's middle span is down in the Jialing, its torn ends hanging
// toward the water and its cables there slack. What the city made under the decks stands lower (cutdown.ts).
import { solid, rampSolid, turn, type Solid } from '../geom';
import { MAT } from '../mats';
import type { Heightfield } from '../heightfield';
import { GEO } from '../geo';
import { streets, WATER_Y, type Street } from './ground';
import { inside } from './shapes';
import type { Ceil } from './cutdown';
import type { Line, Plot, Climbable, Teleport } from '../world';
import { sin, atan2 } from '../trig';

/** The truss: its panels' length, its half-width, the rail deck under the road (m), the road plate's and the rail
 *  floor's depth, its chords' width; the pylons' height over the road. */
export const TRUSS = { panel: 12, half: 12.5, depth: 8, plate: 1.6, floor: 0.6, chord: 0.6, pylon: 75 };
/** The Qiansimen's fallen span, as fractions of the river it crosses from its Yuzhong bank. */
const FALLEN = [0.3, 0.55];
const RED = 0xb8452a, WHITE = 0xe4e2dc, STAY = 0xd8693a, GREY = 0x6a6e72;

/** A bridge's line: its axis from its Yuzhong end (t along, s across, both in m), its road's height at either end,
 *  where its truss runs (ta to tb), the river under it, its pylons; the stretches with no road plate over the truss
 *  (`lifted`) and with nothing at all (`fallen`); its rail deck's holes (from, to, whether the stringers are left), a
 *  derailed car's (from, 11 m long), the north pier whose ladder climbs to it (M6-08). */
export interface Span {
  name: string; ox: number; oz: number; ux: number; uz: number; len: number; y0: number; y1: number;
  ta: number; tb: number; river: [number, number]; pylons: number[]; lifted?: [number, number]; fallen?: [number, number];
  holes?: [number, number, boolean][]; car?: number; pier?: number;
  /** its checkpoint's north wall, and the hatch in its road plate (M6-19, checkpoint.ts) */
  checkpoint?: number; hatch?: number;
}

export const road = (b: Span, t: number) => b.y0 + ((b.y1 - b.y0) * t) / b.len;
export const rail = (b: Span, t: number) => road(b, t) - TRUSS.depth;
/** The world point t along and s across. */
export const at = (b: Span, t: number, s: number): [number, number] => [b.ox + b.ux * t - b.uz * s, b.oz + b.uz * t + b.ux * s];
/** A world point's t along and s across. */
export const along = (b: Span, x: number, z: number): [number, number] => [(x - b.ox) * b.ux + (z - b.oz) * b.uz, (z - b.oz) * b.ux - (x - b.ox) * b.uz];
const hAt = (g: Heightfield, x: number, z: number) => g.y[Math.max(0, Math.min(g.h - 1, Math.round(z / g.cell))) * g.w + Math.max(0, Math.min(g.w - 1, Math.round(x / g.cell)))];
const within = (t: number, r?: [number, number]) => !!r && t > r[0] && t < r[1];

/** The bridge by its name on the map: its line along its longest carriageway, turned to run away from Yuzhong. */
function spanOf(name: string, g: Heightfield, two: boolean): Span | null {
  const sts = streets().filter(s => s.name === name && s.bridge), L = (s: Street) => Math.hypot(s.pts[s.pts.length - 1][0] - s.pts[0][0], s.pts[s.pts.length - 1][1] - s.pts[0][1]);
  const mains = sts.filter(s => s.kind !== 'footway').sort((a, b) => L(b) - L(a)).slice(0, 2);
  if (!mains.length) return null;
  const [a, e] = [mains[0].pts[0], mains[0].pts[mains[0].pts.length - 1]], J = GEO.landmarks.jiefangbei, d = L(mains[0]);
  let ux = (e[0] - a[0]) / d, uz = (e[1] - a[1]) / d;
  if ((J.x - a[0]) * ux + (J.z - a[1]) * uz > 0) { ux = -ux; uz = -uz; }
  const all = sts.flatMap(s => s.pts), tOf = (p: [number, number]) => (p[0] - a[0]) * ux + (p[1] - a[1]) * uz;
  const sc = mains.flatMap(s => s.pts).reduce((m, p, _, q) => m + ((p[1] - a[1]) * ux - (p[0] - a[0]) * uz) / q.length, 0);
  const lo = all.reduce((m, p) => (tOf(p) < tOf(m) ? p : m)), hi = all.reduce((m, p) => (tOf(p) > tOf(m) ? p : m)), t0 = tOf(lo);
  const b: Span = { name, ox: a[0] + ux * t0 - uz * sc, oz: a[1] + uz * t0 + ux * sc, ux, uz, len: tOf(hi) - t0, y0: hAt(g, lo[0], lo[1]), y1: hAt(g, hi[0], hi[1]), ta: 0, tb: 0, river: [0, 0], pylons: [] };
  const ground = (t: number) => { const [x, z] = at(b, t, 0); return hAt(g, x, z); };
  let r0 = -1, r1 = -1;
  for (let t = 0; t <= b.len; t += 2) if (ground(t) < WATER_Y) { if (r0 < 0) r0 = t; r1 = t; }
  b.river = [r0, r1];
  for (b.ta = 0; b.ta < r0 && ground(b.ta) > rail(b, b.ta) - 0.5; b.ta += 1);
  for (b.tb = b.len; b.tb > r1 && ground(b.tb) > rail(b, b.tb) - 0.5; b.tb -= 1);
  b.pylons = two ? [r0 + 20, r1 - 20] : [r1 - 20];
  // (The fallen span from panel to panel.)
  const P = (b.tb - b.ta) / Math.max(1, Math.round((b.tb - b.ta) / TRUSS.panel)), panel = (t: number, up: boolean) => b.ta + (up ? Math.ceil : Math.floor)((t - b.ta) / P) * P;
  if (!two) b.fallen = [panel(r0 + (r1 - r0) * FALLEN[0], false), panel(r0 + (r1 - r0) * FALLEN[1], true)];
  else {
    // The Dongshuimen's rail deck as the war left it (M6-08): over the river a stretch whose plates are gone but for
    // the stringers under the tracks, mid-river a gap the deck's width a run and a jump cross, a derailed maintenance
    // car across it to climb over; the road's plates lifted out a panel past the bridgehead.
    // The checkpoint where its main span leaves the curving approach, the lifted plates two panels past it (M6-19).
    const mid = (r0 + r1) / 2, main = Math.min(tOf(mains[0].pts[0]), tOf(mains[0].pts[mains[0].pts.length - 1])) - t0;
    b.checkpoint = panel(main + 2, true);
    b.hatch = b.checkpoint + 5;
    b.lifted = [b.checkpoint + 3 * P, b.checkpoint + 4 * P];
    b.holes = [[r0 + 60, r0 + 69, true], [mid, mid + 2.4, false]];
    b.car = r1 - 120;
  }
  return b;
}

/** The Dongshuimen and the Qiansimen. */
export function bridgeSpans(g: Heightfield): Span[] {
  return [spanOf('东水门大桥', g, true), spanOf('千厮门大桥', g, false)].filter((b): b is Span => !!b);
}
export const spanFor = (spans: Span[], s: Street) => spans.find(b => b.name === s.name);

/** Under the bridges (cutdown.ts): the truss's underside, 2.6 m under its rail deck, across its width and a margin;
 *  the approach roads' undersides. */
export function bridgeCeil(spans: Span[]): Ceil {
  type Strip = { ax: number; az: number; ux: number; uz: number; len: number; half: number; y0: number; y1: number };
  const strips: Strip[] = [];
  for (const b of spans) {
    const [ax, az] = at(b, b.ta, 0);
    strips.push({ ax, az, ux: b.ux, uz: b.uz, len: b.tb - b.ta, half: TRUSS.half + 1.5, y0: rail(b, b.ta) - 2.6, y1: rail(b, b.tb) - 2.6 });
    for (const s of streets().filter(q => q.name === b.name && q.bridge)) for (let k = 0; k + 1 < s.pts.length; k++) {
      const [px, pz] = s.pts[k], [qx, qz] = s.pts[k + 1], len = Math.hypot(qx - px, qz - pz);
      if (len < 0.5) continue;
      strips.push({ ax: px, az: pz, ux: (qx - px) / len, uz: (qz - pz) / len, len, half: s.w / 2 + 1.5, y0: road(b, along(b, px, pz)[0]) - 3, y1: road(b, along(b, qx, qz)[0]) - 3 });
    }
  }
  const pad = 40, X0 = Math.min(...strips.map(q => Math.min(q.ax, q.ax + q.ux * q.len))) - pad, X1 = Math.max(...strips.map(q => Math.max(q.ax, q.ax + q.ux * q.len))) + pad;
  const Z0 = Math.min(...strips.map(q => Math.min(q.az, q.az + q.uz * q.len))) - pad, Z1 = Math.max(...strips.map(q => Math.max(q.az, q.az + q.uz * q.len))) + pad;
  return pts => {
    if (!pts.some(([x, z]) => x > X0 && x < X1 && z > Z0 && z < Z1)) return Infinity;
    let y = Infinity;
    for (const q of strips) {
      let t0 = Infinity, t1 = -Infinity, s0 = Infinity, s1 = -Infinity;
      for (const [x, z] of pts) { const dx = x - q.ax, dz = z - q.az, t = dx * q.ux + dz * q.uz, s = dz * q.ux - dx * q.uz; t0 = Math.min(t0, t); t1 = Math.max(t1, t); s0 = Math.min(s0, s); s1 = Math.max(s1, s); }
      if (s1 < -q.half || s0 > q.half || t1 < 0 || t0 > q.len) continue;
      const f = (t: number) => q.y0 + ((q.y1 - q.y0) * Math.max(0, Math.min(q.len, t))) / q.len;
      y = Math.min(y, f(t0), f(t1));
    }
    return y;
  };
}

/** A street's bridge deck from the ground at its ends, rising to clear what it crosses (5.5 m over the ground once 20 m
 *  out from either end), with railings; one of the two bridges' on its road's grade, none where its plates are lifted
 *  or its span's fallen. */
export function deck(s: Street, g: Heightfield, solids: Solid[], main: boolean, b?: Span) {
  // Pieces of at most 8 m, so the deck can arch over what it crosses.
  const pts: [number, number][] = [s.pts[0]];
  for (let k = 1; k < s.pts.length; k++) {
    const [ax, az] = s.pts[k - 1], [bx, bz] = s.pts[k], m = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 8));
    for (let i = 1; i <= m; i++) pts.push([ax + ((bx - ax) * i) / m, az + ((bz - az) * i) / m]);
  }
  const dist = [0];
  for (let k = 1; k < pts.length; k++) dist.push(dist[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  const total = dist[dist.length - 1] || 1, n = pts.length - 1;
  const y0 = hAt(g, pts[0][0], pts[0][1]), y1 = hAt(g, pts[n][0], pts[n][1]);
  // Footbridges climb steeply (stairs at their ends); road bridges ramp over 20 m.
  const foot = !main, ramp = foot ? 6 : 20, thick = foot ? 0.6 : 1.5;
  const deckY = pts.map(([x, z], k) => (b ? road(b, along(b, x, z)[0]) : Math.max(y0 + ((y1 - y0) * dist[k]) / total, hAt(g, x, z) + 5.2 * Math.min(1, Math.min(dist[k], total - dist[k]) / ramp))));
  for (let k = 0; k < n; k++) {
    const [ax, az] = pts[k], [bx, bz] = pts[k + 1], len = Math.hypot(bx - ax, bz - az);
    if (len < 0.5) continue;
    const ya = deckY[k], yb = deckY[k + 1];
    const cx = (ax + bx) / 2, cz = (az + bz) / 2, yaw = atan2(bz - az, bx - ax), lo = Math.min(ya, yb), hi = Math.max(ya, yb);
    if (b) { const t = along(b, cx, cz)[0]; if (within(t, b.lifted) || within(t, b.fallen)) continue; }
    const x0 = cx - len / 2 - 0.2, x1 = cx + len / 2 + 0.2, z0 = cz - s.w / 2, z1 = cz + s.w / 2;
    const d = hi - lo < 0.05 ? solid(x0, lo - thick, z0, x1, lo, z1, MAT.concrete) : rampSolid(x0, lo - thick, z0, x1, z1, lo, hi, ya < yb ? 1 : 2, MAT.concrete);
    solids.push(...turn([d, solid(x0, lo, z0 - 0.25, x1, hi + 1.1, z0, MAT.metal), solid(x0, lo, z1, x1, hi + 1.1, z1 + 0.25, MAT.metal)], yaw, cx, cz));
  }
}

/** A spindle pylon's legs' half-spread f of the way up it: close at its foot and its head, out round the deck. */
const spread = (f: number) => 4 + 13 * sin(Math.PI * Math.pow(Math.max(0, Math.min(1, f)), 0.8));

/** The bridge built: its truss (chords, posts, the road plate on top, the rail deck's floor and handrails inside, its
 *  diagonals drawn), its pylons and their cables, its piers where the ground under it is clear of buildings, the
 *  portals its rail deck goes into the hills by, a fallen span's wreck; its rail deck's holes, derailed car and ladders
 *  (M6-08); and its stand-ins for the far view. */
export function buildBridge(b: Span, g: Heightfield, plots: Plot[]) {
  const T = TRUSS, H = T.half, local: Solid[] = [], decor: Solid[] = [], lines: Line[] = [], piers: number[] = [];
  const box = (t0: number, t1: number, s0: number, s1: number, y0: number, y1: number, mat: number, tint?: number, out = local) => { const q = solid(b.ox + t0, y0, b.oz + s0, b.ox + t1, y1, b.oz + s1, mat); if (tint) q.tint = tint; out.push(q); };
  const ramp = (t0: number, t1: number, s0: number, s1: number, down: number, top: (t: number) => number, mat: number, tint?: number) => {
    const ya = top(t0), yb = top(t1), q = rampSolid(b.ox + t0, Math.min(ya, yb) - down, b.oz + s0, b.ox + t1, b.oz + s1, Math.min(ya, yb), Math.max(ya, yb), ya < yb ? 1 : 2, mat);
    if (tint) q.tint = tint;
    local.push(q);
  };
  const P3 = (t: number, s: number, y: number) => { const [x, z] = at(b, t, s); return { x, y, z }; };
  const strut = (a: { x: number; y: number; z: number }, c: { x: number; y: number; z: number }, r: number, color: number) => lines.push({ a, b: c, r, color });
  const R = (t: number) => rail(b, t), Y = (t: number) => road(b, t), gone = (t0: number, t1: number) => !!b.fallen && t1 > b.fallen[0] && t0 < b.fallen[1];
  const n = Math.max(1, Math.round((b.tb - b.ta) / T.panel)), P = (b.tb - b.ta) / n, post = (t: number) => { const k = (t - b.ta) / P; return Math.abs(k - Math.round(k)) * P < 1.5; };
  // The piers under the side spans, every 50 m or so in from the pylons, each where its two columns stand clear of the
  // city's buildings: two columns under the chords and a cap across under the truss.
  const clear = (t: number) => [-1, 1].every(sd => [-1.7, 0, 1.7].every(dt => [-1.7, 0, 1.7, 2.6].every(ds => { const [x, z] = at(b, t + dt, sd * (H - 1.2) + ds); return !plots.some(p => inside(p.corners, x, z)); })));
  const ends = [[b.pylons[0], b.ta + 8, -1], [b.pylons[b.pylons.length - 1], b.tb - 8, 1]] as const;
  for (const [tp, stop, dir] of ends) for (let t = tp + dir * (dir < 0 && b.pylons.length === 1 ? 200 : 50); dir < 0 ? t > stop : t < stop; t += dir * 50) {
    const q = [0, 4, -4, 8, -8, 12, -12].map(o => t + o).find(c => (dir < 0 ? c > stop : c < stop) && !gone(c - 2, c + 2) && !post(c) && clear(c));
    if (q === undefined) continue;
    for (const sd of [-1, 1]) box(q - 1.2, q + 1.2, sd * (H - 1.2) - 1.2, sd * (H - 1.2) + 1.2, hAt(g, ...at(b, q, sd * (H - 1.2))) - 1, R(q) - 3.6, MAT.plaster, WHITE);
    box(q - 1.2, q + 1.2, -H, H, R(q) - 3.6, R(q) - T.floor, MAT.plaster, WHITE);
    if (dir < 0) piers.push(q);
  }
  // The north pier's ladder (M6-08): up its outer column's face to the rail deck's edge, from the ground on the bank.
  if (b.holes) b.pier = piers.find(q => hAt(g, ...at(b, q, H + 1)) > WATER_Y + 1);
  for (let k = 0; k < n; k++) {
    const t0 = b.ta + k * P, t1 = t0 + P, tm = t0 + P / 2;
    if (gone(t0, t1)) continue;
    // (Its floor round the holes in it; a hole's stringers, if they're left.)
    let u = t0;
    for (const [h0, h1, beams] of (b.holes ?? []).filter(([h0, h1]) => h1 > t0 && h0 < t1)) {
      if (h0 > u) ramp(u, h0, -H, H, T.floor, R, MAT.concrete);
      if (beams) for (const c of [-2.6, 2.6]) ramp(Math.max(h0, t0), Math.min(h1, t1), c - 0.3, c + 0.3, T.floor, R, MAT.metal, RED);
      u = Math.max(u, h1);
    }
    if (u < t1) ramp(u, t1, -H, H, T.floor, R, MAT.concrete);
    // (The road plate: none where it's lifted; round the checkpoint's hatch in the median.)
    const plate = (r0: number, r1: number, s0: number, s1: number) => ramp(r0, r1, s0, s1, T.plate, t => Y(t) - 0.02, MAT.concrete), h = b.hatch;
    if (h !== undefined && h > t0 && h + 1.2 < t1) { plate(t0, h, -H, H); plate(h + 1.2, t1, -H, H); plate(h, h + 1.2, -H, -0.6); plate(h, h + 1.2, 0.6, H); }
    else if (!(b.lifted && t1 > b.lifted[0] && t0 < b.lifted[1])) plate(t0, t1, -H, H);
    for (const sd of [-1, 1]) {
      const [s0, s1] = sd < 0 ? [-H, -H + T.chord] : [H - T.chord, H], my = (Y(t0) + Y(t1)) / 2, mr = (R(t0) + R(t1)) / 2;
      box(t0, t1, s0, s1, mr - 1.6, mr, MAT.metal, RED);
      box(t0, t1, s0, s1, my - 2.2, my + 0.25, MAT.metal, RED);
      box(t0 - 0.3, t0 + 0.3, s0, s1, mr, my - 2.2, MAT.metal, RED);
      // (The handrail, open where the pier's ladder comes up.)
      const gap = sd > 0 && b.pier !== undefined && b.pier > t0 && b.pier < t1 ? b.pier : undefined;
      for (const [r0, r1] of gap === undefined ? [[t0, t1]] : [[t0, gap - 0.8], [gap + 0.8, t1]]) box(r0, r1, sd * (H - 0.7) - 0.04, sd * (H - 0.7) + 0.04, mr, mr + 1.1, MAT.metal, GREY);
      // (The Warren diagonals, up from the bottom chord to the top and down again.)
      const sw = sd * (H - T.chord / 2);
      strut(P3(t0, sw, R(t0)), P3(tm, sw, Y(tm) - 2.2), 0.22, RED);
      strut(P3(tm, sw, Y(tm) - 2.2), P3(t1, sw, R(t1)), 0.22, RED);
      // Line 6's two tracks on their bed.
      const c = sd * 2.6;
      box(t0, t1, c - 1.4, c + 1.4, mr, mr + 0.05, MAT.stone, 0x4a4844, decor);
      for (const r of [-0.72, 0.72]) box(t0, t1, c + r - 0.04, c + r + 0.04, mr + 0.05, mr + 0.2, MAT.metal, undefined, decor);
    }
  }
  // The last posts, and the portals at either end where the rail deck goes into the hills, their shutters down.
  for (const [t, d] of [[b.tb, 1], [b.ta, -1]] as const) {
    for (const sd of [-1, 1]) box(t - 0.3, t + 0.3, sd < 0 ? -H : H - T.chord, sd < 0 ? -H + T.chord : H, R(t), Y(t) - 2.2, MAT.metal, RED);
    box(Math.min(t, t + d * 1.5), Math.max(t, t + d * 1.5), -H, H, R(t) - T.floor, Y(t) - T.plate, MAT.concrete);
    box(Math.min(t, t + d * 0.2), Math.max(t, t + d * 0.2), -H + 1.5, H - 1.5, R(t), R(t) + 5, MAT.metal, GREY);
  }
  // The pylons: two legs bulging out round the deck and closing at the head, on a footing in the river; a cross beam
  // under the truss; their cables fanned out to the top chords either way.
  for (const tp of b.pylons) {
    const foot = Math.min(hAt(g, ...at(b, tp, 0)), WATER_Y - 1), top = Y(tp) + T.pylon, N = Math.ceil((top - foot) / 4), h = (top - foot) / N;
    box(tp - 7, tp + 7, -21, 21, foot - 2, WATER_Y + 2, MAT.concrete);
    for (let i = 0; i < N; i++) for (const sd of [-1, 1]) { const sp = spread((i + 0.5) / N); box(tp - 1.9, tp + 1.9, sd * sp - 1.3, sd * sp + 1.3, foot + i * h, foot + (i + 1) * h + 0.05, MAT.plaster, WHITE); }
    box(tp - 1.9, tp + 1.9, -5.3, 5.3, top, top + 5, MAT.plaster, WHITE);
    const sr = spread((R(tp) - foot) / (top - foot));
    box(tp - 2, tp + 2, -sr, sr, R(tp) - 3.6, R(tp) - T.floor, MAT.plaster, WHITE);
    for (const dir of [-1, 1]) for (let k = 0; k < 8; k++) for (const sd of [-1, 1]) {
      const ta = tp + dir * (24 + 20 * k), y = top - 32 + k * 3.5, from = P3(tp, sd * spread((y - foot) / (top - foot)), y);
      if (ta < b.ta || ta > b.tb) continue;
      if (within(ta, b.fallen)) { const mid = P3(ta - dir * 18, sd * H, WATER_Y + 6); strut(from, mid, 0.07, STAY); strut(mid, P3(ta - dir * 8, sd * H, WATER_Y - 1), 0.07, STAY); continue; }
      strut(from, P3(ta, sd * (H - 0.3), Y(ta) + 0.2), 0.07, STAY);
    }
  }
  // The derailed car, across the rail deck from handrail to handrail.
  if (b.car !== undefined) { const m = (R(b.car) + R(b.car + 11)) / 2; box(b.car, b.car + 11, -H + 0.75, H - 0.75, m, m + 2, MAT.metal, 0x6f767c); }
  // The ladders: up the north pier from the bank to the rail deck's edge; at the lifted plates' edge from the rail deck
  // up to the road. Where he's put to come at them.
  const climbables: Climbable[] = [], teleports: Teleport[] = [];
  if (b.pier !== undefined) {
    const q = b.pier, [x, z] = at(b, q, H + 0.05), [fx, fz] = at(b, q, H + 1), gy = hAt(g, fx, fz);
    climbables.push({ kind: 'ladder', x, z, y0: gy, y1: R(q) + 0.3, nx: -b.uz, nz: b.ux });
    teleports.push({ name: 'Dongshuimen Bridge: north pier', x: fx, y: gy + 0.3, z: fz, yaw: atan2(-b.uz, b.ux) });
  }
  if (b.lifted) { const t = b.lifted[0] + 0.05, [x, z] = at(b, t, 0); climbables.push({ kind: 'ladder', x, z, y0: R(t), y1: Y(t) + 0.3, nx: b.ux, nz: b.uz }); }
  if (b.holes) { const [x, z] = at(b, b.ta + 6, -6); teleports.push({ name: 'Dongshuimen Bridge: rail deck', x, y: R(b.ta + 6) + 0.1, z, yaw: atan2(-b.ux, -b.uz) }); }
  // A fallen span: its torn ends hanging toward the river, the wreck of it in the water below.
  if (b.fallen) for (const [t, d] of [[b.fallen[0], 1], [b.fallen[1], -1]] as const) {
    for (const sd of [-1, 1]) {
      const s = sd * (H - T.chord / 2);
      strut(P3(t, s, R(t)), P3(t + d * 5, s + sd, R(t) - 14), 0.3, RED);
      strut(P3(t, s, Y(t) - 1), P3(t + d * 7, s - sd * 2, R(t) - 9), 0.3, RED);
      strut(P3(t, s, Y(t) - 1), P3(t + d * 3, s, R(t) - 6), 0.22, RED);
    }
    const w0 = t + d * 14, w1 = t + d * 46;
    box(Math.min(w0, w1), Math.max(w0, w1), -H, H, WATER_Y - 4, WATER_Y + 1.2, MAT.metal, RED);
    box(Math.min(w0, w1) + 6, Math.max(w0, w1) - 6, -H + 2, H - 2, WATER_Y + 1.2, WATER_Y + 3.4, MAT.concrete);
  }
  // (Seen from afar, past the city's detail, its steel and concrete as they are, but for the thin handrails.)
  const yaw = atan2(b.uz, b.ux), far = local.filter(q => Math.min(q.x1 - q.x0, q.y1 - q.y0, q.z1 - q.z0) >= 0.5).map(q => ({ ...q }));
  return { solids: turn(local, yaw, b.ox, b.oz), decor: turn(decor, yaw, b.ox, b.oz), far: turn(far, yaw, b.ox, b.oz), lines, climbables, teleports };
}
