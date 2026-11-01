// M4-89 (U-066): stairwells and trapdoors seen through. No floor tile, finish or patch is drawn over a trapdoor, a
// manhole or the middle of a flight of stairs anywhere in the city.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { buildIndex, raycast } from '../../src/world/geom';
import { MAT } from '../../src/world/mats';

describe('stairwells and trapdoors seen through (M4-89)', () => {
  it('has nothing thin drawn across a trapdoor or a flight', () => {
    const w = getWorld('yuzhong'), thin = buildIndex(w.decor.filter(s => s.y1 - s.y0 <= 0.06));
    const covers = w.props.filter(p => p.kind === 'hatch' || p.kind === 'grate');
    const ramps = w.solids.filter(s => s.ramp && s.mat === MAT.hidden);
    expect(covers.length).toBeGreaterThan(20);
    expect(ramps.length).toBeGreaterThan(50);
    const coveredHatch = covers.filter(p => raycast(thin, p.x, p.y, p.z, 0, 1, 0, 0.3));
    // (A finish over a flight counts only if it isn't lying on something solid there: a wall's top, a planter.)
    const coveredStair = ramps.filter(s => {
      const x = (s.x0 + s.x1) / 2, z = (s.z0 + s.z1) / 2, y = (s.y0 + s.y1) / 2 + 0.1, h = raycast(thin, x, y, z, 0, 1, 0, s.y1 - y + 0.3);
      return h && !raycast(w.index, x, y, z, 0, 1, 0, h.t);
    });
    expect(coveredHatch.length, `${coveredHatch.length} of ${covers.length} trapdoors covered`).toBe(0);
    expect(coveredStair.length, `${coveredStair.length} of ${ramps.length} flights covered`).toBe(0);
  });
});
