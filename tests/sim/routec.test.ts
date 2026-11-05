// M7-10: Route C from a fresh run. He goes from place to place along the route (teleported between its steps, as the
// route tests do), and at each takes what he needs with his own hands: a crowbar from where one lies, the police
// station's evidence-room door forced with it and the boat key out of its key cabinet, a car battery with charge in it,
// a jerrycan of diesel. On the river-police pier he pours in the diesel and wires in the battery, sleeps rough on the
// pontoon until a foggy midnight, casts off with the key, and drifts and paddles past the buoys and down the open
// river with the engine off, steering for the reach past Chaotianmen: 雾中.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { startRun } from '../../src/sim/run';
import { lookTarget } from '../../src/sim/interact';
import { weatherAt } from '../../src/sim/weather';
import { sisterRoute } from '../../src/sim/sister';
import { BOAT, ahead } from '../../src/sim/boat';
import { raycast } from '../../src/world/geom';
import { WATER_Y } from '../../src/world/yuzhong/ground';
import type { Stack } from '../../src/sim/inventory';
import type { Inter } from '../../src/world/world';
import { run, secs, aim } from './helpers';
import { holding, standBy, hold, take } from './routekit';

const w = getWorld('yuzhong'), moor = w.inter.find(i => i.id === 'patrolboat')!;
const cabinet = w.inter.find(i => i.kind === 'container' && (i.data?.items as [string, number][] | undefined)?.some(([id]) => id === 'boatkey'))!;
const evidence = w.inter.find(i => i.kind === 'door' && i.en === 'Evidence room' && Math.hypot(i.x - cabinet.x, i.z - cabinet.z) < 6)!;
const zone = w.zones.find(z => z.kind === 'ending:boat')!.box, mid = { x: (zone.x0 + zone.x1) / 2, z: (zone.z0 + zone.z1) / 2 };

describe('Route C from a fresh run (M7-10)', () => {
  it('gathers fuel, battery and ignition, launches at a foggy midnight and drifts down to the far reach', () => {
    const charged = (st: Stack) => st.id === 'carbattery' && (st.charge ?? 100) >= BOAT.crank + 5;
    const is = (id: string) => (st: Stack) => st.id === id;
    // A run whose first midnight is foggy, and whose city has a crowbar, a charged car battery and a jerrycan in it.
    let seed = 0, found: Record<string, Inter[]> = {};
    for (let n = 1; n < 60 && !seed; n++) {
      if (weatherAt(n, 86400 + 1800).fog < 0.7 || sisterRoute(n) === 'boat') continue;
      found = { crowbar: holding(w, n, is('crowbar')), carbattery: holding(w, n, charged), jerrycan: holding(w, n, is('jerrycan')) };
      if (Object.values(found).every(l => l.length)) seed = n;
    }
    expect(seed, 'a seed').toBeGreaterThan(0);
    const s = createState(seed, w);
    startRun(s, w);
    const alive = (step: string) => expect([step, s.dead]).toEqual([step, null]);
    // A crowbar; the evidence room forced with it; the boat key from its cabinet.
    expect(take(s, w, found.crowbar, is('crowbar')), 'a crowbar').toBeDefined();
    alive('crowbar');
    expect(standBy(s, w, evidence.x, evidence.y, evidence.z, cabinet), 'by the evidence room door').toBe(true);
    expect(lookTarget(s, w)?.id).toBe(evidence.id);
    hold(s, w, 2);
    expect(s.wstate.open[evidence.id], 'forced').toBe(true);
    expect(take(s, w, [cabinet], is('boatkey')), 'the boat key').toBe(cabinet.id);
    alive('the key');
    expect(take(s, w, found.carbattery, charged), 'a car battery').toBeDefined();
    alive('the battery');
    expect(take(s, w, found.jerrycan, is('jerrycan')), 'a jerrycan').toBeDefined();
    alive('the jerrycan');
    // On the pontoon by the boat: the diesel in, the battery wired.
    const f = ahead(moor.data!.yaw as number), side = [1, -1].map(k => ({ x: moor.x - f.z * k * 2.4, z: moor.z + f.x * k * 2.4 })).find(q => (raycast(w.index, q.x, WATER_Y + 3, q.z, 0, -1, 0, 3)?.t ?? 9) < 3)!;
    expect(standBy(s, w, moor.x, moor.y, moor.z, { x: 2 * moor.x - side.x, z: 2 * moor.z - side.z }, [2.2, 2.5, 2.8]), 'on the pontoon').toBe(true);
    hold(s, w, BOAT.pour + 0.3);
    aim(s, moor.x, moor.y, moor.z);
    hold(s, w, BOAT.wire + 0.3);
    expect([s.boat?.fuel, (s.boat?.batt ?? 0) >= BOAT.crank]).toEqual([20, true]);
    alive('the boat readied');
    // Rough on the pontoon till midnight.
    expect(s.time).toBeLessThan(86400);
    s.player.pitch = 1.2;
    run(s, w, 2, { pitch: 1.2 });
    run(s, w, 1, { pitch: 1.2, cmds: [{ c: 'act', name: 'sleep', arg: 0 }] });
    expect(s.time).toBeGreaterThanOrEqual(86400);
    alive('slept');
    expect(s.weather.fog).toBeGreaterThanOrEqual(0.7);
    // Cast off with the key, and away: the engine never started; paddling, steered for the reach.
    aim(s, moor.x, moor.y, moor.z);
    hold(s, w, 0);
    expect([s.player.mode, s.boat?.ign]).toEqual(['boat', 'key']);
    let boats = 0;
    for (let t = 0; t < secs(600) && !s.ended && !s.dead; t++) {
      const b = s.boat!, want = Math.atan2(-(mid.x - b.x), -(mid.z - b.z));
      let err = want - b.yaw;
      err -= Math.round(err / (2 * Math.PI)) * 2 * Math.PI;
      run(s, w, 1, { my: 1, mx: Math.max(-1, Math.min(1, -err * 3)) }, x => { for (const e of x.events) if (e.t === 'sfx' && e.id === 'boats') boats++; });
    }
    expect([s.dead, boats, !!s.boat!.on]).toEqual([null, 0, false]);
    expect(s.ended).toMatchObject({ route: 'boat', sister: false });
    expect(Object.keys(s.escape!.boat).sort()).toEqual(['battery', 'fuel', 'ignition', 'launch']);
  }, 1500000);
});
