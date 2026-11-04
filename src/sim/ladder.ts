// The telescoping ladder (M5-22, DESIGN section 8): used facing a wall within reach, it's stood against it, climbable
// to 4 m (or the wall's top, if lower); used at an edge facing a gap, it's laid flat across to the other side if that's
// within 3.8 m and near the same height: walkable, but only at a crouch's pace. Either way it stays till he takes it
// down (from its foot, or from the near end across a gap). Dropped, it clatters, heard 30 m round (drops.ts).
import type { SimState } from './types';
import type { World, Inter } from '../world/world';
import type { Stack } from './inventory';
import { onUseId } from './use';
import { extraInters, onInteract } from './interact';
import { eyeOf } from './player';
import { raycast, topAt, solid, turn, grow, type Solid } from '../world/geom';
import { rayGround } from '../world/heightfield';
import { addItem, takeStack } from './inventory';
import { MAT } from '../world/mats';
import { PLANK_W } from './plank';

/** Its rails' outer half-width and their depth, as render/rigs.ts draws them; how far out the wall is felt from. */
export const RAIL = 0.22, DEPTH = 0.03;
const FEEL = 0.6;
/** How high against a wall (m), the longest gap, how far from him a wall or an edge is looked for, how far the other
 *  side may sit above or below his, the ladder's width across a gap; stood against a wall, its rails' middle this far
 *  off whatever's behind them (their half-depth and a hair), and the most it stands out past something on the wall. */
export const LADDER = { wall: 4, gap: 3.8, reach: 1.4, level: 0.6, width: PLANK_W, off: DEPTH / 2 + 0.015, standOff: 0.3 };

function floorUnder(w: World, x: number, y: number, z: number) {
  const a = raycast(w.index, x, y, z, 0, -1, 0, 200), g = w.ground ? rayGround(w.ground, x, y, z, 0, -1, 0, 200) : null;
  return y - Math.min(a?.t ?? 200, g?.t ?? 200);
}

onUseId('ladder', (s, w, st) => {
  const p = s.player;
  if (p.swing > 0 || s.task) return;
  if (againstWall(s, w, st) || across(s, w, st)) { p.swing = 0.8; return; }
});

/** Stood against the wall he faces, if one's in reach: upright, its rails just off the face (M10-24). Up from its foot
 *  the world is felt for across its width by rays in at the wall: anything standing out a little (a step, a sill)
 *  moves it out past it; anything standing out further (a balcony) is where it stops, below. */
function againstWall(s: SimState, w: World, st: Stack) {
  const p = s.player, e = eyeOf(p), fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), y = p.pos.y + 1;
  const h = raycast(w.index, e.x, y, e.z, fx, 0, fz, LADDER.reach);
  if (!h || h.id < 0 || Math.abs(h.ny) > 0.5) return false;
  const nl = Math.hypot(h.nx, h.nz), nx = h.nx / nl, nz = h.nz / nl, hx = e.x + fx * h.t, hz = e.z + fz * h.t;
  const top = topAt(w.index.solids[h.id], hx - nx * 0.1, hz - nz * 0.1);
  // How far out its rails' middle must stand at a height to clear what's there (felt at its edges and middle).
  const outAt = (yk: number) => {
    let at = LADDER.off;
    for (const u of [-RAIL, 0, RAIL]) {
      const r = raycast(w.index, hx - nz * u + nx * FEEL, yk, hz + nx * u + nz * FEEL, -nx, 0, -nz, FEEL + 0.05);
      if (r) at = Math.max(at, FEEL - r.t + LADDER.off);
    }
    return at;
  };
  const tooFar = (yk: number) => outAt(yk) - LADDER.off > LADDER.standOff;
  let out = LADDER.off, y0 = 0, y1 = 0;
  // (Twice: standing further out, its foot may find other floor.)
  for (let pass = 0; pass < 2; pass++) {
    y0 = Math.max(...[-RAIL, RAIL].map(u => floorUnder(w, hx + nx * out - nz * u, y, hz + nz * out + nx * u)));
    y1 = Math.min(y0 + LADDER.wall, Math.max(top, y0 + 1));
    let need = LADDER.off;
    for (let k = y0 + 0.02; k < y1 + 0.05; k += 0.05) {
      const yk = Math.min(k, y1);
      const at = outAt(yk);
      if (at - LADDER.off > LADDER.standOff) {
        // Its top just under what stands out.
        let c = yk - 0.01;
        while (c > y0 && tooFar(c)) c -= 0.01;
        y1 = c - 0.01;
        break;
      }
      need = Math.max(need, at);
    }
    if (need === out) break;
    out = need;
  }
  if (y1 - y0 < 1) return false;
  const x = hx + nx * out, z = hz + nz * out;
  takeStack(s.inv.pack, st.uid); s.inv.held = 0;
  (s.ropes ??= []).push({ kind: 'ladder', x, z, y0, y1, nx, nz, item: st.id });
  s.events.push({ t: 'msg', text: 'ladder up' }, { t: 'noise', x, y: y0, z, r: 6, kind: 'ladder' });
  return true;
}

/** Laid across the gap in front of him, if there's an edge there and the other side's in reach. */
function across(s: SimState, w: World, st: Stack) {
  const p = s.player, fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), y = p.pos.y + 0.3;
  let edge = -1;
  for (let k = 0.1; k <= LADDER.reach; k += 0.02) if (p.pos.y - floorUnder(w, p.pos.x + fx * k, y, p.pos.z + fz * k) > 1) { edge = k; break; }
  if (edge < 0) return false;
  let far = -1;
  for (let k = edge + 0.3; k <= edge + LADDER.gap; k += 0.05) if (Math.abs(floorUnder(w, p.pos.x + fx * k, y + LADDER.level, p.pos.z + fz * k) - p.pos.y) < LADDER.level) { far = k; break; }
  if (far < 0) { return true; }
  takeStack(s.inv.pack, st.uid); s.inv.held = 0;
  const a = edge - 0.4, b = far + 0.4;
  (s.planks ??= []).push({ x: p.pos.x, z: p.pos.z, yaw: p.yaw, a, b, y: p.pos.y, item: st.id });
  s.events.push({ t: 'msg', text: 'ladder across' }, { t: 'noise', x: p.pos.x + fx * far, y: p.pos.y, z: p.pos.z + fz * far, r: 8, kind: 'ladder' });
  return true;
}

/** A plank's solid: the ladder flat from a to b along his heading from where he stood, its top at his feet. */
function plankSolid(q: NonNullable<SimState['planks']>[number]): Solid {
  const W = LADDER.width / 2, s = solid(q.x - W, q.y - 0.08, q.z - q.b, q.x + W, q.y, q.z - q.a, MAT.metal);
  return turn([s], -q.yaw, q.x, q.z)[0];
}

/** The ladders lying across gaps, each with its solid in the world's index (made the first time, switched off when
 *  it's taken up). */
const made = new WeakMap<World, Map<string, number>>();
export function stepPlanks(s: SimState, w: World) {
  const m = made.get(w) ?? made.set(w, new Map()).get(w)!, want = new Set<string>();
  for (const q of s.planks ?? []) {
    const k = `${q.x.toFixed(2)},${q.z.toFixed(2)},${q.yaw.toFixed(3)},${q.a.toFixed(2)},${q.b.toFixed(2)},${q.y.toFixed(2)}`;
    want.add(k);
    let i = m.get(k);
    if (i === undefined) { i = w.index.solids.length; w.index.solids.push(plankSolid(q)); grow(w.index); m.set(k, i); }
    w.index.off[i] = 0;
  }
  for (const [k, i] of m) if (!want.has(k)) w.index.off[i] = 1;
}

// Taken up from its near end.
extraInters.push((s: SimState): Inter[] => (s.planks ?? []).map((q, i) => ({
  id: `plank${i}`, kind: 'plank', x: q.x - Math.sin(q.yaw) * (q.a + 0.3), y: q.y + 0.2, z: q.z - Math.cos(q.yaw) * (q.a + 0.3), r: 0.6, zh: '收起梯子', en: 'Take up the ladder', data: { i },
})));
onInteract('plank', {
  now: (s, _w, it) => {
    const q = s.planks?.[it.data!.i as number];
    if (!q) return;
    s.planks!.splice(it.data!.i as number, 1);
    addItem(s, s.inv.pack, q.item, 1);
    s.events.push({ t: 'msg', text: 'ladder taken up' });
  },
});
