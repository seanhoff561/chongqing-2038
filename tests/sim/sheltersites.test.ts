// M6-24 (U-013): shelter sites across the city. Every district has several places he could make a hideout (flats, roof
// huts, cellars and tunnel rooms), each with a bed, a table or containers to claim; he sets one up in two districts.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { districtOf } from '../../src/sim/district';
import { run, aim } from './helpers';
import { B } from '../../src/sim/types';

const DISTRICTS = ['jiefangbei', 'jiaochangkou', 'shibati', 'xiaoshizi', 'hongyadong', 'chaotianmen'];

describe('shelter sites across the city (M6-24)', () => {
  it('offers several in every district, and a hideout is made in two of them', () => {
    const w = getWorld('yuzhong'), ready = w.sites.filter(s => s.bed || s.table || s.containers.length);
    for (const d of DISTRICTS) {
      const mine = ready.filter(s => districtOf(s.x, s.z) === d);
      expect(mine.length, d).toBeGreaterThanOrEqual(5);
      expect(mine.filter(s => s.bed).length, `${d} beds`).toBeGreaterThanOrEqual(2);
    }
    expect(new Set(ready.map(s => s.kind)).size).toBeGreaterThanOrEqual(3);
    // A bed claimed in Jiefangbei and in Chaotianmen: two hideouts.
    const s = createState(1, w);
    s.flags.god = true;
    for (const d of ['jiefangbei', 'chaotianmen']) {
      const site = ready.find(q => q.bed && districtOf(q.x, q.z) === d)!, bed = w.inter.find(i => i.id === site.bed)!;
      // (Beside it, looking at it.)
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        s.player.pos = { x: bed.x + dx * 1.1, y: bed.y - 0.4, z: bed.z + dz * 1.1 };
        run(s, w, 5); aim(s, bed.x, bed.y, bed.z);
        run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
        if (s.shelters.some(h => h.id === bed.id)) break;
      }
      expect(s.shelters.some(h => h.id === bed.id), d).toBe(true);
    }
  });
});
