// M4-54 (U-051): machine fire is quick and deadly. Rounds arrive at once; standing in the open 20 m from a humanoid
// that has him, a burst or two kills him in seconds; the rounds that miss crack past him.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import type { Patrol } from '../../src/world/world';
import { reportOf } from '../../src/audio/gunfire';

describe('gunfire (M4-54)', () => {
  it('kills in seconds in the open, the misses cracking past', () => {
    const times: number[] = [];
    let cracks = 0, shots = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const beat: Patrol = { kind: 'street', unit: 'humanoid', pts: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0.01 }], dwell: [600, 600], hours: [0, 24] };
      const { world, state } = setup([floor(0, 300)], { x: 0, y: 0, z: 20, yaw: 0 }, { patrols: [beat] });
      Object.assign(state, { time: 12 * 3600, weather: { fog: 0, rain: 0 } });
      state.flags.clear = true; state.rng = { s: seed * 7919 };
      state.units[0].aware = 1.5; state.units[0].state = 'engaged'; state.units[0].seen = { x: 0, y: 0, z: 20 };
      let t = 0;
      while (t < secs(15) && state.player.mode !== 'dead') {
        run(state, world, 1, {}, s => { for (const e of s.events) if (e.t === 'shot') { shots++; if (e.crack) cracks++; } });
        t++;
      }
      times.push(t / 60);
    }
    times.sort((a, b) => a - b);
    // Dead every time, in about four seconds of its fire (the median), never more than ten.
    expect(times[times.length - 1]).toBeLessThan(10);
    expect(times[3]).toBeLessThan(4.5);
    expect(cracks).toBeGreaterThan(shots * 0.3);
  });
  it('sounds like gunfire: the report late and dull with distance, muffled through walls, echoing by the place', () => {
    const near = reportOf(20, false, 'street'), far = reportOf(300, false, 'street'), walled = reportOf(20, true, 'street');
    expect(far.delay).toBeCloseTo(300 / 343);
    expect(near.delay).toBeLessThan(0.1);
    expect(far.cutoff).toBeLessThan(near.cutoff / 4);
    expect(walled.cutoff).toBeLessThan(near.cutoff / 4);
    expect(walled.gain).toBeLessThan(near.gain);
    // A tunnel rolls on longer than a street, a street longer than a room.
    const tail = (w: Parameters<typeof reportOf>[2]) => Math.max(...reportOf(20, false, w).echoes.map(([t]) => t));
    expect(tail('under')).toBeGreaterThan(tail('street'));
    expect(tail('street')).toBeGreaterThan(tail('indoors'));
  });
});
