// M9-06: a whole run, from the opening to an ending, and the death loop (place to place, teleported between steps as
// the route tests do; at each he does the thing with his own hands, nothing given him). He wakes in the friends'
// hideout at night, takes his laptop and bag and sleeps rough till 06:00. Then three days: water and food from where
// they lie, eaten and drunk as he needs them; at the electronics market (a high-security site) the jammer's parts; a
// toolbox, a charged car battery and an inverter; a bed in a flat claimed and powered, a workbench made there, the
// jammer made; asleep there. Waking on day two he falls to his death, and wakes again where he last slept, his death
// counted; on, to the Xinhua Road substation (another) for the bolt cutters and his father's gloves; asleep in his bed
// till the third night; the bridge's relay cut, Xiaoyu told, across the Dongshuimen's truss with the jammer: 桥下 and
// the run's summary, the save gone. A new run starts as a run does, fresh, saved as it starts; dying in it takes him
// back to its start.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { startRun, START_CRATE, STARTING_SUPPLIES } from '../../src/sim/run';
import { beginOpening, WAKE_END, OPENING } from '../../src/sim/opening';
import { lookTarget, ROUGH_HOLD } from '../../src/sim/interact';
import { sisterRoute } from '../../src/sim/sister';
import { countOf } from '../../src/sim/craft';
import { BUS, busDown, deckDrones } from '../../src/sim/bridge';
import { summary, closeRun } from '../../src/sim/escape';
import { writeSave, readSave, afterDeath, type Storage } from '../../src/sim/save';
import { syncWorld, doorSolid } from '../../src/sim/doors';
import { spoiled } from '../../src/sim/food';
import { free } from '../../src/sim/physics';
import { teleport } from '../../src/sim/player';
import { dayOf, hourOf } from '../../src/sim/clock';
import { recipe } from '../../src/data/recipes';
import { item } from '../../src/data/items';
import { survival } from '../../src/data/survival';
import { raycast } from '../../src/world/geom';
import { WATER_Y } from '../../src/world/yuzhong/ground';
import { at, rail } from '../../src/world/yuzhong/bridges';
import { B, type SimState } from '../../src/sim/types';
import type { Stack } from '../../src/sim/inventory';
import type { Inter } from '../../src/world/world';
import { run, secs, aim, settle, LMB } from './helpers';
import { holding, standBy, hold, take, walk, crossDeck, climbLadder } from './routekit';

const w = getWorld('yuzhong'), b = w.bridges![0];
const site = (id: string) => w.secure!.find(q => q.id === id)!, sub = site('substation');
const near = (p: { x: number; z: number }) => (a: Inter, c: Inter) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(c.x - p.x, c.z - p.z);
const holds = (id: string) => (it: Inter) => it.kind === 'container' && !!(it.data?.items as [string, number][] | undefined)?.some(([q]) => q === id);
const cutters = w.inter.filter(holds('boltcutters')).sort(near(sub.heart))[0], locker = w.inter.find(i => i.en === "Li Guorong's locker")!;
const relay = w.inter.find(i => i.kind === 'busrelay')!;
const is = (id: string) => (st: Stack) => st.id === id, charged = (st: Stack) => st.id === 'carbattery' && (st.charge ?? 100) >= 20;
const inSite = (ids: string[]) => (it: Inter) => ids.includes(it.data?.site as string), outside = (it: Inter) => !it.data?.site;
const drink = (st: Stack) => st.id === 'water' || st.id === 'energy', food = (st: Stack) => item(st.id).cat === 'food' && !item(st.id).food!.raw;
const beds = w.inter.filter(i => i.kind === 'mattress');
const pairs = w.inter.filter(i => i.kind === 'table').flatMap(t => beds.filter(m => Math.hypot(m.x - t.x, m.z - t.z) < 5 && Math.abs(m.y - t.y) < 0.6).map(m => [m, t] as const));
const shim = (): Storage => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: k => void m.delete(k) }; };

/** A seed whose sister waits at the bridge, its market holding the jammer's parts, an RF amplifier at the market or the
 *  exchange, a toolbox, a charged car battery and an inverter about the city, and water and food enough lying out of
 *  the sites for three days. */
function pick() {
  for (let n = 1; n < 160; n++) {
    if (sisterRoute(n) !== 'bridge') continue;
    let found: Record<string, Inter[]> = { sdr: holding(w, n, is('sdr')).filter(inSite(['market'])), board: holding(w, n, is('board')).filter(inSite(['market'])), battpack: holding(w, n, is('battpack')).filter(inSite(['market'])) };
    if (!Object.values(found).every(l => l.length)) continue;
    found = { ...found, rfamp: holding(w, n, is('rfamp')).filter(inSite(['market', 'telecom'])), toolbox: holding(w, n, is('toolbox')), carbattery: holding(w, n, charged), inverter: holding(w, n, is('inverter')) };
    if (!Object.values(found).every(l => l.length)) continue;
    found = { ...found, drink: holding(w, n, drink).filter(outside), food: holding(w, n, food).filter(outside) };
    if (found.drink.length >= 8 && found.food.length >= 4) return { seed: n, found };
  }
  throw new Error('no seed');
}

/** What a run does as it starts (game.ts: newRun): a fresh state, the opening begun, saved. */
function newRun(seed: number, st: Storage) {
  const s = createState(seed, w);
  startRun(s, w);
  beginOpening(s, w);
  writeSave(st, 'run', s);
  return s;
}

const alive = (s: SimState, step: string) => expect([step, s.dead ?? null]).toEqual([step, null]);
const use = (s: SimState, st: Stack) => run(s, w, 1, { cmds: [{ c: 'use', uid: st.uid }] });
/** Drink while he's thirsty and eat while he's hungry, from what he carries (nothing spoiled, the soonest to spoil
 *  first); then his needs are all in range. */
function tend(s: SimState, step: string) {
  const B_ = s.body, mine = (f: (st: Stack) => boolean) => s.inv.pack.items.filter(st => f(st) && !spoiled(s, st)).sort((a, c) => item(a.id).food!.shelfDays - item(c.id).food!.shelfDays)[0];
  for (let k = 0; k < 6 && B_.hydration < 65 && mine(drink); k++) use(s, mine(drink)!);
  for (let k = 0; k < 6 && B_.satiety < 60 && mine(food); k++) use(s, mine(food)!);
  const low = survival.needs.low;
  expect([step, B_.satiety > low, B_.hydration > low, B_.energy > low, B_.hp > 50]).toEqual([step, true, true, true, true]);
}
/** Taken from the first of `from` he hasn't emptied of it, as many as `n`. */
function scavenge(s: SimState, from: Inter[], want: (st: Stack) => boolean, n: number) {
  let got = 0;
  for (let k = 0; k < from.length && got < n; k++) {
    const id = take(s, w, [from[k]], want);
    if (id) { got++; k--; }
  }
  return got;
}
/** The sleep the menu gives (a bed if he's looking at one, else rough), saved as he wakes as the game saves it. */
function sleep(s: SimState, st: Storage, hour: number) {
  run(s, w, 1, { cmds: [{ c: 'act', name: 'sleep', arg: hour }] }, q => {
    for (const e of q.events) if (e.t === 'slept' && e.where !== 'collapse' && !q.dead) writeSave(st, 'run', q);
  });
}
/** A drop from high over open ground (not the river) near (x, z). */
function fall(s: SimState, x: number, z: number) {
  for (let r = 0; r < 200; r += 4) for (let k = 0; k < 12; k++) {
    const px = x + Math.sin(k * 0.52) * r, pz = z + Math.cos(k * 0.52) * r, y = 300, hit = raycast(w.index, px, y, pz, 0, -1, 0, 400);
    if (!hit || y - hit.t < WATER_Y + 2 || !free(w.index, px, y - hit.t + 0.3, pz, 30)) continue;
    teleport(s.player, px, y - hit.t + 25, pz);
    for (let t = 0; t < secs(8) && !s.dead; t++) run(s, w, 1);
    return;
  }
}
/** He wakes from a death (death.ts): the save, back as the game loads it. */
function wake(st: Storage, dying: SimState) {
  const f = afterDeath(st, dying)!;
  expect(f, 'a save to wake at').toBeTruthy();
  syncWorld(f.state, w);
  return f.state;
}

describe('a full run (M9-06)', () => {
  it('the opening, a shelter, three days of scavenging, two high-security sites, the jammer, the bridge to its ending; the death loop', async () => {
    await settle();
    expect(pairs.length, 'a bed by a table').toBeGreaterThan(0);
    const { seed, found } = pick(), st = shim();
    let s = newRun(seed, st);
    expect([dayOf(s.time), Math.round(hourOf(s.time))]).toEqual([1, OPENING.hour]);
    // The opening: he lies still while she speaks; then the laptop and the bag off the floor.
    run(s, w, secs(WAKE_END) + 2);
    expect(s.opening).toBeUndefined();
    const g = s.gear!;
    for (const [id, y] of [['gear-laptop', 0.26], ['gear-pack', 0.1]] as const) {
      aim(s, g.x, g.y + y, g.z);
      run(s, w, 2);
      expect(s.target).toBe(id);
      run(s, w, 2, { pressed: B.INTERACT });
    }
    expect(s.gear).toBeUndefined();
    // The night rough on the hideout's floor (held B, the sleep menu, 06:00).
    aim(s, s.player.pos.x - Math.sin(s.player.yaw) * 0.6, s.player.pos.y, s.player.pos.z - Math.cos(s.player.yaw) * 0.6);
    let menu = false;
    run(s, w, secs(ROUGH_HOLD) + 5, { buttons: B.SLEEP, pressed: B.SLEEP }, q => { if (q.events.some(e => e.t === 'sleep-menu')) menu = true; });
    expect(menu, 'the sleep menu').toBe(true);
    sleep(s, st, 6);
    expect([dayOf(s.time), Math.floor(hourOf(s.time))]).toEqual([1, 6]);
    expect(readSave(st)!.state.time, 'saved as he woke').toBe(s.time);
    alive(s, 'the first night');
    tend(s, 'day 1 at dawn');

    // Day 1: water and food; the jammer's parts at the electronics market.
    expect(scavenge(s, found.drink, drink, 2), 'something to drink').toBe(2);
    expect(scavenge(s, found.food, food, 1), 'something to eat').toBe(1);
    for (const id of ['sdr', 'board', 'battpack', 'rfamp']) { expect(take(s, w, found[id], is(id)), id).toBeDefined(); alive(s, id); }
    expect(take(s, w, found.toolbox, is('toolbox')), 'a toolbox').toBeDefined();
    expect(take(s, w, found.carbattery, charged), 'a car battery').toBeDefined();
    expect(take(s, w, found.inverter, is('inverter')), 'an inverter').toBeDefined();
    alive(s, 'the bench kit');
    tend(s, 'day 1 morning');
    // A shelter: a bed in a flat claimed, the battery and the inverter wired in; the toolbox on its table, the jammer
    // made there.
    const [bed, table] = pairs.find(([m]) => standBy(s, w, m.x, m.y, m.z) && lookTarget(s, w)?.id === m.id)!;
    hold(s, w, 0);
    expect(s.shelters.map(h => h.id), 'the bed his').toEqual([bed.id]);
    use(s, s.inv.pack.items.find(is('carbattery'))!);
    use(s, s.inv.pack.items.find(is('inverter'))!);
    expect(s.shelters[0]).toMatchObject({ inverter: true });
    expect(s.shelters[0].battery).toBeGreaterThan(0);
    expect(standBy(s, w, table.x, table.y, table.z), 'at the table').toBe(true);
    expect(lookTarget(s, w)?.id).toBe(table.id);
    s.inv.hotbar[0] = s.inv.pack.items.find(is('toolbox'))!.uid; s.inv.held = 1;
    run(s, w, 1, { pressed: LMB, buttons: LMB });
    expect(s.wstate.benches?.[table.id], 'a workbench').toBe(true);
    run(s, w, 1, { cmds: [{ c: 'act', name: 'craft', arg: 'jammer' }] });
    run(s, w, secs(recipe('jammer')!.secs + 0.5));
    expect(countOf(s, 'jammer'), 'the jammer made').toBe(1);
    alive(s, 'the jammer');
    /** Back to his bed, looking at it: E (the sleep menu), and asleep till `hour`. */
    const home = (hour: number, step: string) => {
      expect(standBy(s, w, bed.x, bed.y, bed.z), `home: ${step}`).toBe(true);
      expect(lookTarget(s, w)?.id).toBe(bed.id);
      tend(s, `${step}, to bed`);
      hold(s, w, 0);
      sleep(s, st, hour);
      expect(Math.floor(hourOf(s.time)), step).toBe(hour);
      expect(readSave(st)!.state.time, `${step}: saved`).toBe(s.time);
      alive(s, step);
      tend(s, `${step}, up`);
    };
    home(18, 'day 1, a nap');
    // Out again at dusk for water; asleep till day 2.
    expect(scavenge(s, found.drink, drink, 2), 'day 1 dusk: water').toBeGreaterThanOrEqual(1);
    home(6, 'night 1');
    expect(dayOf(s.time)).toBe(2);

    // Day 2: the death loop. Up on a height he falls; he wakes where he last slept, as he was, his death counted.
    const slept = readSave(st)!.state;
    fall(s, bed.x, bed.z);
    expect(s.dead, 'dead of the fall').toBe('fall');
    s = wake(st, s);
    expect([s.dead ?? null, s.deaths, s.time, s.player.pos]).toEqual([null, 1, slept.time, slept.player.pos]);
    expect([countOf(s, 'jammer'), s.shelters.map(h => h.id), s.wstate.benches?.[table.id]]).toEqual([1, [bed.id], true]);
    expect(readSave(st)!.state.deaths, 'kept').toBe(1);
    // Food and water; at the substation the bolt cutters and his father's gloves.
    expect(scavenge(s, found.drink, drink, 2), 'day 2: water').toBeGreaterThanOrEqual(1);
    expect(scavenge(s, found.food, food, 2), 'day 2: food').toBeGreaterThanOrEqual(1);
    tend(s, 'day 2 morning');
    expect(take(s, w, [cutters], is('boltcutters')), 'the bolt cutters').toBe(cutters.id);
    expect(take(s, w, [locker], is('insgloves')), "his father's gloves").toBe(locker.id);
    alive(s, 'the gloves');
    home(18, 'day 2, a nap');
    expect(scavenge(s, found.drink, drink, 1) + scavenge(s, found.food, food, 1), 'day 2 dusk').toBeGreaterThanOrEqual(1);
    home(6, 'night 2');
    expect(dayOf(s.time)).toBe(3);
    // Day 3: food and water; asleep till the night.
    expect(scavenge(s, found.drink, drink, 2), 'day 3: water').toBeGreaterThanOrEqual(1);
    home(21, 'day 3');
    expect(dayOf(s.time)).toBe(3);

    // The third night: the relay cut, Xiaoyu told to come, up the north pier and across the truss with the jammer.
    expect(standBy(s, w, relay.x, relay.y, relay.z, sub.heart), 'at the relay').toBe(true);
    expect(lookTarget(s, w)?.id).toBe(relay.id);
    hold(s, w, BUS.cut + 0.3);
    expect(busDown(s), 'the relay cut').toBe(true);
    alive(s, 'the relay');
    const x = s.sister!;
    expect(standBy(s, w, x.x, x.y + 0.7, x.z, undefined, [0.9, 1.2]), 'by Xiaoyu').toBe(true);
    expect(lookTarget(s, w)?.id).toBe('sister');
    hold(s, w, 0);
    expect(x.with, "she'll come").toBe(true);
    const pier = w.teleports.find(t => t.name === 'Dongshuimen Bridge: north pier')!, ladder = w.climbables.filter(c => c.kind === 'ladder').sort((p, q) => Math.hypot(p.x - pier.x, p.z - pier.z) - Math.hypot(q.x - pier.x, q.z - pier.z))[0];
    teleport(s.player, pier.x, pier.y, pier.z);
    run(s, w, 10);
    expect(climbLadder(s, w, ladder), 'up the north pier').toBe(true);
    const [ix, iz] = at(b, b.pier!, 6);
    expect(walk(s, w, [{ x: ix, y: rail(b, b.pier!), z: iz }]), 'in through the handrail').toBe(1);
    const jam = (q: SimState) => {
      if (q.tick % 15) return;
      const d = Math.min(...deckDrones(q, b).map(o => Math.hypot(o.x - q.player.pos.x, o.z - q.player.pos.z)));
      if ((d < 40) !== !!q.jam) use(q, q.inv.pack.items.find(is('jammer'))!);
    };
    expect([crossDeck(s, w, jam), s.dead ?? null], 'across the truss').toEqual([5, null]);
    // The ending, and the run's summary: three days, both sites got into, with Xiaoyu; the save gone.
    expect(s.ended).toMatchObject({ route: 'bridge', sister: true });
    const sum = summary(s);
    expect([sum.days, sum.sister, sum.km > 0]).toEqual([2, true, true]);
    expect(Object.keys(s.stats!.sites)).toEqual(expect.arrayContaining(['market', 'substation']));
    closeRun(st, s);
    expect(readSave(st), 'the save gone').toBeNull();

    // A new run: fresh, nothing carried over but the city, saved as it starts.
    const s2 = newRun(seed + 1, st);
    expect([s2.ended, s2.dead ?? null, s2.deaths, s2.escape, s2.stats, s2.shelters]).toEqual([undefined, null, undefined, undefined, undefined, []]);
    expect(s2.inv.pack.items.flatMap(i => Array(i.n).fill(i.id)).sort()).toEqual(STARTING_SUPPLIES.flatMap(([id, n]) => Array(n).fill(id)).sort());
    expect(Object.keys(s2.containers)).toEqual([START_CRATE]);
    expect([dayOf(s2.time), Math.round(hourOf(s2.time)), s2.opening, !!s2.gear]).toEqual([1, OPENING.hour, 0, true]);
    expect(w.inter.filter(i => doorSolid(i) >= 0 && !i.data?.shutter && w.index.off[doorSolid(i)] !== (s2.wstate.open[i.id] ? 1 : 0)).map(i => i.id), 'the city shut as it was').toEqual([]);
    expect(readSave(st)!.state.seed).toBe(seed + 1);
    // Dead before he's ever slept: back to the run's start, his death counted.
    run(s2, w, secs(WAKE_END) + 2);
    fall(s2, w.spawn.x, w.spawn.z);
    expect(s2.dead).toBe('fall');
    const s3 = wake(st, s2);
    expect([s3.deaths, s3.time, s3.opening, s3.player.pos]).toEqual([1, readSave(st)!.state.time, 0, readSave(st)!.state.player.pos]);
  }, 2400000);
});
