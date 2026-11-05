// Hand-made insides (M10-38b, U-104): the tools a key place's own layout is built with, in its building's frame (u
// along the long side, v across, from inside the corner wall; floor k): rooms carved out of the block, doorways and
// their doors (locked to a card, chained, jammed, collapsed), crawl vents, flights of stairs from one floor to the
// next and up from the cellar, heaps where it came down, barred windows, the things set out in them, words written on
// a wall, and marks for what's fitted later (yuzhong/secure.ts). The rooms are furnished as the city's are (rooms.ts),
// by dice of the building's own, round what's set out by hand, nothing in them knocked over by chance.
import { carve, rampSolid, type Solid } from '../geom';
import { stepsFor } from '../steps';
import { MAT } from '../mats';
import { makeRng, hashString, rand } from '../../sim/rng';
import { TYPES } from './types';
import { FLOOR, WALL, SLAB, DOOR, DOOR_H, CORE, CORE_W, furnish, piece, FURNITURE, type Floor, type Kind, type Rect, type Piece } from './rooms';
import { door as hang, glaze, shutter, type Lock } from './access';
import { VENT, WIN, type Frame } from './puzzle';
import type { Fabric } from './buildings';
import type { Site } from '../world';

type Face = [number, number];
type Rise = '+u' | '-u' | '+v' | '-v';
type Opts = { key?: string; label?: [string, string]; w?: number; h?: number; way?: string; shutter?: boolean };

export function handmade(fr: Frame, from: number, out: Fabric, look: number) {
  const { l, U, base, B, at, alongZ, nid } = fr, y = (k: number) => base + k * FLOOR;
  const box = (q: Rect, y0: number, y1: number, mat = 0) => B(q[0], y0, q[1], q[2], y1, q[3], mat);
  const unit = (du: number, dv: number): [number, number] => { const [ax, az] = at(0, 0), [bx, bz] = at(du, dv); return [bx - ax, bz - az]; };
  const rooms: { k: number; rect: Rect; kind: Kind | null; fallen: boolean }[] = [], keep = new Map<number, Rect[]>(), cuts: Solid[] = [], later: (() => void)[] = [], set: (() => void)[] = [];
  const kept = (k: number, q: Rect) => (keep.get(k) ?? keep.set(k, []).get(k)!).push(q);
  const floor = (k: number): Floor => ({ l, y: y(k), k, alongZ, B: (...a) => { const s = B(...a); s.inner = true; return s; }, at, decay: fr.decay, nid });
  // (The ground floor's lobby, carved by the stairwell's builder, filled back: it's laid out here.)
  const lobby = fr.core!.lobby, fill = B(0, base, lobby[1], U, base + FLOOR - SLAB, lobby[3], look), lining = TYPES[l.type ?? 'residential'].inside;
  if (lining !== undefined) fill.inside = lining;
  out.solids.push(fill);
  /** Stairs over a rect from y0 up to y1 (on floor k), rising along `rise` to a landing a metre deep at the head,
   *  carved open up to under the slab over the floor above. */
  const stairs = (k: number, q: Rect, y0: number, y1: number, rise: Rise) => {
    const [u0, v0, u1, v1] = q, up = rise[0] === '+', alongU = rise[1] === 'u';
    cuts.unshift(box(q, y0, y1 + FLOOR - SLAB));
    kept(k, q);
    const head: Rect = alongU ? (up ? [u1 - 1, v0, u1, v1] : [u0, v0, u0 + 1, v1]) : up ? [u0, v1 - 1, u1, v1] : [u0, v0, u1, v0 + 1];
    const run: Rect = alongU ? (up ? [u0, v0 + 0.05, u1 - 1, v1 - 0.05] : [u0 + 1, v0 + 0.05, u1, v1 - 0.05]) : up ? [u0 + 0.05, v0, u1 - 0.05, v1 - 1] : [u0 + 0.05, v0 + 1, u1 - 0.05, v1];
    // (Which way it climbs in the lot's own frame.)
    const dir = (alongU ? (alongZ ? (up ? 3 : 4) : up ? 1 : 2) : alongZ ? (up ? 1 : 2) : up ? 3 : 4) as 1 | 2 | 3 | 4;
    later.push(() => {
      const [ax, az] = at(run[0], run[1]), [bx, bz] = at(run[2], run[3]);
      const ramp = rampSolid(Math.min(ax, bx), y0 - 0.12, Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz), y0, y1, dir, MAT.hidden);
      out.solids.push(ramp, box(head, y1 - SLAB, y1, MAT.concrete));
      stepsFor(ramp, out.decor, MAT.concrete);
    });
  };
  const ways: string[] = [];
  // (Clear in front of the street door and round the cellar hatch: nothing's set down there.)
  const doorV = CORE_W + (fr.V - CORE_W) / 2, hatch: [number, number] = [3.8, Math.min(lobby[3], fr.V - 3) - 0.7];
  kept(0, [U - 1.8, doorV - 1.3, U, doorV + 1.3]);
  kept(0, [hatch[0] - 1.2, hatch[1] - 1.2, hatch[0] + 1.2, hatch[1] + 1.2]);
  const K = {
    U, V: fr.V,
    /** A room: carved from floor k's floor to under the slab over it (`floors` tall), furnished as `kind` if given. */
    room(k: number, u0: number, v0: number, u1: number, v1: number, kind: Kind | null = null, o: { floors?: number; fallen?: boolean } = {}) {
      rooms.push({ k, rect: [u0, v0, u1, v1], kind, fallen: !!o.fallen });
      cuts.unshift(box([u0, v0, u1, v1], y(k), y(k) + FLOOR * (o.floors ?? 1) - SLAB));
    },
    /** A doorway through a wall at (u, v), walked through along `through`, and its door as `lock` holds it (a card's
     *  reader if `key`); its id. */
    door(k: number, u: number, v: number, through: 'u' | 'v', lock: Lock, o: Opts = {}) {
      const w = o.w ?? DOOR, h = o.h ?? DOOR_H, id = nid(o.way ? `way${o.way}` : 'd'), Y = y(k), alongU = through === 'v';
      const span = (a: number, b: number, c: number, d: number): Rect => (alongU ? [u + a, v + c, u + b, v + d] : [u + c, v + a, u + d, v + b]);
      cuts.push(box(span(-w / 2, w / 2, -0.45, 0.45), Y, Y + h));
      kept(k, span(-w / 2 - 0.4, w / 2 + 0.4, -1.1, 1.1));
      if (o.way) ways.push(id);
      // Its frame, both faces, unless it's a vent's.
      if (h > 1.5) for (const f of [-0.15, 0.15]) for (const [a, b, y0, y1] of [[-w / 2 - 0.07, -w / 2, Y, Y + h + 0.07], [w / 2, w / 2 + 0.07, Y, Y + h + 0.07], [-w / 2 - 0.07, w / 2 + 0.07, Y + h, Y + h + 0.07]]) {
        const q = box(span(a, b, f - 0.015, f + 0.015), y0, y1, MAT.wood); q.inner = true; out.decor.push(q);
      }
      later.push(() => {
        const hinge = alongU ? at(u - w / 2, v) : at(u, v - w / 2);
        hang(id, box(span(-w / 2, w / 2, -0.03, 0.03), Y, Y + h), hinge, alongU ? unit(1, 0) : unit(0, 1), w, lock, out, o.label);
        const it = out.inter.find(q => q.id === id);
        if (it && o.key) it.data = { ...it.data, lock: 'locked', key: o.key };
        if (o.shutter) shutter(out, id);
      });
      return id;
    },
    /** A crawl vent through a wall, its cover in it. */
    vent(k: number, u: number, v: number, through: 'u' | 'v', lock: Lock, label: [string, string], way?: string) {
      return K.door(k, u, v, through, lock, { w: VENT.w, h: VENT.h, label, way });
    },
    /** A flight of stairs from floor k up to the next, filling the rect: rising along `rise` to a landing a metre deep
     *  at its head, the floor over open above the rest. */
    flight(k: number, u0: number, v0: number, u1: number, v1: number, rise: Rise) {
      rooms.push({ k, rect: [u0, v0, u1, v1], kind: null, fallen: false });
      kept(k + 1, [u0, v0, u1, v1]);
      stairs(k, [u0, v0, u1, v1], y(k), y(k) + FLOOR, rise);
    },
    /** Where it came down: broken concrete heaped h high over the rect (to the slab over it, no way past), chunks
     *  spilled round its foot. */
    heap(k: number, u0: number, v0: number, u1: number, v1: number, h = FLOOR - SLAB) {
      kept(k, [u0 - 0.5, v0 - 0.5, u1 + 0.5, v1 + 0.5]);
      later.push(() => {
        out.solids.push(box([u0, v0, u1, v1], y(k), y(k) + h, MAT.rubble));
        const r = makeRng(hashString(`heap:${l.id}:${k}:${u0}:${v0}`));
        for (let i = 0; i < 8; i++) {
          // (Round its four sides, two a side.)
          const s = 0.25 + rand(r) * 0.4, t = rand(r), side = i % 4;
          const cu = side < 2 ? u0 + t * (u1 - u0) : side === 2 ? u0 - s / 2 : u1 + s / 2, cv = side >= 2 ? v0 + t * (v1 - v0) : side === 0 ? v0 - s / 2 : v1 + s / 2;
          const q = box([cu - s / 2, cv - s / 2, cu + s / 2, cv + s / 2], y(k), y(k) + 0.1 + rand(r) * 0.3, MAT.rubble); q.inner = true; out.decor.push(q);
        }
        // (The slab over it broken through, a beam hanging down.)
        const q = box([u0 + 0.2, v0 + (v1 - v0) / 2 - 0.12, u1 - 0.2, v0 + (v1 - v0) / 2 + 0.12], y(k) + h - 0.5, y(k) + h - 0.25, MAT.concrete); q.inner = true; out.decor.push(q);
      });
    },
    /** A barred window in an outer wall: on the wall at u = 0 or U ('u0', 'u1'), or v = 0 or V ('v0', 'v1'), its middle
     *  c along it. */
    window(k: number, face: 'u0' | 'u1' | 'v0' | 'v1', c: number) {
      const Y = y(k) + WIN.sill, onU = face[0] === 'u', f = face[1] === '0' ? 0 : onU ? U : fr.V, out0 = face[1] === '0' ? -1 : 1;
      const span = (a: number, b: number, d0: number, d1: number): Rect => { const p = f + out0 * d0, q = f + out0 * d1; return onU ? [Math.min(p, q), c + a, Math.max(p, q), c + b] : [c + a, Math.min(p, q), c + b, Math.max(p, q)]; };
      cuts.push(box(span(-WIN.w / 2, WIN.w / 2, -0.05, WALL + 0.05), Y, Y + WIN.h));
      later.push(() => { const m = span(0, 0, WALL / 2, WALL / 2); glaze(nid('w'), box(span(-WIN.w / 2, WIN.w / 2, WALL / 2 - 0.02, WALL / 2 + 0.02), Y, Y + WIN.h), at(m[0], m[1]), onU ? unit(0, 1) : unit(1, 0), WIN.w, 'barred', out); });
    },
    /** A piece of furniture set out by hand against a wall (its front facing `face`), a container to search if it's
     *  one: named, holding `items`, the place's story document's (`doc`), locked. */
    put(k: number, p: Piece, u: number, v: number, face: Face, o: { zh?: string; en?: string; items?: [string, number][]; doc?: boolean; lock?: Lock; fallen?: boolean } = {}) {
      const P = FURNITURE[p], b: Rect = face[0] ? [u - P.d / 2, v - P.w / 2, u + P.d / 2, v + P.w / 2] : [u - P.w / 2, v - P.d / 2, u + P.w / 2, v + P.d / 2];
      kept(k, b);
      set.push(() => {
        const n = out.inter.length, id = nid('f');
        piece(floor(k), p, b, face, id, !!o.fallen, false, out, SITE, 'store');
        const it = out.inter.slice(n).find(q => q.id === id);
        if (!it) return;
        if (o.zh) { it.zh = o.zh; it.en = o.en!; }
        it.data = { ...it.data, ...(o.items ? { items: o.items } : {}), ...(o.doc ? { doc: true } : {}), ...(o.lock ? { lock: o.lock } : {}) };
      });
    },
    /** A model set down (render/roomprops.ts): its front facing `face`; fallen over if asked. */
    prop(k: number, kind: string, u: number, v: number, face: Face, w: number, h: number, d: number, fallen = false, up = 0) {
      if (h > 0.3) kept(k, [u - w / 2, v - w / 2, u + w / 2, v + w / 2]);
      const [x, z] = at(u, v), [fx, fz] = unit(...face);
      out.props.push({ kind: `f:${kind}`, x, y: y(k) + up, z, yaw: Math.atan2(fx, fz), w, h, d, ...(fallen ? { text: 'fallen' } : {}) });
    },
    /** Something solid set down where it stands in the way (a counter, a trolley across a door): a hidden box under a
     *  model. */
    block(k: number, kind: string, u0: number, v0: number, u1: number, v1: number, h: number, face: Face) {
      kept(k, [u0, v0, u1, v1]);
      later.push(() => out.solids.push(box([u0, v0, u1, v1], y(k), y(k) + h, MAT.hidden)));
      const across = face[0] ? v1 - v0 : u1 - u0, deep = face[0] ? u1 - u0 : v1 - v0;
      K.prop(k, kind, (u0 + u1) / 2, (v0 + v1) / 2, face, across, h, deep);
    },
    /** Words written on a wall at (u, v), facing into the room along `face`. */
    scrawl(k: number, u: number, v: number, face: Face, text: string, up = 1.5) {
      const [x, z] = at(u, v), [fx, fz] = unit(...face);
      out.props.push({ kind: 'graffiti', x: x + fx * 0.02, y: y(k) + up, z: z + fz * 0.02, yaw: Math.atan2(fx, fz), text });
    },
    /** A mark for what's fitted once the city stands (yuzhong/secure.ts): 'secure:<what>' at (u, v) on floor k. */
    mark(what: string, k: number, u: number, v: number, face: Face = [1, 0]) {
      const [x, z] = at(u, v), [nx, nz] = unit(...face);
      out.features.push({ kind: `secure:${what}`, x, y: y(k), z, group: out.features.length, nx, nz });
    },
    /** What was set down in the cellar (the basement's furnishings) cleared off a rect of its floor, for a stair. */
    clear(u0: number, v0: number, u1: number, v1: number) {
      const [ax, az] = at(u0 - 0.6, v0 - 0.6), [bx, bz] = at(u1 + 0.6, v1 + 0.6), x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), z0 = Math.min(az, bz), z1 = Math.max(az, bz);
      const inR = (q: { x: number; y: number; z: number }) => q.x > x0 && q.x < x1 && q.z > z0 && q.z < z1 && q.y < base - 0.2;
      out.props = out.props.filter(q => !(q.kind.startsWith('f:') && inR(q)));
      out.inter = out.inter.filter(q => !(q.kind === 'container' && inR(q)));
      out.hides = out.hides.filter(h => !inR({ x: (h.inner.x0 + h.inner.x1) / 2, y: h.inner.y0, z: (h.inner.z0 + h.inner.z1) / 2 }));
      out.decor = out.decor.filter(q => !(q.inner && q.y1 < base - 0.3 && q.y0 > base - 3.3 && q.x0 > x0 && q.x1 < x1 && q.z0 > z0 && q.z1 < z1));
    },
    /** A flight up from the cellar's floor to the ground floor's, filling the rect (in the cellar's footprint), what
     *  was set down there cleared off it. */
    cellarStair(u0: number, v0: number, u1: number, v1: number, rise: Rise) {
      K.clear(u0, v0, u1, v1);
      stairs(0, [u0, v0, u1, v1], base - FLOOR - 0.2, base, rise);
    },
    /** The street door's way in to the foot of the stairs, for the building's walking route (frame points). */
    entry(pts: [number, number][]) {
      if (!l.route) return;
      const P = ([u, v]: [number, number]) => { const [x, z] = at(u, v); return { x, y: base, z }; };
      l.route.splice(1, 2, ...pts.map(P), P([CORE.near / 2, CORE_W + 0.8]));
    },
    /** Cut, hang, set out and furnish everything. */
    build() {
      for (const c of cuts) out.solids.splice(from, out.solids.length - from, ...carve(out.solids.slice(from), c));
      for (const f of later) f();
      for (const f of set) f();
      const r = makeRng(hashString(`inside:${l.id}`));
      // (Nothing in them knocked over by chance, across a way that's laid out to be walked.)
      for (const m of rooms) if (m.kind) furnish({ ...floor(m.k), decay: 0 }, m.rect, m.kind, keep.get(m.k) ?? [], m.fallen, r, out, SITE);
      return ways;
    },
  };
  return K;
}

/** (What furnish and the pieces set out record a room's bed, table and containers in: none claimed, nothing kept.) */
const SITE: Site = { id: '', kind: 'flat', x: 0, y: 0, z: 0, bed: 'none', table: 'none', containers: [], exits: 0, windows: 0, streetSides: 0 };
