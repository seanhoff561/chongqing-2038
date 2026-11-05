// M7-08: the river police's patrol boat. It needs 20 L of diesel, a car battery with charge enough to turn it over, and
// its key or the CAN interface's hotwire; E on it does each in turn, then takes the helm. At the helm the engine starts
// with E (loud: the machines hear it), W drives it ahead, A and D steer it, it runs up against the bank and stops, and
// jump steps off it. On a bank with a pontoon out into a river.
import { describe, it, expect } from 'vitest';
import { run, secs, aim } from './helpers';
import { createState } from '../../src/sim/sim';
import { makeWorld } from '../../src/world/world';
import { solid } from '../../src/world/geom';
import { heightfield } from '../../src/world/heightfield';
import { addItem, count } from '../../src/sim/inventory';
import { teleport } from '../../src/sim/player';
import { BOAT, nextStep } from '../../src/sim/boat';
import { B, type SimState } from '../../src/sim/types';

/** The bank (ground at 0) for x < 0, the river (surface at -1) beyond; a pontoon out from the bank, the boat moored
 *  along its river side, its bow north (yaw 0). */
function river() {
  const ground = heightfield(-40, -240, 1, 480, 480);
  for (let j = 0; j < 480; j++) for (let i = 0; i < 480; i++) ground.y[j * 480 + i] = i < 40 ? 0 : -10;
  return makeWorld({
    name: 'river', ground, spawn: { x: 0, y: 0, z: 0, yaw: 0 },
    solids: [solid(-40, -11, -240, 440, -10, 240), solid(0, -1.6, -6, 3, -0.6, 6)],
    water: [{ x0: 0, y0: -10, z0: -240, x1: 440, y1: -1, z1: 240 }],
    inter: [{ id: 'patrolboat', kind: 'boat', x: 4.8, y: 0.8, z: 0, r: 1.5, zh: '', en: '', data: { yaw: 0 } }],
  });
}

/** On the pontoon by the boat, looking at it; E pressed and held for `t` s. */
function work(s: SimState, w: ReturnType<typeof river>, t: number) {
  if (s.player.mode !== 'boat') { teleport(s.player, 2, -0.6, 0); run(s, w, 20); }
  aim(s, 4.8, 0.8, 0);
  run(s, w, Math.max(1, secs(t)), { buttons: B.INTERACT, pressed: B.INTERACT });
  run(s, w, 2);
}

describe('the patrol boat (M7-08)', () => {
  it('needs diesel, a battery that turns it over, and its key or a hotwire, each done in turn, then he takes the helm', () => {
    const w = river(), s = createState(1, w);
    s.time = 12 * 3600;
    work(s, w, 1);
    expect(s.player.mode, 'nothing to give it').toBe('ground');
    expect(nextStep(s)).toMatch(/dry/);
    addItem(s, s.inv.pack, 'jerrycan', 1);
    work(s, w, BOAT.pour - 1);
    expect(s.boat?.fuel ?? 0, 'let go too soon').toBe(0);
    work(s, w, BOAT.pour + 0.5);
    expect(s.boat!.fuel).toBe(20);
    expect(count(s.inv.pack, 'jerrycan')).toBe(0);
    expect(s.escape?.boat?.fuel).toBeDefined();
    // A flat battery goes in, but won't turn it over: a better one takes its place, the flat one back in his pack.
    addItem(s, s.inv.pack, 'carbattery', 1, { charge: 15 });
    work(s, w, BOAT.wire + 0.5);
    expect(s.boat!.batt).toBe(15);
    expect(nextStep(s)).toMatch(/battery/);
    addItem(s, s.inv.pack, 'carbattery', 1, { charge: 60 });
    work(s, w, BOAT.wire + 0.5);
    expect(s.boat!.batt).toBe(60);
    expect(s.inv.pack.items.filter(i => i.id === 'carbattery').map(i => i.charge)).toEqual([15]);
    // No key: the ignition's locked, till the CAN interface bypasses it.
    expect(nextStep(s)).toMatch(/key/);
    addItem(s, s.inv.pack, 'canif', 1);
    work(s, w, BOAT.hotwire + 0.5);
    expect(s.boat!.ign).toBe('can');
    work(s, w, 0);
    expect(s.player.mode).toBe('boat');
    expect(s.boat!.moored).toBe(false);
    expect(Object.keys(s.escape!.boat).sort()).toEqual(['battery', 'fuel', 'ignition', 'launch']);
  });

  it('with its key: fuel and battery in, E takes the helm', () => {
    const w = river(), s = createState(1, w);
    for (const [id, extra] of [['jerrycan', {}], ['carbattery', { charge: 50 }], ['boatkey', {}]] as const) addItem(s, s.inv.pack, id, 1, extra);
    work(s, w, BOAT.pour + 0.5);
    work(s, w, BOAT.wire + 0.5);
    work(s, w, 0);
    expect([s.player.mode, s.boat!.ign]).toEqual(['boat', 'key']);
  });

  it('starts loud, drives ahead, steers, stops against the bank, and he steps off it', () => {
    const w = river(), s = createState(1, w);
    for (const [id, extra] of [['jerrycan', {}], ['carbattery', { charge: 50 }], ['boatkey', {}]] as const) addItem(s, s.inv.pack, id, 1, extra);
    work(s, w, BOAT.pour + 0.5); work(s, w, BOAT.wire + 0.5); work(s, w, 0);
    const b = s.boat!, heard: number[] = [], sfx: string[] = [];
    const listen = (x: SimState) => { for (const e of x.events) { if (e.t === 'noise' && e.kind === 'engine') heard.push(e.r); if (e.t === 'sfx') sfx.push(e.id); } };
    // Paddling, engine off: slow, and quiet.
    run(s, w, secs(5), { my: 1 }, listen);
    expect(b.v).toBeCloseTo(BOAT.paddle, 1);
    expect(heard).toEqual([]);
    run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT }, listen);
    expect(b.on).toBe(true);
    expect(sfx).toContain('engine-start');
    const z0 = b.z, fuel = b.fuel;
    run(s, w, secs(10), { my: 1 }, listen);
    expect(b.v).toBeCloseTo(BOAT.top, 0);
    expect(z0 - b.z, 'ahead, north').toBeGreaterThan(40);
    expect(Math.abs(b.x - 4.8)).toBeLessThan(0.5);
    expect(heard.length).toBeGreaterThan(15);
    expect(heard[0]).toBe(BOAT.noise);
    expect(b.fuel).toBeLessThan(fuel);
    // He's at the helm, carried along with it.
    expect(Math.hypot(s.player.pos.x - b.x, s.player.pos.z - b.z)).toBeCloseTo(BOAT.helm, 1);
    expect(s.player.pos.y).toBeCloseTo(-1 + BOAT.deck, 2);
    // A to port (left: west, toward the bank), then on ahead into it: it turns, runs up against the bank and stops there.
    run(s, w, secs(4), { my: 1, mx: -1 });
    expect(b.yaw).toBeGreaterThan(0.5);
    run(s, w, secs(10), { my: 1 });
    expect(b.x).toBeGreaterThan(0);
    expect(b.x).toBeLessThan(4);
    expect(Math.abs(b.v)).toBeLessThan(BOAT.top / 2);
    // E: the engine dies away; jump: off onto the bank, the boat left where it is.
    run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT }, listen);
    expect(b.on).toBe(false);
    expect(sfx).toContain('engine-stop');
    run(s, w, 1, { pressed: B.JUMP, buttons: B.JUMP });
    run(s, w, 30);
    expect(s.player.mode).toBe('ground');
    expect(s.player.pos.x).toBeLessThan(0);
    expect(s.player.pos.y).toBeCloseTo(0, 1);
  });

  it("won't take a flat battery's start, nor go without its ignition", () => {
    const w = river(), s = createState(1, w);
    for (const [id, extra] of [['jerrycan', {}], ['carbattery', { charge: BOAT.crank - 5 }], ['boatkey', {}]] as const) addItem(s, s.inv.pack, id, 1, extra);
    work(s, w, BOAT.pour + 0.5); work(s, w, BOAT.wire + 0.5); work(s, w, 0);
    expect(s.player.mode, 'flat: not cast off').toBe('ground');
    expect(s.boat!.moored).toBe(true);
  });
});
