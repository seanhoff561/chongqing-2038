// M5-28 (U-032), M10-22 (U-104): the calendar, stepped. Day 1 is late autumn: the leaves mostly turned and thinning,
// fallen leaves lying; by the 23rd most are down and the grass is drying; by the 45th it's winter: the trees mostly bare, the grass straw, dusk
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
    expect(a.turn).toBeGreaterThan(0.75); expect(a.bare).toBeGreaterThan(0.2); expect(a.bare).toBeLessThan(0.45); expect(a.litter).toBeGreaterThan(0.4);
    expect(m.litter).toBeGreaterThan(a.litter); expect(m.straw).toBeGreaterThan(0.5); expect(m.bare).toBeGreaterThan(0.5);
    expect(w.bare).toBeGreaterThan(0.8); expect(w.straw).toBe(1); expect(w.litter).toBeLessThan(m.litter);
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
