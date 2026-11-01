import { describe, it, expect } from 'vitest';
import { setup, run, secs } from './helpers';
import { solid } from '../../src/world/geom';
import type { SimEvent } from '../../src/sim/types';
import { fallOutcome } from '../../src/sim/move';
import { MAT } from '../../src/world/mats';
import { propBoxes } from '../../src/world/yuzhong/dressing';

/** Walk off a ledge of height h onto the floor (no roll any more: U-054). */
function drop(h: number) {
  const { world, state } = setup([solid(-5, -1, -30, 5, 0, 30), solid(-5, 0, -2, 5, h, 10)], { x: 0, y: h, z: 0, yaw: 0 });
  const lands: SimEvent[] = [];
  for (let i = 0; i < secs(5); i++) {
    run(state, world, 1, { my: 1 });
    lands.push(...state.events.filter(e => e.t === 'land' && e.h > 1));
  }
  return lands[0] as Extract<SimEvent, { t: 'land' }>;
}

describe('falls (U-054: no roll, every fall as a rolled one was)', () => {
  it('3.5 m and 6.5 m: nothing', () => {
    for (const h of [3.5, 6.5]) {
      const e = drop(h);
      expect(e.h).toBeCloseTo(h, 1);
      expect(e.outcome).toEqual({ damage: 0, sprain: false, fracture: false, arm: false, lethal: false });
    }
  });
  it('9 m: eased damage, nothing broken', () => {
    const e = drop(9);
    expect(e.outcome.fracture).toBe(false);
    expect(e.outcome.damage).toBeCloseTo(16, 0);
  });
  it('11 m: a broken bone and heavy damage; 13 m: lethal', () => {
    const e = drop(11);
    expect(e.outcome.fracture).toBe(true);
    expect(e.outcome.damage).toBeCloseTo(70, 0);
    expect(drop(13).outcome.lethal).toBe(true);
  });
  it('outcome table edges', () => {
    const r = () => 0;
    expect(fallOutcome(7, r).damage).toBe(0);
    expect(fallOutcome(9, r).damage).toBeCloseTo(16);
    expect(fallOutcome(11, r).fracture).toBe(true);
    expect(fallOutcome(12.5, r).lethal).toBe(true);
  });
});

describe('soft landings (U-024)', () => {
  /** Walk off a ledge of height h onto a 0.6 m heap of the given material spread out below it. */
  const onto = (h: number, mat: number) => {
    const { world, state } = setup([solid(-5, -1, -30, 5, 0, 30), solid(-5, 0, -2, 5, h, 10), solid(-2, 0, -12, 2, 0.6, -2, mat)], { x: 0, y: h, z: 0, yaw: 0 });
    for (let i = 0; i < secs(5); i++) {
      run(state, world, 1, { my: i < 60 ? 1 : 0 });
      const e = state.events.find(e => e.t === 'land' && e.h > 1);
      if (e) return e as Extract<SimEvent, { t: 'land' }>;
    }
    throw new Error('never landed');
  };
  it('bags, bins and awnings take half the drop: 8 m onto bags is a 4 m fall, no harm', () => {
    const hard = onto(8.5, MAT.concrete), soft = onto(8.5, MAT.soft), awning = onto(8.5, MAT.cloth);
    expect(hard.h).toBeGreaterThan(7.5);
    expect(soft.h).toBeCloseTo(hard.h / 2, 1);
    expect(awning.h).toBeCloseTo(hard.h / 2, 1);
    expect(hard.outcome.damage).toBeGreaterThan(0);
    expect(soft.outcome.damage).toBe(0);
  });
  it('every soft kind of prop lands soft: bags, bins, cardboard and tarps', () => {
    for (const kind of ['bags', 'bin', 'boxes', 'tarp']) {
      const boxes = propBoxes({ kind, x: 0, y: 0, z: -4, yaw: 0 });
      expect(boxes.length, kind).toBeGreaterThan(0);
      for (const b of boxes) expect(b.mat, kind).toBe(MAT.soft);
    }
    expect(onto(8.5, MAT.soft).outcome.damage).toBe(0);
  });
});
