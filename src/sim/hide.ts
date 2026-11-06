// Curling up inside boxes, crates, dumpsters and cabinets.
import { B, type InputFrame, type SimState } from './types';
import type { World } from '../world/world';
import type { Player } from './player';
import { movement as M } from '../data/movement';
import { free } from './physics';
import { startAction } from './parkour';
import { forward } from './move';

/** The world's hiding spots by their middles in 4 m cells (built on first use, again if the list grows): a look for
 *  one only scans the cells round him, not the whole city's every frame. */
const CELL = 4, grids = new WeakMap<World['hides'], { n: number; cells: Map<number, number[]> }>();
const cellKey = (i: number, j: number) => i * 65536 + j, NONE: number[] = [];
function hideGrid(world: World) {
  let g = grids.get(world.hides);
  if (!g || g.n !== world.hides.length) {
    g = { n: world.hides.length, cells: new Map() };
    world.hides.forEach((h, i) => {
      const k = cellKey(Math.floor((h.inner.x0 + h.inner.x1) / 2 / CELL), Math.floor((h.inner.z0 + h.inner.z1) / 2 / CELL)), a = g!.cells.get(k);
      if (a) a.push(i); else g!.cells.set(k, [i]);
    });
    grids.set(world.hides, g);
  }
  return g.cells;
}

/** Nearest hiding spot in reach that he's facing, or -1. */
export function hideNear(world: World, p: Player): number {
  const f = forward(p.yaw), cells = hideGrid(world), R = M.hide.reach;
  let best = -1, bd = R;
  for (let ci = Math.floor((p.pos.x - R) / CELL); ci <= Math.floor((p.pos.x + R) / CELL); ci++) for (let cj = Math.floor((p.pos.z - R) / CELL); cj <= Math.floor((p.pos.z + R) / CELL); cj++) for (const i of cells.get(cellKey(ci, cj)) ?? NONE) {
    const h = world.hides[i], cx = (h.inner.x0 + h.inner.x1) / 2, cz = (h.inner.z0 + h.inner.z1) / 2;
    const dx = cx - p.pos.x, dz = cz - p.pos.z, d = Math.hypot(dx, dz);
    if (d > bd || Math.abs(h.inner.y0 - p.pos.y) > 0.8) continue;
    if (d > 0.01 && (dx * f.x + dz * f.z) / d < 0.5) continue;
    best = i; bd = d;
  }
  return best;
}

export const fits = (world: World, i: number) => {
  const h = world.hides[i], b = h.inner;
  // Lying curled in a car boot he needs less height than sitting in a box.
  if (h.kind === 'boot') return Math.min(b.x1 - b.x0, b.z1 - b.z0) >= M.hide.minInner - 1e-6 && b.y1 - b.y0 >= M.hide.minBoot - 1e-6;
  return Math.min(b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0) >= M.hide.minInner - 1e-6;
};

export function enterHide(state: SimState, world: World, i: number): boolean {
  const p = state.player;
  if (!fits(world, i)) {
    return false;
  }
  const b = world.hides[i].inner;
  p.hideExit = { ...p.pos };
  p.hideId = i;
  startAction(p, 'hide', M.hide.enterTime, { x: (b.x0 + b.x1) / 2, y: b.y0, z: (b.z0 + b.z1) / 2 }, 'hidden', 'hidden', 0);
  return true;
}

export function stepHidden(state: SimState, world: World, input: InputFrame) {
  const p = state.player;
  if (!(input.pressed & B.INTERACT) || !p.hideExit) return;
  const e = p.hideExit;
  if (!free(world.index, e.x, e.y, e.z, M.height.crouch)) return;
  p.hideId = -1;
  p.hideExit = null;
  startAction(p, 'unhide', M.hide.exitTime, e, 'ground', 'crouch', 0);
}
