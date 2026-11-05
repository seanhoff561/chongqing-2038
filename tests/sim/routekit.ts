// What the route tests (routec, routeb, routea) do with his own hands at each step: stand by a thing and look at it,
// hold E on it, find which containers hold something in a run of a seed, take it from one into his pack, walk him
// along a way, and cross the Dongshuimen's rail deck.
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { openContainer } from '../../src/sim/containers';
import { lookTarget } from '../../src/sim/interact';
import { free } from '../../src/sim/physics';
import { raycast } from '../../src/world/geom';
import { B, type SimState } from '../../src/sim/types';
import type { Stack } from '../../src/sim/inventory';
import type { Climbable, Inter, World } from '../../src/world/world';
import { at, rail } from '../../src/world/yuzhong/bridges';
import { run, secs, aim, LMB, RMB } from './helpers';

type V3 = { x: number; y: number; z: number };

/** The unlocked containers that hold, in a run of this seed, something `want` takes (each rolls from its own stream:
 *  opened in a run of its own to see). */
export function holding(w: World, seed: number, want: (st: Stack) => boolean): Inter[] {
  const probe = createState(seed, w);
  return w.inter.filter(it => {
    if (it.kind !== 'container' || it.data?.lock || it.id.startsWith('wreck:')) return false;
    openContainer(probe, it);
    return probe.containers[it.id].items.some(want);
  });
}

/** Stand within reach of a point (on a floor round it, `rs` off, nothing between his eyes and it but within `slack` of
 *  it; the spots farthest from `away` first), looking at it. */
export function standBy(s: SimState, w: World, x: number, y: number, z: number, away?: { x: number; z: number }, rs = [0.8, 1.1, 1.4], slack = 0.5): boolean {
  const spots: [number, number][] = [];
  for (const r of rs) for (let k = 0; k < 16; k++) spots.push([x + Math.sin((k * Math.PI) / 8) * r, z + Math.cos((k * Math.PI) / 8) * r]);
  if (away) spots.sort((a, b) => Math.hypot(b[0] - away.x, b[1] - away.z) - Math.hypot(a[0] - away.x, a[1] - away.z));
  for (const [px, pz] of spots) {
    const dn = raycast(w.index, px, y + 0.3, pz, 0, -1, 0, 3);
    if (!dn) continue;
    const fy = y + 0.3 - dn.t, ey = fy + 1.62, d = Math.hypot(x - px, y - ey, z - pz);
    if (!free(w.index, px, fy + 0.3, pz, 1.75)) continue;
    const see = raycast(w.index, px, ey, pz, (x - px) / d, (y - ey) / d, (z - pz) / d, d);
    if (see && see.t < d - slack) continue;
    teleport(s.player, px, fy + 0.3, pz);
    run(s, w, 40);
    aim(s, x, y, z);
    run(s, w, 2);
    return true;
  }
  return false;
}

/** E held on what he's looking at for `t` s. */
export const hold = (s: SimState, w: World, t: number) => { run(s, w, Math.max(1, secs(t)), { buttons: B.INTERACT, pressed: B.INTERACT }); run(s, w, 2); };

/** Searched, and what `want` takes of it into his pack: the first of the containers he can get to and look at (as near
 *  as a look finds it: its reach). */
export function take(s: SimState, w: World, from: Inter[], want: (st: Stack) => boolean): string | undefined {
  for (const it of from) {
    if (!standBy(s, w, it.x, it.y, it.z, undefined, undefined, Math.max(0.5, it.r)) || lookTarget(s, w)?.id !== it.id) continue;
    hold(s, w, 1);
    if (s.openContainer !== it.id) continue;
    const st = s.containers[it.id].items.find(want);
    if (!st) continue;
    run(s, w, 1, { cmds: [{ c: 'quick', from: it.id, uid: st.uid }] });
    if (s.inv.pack.items.some(i => i.uid === st.uid)) return it.id;
  }
  return undefined;
}

/** Walk him to each point in turn (holding `buttons`), hopping when he's stopped against something, `each` after
 *  every tick; the points he reached (all of them once the run's ended). */
export function walk(s: SimState, w: World, pts: V3[], buttons = 0, each?: (s: SimState) => void): number {
  const p = s.player;
  for (let i = 0; i < pts.length; i++) {
    const g = pts[i];
    let still = 0, last = { ...p.pos };
    const until = secs(30 + Math.hypot(g.x - p.pos.x, g.z - p.pos.z) / 2);
    for (let k = 0; k < until && Math.hypot(g.x - p.pos.x, g.z - p.pos.z) > 0.6 && !s.ended && !s.dead; k++) {
      const hop = still > 30 && still % 40 < 2;
      run(s, w, 1, { my: 1, yaw: Math.atan2(-(g.x - p.pos.x), -(g.z - p.pos.z)), buttons: buttons | (hop ? B.JUMP : 0), pressed: hop ? B.JUMP : 0 });
      each?.(s);
      if (Math.hypot(p.pos.x - last.x, p.pos.z - last.z) < 0.02) still++; else { still = 0; last = { ...p.pos }; }
    }
    if (s.ended) return pts.length;
    if (Math.hypot(g.x - p.pos.x, g.z - p.pos.z) > 1) return i;
  }
  return pts.length;
}

/** Across the Dongshuimen's rail deck from where he stands at its north end to its Nan'an end: along a stringer where
 *  the plates are gone, a run and a jump over the gap, up over the derailed car by its lip (M6-08). The step he got
 *  to (5 for the whole way). `each` after every tick he walks. */
export function crossDeck(s: SimState, w: World, each?: (s: SimState) => void): number {
  const b = w.bridges![0], P = (t: number, sv: number): V3 => { const [x, z] = at(b, t, sv); return { x, y: rail(b, t), z }; };
  const [a0, a1] = b.holes![0], [g0] = b.holes![1], c = b.car!, p = s.player, ahead = Math.atan2(-b.ux, -b.uz);
  if (walk(s, w, [P(a0 - 6, -2.6), P(a0 - 1, -2.6), P(a1 + 3, -2.6), P(g0 - 30, -5)], 0, each) < 4 || s.dead) return 0;
  for (let k = 0; k < secs(10) && (p.pos.x - b.ox) * b.ux + (p.pos.z - b.oz) * b.uz < g0 - 0.3; k++) { run(s, w, 1, { my: 1, yaw: ahead, buttons: B.SPRINT }); each?.(s); }
  run(s, w, 1, { my: 1, yaw: ahead, buttons: B.SPRINT | B.JUMP, pressed: B.JUMP });
  run(s, w, secs(1.5), { my: 1, yaw: ahead, buttons: B.SPRINT | B.JUMP });
  if (Math.abs(p.pos.y - rail(b, g0)) > 0.5 || s.dead) return 1;
  if (walk(s, w, [P(c - 3, -5), P(c - 0.9, -5)], 0, each) < 2 || s.dead) return 2;
  const lip = P(c, -5);
  for (let k = 0; k < 40 && p.mode !== 'grip'; k++) { aim(s, lip.x, lip.y + 1.9, lip.z); run(s, w, 1, { buttons: LMB }); }
  run(s, w, secs(3), { buttons: LMB, my: 1 });
  if (p.pos.y < lip.y + 1.8 || s.dead) return 3;
  return walk(s, w, [P(c + 5, -5), P(c + 15, -5), P(b.tb - 2, -5)], 0, each) < 3 || s.dead ? 4 : 5;
}

/** Up a ladder from its foot hand over hand and over its top (as tests/sim/ladders.test.ts); whether he's on his feet
 *  at its top. */
export function climbLadder(s: SimState, w: World, c: Climbable): boolean {
  const p = s.player, bits = [LMB, RMB];
  teleport(p, c.x + c.nx * 0.7, Math.max(p.pos.y, c.y0) + 0.01, c.z + c.nz * 0.7);
  run(s, w, 5);
  let hand = 0;
  for (let k = 0; k < 400 && (p.mode !== 'ground' || k === 0 || p.pos.y < c.y1 - 1) && !s.dead; k++) {
    const holding = p.hands.reduce((a, h, i) => a | (h.grip ? bits[i] : 0), 0);
    aim(s, c.x + c.nx * 0.08, Math.min(c.y1 - 0.05, p.pos.y + 2.2), c.z + c.nz * 0.08);
    run(s, w, 2, { buttons: holding | bits[hand] });
    run(s, w, secs(1), { buttons: bits[hand], my: 1 });
    hand = 1 - hand;
    if (p.mode === 'action') run(s, w, secs(1));
  }
  return p.mode === 'ground' && p.pos.y > c.y1 - 1;
}
