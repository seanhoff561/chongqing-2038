// M8-10: the music. The pursuit layer's strength follows the district's alert: none unaware, strongest engaged, easing
// down through searching and heightened; by night the pads are darker and the notes fewer.
import { describe, it, expect } from 'vitest';
import { PURSUIT, NIGHT, nightOf } from '../../src/audio/music';
import type { Alert } from '../../src/sim/district';

describe('the music (M8-10)', () => {
  it('maps each alert state to its intensity, and night to darker pads', () => {
    const L = PURSUIT.level, all: Alert[] = ['unaware', 'suspicious', 'engaged', 'searching', 'heightened'];
    for (const a of all) { expect(L[a], a).toBeGreaterThanOrEqual(0); expect(L[a], a).toBeLessThanOrEqual(1); }
    expect(L.unaware).toBe(0);
    expect(L.engaged).toBe(1);
    expect(L.engaged).toBeGreaterThan(L.searching);
    expect(L.searching).toBeGreaterThan(L.heightened);
    expect(L.heightened).toBeGreaterThan(L.unaware);
    expect(L.suspicious).toBeGreaterThan(L.unaware);
    expect(nightOf(1)).toBe(0); expect(nightOf(0)).toBe(1);
    expect(NIGHT.bright).toBeLessThan(1); expect(NIGHT.notes).toBeLessThan(1);
  });
});
