// M4-86 (U-065): synth music by place: high up a calm one, in the streets a grounded one, underground and in the
// sewers another; all slow (nothing fast), in one key so they cross-fade.
import { describe, it, expect } from 'vitest';
import { trackFor, TRACKS } from '../../src/audio/music';

describe('music by place (M4-86)', () => {
  it('picks the track for where he is, every one slow', () => {
    expect(trackFor('roof', 20)).toBe('high');
    expect(trackFor('street', 30)).toBe('high');
    expect(trackFor('street', 0)).toBe('ground');
    expect(trackFor('alley', 0)).toBe('ground');
    expect(trackFor('indoors', 2)).toBe('ground');
    expect(trackFor('under', 0)).toBe('under');
    for (const t of Object.values(TRACKS)) { expect(t.bpm).toBeLessThanOrEqual(90); expect(t.bpm).toBeGreaterThanOrEqual(60); }
    // The high one calm: no drums. The others with a beat.
    expect(TRACKS.high.kick.length + TRACKS.high.hat.length).toBe(0);
    expect(TRACKS.ground.kick.length).toBeGreaterThan(0);
    expect(TRACKS.under.kick.length).toBeGreaterThan(0);
  });
});
