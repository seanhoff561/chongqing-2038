// M5-01: Anna's laptop. L opens and shuts it (a command; nothing stops); open, a full battery lasts eight game hours (U-102) and
// then it shuts itself, flat; at night its screen lights him (0.5); shut at a hideout with a charged car battery it
// charges, a little off the battery.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs, aim, LMB, RMB } from './helpers';
import { solid } from '../../src/world/geom';
import { B } from '../../src/sim/types';
import { SCALE } from '../../src/sim/clock';
import { laptopLight, LAPTOP } from '../../src/sim/laptop';
import { claimBed } from '../../src/sim/shelter';

const toggle = { cmds: [{ c: 'act' as const, name: 'laptop' }] };

describe("Anna's laptop (M5-01)", () => {
  it('runs eight game hours open, lights him, and charges at a hideout with power', () => {
    const { world, state } = setup([floor()]);
    state.time = 22 * 3600;
    run(state, world, 10);
    run(state, world, 1, toggle);
    expect(state.laptop!.open).toBe(true);
    expect(laptopLight(state)).toBe(LAPTOP.glow);
    // Half its time in, half gone; time goes on all the while.
    const t0 = state.time, half = LAPTOP.lasts / 2;
    expect(LAPTOP.lasts).toBe(8 * 3600);
    run(state, world, secs(half / SCALE));
    expect(state.time - t0).toBeCloseTo(half, -2);
    expect(state.laptop!.charge).toBeCloseTo(0.5, 1);
    run(state, world, secs(half / SCALE) + 60);
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

describe('the laptop in his hands (M10-12, U-104)', () => {
  it("held up, he can't sprint, jump or take hold of anything; put away, he can", () => {
    const mk = () => setup([floor(), solid(-1, 0, -3.2, 1, 1.9, -2.2)]);
    const go = (open: boolean) => {
      const { world, state } = mk();
      run(state, world, 10);
      if (open) run(state, world, 1, toggle);
      expect(!!state.laptop?.open).toBe(open);
      // Sprinting from a standstill: no faster than a jog.
      state.player.yaw = Math.PI;
      run(state, world, secs(1), { my: 1, buttons: B.SPRINT });
      const v = Math.hypot(state.player.vel.x, state.player.vel.z);
      state.player.yaw = 0;
      // A jump.
      run(state, world, 1, { buttons: B.JUMP, pressed: B.JUMP });
      run(state, world, 3);
      const jumped = state.player.pos.y > 0.05;
      // Up against the block, reaching for its top edge with both hands.
      state.player.pos.z = 0;
      run(state, world, secs(1.5), { my: 1 });
      aim(state, 0, 1.9, -2.2);
      run(state, world, 10, { buttons: LMB | RMB, pressed: LMB | RMB });
      return { v, jumped, held: state.player.hands.some(h => h.grip) };
    };
    const out = go(true), away = go(false);
    expect(out.v).toBeLessThan(3.5);
    expect(out.jumped).toBe(false);
    expect(out.held).toBe(false);
    expect(away.v).toBeGreaterThan(5);
    expect(away.jumped).toBe(true);
    expect(away.held).toBe(true);
  });
});
