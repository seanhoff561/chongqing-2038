// M4-48 (U-050): giant spider robots and colossi walk the streets on their own beats, day and night, and see him.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { unitPose } from '../../src/sim/units';
import { teleport } from '../../src/sim/player';
import { heightAt } from '../../src/world/heightfield';
import { run, secs } from './helpers';

const w = getWorld('yuzhong');

describe('giant walkers (M4-48)', () => {
  it('walk the streets on their own beats and see him', () => {
    const s = createState(1, w), giants = s.units.filter(u => !u.extra && (u.kind === 'spider' || u.kind === 'colossus'));
    expect(giants.filter(u => u.kind === 'spider').length).toBeGreaterThanOrEqual(4);
    expect(giants.filter(u => u.kind === 'colossus').length).toBeGreaterThanOrEqual(2);
    for (const u of giants) {
      // Out at noon and at midnight, a minute apart somewhere else on the street, on the ground.
      for (const h of [12, 0]) {
        const a = unitPose(w, u, h * 3600), b = unitPose(w, u, h * 3600 + 60 * 60);
        expect(a.active).toBe(true);
        expect(Math.abs(a.y - (heightAt(w.ground!, a.x, a.z) ?? a.y))).toBeLessThan(1.5);
        if (Math.hypot(a.x - b.x, a.z - b.z) > 1) continue;
        // (Waiting at its beat's end: a few minutes on it has moved.)
        const c = unitPose(w, u, h * 3600 + 6 * 60 * 60);
        expect(Math.hypot(a.x - c.x, a.z - c.z)).toBeGreaterThan(1);
      }
    }
    // He stands in the street ahead of one by day: it sees him.
    for (const kind of ['spider', 'colossus']) {
      const u = giants.find(x => x.kind === kind)!, s2 = createState(1, w), v = s2.units.find(x => x.id === u.id)!;
      s2.time = 12 * 3600; s2.flags.god = true; s2.flags.clear = true;
      const q = unitPose(w, v, s2.time), ahead = 18;
      teleport(s2.player, q.x + Math.sin(q.yaw) * ahead, (heightAt(w.ground!, q.x + Math.sin(q.yaw) * ahead, q.z + Math.cos(q.yaw) * ahead) ?? q.y) + 0.05, q.z + Math.cos(q.yaw) * ahead);
      run(s2, w, secs(3));
      expect(v.aware ?? 0, kind).toBeGreaterThanOrEqual(0.3);
    }
  });
});
