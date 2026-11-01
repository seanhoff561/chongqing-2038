// M4-55 (U-051, U-077, U-079): his heart pounds only when he's badly hurt, louder the worse; no breathing.
import { describe, it, expect } from 'vitest';
import { heartOf, BADLY } from '../../src/audio/heart';

describe('heartbeat (M4-55)', () => {
  it('is heard only when he is badly hurt, louder the worse', () => {
    expect(heartOf(100)).toBe(0);
    expect(heartOf(BADLY + 5)).toBe(0);
    expect(heartOf(15)).toBeGreaterThan(heartOf(25));
    expect(heartOf(10)).toBeGreaterThan(0.8);
  });
});
