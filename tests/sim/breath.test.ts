// M4-55 (U-051): spent, hurt or terrified he breathes hard and his heart pounds, louder the worse it is. The levels
// driven from his endurance, health and the city's alert (and his effort running and climbing).
import { describe, it, expect } from 'vitest';
import { strainOf, stepEffort } from '../../src/audio/breath';

describe('breath and heartbeat (M4-55)', () => {
  it('drives the breath and heart from endurance, health and alert', () => {
    // Calm and whole: neither heard (the sound starts at 0.25 breath, 0.3 heart).
    const calm = strainOf(100, 100, 0, 0);
    expect(calm.breath).toBeLessThan(0.25); expect(calm.heart).toBeLessThan(0.3);
    // Spent: his grip worn to 10.
    const spent = strainOf(10, 100, 0, 0);
    expect(spent.breath).toBeGreaterThan(0.8);
    // Hurt: the worse, the louder.
    expect(strainOf(100, 15, 0, 0).heart).toBeGreaterThan(strainOf(100, 40, 0, 0).heart);
    expect(strainOf(100, 15, 0, 0).heart).toBeGreaterThan(0.8);
    // Terrified: the city after him.
    expect(strainOf(100, 100, 1, 0).heart).toBeGreaterThan(0.8);
    expect(strainOf(100, 100, 1, 0).breath).toBeGreaterThan(0.5);
    // Effort: ten seconds' sprint brings him to hard breathing; half a minute's rest takes it away.
    let e = 0;
    for (let i = 0; i < 600; i++) e = stepEffort(e, 1 / 60, 7, false);
    expect(strainOf(100, 100, 0, e).breath).toBeGreaterThan(0.9);
    for (let i = 0; i < 1800; i++) e = stepEffort(e, 1 / 60, 0, false);
    expect(strainOf(100, 100, 0, e).breath).toBeLessThan(0.25);
  });
});
