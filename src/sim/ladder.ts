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

/** How high against a wall (m), the longest gap, how far from him a wall or an edge is looked for, how far the other
 *  side may sit above or below his, and the ladder's width across a gap. */
export const LADDER = { wall: 4, gap: 3.8, reach: 1.4, level: 0.6, width: PLANK_W };

function floorUnder(w: World, x: number, y: number, z: number) {
  const a = raycast(w.index, x, y, z, 0, -1, 0, 200), g = w.ground ? rayGround(w.ground, x, y, z, 0, -1, 0, 200) : null;
  return y - Math.min(a?.t ?? 200, g?.t ?? 200);
}

onUseId('ladder', (s, w, st) => {
  const p = s.player;
  if (p.swing > 0 || s.task) return;
  if (againstWall(s, w, st) || across(s, w, st)) { p.swing = 0.8; return; }
});

/** Stood against the wall he faces, if one's in reach. */
function againstWall(s: SimState, w: World, st: Stack) {
  const p = s.player, e = eyeOf(p), fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), y = p.pos.y + 1;
  const h = raycast(w.index, e.x, y, e.z, fx, 0, fz, LADDER.reach);
  if (!h || h.id < 0 || Math.abs(h.ny) > 0.5) return false;
  const x = e.x + fx * h.t + h.nx * 0.05, z = e.z + fz * h.t + h.nz * 0.05, y0 = floorUnder(w, x + h.nx * 0.3, y, z + h.nz * 0.3), top = topAt(w.index.solids[h.id], x - h.nx * 0.1, z - h.nz * 0.1);
  takeStack(s.inv.pack, st.uid); s.inv.held = 0;
  (s.ropes ??= []).push({ kind: 'ladder', x, z, y0, y1: Math.min(y0 + LADDER.wall, Math.max(top, y0 + 1)), nx: h.nx, nz: h.nz, item: st.id });
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
