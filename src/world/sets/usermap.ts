// A map made in the editor (M10-32): a flat empty ground and the pieces placed on it (sets/pieces.ts), built into a
// World with the city's own builders: furniture as the rooms furnish it, props with the dressing's collision boxes,
// hiding places and climbable trunks and posts, stairs as the city's, containers that hold what was chosen for them.
import { solid, rampSolid, turn, carve, type Solid, type Box } from '../geom';
import { makeWorld, type World, type Climbable, type Prop, type Inter, type HideSpot, type Line } from '../world';
import { MAT } from '../mats';
import { stepsFor } from '../steps';
import { FURNITURE } from '../city/rooms';
import { propBoxes } from '../yuzhong/dressing';
import { climbOf } from '../yuzhong/green';
import { PROP_HIDE } from '../../data/props';
import { PIECES } from './pieces';
import { sin, cos } from '../trig';

/** A placed piece: where its foot is, which way it faces (yaw, as a prop's), its box's sizes; a built piece's
 *  material, a sign's or graffiti's text, a container's chosen things and the loot table it also rolls from. */
export interface Piece { kind: string; x: number; y: number; z: number; yaw: number; w: number; h: number; d: number; mat?: string; text?: string; items?: [string, number][]; loot?: string }
export interface MapDoc { v: 1; name: string; pieces: Piece[] }

/** Half the ground's width: a 300 m square. */
export const GROUND = 150;
/** How steeply a zipline falls along its length: rideable (sim/zip.ts wants 1 in 10). */
const ZIP_FALL = 1 / 8;

/** A new map: the ground, the spawn point and one large empty apartment beside it to fill. */
export function emptyMap(name = 'new map'): MapDoc {
  return { v: 1, name, pieces: [{ kind: 'spawn', x: 0, y: 0, z: 0, yaw: 0, w: 0.6, h: 1.8, d: 0.6 }, { kind: 'apartment', x: 0, y: 0, z: -12, yaw: 0, w: 14, h: 3, d: 10 }] };
}

export function buildMap(doc: MapDoc): World {
  let solids: Solid[] = [solid(-GROUND, -4, -GROUND, GROUND, 0, GROUND, MAT.concrete)];
  const decor: Solid[] = [], climbables: Climbable[] = [], props: Prop[] = [], inter: Inter[] = [], hides: HideSpot[] = [], lines: Line[] = [], water: Box[] = [], cuts: Box[] = [];
  let spawn = { x: 0, y: 0, z: 0, yaw: 0 };
  doc.pieces.forEach((p, i) => {
    const c = cos(p.yaw), s = sin(p.yaw), id = `map-${i}`, { w, h, d } = p;
    const mat: number = MAT[(p.mat ?? PIECES[p.kind]?.mat ?? 'concrete') as keyof typeof MAT] ?? MAT.concrete;
    /** a point of its own frame in the world */
    const at = (lx: number, lz: number) => ({ x: p.x + lx * c + lz * s, z: p.z - lx * s + lz * c });
    /** a box of its own frame (x, z about its foot, y up from it) */
    const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, m = mat) => solid(p.x + x0, p.y + y0, p.z + z0, p.x + x1, p.y + y1, p.z + z1, m);
    /** its solids turned as it faces */
    const put = (ss: Solid[], into = solids) => { into.push(...(p.yaw ? turn(ss, -p.yaw, p.x, p.z) : ss)); };
    const climb = (kind: Climbable['kind'], lx: number, lz: number, y0: number, y1: number) => climbables.push({ kind, ...at(lx, lz), y0: p.y + y0, y1: p.y + y1, nx: s, nz: c });
    const front = (out: number, y: number) => ({ ...at(0, d / 2 + out), y: p.y + y });
    const prop = (kind: string, extra: Partial<Prop> = {}): Prop => { const q: Prop = { kind, x: p.x, y: p.y, z: p.z, yaw: p.yaw, ...extra }; props.push(q); return q; };
    switch (p.kind) {
      case 'spawn': spawn = { x: p.x, y: p.y, z: p.z, yaw: p.yaw }; break;
      case 'apartment': put(apartment(box, w, h, d)); break;
      case 'platform': case 'wall': case 'pillar': put([box(-w / 2, 0, -d / 2, w / 2, h, d / 2)]); break;
      // (Up toward its back.)
      case 'ramp': put([rampSolid(p.x - w / 2, p.y, p.z - d / 2, p.x + w / 2, p.z + d / 2, p.y, p.y + h, 4, mat)]); break;
      case 'stairs': { const r = rampSolid(p.x - w / 2, p.y, p.z - d / 2, p.x + w / 2, p.z + d / 2, p.y, p.y + h, 4, MAT.hidden), steps: Solid[] = []; stepsFor(r, steps, mat); put([r]); put(steps, decor); break; }
      case 'pool': cuts.push({ x0: p.x - w / 2, y0: -h, z0: p.z - d / 2, x1: p.x + w / 2, y1: 0.1, z1: p.z + d / 2 }); water.push({ x0: p.x - w / 2, y0: -h, z0: p.z - d / 2, x1: p.x + w / 2, y1: -0.3, z1: p.z + d / 2 }); break;
      // Climbing: a pipe on its bracket strip, a ladder (its frame makeWorld's), a pole, a rope in its frame, a vine.
      case 'pipe': put([box(-0.05, 0, 0, 0.05, h, 0.03, MAT.metal)]); climb('pipe', 0, 0.05, 0, h); break;
      case 'ladder': climb('ladder', 0, 0.05, 0, h); break;
      case 'pole': put([box(-0.06, 0, -0.06, 0.06, h, 0.06, MAT.metal)]); climb('post', 0, -0.02, 0.3, h); break;
      case 'rope':
        put([box(-w / 2, 0, -0.06, -w / 2 + 0.12, h + 0.12, 0.06, MAT.metal), box(w / 2 - 0.12, 0, -0.06, w / 2, h + 0.12, 0.06, MAT.metal), box(-w / 2, h, -0.06, w / 2, h + 0.12, 0.06, MAT.metal)]);
        put([box(-0.02, 0.4, -0.02, 0.02, h, 0.02, MAT.cloth)], decor);
        climb('rope', 0, -0.05, 0.4, h);
        break;
      case 'vine': prop('vine', { w, h }); climb('vine', 0, 0.12, 0.4, h); break;
      case 'ledge': put([box(-w / 2, 0, 0, w / 2, 0.1, d)]); break;
      case 'bar': put([box(-w / 2 - 0.1, 0, -0.1, -w / 2, h + 0.4, 0.1, MAT.metal), box(w / 2, 0, -0.1, w / 2 + 0.1, h + 0.4, 0.1, MAT.metal), box(-w / 2, h - 0.05, -0.03, w / 2, h, 0.03, MAT.metal)]); break;
      case 'rail': {
        const n = Math.max(1, Math.ceil(w / 1.5)), ss = [box(-w / 2, h - 0.05, -0.03, w / 2, h, 0.03, MAT.metal)];
        for (let k = 0; k <= n; k++) { const x = -w / 2 + 0.03 + (k * (w - 0.06)) / n; ss.push(box(x - 0.03, 0, -0.03, x + 0.03, h - 0.05, 0.03, MAT.metal)); }
        put(ss);
        break;
      }
      // A cable between two poles, falling 1 in 8 from its high end (local -x) to its low.
      case 'zipline': {
        const low = Math.max(1.5, h - w * ZIP_FALL), a = at(-w / 2, 0), b = at(w / 2, 0);
        put([box(-w / 2 - 0.08, 0, -0.08, -w / 2 + 0.08, h + 0.3, 0.08, MAT.metal), box(w / 2 - 0.08, 0, -0.08, w / 2 + 0.08, low + 0.3, 0.08, MAT.metal)]);
        lines.push({ a: { x: a.x, y: p.y + h, z: a.z }, b: { x: b.x, y: p.y + low, z: b.z } });
        break;
      }
      case 'chimney': put([box(-w / 2, 0, -d / 2, w / 2, h, -d / 2 + 0.3), box(-w / 2, 0, d / 2 - 0.3, w / 2, h, d / 2)]); break;
      case 'hidebox':
        put([box(-w / 2, 0, -d / 2, w / 2, h, d / 2, MAT.crate)]);
        hides.push({ id: hides.length, kind: 'crate', yaw: p.yaw, inner: { x0: p.x - w / 2 + 0.05, y0: p.y + 0.05, z0: p.z - d / 2 + 0.05, x1: p.x + w / 2 - 0.05, y1: p.y + h - 0.05, z1: p.z + d / 2 - 0.05 } });
        break;
      // A red sign, on a wall or on the floor, its text read with E (interact).
      case 'redsign': case 'redfloor': {
        const wall = p.kind === 'redsign', y = wall ? h / 2 : 0.01, o = wall ? at(0, 0.02) : at(0, 0);
        prop(p.kind, { ...o, y: p.y + y, w, h: wall ? h : d, text: p.text ?? '' });
        inter.push({ id, kind: 'sign', ...o, y: p.y + y, r: Math.max(w, wall ? h : d) / 2 + 0.2, zh: '牌子', en: 'Sign', data: { text: p.text ?? '' } });
        break;
      }
      case 'graffiti': prop('graffiti', { ...at(0, 0.01), y: p.y + h / 2, text: p.text || ' ' }); break;
      default: {
        const f = FURNITURE[p.kind as keyof typeof FURNITURE];
        if (f) { furnish(p, id, f, put, box, front, props, inter, hides); break; }
        if (PIECES[p.kind]?.group !== 'prop' && p.kind !== 'tree') break;
        // A prop as the city sets it: its collision boxes, a place to hide in, a trunk or a post to climb.
        const sized = PIECES[p.kind].size ? { w: p.kind === 'halfwall' ? d : w, h } : {};
        const q = prop(p.kind, { ...(PIECES[p.kind].on ? at(0, 0) : {}), ...sized });
        solids.push(...propBoxes(q));
        const hd = PROP_HIDE[p.kind];
        if (hd) { const o = at(0, hd.z); hides.push({ id: hides.length, kind: hd.kind, yaw: p.yaw, inner: { x0: o.x - hd.w / 2, y0: p.y + hd.y, z0: o.z - hd.d / 2, x1: o.x + hd.w / 2, y1: p.y + hd.y + hd.h, z1: o.z + hd.d / 2 } }); }
        const cl = climbOf(q);
        if (cl) climbables.push(cl);
      }
    }
  });
  for (const b of cuts) solids = carve(solids, b);
  return makeWorld({ name: 'map', solids, decor, climbables, props, inter, hides, lines, water, spawn, teleports: [{ name: 'spawn', ...spawn }] });
}

/** A large empty flat: a floor slab, plaster walls with a door in the front and windows round the others, a ceiling
 *  (its roof, flat, to climb onto). */
function apartment(box: (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, m?: number) => Solid, w: number, h: number, d: number): Solid[] {
  const T = 0.25, F = 0.2, x0 = -w / 2, x1 = w / 2, z0 = -d / 2, z1 = d / 2, top = F + h;
  const out = [box(x0, 0, z0, x1, F, z1, MAT.concrete), box(x0, top, z0, x1, top + T, z1, MAT.concrete)];
  /** a wall along x (or z) from a to b, its openings [from, to, bottom, top] cut out */
  const wall = (alongX: boolean, a: number, b: number, at0: number, at1: number, gaps: [number, number, number, number][]) => {
    const seg = (u0: number, u1: number, y0: number, y1: number) => { if (u1 - u0 > 0.01 && y1 - y0 > 0.01) out.push(alongX ? box(u0, y0, at0, u1, y1, at1, MAT.plaster) : box(at0, y0, u0, at1, y1, u1, MAT.plaster)); };
    let u = a;
    for (const [g0, g1, lo, hi] of gaps) { seg(u, g0, F, top); seg(g0, g1, F, F + lo); seg(g0, g1, F + hi, top); u = g1; }
    seg(u, b, F, top);
  };
  const win = (m: number): [number, number, number, number] => [m - 0.7, m + 0.7, 0.9, Math.min(2.1, h - 0.3)];
  wall(true, x0, x1, z1 - T, z1, [[-0.5, 0.5, 0, Math.min(2.1, h - 0.2)]]);
  wall(true, x0, x1, z0, z0 + T, [win(-w / 4), win(w / 4)]);
  wall(false, z0 + T, z1 - T, x0, x0 + T, [win(0)]);
  wall(false, z0 + T, z1 - T, x1 - T, x1, [win(0)]);
  return out;
}

type Put = (ss: Solid[]) => void;
type BoxFn = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, m?: number) => Solid;
/** A piece of furniture as the rooms set it (city/rooms.ts): its model, its box that collides (a chair's doesn't), a
 *  bed to sleep on, a table, a running sink, a wardrobe to hide in; a container holding what was chosen for it (and,
 *  given a loot table, what it rolls). */
function furnish(p: Piece, id: string, f: (typeof FURNITURE)[keyof typeof FURNITURE], put: Put, box: BoxFn, front: (out: number, y: number) => { x: number; y: number; z: number }, props: Prop[], inter: Inter[], hides: HideSpot[]) {
  const { w, h, d } = p;
  props.push({ kind: `f:${p.kind}`, x: p.x, y: p.y, z: p.z, yaw: p.yaw, w, h, d });
  if (p.kind !== 'chair') put([box(-w / 2, 0, -d / 2, w / 2, h, d / 2, MAT.hidden)]);
  if (p.kind === 'wardrobe') hides.push({ id: hides.length, kind: 'wardrobe', yaw: p.yaw, inner: { x0: p.x - (w - 0.1) / 2, y0: p.y + 0.05, z0: p.z - (d - 0.1) / 2, x1: p.x + (w - 0.1) / 2, y1: p.y + Math.min(1.9, h - 0.05), z1: p.z + (d - 0.1) / 2 } });
  if (p.kind === 'sink') inter.push({ id, kind: 'sink', ...front(0.05, h), r: 0.6, zh: '水槽', en: 'Sink', data: { running: true } });
  if (!('zh' in f)) return;
  if ('use' in f) { inter.push({ id, kind: f.use, ...front(0.05, h), r: 0.8, zh: f.zh, en: f.en }); return; }
  // ('none': only what was chosen, not the leftovers an empty container in the city might hold.)
  inter.push({ id, kind: 'container', ...front(0.05, Math.min(1.0, h / 2)), r: 0.6, zh: f.zh, en: f.en, data: { type: p.kind, items: p.items ?? [], loot: p.loot || 'none' } });
}
