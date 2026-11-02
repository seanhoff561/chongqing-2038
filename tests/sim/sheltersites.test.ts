// M6-24 (U-013): shelter sites across the city. Every district has several places he could make a hideout (flats, roof
// huts, cellars and tunnel rooms), each with a bed, a table or containers to claim; he sets one up in two districts.
import { describe, it, expect } from 'vitest';
import { addItem } from '../../src/sim/inventory';
import { raycast } from '../../src/world/geom';
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

  it('has the named rooms (M6-24b): the Hongyadong cliff cellar and the Xiaoshizi metro service room, a hideout made in each', () => {
    const w = getWorld('yuzhong'), s = createState(1, w);
    s.flags.god = true;
    for (const [id, en] of [['xiaoshizi-service', 'Xiaoshizi metro service room'], ['hongyadong-cellar', 'Hongyadong cliff cellar']]) {
      const site = w.sites.find(q => q.id === id)!;
      expect(site?.name?.[1], id).toBe(en);
      expect(site.bed || site.table || site.containers.length, id).toBeTruthy();
      // (The service room opens onto its station's platform: a clear way out through its door.)
      if (id === 'xiaoshizi-service') {
        const st = w.features.filter(f => f.kind === 'station').sort((a, b) => Math.hypot(a.x - site.x, a.z - site.z) - Math.hypot(b.x - site.x, b.z - site.z))[0];
        const d = Math.hypot(st.x - site.x, st.z - site.z);
        expect(d).toBeLessThan(20);
        expect(raycast(w.index, site.x, site.y + 1.5, site.z, (st.x - site.x) / d, 0, (st.z - site.z) / d, d - 1), 'out through its door').toBeNull();
      }
      const before = s.shelters.length;
      if (site.bed) {
        // Its cot claimed.
        const bed = w.inter.find(i => i.id === site.bed)!;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          s.player.pos = { x: bed.x + dx * 1.1, y: bed.y - 0.4, z: bed.z + dz * 1.1 };
          run(s, w, 5); aim(s, bed.x, bed.y, bed.z);
          run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
          if (s.shelters.some(h => h.id === bed.id)) break;
        }
      } else {
        // A bedroll laid on its floor, by its shelves.
        const c = w.inter.find(i => i.id === site.containers[0])!;
        for (const [dx, dz] of [[1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2]]) {
          if (s.shelters.length > before) break;
          s.player.pos = { x: c.x + dx, y: site.y + 0.05, z: c.z + dz }; s.player.vel = { x: 0, y: 0, z: 0 };
          run(s, w, 10);
          addItem(s, s.inv.pack, 'bedroll', 1);
          const st = s.inv.pack.items.find(i => i.id === 'bedroll')!;
          s.player.pitch = -1;
          run(s, w, 2, { pitch: -1 });
          run(s, w, 1, { pitch: -1, cmds: [{ c: 'use', uid: st.uid }] });
          run(s, w, 2, { pitch: -1 });
        }
      }
      expect(s.shelters.length, `${id}: a hideout made there`).toBeGreaterThan(before);
    }
  });
});
