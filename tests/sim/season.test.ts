// M5-28 (U-032): the calendar, stepped. Day 1 is autumn, the leaves a third turned and a few falling; by the 23rd most
// are coming down and the grass is drying; by the 45th it's winter: the trees mostly bare, the grass straw, dusk
// earlier and dawn later than at the start; and the weeks toward winter foggier than the first.
import { describe, it, expect } from 'vitest';
import { seasonOf } from '../../src/sim/season';
import { daylight } from '../../src/sim/clock';
import { weatherAt } from '../../src/sim/weather';

const at = (day: number, hour = 12) => (day - 1) * 86400 + hour * 3600;

describe('the seasons (M5-28)', () => {
  it('turn from autumn into winter, day by day', () => {
    const a = seasonOf(at(1)), m = seasonOf(at(23)), w = seasonOf(at(46));
    expect(a.name).toBe('autumn'); expect(w.name).toBe('winter');
    expect(a.turn).toBeCloseTo(0.3, 1); expect(a.bare).toBe(0); expect(a.falling).toBeGreaterThan(0);
    expect(m.falling).toBeGreaterThan(0.8); expect(m.straw).toBeGreaterThan(0.5); expect(m.bare).toBeGreaterThan(0.3);
    expect(w.bare).toBeGreaterThan(0.8); expect(w.straw).toBe(1); expect(w.falling).toBeLessThan(0.1);
    // The days draw in: at 18:15 day 1 is still full daylight, deep winter's is fading; at 06:45 the reverse.
    expect(daylight(at(1, 18.15))).toBe(1);
    expect(daylight(at(46, 18.15))).toBeLessThan(1);
    expect(daylight(at(1, 6.6))).toBe(1);
    expect(daylight(at(46, 6.6))).toBeLessThan(1);
    // Foggier mornings toward winter.
    const fog = (d0: number) => { let n = 0; for (let seed = 1; seed <= 40; seed++) for (let d = d0; d < d0 + 10; d++) n += weatherAt(seed, at(d, 7)).fog > 0.3 ? 1 : 0; return n; };
    expect(fog(46)).toBeGreaterThan(fog(1));
  });
});
