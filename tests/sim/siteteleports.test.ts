// M6-25: the teleports and scenarios cover every district and every site's ways in: each district's teleport and
// scenario, and for each high-security site a teleport outside each way in, stood on what's there with room to
// stand, the way in front of him.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { scenarios } from '../../src/data/scenarios';
import { free } from '../../src/sim/physics';
import { SECURE } from '../../src/world/yuzhong/secure';

const w = getWorld('yuzhong');

describe('teleports and scenarios for every site (M6-25)', () => {
  it('cover every district and every way into every site', () => {
    for (const d of ['jiefangbei', 'shibati', 'jiaochangkou', 'hongyadong', 'xiaoshizi', 'chaotianmen']) {
      expect(w.teleports.some(t => t.name === d), d).toBe(true);
      expect(scenarios.some(s => s.at === d || (d === 'jiefangbei' && s.name === 'yuzhong') || (d === 'shibati' && s.name === 'shibati')), d).toBe(true);
    }
    for (const S of w.secure!) {
      const en = SECURE.find(q => q.id === S.id)!.en;
      for (const way of S.ways) {
        const t = w.teleports.find(q => q.name === `${en}: ${way.kind}`);
        expect(t, `${en}: ${way.kind}`).toBeTruthy();
        expect(free(w.index, t!.x, t!.y, t!.z, 1.8), `${t!.name} has room`).toBe(true);
        const it = w.inter.find(i => i.id === way.id)!;
        expect(Math.hypot(it.x - t!.x, it.z - t!.z), t!.name).toBeLessThan(3.5);
      }
      expect(scenarios.some(s => s.name === `site-${S.id}`), S.id).toBe(true);
    }
    // And every scenario's teleport is one of the world's.
    for (const s of scenarios.filter(q => q.world === 'yuzhong' && q.at)) expect(w.teleports.some(t => t.name === s.at), s.name).toBe(true);
  });
});
