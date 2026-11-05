// M7-12: Route D from a fresh run (place to place along the route, teleported between its steps as the route tests
// do; at each he does the thing with his own hands). At the Xinhua Road substation the bolt cutters from its tool crate,
// store cage B's chain cut, the spare HV fuse out of its relay cabinet and fitted in the metro's feeder panel; at
// Jiefangbei station the maintenance key from the staff lockers, the control room opened with it and the pumps started;
// at Xiaoshizi the protective door's card from the night staff's locker; Xiaoyu, waiting in the running tunnel, told to
// come; the door opened with the card, the water gone, and slowly through the extension to the way out: 隧道尽头, with
// her.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { startRun } from '../../src/sim/run';
import { lookTarget } from '../../src/sim/interact';
import { sisterRoute } from '../../src/sim/sister';
import { teleport } from '../../src/sim/player';
import { CABIN } from '../../src/sim/cablecar';
import { RAIL } from '../../src/sim/metro';
import { BLAST, PUMPS } from '../../src/sim/tunnelend';
import { B, type SimState } from '../../src/sim/types';
import type { Stack } from '../../src/sim/inventory';
import type { Inter } from '../../src/world/world';
import { run, secs, settle } from './helpers';
import { standBy, hold, take } from './routekit';

const w = getWorld('yuzhong');
const sub = w.secure!.find(q => q.id === 'substation')!, heart = w.features.find(f => f.kind === 'heart:metro')!;
const near = (p: { x: number; z: number }) => (a: Inter, b: Inter) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z);
const holds = (id: string) => (it: Inter) => it.kind === 'container' && !!(it.data?.items as [string, number][] | undefined)?.some(([q]) => q === id);
const cutters = w.inter.filter(holds('boltcutters')).sort(near(sub.heart))[0], relay = w.inter.filter(holds('hvfuse')).sort(near(sub.heart))[0];
const locker = w.inter.filter(holds('metrokey')).sort(near(heart))[0], night = w.inter.find(i => i.id === 'svc-locker2')!;
const cage = w.inter.filter(i => i.kind === 'door' && i.en === 'Store cage B').sort(near(sub.heart))[0], control = w.inter.find(i => i.id === 'metro-control')!;
const feeder = w.inter.find(i => i.data?.live === 'metro-feeder')!, pumps = w.inter.find(i => i.id === 'metro-pumps')!, door = w.inter.find(i => i.kind === 'blastdoor')!;
const walk = w.features.filter(f => f.kind === 'tunnelEnd:walk').sort((a, b) => a.group - b.group);
const is = (id: string) => (st: Stack) => st.id === id;
const alive = (s: SimState, step: string) => expect([step, s.dead]).toEqual([step, null]);
const where = (s: SimState) => `at ${s.player.pos.x.toFixed(1)},${s.player.pos.y.toFixed(1)},${s.player.pos.z.toFixed(1)} ${s.player.mode}`;
/** By a thing (on the side away from `away`), looking at it, E held `t` s. */
function work(s: SimState, it: Inter, t: number, away?: { x: number; z: number }) {
  expect(standBy(s, w, it.x, it.y, it.z, away), `by ${it.en}`).toBe(true);
  expect(lookTarget(s, w)?.id).toBe(it.id);
  hold(s, w, t);
}

describe('Route D from a fresh run (M7-12)', () => {
  it('the fuse in the metro feeder, the pumps started, the card found, Xiaoyu told, the door opened and slowly out under the hill', async () => {
    await settle();
    let seed = 1;
    while (sisterRoute(seed) !== 'tunnel') seed++;
    const s = createState(seed, w);
    startRun(s, w);
    // The substation: its own bolt cutters, cage B's chain cut, the spare fuse into the metro's feeder.
    expect(take(s, w, [cutters], is('boltcutters')), 'the bolt cutters').toBe(cutters.id);
    work(s, cage, 2, relay);
    expect(s.wstate.open[cage.id], 'cage B open').toBe(true);
    expect(take(s, w, [relay], is('hvfuse')), 'the spare fuse').toBe(relay.id);
    work(s, feeder, CABIN.fuse + 0.3, sub.heart);
    expect(s.wstate.open['metro-feeder'], 'the metro feeder live').toBe(true);
    alive(s, 'the feeder');
    // Jiefangbei station: the maintenance key, the control room, the pumps.
    expect(take(s, w, [locker], is('metrokey')), 'the maintenance key').toBe(locker.id);
    work(s, control, 0, pumps);
    expect(s.wstate.open[control.id], 'the control room open').toBe(true);
    work(s, pumps, RAIL.pumps + 0.3);
    expect(s.wstate.open['metro-pumps'], 'the pumps running').toBe(true);
    alive(s, 'the pumps');
    // Xiaoshizi: the door's card in the night staff's locker.
    expect(take(s, w, [night], is('blastcard')), 'the card').toBe(night.id);
    // In the running tunnel east of Jiefangbei: Xiaoyu told to come.
    const x = s.sister!;
    expect(standBy(s, w, x.x, x.y + 0.7, x.z, undefined, [0.9, 1.2]), 'by Xiaoyu').toBe(true);
    expect(lookTarget(s, w)?.id).toBe('sister');
    hold(s, w, 0);
    expect(x.with, 'she\'ll come').toBe(true);
    // The protective door: the card.
    teleport(s.player, walk[0].x, walk[0].y + 0.05, walk[0].z);
    work(s, door, BLAST.card + 0.3, walk[1]);
    expect(s.wstate.open[door.id], 'the door open').toBe(true);
    alive(s, 'the door');
    // The water goes down; then through, crouched (the sensors feel a man walking), down, along and up to the way out.
    for (let t = 0; t < secs(PUMPS.drain) && s.escape?.tunnel?.drained === undefined; t++) run(s, w, 1);
    expect(s.escape!.tunnel.drained, 'drained').toBeDefined();
    const p = s.player;
    for (const q of walk.slice(1)) for (let t = 0; t < secs(40 + Math.hypot(q.x - p.pos.x, q.z - p.pos.z)) && Math.hypot(q.x - p.pos.x, q.z - p.pos.z) > 0.5 && !s.ended; t++)
      run(s, w, 1, { my: 1, yaw: Math.atan2(-(q.x - p.pos.x), -(q.z - p.pos.z)), buttons: B.CROUCH });
    alive(s, 'the extension');
    expect(s.ended, where(s)).toMatchObject({ route: 'tunnel', sister: true });
    expect(Object.keys(s.escape!.tunnel).sort()).toEqual(['door', 'drained', 'feeder', 'pumps']);
  }, 1500000);
});
