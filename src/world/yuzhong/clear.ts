// Clearing the ground for a place built where the city stood (U-108: Hongyadong, the border wall): once the city's
// dressed, whatever it set where the new place goes taken away (not the place's own), and the streets that ran there
// ending at it. Nothing else is touched, so every die elsewhere falls as it did.
import { frameOut, type Solid } from '../geom';
import type { P2 } from './shapes';
import type { Plot, Patrol } from '../world';

/** A solid's footprint: its corners (turned with it) and its middle. */
export function footprint(s: Solid): P2[] {
  const b = s.rot ?? s, pts: P2[] = [[b.x0, b.z0], [b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1], [(b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2]];
  return pts.map(([x, z]) => frameOut(s, x, z));
}

/** Where a new place stands: whether something at (x, z) reaching up to y is in its way; a solid, whether it is. */
export type Gone = (x: number, z: number, y: number) => boolean;
export interface Clear { point: Gone; solid: (s: Solid) => boolean }

type OwnKey = keyof NonNullable<Plot['own']>;
/** The city's lists the plots' own ranges index (each the start of the list the world gets), by which range. */
export type Owned = { plots: Plot[]; of: Map<object[], OwnKey> };

/** a with what `gone` says taken out, in place; where its plots' ranges index it, moved down past what's gone. */
export function drop<T>(a: T[], gone: (q: T, i: number) => boolean, owned?: Owned) {
  const k = owned?.of.get(a as object[]), before = new Int32Array(a.length + 1);
  let n = 0;
  for (let i = 0; i < a.length; i++) { const out = gone(a[i], i); before[i + 1] = before[i] + (out ? 1 : 0); if (!out) a[n++] = a[i]; }
  a.length = n;
  if (k && n < before.length - 1) for (const p of owned!.plots) if (p.own) p.own[k] = [p.own[k][0] - before[p.own[k][0]], p.own[k][1] - before[p.own[k][1]]];
}

/** The lists with what's in the way taken out (not what's in `mine`), in place. */
export function sweep(gone: Clear, mine: Set<object>, lists: { solids?: Solid[][]; points?: { x: number; y: number; z: number }[][]; ups?: { x: number; y1: number; z: number }[][] }, owned?: Owned) {
  for (const a of lists.solids ?? []) drop(a, q => !mine.has(q) && gone.solid(q), owned);
  for (const a of lists.points ?? []) drop(a, q => !mine.has(q) && gone.point(q.x, q.z, q.y), owned);
  for (const a of lists.ups ?? []) drop(a, q => !mine.has(q) && gone.point(q.x, q.z, q.y1), owned);
}

/** The streets with their stretches where `out` holds cut away (looked at every metre), for the machines' ways. */
export function clipStreets<S extends { pts: P2[] }>(sts: S[], out: (x: number, z: number) => boolean): S[] {
  return sts.flatMap(s => {
    const pieces: S[] = [];
    let cur: P2[] = [], was = true, last: P2 | null = null, cut = false;
    const flush = () => { if (cur.length > 1) pieces.push({ ...s, pts: cur }); cur = []; };
    for (let k = 0; k + 1 < s.pts.length; k++) {
      const [ax, az] = s.pts[k], [bx, bz] = s.pts[k + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az)));
      for (let i = k === 0 ? 0 : 1; i <= n; i++) {
        const p: P2 = [ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n], o = out(...p);
        // (Into it: the last metre out ends this piece; out of it: the first metre out starts the next; corners kept.)
        if (o) { cut = true; if (!was && last && cur[cur.length - 1] !== last) cur.push(last); flush(); }
        else if (was || i === n) cur.push(p);
        was = o; last = p;
      }
    }
    flush();
    // (One it doesn't touch as it was.)
    return cut ? pieces : [s];
  });
}

/** A street beat that ran through a new place (`out`) or by it (`near`): its points in it left out, and where the
 *  way between two of those left crosses it, only its longest stretch kept; each point set on firm footing now
 *  (`firm`: on what's under it, or beside it where the ground's been cut away under it). (Never none: each beat's
 *  walkers keep their dice.) */
type V3 = { x: number; y: number; z: number };
export function clipBeat(p: Patrol, out: (x: number, z: number) => boolean, near: (x: number, z: number) => boolean, firm: (q: V3) => V3 | null): Patrol {
  if (p.kind !== 'street' || !p.pts.some(q => near(q.x, q.z))) return p;
  const crosses = (a: V3, b: V3) => { const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z)); for (let k = 1; k < n; k++) if (out(a.x + ((b.x - a.x) * k) / n, a.z + ((b.z - a.z) * k) / n)) return true; return false; };
  const runs: number[][] = [[]];
  p.pts.forEach((q, i) => {
    if (out(q.x, q.z)) return;
    const run = runs[runs.length - 1];
    if (run.length && crosses(p.pts[run[run.length - 1]], q)) runs.push([i]); else run.push(i);
  });
  let keep = runs.reduce((a, b) => (b.length > a.length ? b : a));
  if (keep.length < 2) keep = p.pts.map((_, i) => i);
  const at = new Map(keep.map((i, k) => [i, k]));
  const look = p.look && Object.fromEntries(Object.entries(p.look).filter(([i]) => at.has(+i)).map(([i, v]) => [at.get(+i)!, v]));
  const pts = keep.map(i => firm(p.pts[i]) ?? p.pts[i]);
  return { ...p, pts, dwell: keep.map(i => p.dwell[i]), ...(look ? { look } : {}) };
}
