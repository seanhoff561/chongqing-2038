// M5-01: Anna's laptop. L opens and shuts it (a command; nothing stops); open, a full battery lasts two game hours and
// then it shuts itself, flat; at night its screen lights him (0.5); shut at a hideout with a charged car battery it
// charges, a little off the battery.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { SCALE } from '../../src/sim/clock';
import { laptopLight, LAPTOP } from '../../src/sim/laptop';
import { claimBed } from '../../src/sim/shelter';

const toggle = { cmds: [{ c: 'act' as const, name: 'laptop' }] };

describe("Anna's laptop (M5-01)", () => {
  it('runs two game hours open, lights him, and charges at a hideout with power', () => {
    const { world, state } = setup([floor()]);
    state.time = 22 * 3600;
    run(state, world, 1, toggle);
    expect(state.laptop!.open).toBe(true);
    expect(laptopLight(state)).toBe(LAPTOP.glow);
    // An hour in, half gone; time goes on all the while.
    const t0 = state.time;
    run(state, world, secs(3600 / SCALE));
    expect(state.time - t0).toBeCloseTo(3600, -2);
    expect(state.laptop!.charge).toBeCloseTo(0.5, 1);
    run(state, world, secs(3600 / SCALE) + 60);
    expect(state.laptop!.open).toBe(false);
    expect(state.laptop!.charge).toBe(0);
    // Flat, it won't open.
    run(state, world, 1, toggle);
    expect(state.laptop!.open).toBe(false);
    // At a hideout with a charged battery, it charges.
    claimBed(state, { id: 'bed', kind: 'mattress', x: 0, y: 0, z: 0, r: 1, zh: '', en: '' }, 80);
    run(state, world, secs(3600 / SCALE));
    expect(state.laptop!.charge).toBeGreaterThan(0.3);
    expect(state.shelters[0].battery).toBeLessThan(80);
  });
});
