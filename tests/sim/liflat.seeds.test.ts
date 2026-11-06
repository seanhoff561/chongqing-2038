// M10-38 (U-104): the Li family's flat is found in every city, the nearest round upper Shibati where its own Shibati
// has no house he can walk up to (seed 943166721 had none). (Another city: run in a worker of its own, *.seeds.test.)
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';

describe('the Li family flat in other cities', () => {
  it('is found in a city whose Shibati has no such house: the nearest round it (seed 943166721 had none)', () => {
    const v = getWorld('yuzhong', 943166721), f = v.teleports.find(t => t.name === 'Li family flat')!, top = v.teleports.find(t => t.name === 'Shibati top')!;
    expect(f).toBeDefined();
    expect(Math.hypot(f.x - top.x, f.z - top.z)).toBeLessThan(600);
  }, 900000);
});
