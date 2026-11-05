// M7-04: Route A from a fresh run (place to place along the route, teleported between its steps as the route tests
// do; at each he does the thing with his own hands). The jammer's parts at the electronics market (an SDR dongle, a
// board, a battery pack) and an RF amplifier (the market's or the telecom exchange's); a toolbox, a car battery with
// charge in it and an inverter from where they lie; in a flat a bed claimed, the battery and the inverter wired in,
// the toolbox set on its table: a workbench, the jammer made there; asleep in the bed till 22:00. At the Xinhua Road
// substation the bolt cutters from the workshop's tool crate and his father's gloves from his locker, and the
// bridge's sensor relay cut. At Xiaoshizi, Xiaoyu told to come. Up the north pier's ladder onto the rail deck and
// across the truss, the jammer switched on as a maintenance drone nears and off once it's by: 桥下, with her.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { startRun } from '../../src/sim/run';
import { lookTarget } from '../../src/sim/interact';
import { sisterRoute } from '../../src/sim/sister';
import { countOf } from '../../src/sim/craft';
import { BUS, busDown, deckDrones } from '../../src/sim/bridge';
import { recipe } from '../../src/data/recipes';
import { teleport } from '../../src/sim/player';
import type { SimState } from '../../src/sim/types';
import type { Stack } from '../../src/sim/inventory';
import type { Inter } from '../../src/world/world';
import { run, secs, settle, LMB } from './helpers';
import { holding, standBy, hold, take, walk, crossDeck, climbLadder } from './routekit';
import { at, rail } from '../../src/world/yuzhong/bridges';

const w = getWorld('yuzhong'), b = w.bridges![0];
const site = (id: string) => w.secure!.find(q => q.id === id)!, sub = site('substation');
const near = (p: { x: number; z: number }) => (a: Inter, c: Inter) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(c.x - p.x, c.z - p.z);
const holds = (id: string) => (it: Inter) => it.kind === 'container' && !!(it.data?.items as [string, number][] | undefined)?.some(([q]) => q === id);
const cutters = w.inter.filter(holds('boltcutters')).sort(near(sub.heart))[0], locker = w.inter.find(i => i.en === "Li Guorong's locker")!;
const relay = w.inter.find(i => i.kind === 'busrelay')!;
const is = (id: string) => (st: Stack) => st.id === id, charged = (st: Stack) => st.id === 'carbattery' && (st.charge ?? 100) >= 20;
const inSite = (ids: string[]) => (it: Inter) => ids.includes(it.data?.site as string);
// A bed and a table in the same room of a flat, a few metres apart.
const beds = w.inter.filter(i => i.kind === 'mattress');
const pairs = w.inter.filter(i => i.kind === 'table').flatMap(t => beds.filter(m => Math.hypot(m.x - t.x, m.z - t.z) < 5 && Math.abs(m.y - t.y) < 0.6).map(m => [m, t] as const));

/** A fresh run of a seed whose sister waits at the bridge, its market holding the jammer's parts, an RF amplifier at
 *  the market or the exchange, and a toolbox, a charged car battery and an inverter about the city. */
function fresh() {
  let seed = 0, found: Record<string, Inter[]> = {};
  for (let n = 1; n < 120 && !seed; n++) {
    if (sisterRoute(n) !== 'bridge') continue;
    found = { sdr: holding(w, n, is('sdr')).filter(inSite(['market'])), board: holding(w, n, is('board')).filter(inSite(['market'])), battpack: holding(w, n, is('battpack')).filter(inSite(['market'])) };
    if (!Object.values(found).every(l => l.length)) continue;
    found = { ...found, rfamp: holding(w, n, is('rfamp')).filter(inSite(['market', 'telecom'])), toolbox: holding(w, n, is('toolbox')), carbattery: holding(w, n, charged), inverter: holding(w, n, is('inverter')) };
    if (Object.values(found).every(l => l.length)) seed = n;
  }
  expect(seed, 'a seed').toBeGreaterThan(0);
  const s = createState(seed, w);
  startRun(s, w);
  return { s, found };
}
const alive = (s: SimState, step: string) => expect([step, s.dead ?? null]).toEqual([step, null]);
const use = (s: SimState, id: string) => run(s, w, 1, { cmds: [{ c: 'use', uid: s.inv.pack.items.find(i => i.id === id)!.uid }] });

describe('Route A from a fresh run (M7-04)', () => {
  it('the jammer made, the relay cut, Xiaoyu told, the truss crossed at night to the ending', async () => {
    await settle();
    expect(pairs.length, 'a bed by a table').toBeGreaterThan(0);
    const { s, found } = fresh();
    // The jammer's parts, each where it lies.
    for (const id of ['sdr', 'board', 'battpack', 'rfamp']) { expect(take(s, w, found[id], is(id)), id).toBeDefined(); alive(s, id); }
    expect(take(s, w, found.toolbox, is('toolbox')), 'a toolbox').toBeDefined();
    expect(take(s, w, found.carbattery, charged), 'a car battery').toBeDefined();
    expect(take(s, w, found.inverter, is('inverter')), 'an inverter').toBeDefined();
    alive(s, 'the bench kit');
    // A bed in a flat claimed, the battery and the inverter wired in there; the toolbox on its table; the jammer made.
    const [bed, table] = pairs.find(([m, t]) => standBy(s, w, m.x, m.y, m.z) && lookTarget(s, w)?.id === m.id && !!t)!;
    hold(s, w, 0);
    expect(s.shelters.some(h => h.id === bed.id), 'the bed his').toBe(true);
    use(s, 'carbattery');
    use(s, 'inverter');
    expect(s.shelters.find(h => h.id === bed.id)).toMatchObject({ inverter: true });
    expect(standBy(s, w, table.x, table.y, table.z), 'at the table').toBe(true);
    expect(lookTarget(s, w)?.id).toBe(table.id);
    s.inv.hotbar[0] = s.inv.pack.items.find(i => i.id === 'toolbox')!.uid; s.inv.held = 1;
    run(s, w, 1, { pressed: LMB, buttons: LMB });
    expect(s.wstate.benches?.[table.id], 'a workbench').toBe(true);
    run(s, w, 1, { cmds: [{ c: 'act', name: 'craft', arg: 'jammer' }] });
    run(s, w, secs(recipe('jammer')!.secs + 0.5));
    expect(countOf(s, 'jammer'), 'the jammer made').toBe(1);
    alive(s, 'the jammer');
    // Asleep in his bed till 22:00.
    expect(standBy(s, w, bed.x, bed.y, bed.z)).toBe(true);
    expect(lookTarget(s, w)?.id).toBe(bed.id);
    run(s, w, 1, { cmds: [{ c: 'act', name: 'sleep', arg: 22 }] });
    expect(s.time % 86400).toBeGreaterThanOrEqual(22 * 3600 - 60);
    alive(s, 'slept');
    // At the substation: the bolt cutters, his father's gloves, the relay cut.
    expect(take(s, w, [cutters], is('boltcutters')), 'the bolt cutters').toBe(cutters.id);
    expect(take(s, w, [locker], is('insgloves')), "his father's gloves").toBe(locker.id);
    alive(s, 'the gloves');
    expect(standBy(s, w, relay.x, relay.y, relay.z, sub.heart), 'at the relay').toBe(true);
    expect(lookTarget(s, w)?.id).toBe(relay.id);
    hold(s, w, BUS.cut + 0.3);
    expect(busDown(s), 'the relay cut').toBe(true);
    alive(s, 'the relay');
    // At Xiaoshizi by the Line 6 stairs: Xiaoyu told to come.
    const x = s.sister!;
    expect(standBy(s, w, x.x, x.y + 0.7, x.z, undefined, [0.9, 1.2]), 'by Xiaoyu').toBe(true);
    expect(lookTarget(s, w)?.id).toBe('sister');
    hold(s, w, 0);
    expect(x.with, "she'll come").toBe(true);
    // Up the north pier onto the rail deck, and across, the jammer on only while a drone's near.
    const pier = w.teleports.find(t => t.name === 'Dongshuimen Bridge: north pier')!, ladder = w.climbables.filter(c => c.kind === 'ladder').sort((p, q) => Math.hypot(p.x - pier.x, p.z - pier.z) - Math.hypot(q.x - pier.x, q.z - pier.z))[0];
    teleport(s.player, pier.x, pier.y, pier.z);
    run(s, w, 10);
    expect(climbLadder(s, w, ladder), 'up the north pier').toBe(true);
    const [ix, iz] = at(b, b.pier!, 6);
    expect(walk(s, w, [{ x: ix, y: rail(b, b.pier!), z: iz }]), 'in through the handrail').toBe(1);
    alive(s, 'the pier');
    const jam = (q: SimState) => {
      if (q.tick % 15) return;
      const d = Math.min(...deckDrones(q, b).map(o => Math.hypot(o.x - q.player.pos.x, o.z - q.player.pos.z)));
      if ((d < 40) !== !!q.jam) use(q, 'jammer');
    };
    expect([crossDeck(s, w, jam), s.dead ?? null], 'across the truss').toEqual([5, null]);
    expect(s.deck?.spotted, 'unseen, unfelt').toBeUndefined();
    alive(s, 'the crossing');
    expect(s.ended).toMatchObject({ route: 'bridge', sister: true });
    expect(Object.keys(s.escape!.bridge).sort()).toEqual(['deck', 'relay']);
  }, 1500000);
});
