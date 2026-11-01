// M4-51 (U-051, U-052): the empty city's ambience changes with where he is (street, roof, alley, underground, indoors)
// and the hour, muffled indoors and underground (no rain sound since U-079).
import { describe, it, expect } from 'vitest';
import { mix, whereIs } from '../../src/audio/ambience';
import { setup, floor } from './helpers';
import { solid } from '../../src/world/geom';

describe('ambience (M4-51)', () => {
  it('changes with where he is and the hour', () => {
    const at = (where: Parameters<typeof mix>[0]['where'], hour = 12) => mix({ where, hour });
    expect(at('roof').far).toBeGreaterThan(at('street').far);
    expect(at('alley').far).toBeLessThan(at('street').far);
    expect(at('under').muffle).toBeLessThan(2000);
    expect(at('indoors').muffle).toBeLessThan(2000);
    expect(at('street').muffle).toBeGreaterThan(15000);
    expect(at('under').drone).toBe(0);
    // By night the far machinery thins.
    expect(at('street', 2).far).toBeLessThan(at('street', 12).far);
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
