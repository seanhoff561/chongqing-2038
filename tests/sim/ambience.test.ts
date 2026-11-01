// M4-51 (U-051, U-052): the empty city's ambience changes with where he is (street, roof, alley, underground, indoors)
// and the hour; rain on the street and roofs, dripping under cover, muffled indoors.
import { describe, it, expect } from 'vitest';
import { mix, whereIs } from '../../src/audio/ambience';
import { setup, floor } from './helpers';
import { solid } from '../../src/world/geom';

describe('ambience (M4-51)', () => {
  it('changes with where he is, the hour and the rain', () => {
    const at = (where: Parameters<typeof mix>[0]['where'], hour = 12, rain = 0, covered = false) => mix({ where, hour, rain, covered });
    expect(at('roof').wind).toBeGreaterThan(at('street').wind * 2);
    expect(at('alley').wind).toBeLessThan(at('street').wind);
    expect(at('under').muffle).toBeLessThan(2000);
    expect(at('indoors').muffle).toBeLessThan(2000);
    expect(at('street').muffle).toBeGreaterThan(15000);
    expect(at('under').drone).toBe(0);
    // By night the hum sinks and the far machinery thins.
    expect(at('street', 2).hum).toBeLessThan(at('street', 12).hum);
    expect(at('street', 2).far).toBeLessThan(at('street', 12).far);
    // Rain: hiss and ticks out in it (most on a roof), dripping under cover, muffled indoors, nothing underground.
    expect(at('street', 12, 1).rain).toBe(1);
    expect(at('roof', 12, 1).ticks).toBeGreaterThan(at('street', 12, 1).ticks);
    expect(at('street', 12, 1, true).drips).toBeGreaterThan(at('street', 12, 1).drips);
    expect(at('indoors', 12, 1).rain).toBeLessThan(at('street', 12, 1).rain);
    expect(at('under', 12, 1).rain).toBe(0);
  });
  it('knows a street, a roof, an alley, a room and the underground', () => {
    const { world } = setup([
      floor(),
      // A room 10 m east: four walls and a roof at 3 m.
      solid(8, 0, -3, 8.2, 3, 3), solid(13.8, 0, -3, 14, 3, 3), solid(8, 0, -3, 14, 3, -2.8), solid(8, 0, 2.8, 14, 3, 3), solid(8, 3, -3, 14, 3.2, 3),
      // An alley 10 m west: walls 3 m apart.
      solid(-12, 0, -10, -11.8, 8, 10), solid(-8.8, 0, -10, -8.6, 8, 10),
      // A block 12 m high 20 m north.
      solid(-5, 0, -30, 5, 12, -20),
    ]);
    const head = (x: number, z: number, y = 1.6) => ({ x, y, z });
    expect(whereIs(world, head(0, 5), false).where).toBe('street');
    expect(whereIs(world, head(11, 0), false).where).toBe('indoors');
    expect(whereIs(world, head(-10.3, 0), false).where).toBe('alley');
    expect(whereIs(world, head(0, -25, 13.6), false).where).toBe('roof');
    expect(whereIs(world, head(0, 5), true).where).toBe('under');
  });
});
