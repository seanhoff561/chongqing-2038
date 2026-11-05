// Ways in and out (M3-36, U-014, U-034, U-066): doors and windows and what holds them. A door is a leaf drawn as a
// prop, its collision a hidden solid its interactable switches: open (no leaf), shut, locked (forced with the crowbar,
// loudly, or its key), jammed (shouldered, loudly), chained (the crowbar or bolt cutters) or collapsed (rubble heaped
// in the doorway: no way through). A window is broken in (open), glazed (the glass broken out with E held, loudly)
// or barred.
import { MAT } from '../mats';
import { rand, type Rng } from '../../sim/rng';
import { turn, type Solid } from '../geom';
import type { Fabric } from './buildings';
import { cos, atan2 } from '../trig';

export type Lock = 'open' | 'shut' | 'locked' | 'jammed' | 'chained' | 'collapsed';
export type Glazing = 'open' | 'glass' | 'barred';

/** A lock by weights for open, shut, locked, jammed, chained (and collapsed). */
export function roll(r: Rng, w: number[]): Lock {
  let q = rand(r) * w.reduce((a, b) => a + b, 0);
  for (const [i, k] of (['open', 'shut', 'locked', 'jammed', 'chained', 'collapsed'] as const).entries()) if ((q -= w[i] ?? 0) < 0) return k;
  return 'shut';
}

/** A door in a doorway: `box` fills it (made hidden, its collision), the leaf hinged at `hinge` running along
 *  `dir` (a unit step) `w` wide. */
/** Where a door's handle is (render/props.ts draws it on the leaf): its height up the door and its middle out from
 *  the door's middle toward the free edge, both as shares of the door's height and width. */
export const HANDLE = { y: 0.47, u: 0.355 };

export function door(id: string, box: Solid, hinge: [number, number], dir: [number, number], w: number, lock: Lock, out: Fabric, label: [string, string] = ['门', 'Door']) {
  if (lock === 'open') return;
  box.mat = MAT.hidden; box.part = id;
  out.solids.push(box);
  // Collapsed: no leaf, the doorway heaped with broken concrete and a fallen beam across it (laid along the doorway's
  // own width, in its own frame, turned with it if it's turned).
  if (lock === 'collapsed') {
    const R = box.rot, e = R ?? box, h = box.y1 - box.y0, long = e.x1 - e.x0 > e.z1 - e.z0, mu = long ? (e.z0 + e.z1) / 2 : (e.x0 + e.x1) / 2;
    const [a0, a1] = long ? [e.x0, e.x1] : [e.z0, e.z1], put = (u0: number, u1: number, v: number, y0: number, y1: number, mat: number) => {
      const q: Solid = long ? { x0: u0, x1: u1, z0: mu - v, z1: mu + v, y0, y1, mat, ramp: 0, low: 0 } : { x0: mu - v, x1: mu + v, z0: u0, z1: u1, y0, y1, mat, ramp: 0, low: 0 };
      out.decor.push(R ? turn([q], atan2(R.s, R.c), R.px, R.pz)[0] : q);
    };
    for (let i = 0; i < 4; i++) put(a0 + ((a1 - a0) * i) / 4 - 0.1, a0 + ((a1 - a0) * (i + 1)) / 4 + 0.1, 0.3 + ((i * 37) % 10) / 40, box.y0, box.y0 + h * (0.45 + ((i * 53) % 10) / 25), MAT.rubble);
    put(a0 - 0.1, a1 + 0.1, 0.12, box.y0 + h * 0.62, box.y0 + h * 0.62 + 0.25, MAT.concrete);
  } else {
    const yaw = atan2(-dir[1], dir[0]), mx = hinge[0] + (dir[0] * w) / 2, mz = hinge[1] + (dir[1] * w) / 2, y = box.y0 + (box.y1 - box.y0) * HANDLE.y;
    out.props.push({ kind: 'door', x: hinge[0], y: box.y0, z: hinge[1], yaw, w, h: box.y1 - box.y0, d: 0.05, text: id });
    // What holds it, on both faces (U-066, U-072), gone when it's forced, round the handle each face has (render/props.ts,
    // U-083). Chained: a chain wound twice round the handle and across to the frame past the door's edge, a padlock
    // hanging where its ends meet. Locked: a padlock hanging from the handle (U-079).
    const n: [number, number] = [-dir[1], dir[0]], put = (kind: string, u: number, dy: number, off: number, cw: number, ch: number, cd: number, turn = 0) =>
      out.props.push({ kind, x: mx + dir[0] * u + n[0] * off, y: y + dy, z: mz + dir[1] * u + n[1] * off, yaw: yaw + turn, w: cw, h: ch, d: cd, text: id });
    const at = w * HANDLE.u;
    for (const side of [-1, 1]) {
      const off = side * 0.055;
      if (lock === 'chained') {
        for (const dy of [0.025, -0.025]) for (let k = 0, u = at - 0.06; u <= w / 2 + 0.12; u += 0.045, k++) put('chain', u, dy + 0.01 * cos(u * 9), off, 0.06, 0.038, 0.011, k % 2 ? Math.PI / 2 : 0);
        put('chain', w / 2 + 0.12, -0.06, off * 1.15, 0.034, 0.04, 0.008); put('padlock', w / 2 + 0.12, -0.105, off * 1.15, 0.05, 0.06, 0.022);
      }
      if (lock === 'locked') { put('chain', at, -0.03, off * 1.1, 0.03, 0.04, 0.008); put('padlock', at, -0.075, off * 1.1, 0.045, 0.055, 0.02); }
    }
  }
  out.inter.push({ id, kind: 'door', x: hinge[0] + (dir[0] * w) / 2, y: box.y0 + 1.1, z: hinge[1] + (dir[1] * w) / 2, r: 0.9, zh: label[0], en: label[1], data: lock === 'shut' ? { part: id } : { part: id, lock } });
}

/** A street door made a roller shutter (M5-23b): pulled down and locked over a shopfront, drawn by itself
 *  (render/shutters.ts) in place of the door's leaf and its padlock, prised up with the crowbar. */
export function shutter(out: Fabric, id: string) {
  for (let i = out.props.length - 1; i >= Math.max(0, out.props.length - 40); i--) if (out.props[i].text === id) out.props.splice(i, 1);
  const it = out.inter.find(q => q.id === id);
  if (it) { it.data = { ...it.data, shutter: true }; it.zh = '卷帘门'; it.en = 'Roller shutter'; }
}

/** A window opening's state: `box` fills it (made hidden): its glass to break out, or bars across it running along
 *  `dir`, centred at `c`. */
export function glaze(id: string, box: Solid, c: [number, number], dir: [number, number], w: number, state: Glazing, out: Fabric) {
  if (state === 'open') return;
  box.mat = MAT.hidden; box.part = id;
  out.solids.push(box);
  const h = box.y1 - box.y0;
  if (state === 'glass') {
    out.props.push({ kind: 'pane', x: c[0], y: box.y0, z: c[1], yaw: atan2(-dir[1], dir[0]), w, h, d: 0.03, text: id });
    out.inter.push({ id, kind: 'window', x: c[0], y: box.y0 + h / 2, z: c[1], r: 0.9, zh: '窗', en: 'Window', data: { part: id } });
    return;
  }
  // Bars a hand apart, and a rail across top and bottom.
  const bar = (u: number, t: number, y0: number, y1: number) => {
    const x = c[0] + dir[0] * u, z = c[1] + dir[1] * u, hx = Math.abs(dir[0]) * t + Math.abs(dir[1]) * 0.02, hz = Math.abs(dir[1]) * t + Math.abs(dir[0]) * 0.02;
    out.decor.push({ x0: x - hx, y0, z0: z - hz, x1: x + hx, y1, z1: z + hz, mat: MAT.metal, ramp: 0, low: 0 });
  };
  for (let u = -w / 2 + 0.06; u < w / 2; u += 0.13) bar(u, 0.012, box.y0, box.y1);
  for (const y of [box.y0 + 0.05, box.y1 - 0.08]) bar(0, w / 2, y, y + 0.03);
}

/** A cover over a hole to climb through (M3-73a, M3-83, U-044): a grate's bars or a trapdoor's plate, `box` its
 *  collision (made hidden), opened with F like the start hideout's grate (sim/grate.ts): from below, bolted ones
 *  take drawing the bolts; from above a bolted one won't lift. `c` its middle, `w` its width (square). Its
 *  interactable is a 'grate' with no bags (a manhole's kind). */
export function cover(id: string, box: Solid, c: [number, number], w: number, kind: 'grate' | 'hatch', loose: boolean, out: Pick<Fabric, 'solids' | 'props' | 'inter'>, label: [string, string]) {
  box.mat = MAT.hidden; box.part = id;
  out.solids.push(box);
  out.props.push({ kind, x: c[0], y: (box.y0 + box.y1) / 2, z: c[1], yaw: 0, w, text: id });
  out.inter.push({ id, kind: 'grate', x: c[0], y: (box.y0 + box.y1) / 2, z: c[1], r: Math.max(0.8, w * 0.6), zh: label[0], en: label[1], data: { part: id, manhole: true, half: w / 2, ...(loose ? { loose: true } : {}) } });
}
