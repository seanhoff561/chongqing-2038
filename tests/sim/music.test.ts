// M4-86 (U-065), M4-97 (U-070): music by place, rare and faint. A track for high up, the streets and underground, in
// one key so they cross-fade; most of the time silent, a short slow, sparse piece now and then.
import { describe, it, expect } from 'vitest';
import { trackFor, TRACKS, PLAN, stretch } from '../../src/audio/music';

describe('music (M4-86, M4-97)', () => {
  it('picks the track for where he is, is silent most of the time, and plays slow and sparse', () => {
    expect(trackFor('roof', 20)).toBe('high');
    expect(trackFor('street', 30)).toBe('high');
    expect(trackFor('street', 0)).toBe('ground');
    expect(trackFor('indoors', 2)).toBe('ground');
    expect(trackFor('under', 0)).toBe('under');
    // Four hours of it: silent at least two thirds of the time.
    let seed = 3, quiet = PLAN.first, piece = 0, playing = false;
    const r = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
    while (quiet + piece < 4 * 3600) { playing = !playing; if (playing) piece += stretch(true, r()); else quiet += stretch(false, r()); }
    expect(quiet / (quiet + piece)).toBeGreaterThan(0.66);
    // Slow and sparse: under 60 beats a minute, a note on at most a third of the beats; faint.
    for (const t of Object.values(TRACKS)) { expect(t.bpm).toBeLessThan(60); expect(t.melody).toBeLessThanOrEqual(0.34); }
    expect(PLAN.gain).toBeLessThanOrEqual(0.4);
  });
});
