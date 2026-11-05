// M7-07: Route B from a fresh run, both ways (place to place along the route, teleported between its steps as the route
// tests do; at each he does the thing with his own hands). The cabin: a crowbar from the cableway's switch room; at the
// Xinhua Road substation store cage B prised open and the spare HV fuse out of its relay cabinet, fitted at the
// cableway's feeder panel; at the station the upper station's door and the operator's booth forced, the operator key
// out of the control desk's drawer; Xiaoyu, waiting in cabin 2, told to come; the key turned, and kept low under the
// windows past the line drone to the river: 索道, with her. The trolley: a pulley block and two carabiners from where
// they lie, the harness from the station's rope gear locker (the upper station forced to get to it), the trolley made
// at a workbench (a toolbox found and set on a table); up onto cabin 2's roof, clipped onto the haul rope, and down it to the river: 索道, alone.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { startRun } from '../../src/sim/run';
import { lookTarget } from '../../src/sim/interact';
import { sisterRoute } from '../../src/sim/sister';
import { countOf } from '../../src/sim/craft';
import { CABIN } from '../../src/sim/cablecar';
import { TROLLEY } from '../../src/sim/trolley';
import { recipe } from '../../src/data/recipes';
import { B, type SimState } from '../../src/sim/types';
import type { Stack } from '../../src/sim/inventory';
import type { Inter } from '../../src/world/world';
import { run, secs, aim, settle, LMB } from './helpers';
import { holding, standBy, hold, take } from './routekit';

const w = getWorld('yuzhong');
const S = w.secure!.find(q => q.id === 'cableway')!, sub = w.secure!.find(q => q.id === 'substation')!;
const near = (p: { x: number; z: number }) => (a: Inter, b: Inter) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z);
const holds = (id: string) => (it: Inter) => it.kind === 'container' && !!(it.data?.items as [string, number][] | undefined)?.some(([q]) => q === id);
const crowbar = w.inter.filter(holds('crowbar')).sort(near(S.heart))[0], drawer = w.inter.filter(holds('opkey')).sort(near(S.heart))[0];
const locker = w.inter.filter(holds('harness')).sort(near(S.heart))[0], relay = w.inter.filter(holds('hvfuse')).sort(near(sub.heart))[0];
const door = (en: string, p: { x: number; z: number }) => w.inter.filter(i => i.kind === 'door' && i.en === en).sort(near(p))[0];
const upper = door('Upper station', S.heart), booth = door("Operator's booth", S.heart), cage = door('Store cage B', sub.heart);
const feeder = w.inter.find(i => i.kind === 'feeder')!, panel = w.inter.find(i => i.kind === 'cabin')!, rope = w.inter.find(i => i.kind === 'haulrope')!;
const cab = w.features.find(f => f.kind === 'cable:cabin')!, mid = { x: cab.x - cab.nx! * 1.35, z: cab.z - cab.nz! * 1.35 }, ux = -cab.nz!, uz = cab.nx!;
const is = (id: string) => (st: Stack) => st.id === id;

/** A fresh run of a seed whose sister waits at the cableway and whose city has a pulley block, two carabiners and a
 *  toolbox lying about. */
function fresh() {
  let seed = 0, found: Record<string, Inter[]> = {};
  for (let n = 1; n < 80 && !seed; n++) {
    if (sisterRoute(n) !== 'cable') continue;
    found = { pulley: holding(w, n, is('pulley')), carabiner: holding(w, n, is('carabiner')), toolbox: holding(w, n, is('toolbox')) };
    if (found.pulley.length && found.carabiner.length >= 2 && found.toolbox.length) seed = n;
  }
  expect(seed, 'a seed').toBeGreaterThan(0);
  const s = createState(seed, w);
  startRun(s, w);
  return { s, found };
}
const alive = (s: SimState, step: string) => expect([step, s.dead]).toEqual([step, null]);
/** A door forced with the crowbar from the side away from `inside`. */
function force(s: SimState, d: Inter, inside: Inter) {
  expect(standBy(s, w, d.x, d.y, d.z, inside), `by ${d.en}`).toBe(true);
  expect(lookTarget(s, w)?.id).toBe(d.id);
  hold(s, w, 3);
  expect(s.wstate.open[d.id], `${d.en} forced`).toBe(true);
}

describe('Route B from a fresh run (M7-07)', () => {
  it('the cabin: the fuse fitted, the key found, Xiaoyu told, the ride kept low to the ending', async () => {
    await settle();
    const { s } = fresh();
    expect(take(s, w, [crowbar], is('crowbar')), 'the crowbar').toBe(crowbar.id);
    alive(s, 'crowbar');
    force(s, cage, relay);
    expect(take(s, w, [relay], is('hvfuse')), 'the spare fuse').toBe(relay.id);
    alive(s, 'the fuse');
    expect(standBy(s, w, feeder.x, feeder.y, feeder.z, sub.heart), 'at the feeder panel').toBe(true);
    expect(lookTarget(s, w)?.id).toBe(feeder.id);
    hold(s, w, CABIN.fuse + 0.3);
    expect(s.wstate.open['cable-feeder'], 'the feeder live').toBe(true);
    alive(s, 'the feeder');
    force(s, upper, booth);
    force(s, booth, drawer);
    expect(take(s, w, [drawer], is('opkey')), 'the operator key').toBe(drawer.id);
    alive(s, 'the key');
    // In cabin 2: Xiaoyu told to come; the key turned.
    const x = s.sister!;
    expect(standBy(s, w, x.x, x.y + 0.7, x.z, undefined, [0.9, 1.2]), 'by Xiaoyu').toBe(true);
    expect(lookTarget(s, w)?.id).toBe('sister');
    hold(s, w, 0);
    expect(x.with, 'she\'ll come').toBe(true);
    expect(standBy(s, w, panel.x, panel.y, panel.z, { x: 2 * panel.x - mid.x, z: 2 * panel.z - mid.z }, [0.9, 1.2]), 'at the panel').toBe(true);
    expect(lookTarget(s, w)?.id).toBe(panel.id);
    hold(s, w, CABIN.key + 0.2);
    expect([s.player.mode, x.aboard]).toEqual(['cable', true]);
    run(s, w, secs(75), { buttons: B.CROUCH });
    expect(s.cable!.spotted, 'unseen').toBeUndefined();
    alive(s, 'the ride');
    expect(s.ended).toMatchObject({ route: 'cable', sister: true });
    expect(Object.keys(s.escape!.cable).sort()).toEqual(['cabin', 'feeder']);
  }, 1500000);

  it('the trolley: its parts gathered, made at a bench, clipped on from cabin 2\'s roof and slid to the ending', async () => {
    await settle();
    const { s, found } = fresh();
    expect(take(s, w, [crowbar], is('crowbar')), 'the crowbar').toBe(crowbar.id);
    expect(take(s, w, found.pulley, is('pulley')), 'a pulley block').toBeDefined();
    alive(s, 'the pulley');
    for (let k = 0; k < found.carabiner.length && countOf(s, 'carabiner') < 2; k++) take(s, w, [found.carabiner[k]], is('carabiner'));
    expect(countOf(s, 'carabiner'), 'two carabiners').toBeGreaterThanOrEqual(2);
    alive(s, 'the carabiners');
    force(s, upper, locker);
    expect(take(s, w, [locker], is('harness')), 'the harness').toBe(locker.id);
    alive(s, 'the harness');
    // A toolbox set on a table (the nearest the station he can get to): a workbench; the trolley made there.
    expect(take(s, w, found.toolbox, is('toolbox')), 'a toolbox').toBeDefined();
    const table = w.inter.filter(i => i.kind === 'table').sort(near(S.heart)).find(t => standBy(s, w, t.x, t.y, t.z) && lookTarget(s, w)?.id === t.id)!;
    expect(table, 'at a table').toBeDefined();
    s.inv.hotbar[0] = s.inv.pack.items.find(i => i.id === 'toolbox')!.uid; s.inv.held = 1;
    run(s, w, 1, { pressed: LMB, buttons: LMB });
    expect(s.wstate.benches?.[table.id], 'a workbench').toBe(true);
    run(s, w, 1, { cmds: [{ c: 'act', name: 'craft', arg: 'trolley' }] });
    run(s, w, secs(recipe('trolley')!.secs + 0.5));
    expect(countOf(s, 'trolley'), 'the trolley made').toBe(1);
    alive(s, 'the trolley');
    // On the platform by cabin 2; up onto its roof; along it under the haul rope; clipped on.
    const lip = { x: mid.x + cab.nx! * 1.7 + ux * 2, y: cab.y + 2.42, z: mid.z + cab.nz! * 1.7 + uz * 2 };
    expect(standBy(s, w, lip.x, lip.y, lip.z, mid, [0.4, 0.5]), 'by the cabin').toBe(true);
    run(s, w, 1, { pressed: B.JUMP, buttons: B.JUMP });
    for (let i = 0; i < 40 && s.player.mode !== 'grip'; i++) { aim(s, lip.x, lip.y, lip.z); run(s, w, 1, { buttons: LMB | B.JUMP }); }
    expect(s.player.mode, 'hanging from its roof').toBe('grip');
    // (Pulled up until he's on it, and no further: the roof's only 3.4 m across.)
    for (let i = 0; i < secs(3) && s.player.mode !== 'ground'; i++) run(s, w, 1, { buttons: LMB, my: s.player.mode === 'grip' ? 1 : 0 });
    run(s, w, secs(1));
    expect(s.player.pos.y, 'on its roof').toBeCloseTo(cab.y + 2.45, 1);
    const to = { x: mid.x + ux * 2.6, z: mid.z + uz * 2.6 };
    for (let i = 0; i < secs(6) && Math.hypot(to.x - s.player.pos.x, to.z - s.player.pos.z) > 0.25; i++) run(s, w, 1, { yaw: Math.atan2(-(to.x - s.player.pos.x), -(to.z - s.player.pos.z)), my: 0.6 });
    run(s, w, 20);
    aim(s, rope.x, rope.y, rope.z);
    run(s, w, 2);
    expect(lookTarget(s, w)?.id).toBe(rope.id);
    hold(s, w, TROLLEY.clip + 0.2);
    expect([s.player.mode, s.cable?.by]).toEqual(['cable', 'trolley']);
    run(s, w, secs(60));
    alive(s, 'the slide');
    expect(s.ended).toMatchObject({ route: 'cable', sister: false });
    expect(s.escape!.cable.trolley).toBeDefined();
  }, 1500000);
});
