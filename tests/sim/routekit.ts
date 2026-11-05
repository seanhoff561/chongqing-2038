// What the route tests (routec, routeb) do with his own hands at each step: stand by a thing and look at it, hold E on
// it, find which containers hold something in a run of a seed, and take it from one into his pack.
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { openContainer } from '../../src/sim/containers';
import { lookTarget } from '../../src/sim/interact';
import { free } from '../../src/sim/physics';
import { raycast } from '../../src/world/geom';
import { B, type SimState } from '../../src/sim/types';
import type { Stack } from '../../src/sim/inventory';
import type { Inter, World } from '../../src/world/world';
import { run, secs, aim } from './helpers';

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
