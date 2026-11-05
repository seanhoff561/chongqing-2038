// Places under the city made by hand (M10-38c, U-104): the tools the air-raid shelter (airraid.ts), Jiefangbei
// station's concourse and control room (metroroom.ts) and the Grand Tunnel's galleries (tunnels.ts) are laid out
// with, in a straight run's own frame (t along it, s across, from its floor y): doorways through the walls between
// their lined halls and the doors in them (shut, locked, keyed to a card, jammed, chained, buried), heaps where it
// came down, furniture set against the walls (a model over a hidden box; a container to search), words on the walls,
// and marks: where a way in starts and where its heart is (for the tests), where its story document lies.
import type { Solid } from '../geom';
import { MAT } from '../mats';
import { makeRng, hashString, rand } from '../../sim/rng';
import { door as hang, type Lock } from '../city/access';
import type { Fabric } from '../city/buildings';
import type { Feature, Inter, Prop } from '../world';

export type Face = [number, number];
export interface Hand {
  /** its interactables' ids start `<pre>-` */
  pre: string;
  /** its floor */
  y: number;
  /** a lined space over the rect from y0 to y1 (every other space's bore cuts its walls where they meet) */
  space(t0: number, t1: number, s0: number, s1: number, y0: number, y1: number, mat?: number): void;
  /** a box in the frame its solids are kept in */
  box(t0: number, t1: number, s0: number, s1: number, y0: number, y1: number, mat: number): Solid;
  /** a point of the frame on the map */
  pt(t: number, s: number): [number, number];
  kept: Solid[]; decor: Solid[]; props: Prop[]; inter: Inter[]; features: Feature[];
}

/** A way along the frame on the map, as a unit vector. */
export function along(h: Hand, dt: number, ds: number): [number, number] {
  const [ax, az] = h.pt(0, 0), [bx, bz] = h.pt(dt, ds), l = Math.hypot(bx - ax, bz - az);
  return [(bx - ax) / l, (bz - az) / l];
}

/** A doorway through the wall at (t, s), walked through along t or s, the wall 0.6 m thick (its halls' bores 0.6 m
 *  apart), and its door as `lock` holds it (a card's reader if `key`). */
export function door(h: Hand, id: string, t: number, s: number, through: 't' | 's', lock: Lock, o: { key?: string; label?: [string, string]; w?: number; ht?: number } = {}) {
  const w = o.w ?? 1.2, ht = o.ht ?? 2.1, y = h.y, spanT = through === 's';
  const span = (a: number, b: number, c: number, d: number): [number, number, number, number] => (spanT ? [t + a, t + b, s + c, s + d] : [t + c, t + d, s + a, s + b]);
  h.space(...span(-w / 2, w / 2, -0.75, 0.75), y, y + ht);
  const fab: Fabric = { solids: h.kept, decor: h.decor, props: h.props, inter: h.inter, features: h.features, lots: [], climbables: [], hides: [], sites: [], far: [] };
  hang(`${h.pre}-${id}`, h.box(...span(-w / 2, w / 2, -0.03, 0.03), y, y + ht, MAT.hidden), spanT ? h.pt(t - w / 2, s) : h.pt(t, s - w / 2), spanT ? along(h, 1, 0) : along(h, 0, 1), w, lock, fab, o.label);
  const it = h.inter.find(q => q.id === `${h.pre}-${id}`);
  if (it && o.key) it.data = { ...it.data, lock: 'locked', key: o.key };
}

/** Where it came down: broken concrete heaped to the roof over the rect (no way past), chunks round its foot, a
 *  beam hanging out of the roof over it. */
export function heap(h: Hand, t0: number, t1: number, s0: number, s1: number, top: number) {
  h.kept.push(h.box(t0, t1, s0, s1, h.y, top, MAT.rubble));
  const r = makeRng(hashString(`heap:${h.pre}:${t0}:${s0}`));
  for (let i = 0; i < 8; i++) {
    const z = 0.25 + rand(r) * 0.4, f = rand(r), side = i % 4;
    const ct = side < 2 ? t0 + f * (t1 - t0) : side === 2 ? t0 - z / 2 : t1 + z / 2, cs = side >= 2 ? s0 + f * (s1 - s0) : side === 0 ? s0 - z / 2 : s1 + z / 2;
    h.decor.push(h.box(ct - z / 2, ct + z / 2, cs - z / 2, cs + z / 2, h.y, h.y + 0.1 + rand(r) * 0.3, MAT.rubble));
  }
  h.decor.push(h.box(t0 + 0.2, t1 - 0.2, (s0 + s1) / 2 - 0.12, (s0 + s1) / 2 + 0.12, top - 0.5, top - 0.25, MAT.concrete));
}

/** A piece of furniture against a wall, its front facing `face` (a model over a hidden box); a container to search
 *  if it's named: of its type, rolling its loot table or tier, holding `items`. Its look point a step off its front. */
export function put(h: Hand, kind: string, t: number, s: number, face: Face, w: number, ht: number, d: number,
  o: { id?: string; zh?: string; en?: string; type?: string; loot?: string; tier?: number; items?: [string, number][]; up?: number; fallen?: boolean } = {}) {
  const y = h.y + (o.up ?? 0), [x, z] = h.pt(t, s), [fx, fz] = along(h, ...face);
  h.props.push({ kind: `f:${kind}`, x, y, z, yaw: Math.atan2(fx, fz), w, h: ht, d, ...(o.fallen ? { text: 'fallen' } : {}) });
  if (ht > 0.3 && !o.fallen) h.kept.push(face[0] ? h.box(t - d / 2, t + d / 2, s - w / 2, s + w / 2, y, y + ht, MAT.hidden) : h.box(t - w / 2, t + w / 2, s - d / 2, s + d / 2, y, y + ht, MAT.hidden));
  if (!o.id) return;
  const [lx, lz] = h.pt(t + face[0] * (d / 2 + 0.1), s + face[1] * (d / 2 + 0.1));
  h.inter.push({ id: `${h.pre}-${o.id}`, kind: 'container', x: lx, y: y + Math.min(ht, 1.2) * 0.7, z: lz, r: 0.7, zh: o.zh ?? '箱子', en: o.en ?? 'Crate',
    data: { type: o.type ?? kind, ...(o.tier ? { tier: o.tier } : { loot: o.loot ?? 'shop' }), ...(o.items ? { items: o.items } : {}) } });
}

/** Words written on a wall at (t, s), facing into the room along `face`. */
export function scrawl(h: Hand, t: number, s: number, face: Face, text: string, up = 1.5) {
  const [x, z] = h.pt(t, s), [fx, fz] = along(h, ...face);
  h.props.push({ kind: 'graffiti', x: x + fx * 0.02, y: h.y + up, z: z + fz * 0.02, yaw: Math.atan2(fx, fz), text });
}

/** A mark at (t, s) on its floor (or `up` over it): `in:<place>:<way>`, `heart:<place>`, `doc:<place>`. */
export function mark(h: Hand, kind: string, t: number, s: number, up = 0) {
  const [x, z] = h.pt(t, s);
  h.features.push({ kind, x, y: h.y + up, z, group: h.features.length });
}
