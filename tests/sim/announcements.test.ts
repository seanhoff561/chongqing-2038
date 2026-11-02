// M8-14 (U-092, U-094): the voiced announcements. Every announcement's line resolves, in Chinese and English, spoken
// by the street speakers, and has its recording in public/audio/pa (played from the lampposts round him, each where it
// stands, U-094; no subtitles, U-092).
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { ANNOUNCE } from '../../src/data/announce';
import { lineById } from '../../src/data/dialogue';

describe('the voiced announcements (M8-14)', () => {
  it('each resolves to a line and a recording', () => {
    const all = Object.values(ANNOUNCE).flat();
    expect(all.length).toBeGreaterThanOrEqual(10);
    for (const l of all) {
      expect(lineById.get(l.id), l.id).toBe(l);
      expect(l.speaker).toBe('pa');
      expect(fs.existsSync(`public/audio/pa/${l.id}.ogg`), l.id).toBe(true);
    }
  });
});
