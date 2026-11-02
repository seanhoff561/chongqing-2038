import { describe, it, expect } from 'vitest';
import { weatherAt } from '../../src/sim/weather';
import { setup, run, floor } from './helpers';

const HOUR = 3600, DAY = 24 * HOUR;
const series = (seed: number) => Array.from({ length: 10 * 24 }, (_, i) => weatherAt(seed, DAY + i * HOUR));

describe('weather schedule (M3-12)', () => {
  it('is deterministic per seed and differs between seeds', () => {
    expect(series(7)).toEqual(series(7));
    expect(series(7)).not.toEqual(series(8));
  });
  it('over 10 days: mornings are often foggy, heavy fog happens, afternoons clear, rain comes in spells', () => {
    let morning = 0, afternoon = 0, heavy = 0, rainy = 0, n = 0;
    for (const seed of [1, 2, 3, 4, 5]) series(seed).forEach((w, i) => {
      const h = i % 24;
      if (h >= 6 && h < 9) { n++; if (w.fog > 0.3) morning++; }
      if (h >= 14 && h < 17 && w.fog > 0.3 && w.rain < 0.1) afternoon++;
      if (w.fog > 0.8) heavy++;
      if (w.rain > 0.2) rainy++;
    });
    expect(morning / n).toBeGreaterThan(0.4);
    expect(afternoon).toBe(0);
    expect(heavy).toBeGreaterThan(0);
    const hours = 5 * 240;
    expect(rainy / hours).toBeGreaterThan(0.04);
    expect(rainy / hours).toBeLessThan(0.35);
  });
  it('sim state carries the factors, and the dev rain flag forces rain', () => {
    const { world, state } = setup([floor()]);
    run(state, world, 2);
    const w = weatherAt(state.seed, state.time);
    expect(state.weather.fog).toBeCloseTo(w.fog, 5);
    state.flags.rain = 1;
    run(state, world, 1);
    expect(state.weather.rain).toBe(1);
  });
  it('in winter some days snow instead of rain (U-097), none in autumn; it lies, then melts', () => {
    const days = (d0: number, d1: number) => { let snow = 0, rain = 0; for (const seed of [1, 2, 3, 4, 5, 6]) for (let t = d0 * DAY; t < d1 * DAY; t += HOUR) { const w = weatherAt(seed, t); if (w.snow > 0.2) snow++; if (w.rain > 0.2) rain++; } return { snow, rain }; };
    expect(days(1, 25).snow, 'autumn').toBe(0);
    const winter = days(35, 60);
    expect(winter.snow, 'winter').toBeGreaterThan(20);
    // Lying: the dev flag makes it snow; three hours of heavy snow cover everything, and it melts once it stops.
    const { world, state } = setup([floor()]);
    state.flags.clear = true; state.flags.snow = 1;
    run(state, world, 2);
    state.time += 3 * HOUR; run(state, world, 2);
    expect(state.weather.cover).toBeGreaterThan(0.95);
    state.flags.snow = 0; state.time += 7 * HOUR; run(state, world, 2);
    expect(state.weather.cover).toBeGreaterThan(0.3);
    expect(state.weather.cover).toBeLessThan(0.7);
  });
});
