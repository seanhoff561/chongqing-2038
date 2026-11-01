// M4-53 (U-051): machines where he doesn't expect them. Through a day machines wait for an hour or three at a time
// just inside rooms, at the foot of stairs, on roofs and in alleys behind the bins, and see him as any machine does.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { unitPose } from '../../src/sim/units';
import { teleport } from '../../src/sim/player';
import { heightAt } from '../../src/world/heightfield';
import { run, secs } from './helpers';

const w = getWorld('yuzhong');

describe('lurkers (M4-53)', () => {
  it('turn up through a day in rooms, on roofs and in alleys, and see him', () => {
    const s = createState(1, w), lurk = s.units.filter(u => u.patrol >= 0 && !u.extra && w.patrols[u.patrol].kind === 'lurk');
    expect(lurk.length).toBeGreaterThanOrEqual(40);
    const seen = new Set<number>(), where = { room: 0, roof: 0, alley: 0 };
    for (let h = 0; h < 24; h += 0.5) for (const u of lurk) {
      const q = unitPose(w, u, h * 3600);
      if (!q.active || seen.has(u.id)) continue;
      seen.add(u.id);
      const ground = heightAt(w.ground!, q.x, q.z);
      if (w.features.some(f => f.kind.startsWith('inside:') && Math.hypot(f.x - q.x, f.z - q.z) < 2.5 && Math.abs(f.y - q.y) < 1)) where.room++;
      else if (ground !== null && q.y - ground > 6) where.roof++;
      else if (w.hides.some(hd => Math.hypot((hd.inner.x0 + hd.inner.x1) / 2 - q.x, (hd.inner.z0 + hd.inner.z1) / 2 - q.z) < 2)) where.alley++;
    }
    expect(seen.size).toBe(lurk.length);
    expect(where.room).toBeGreaterThanOrEqual(5);
    expect(where.roof).toBeGreaterThanOrEqual(5);
    expect(where.alley).toBeGreaterThanOrEqual(5);
    // One just inside a room by day: he steps in front of it and it notices him.
    const u = lurk.find(x => w.patrols[x.patrol].hours[0] >= 9 && w.patrols[x.patrol].hours[0] <= 15 && w.features.some(f => f.kind.startsWith('inside:') && Math.hypot(f.x - w.patrols[x.patrol].pts[0].x, f.z - w.patrols[x.patrol].pts[0].z) < 2.5))!;
    const p = w.patrols[u.patrol], at = p.pts[0], yaw = p.look![0], hour = p.hours[0] + 0.5;
    s.time = hour * 3600; s.flags.god = true; s.flags.clear = true;
    teleport(s.player, at.x + Math.sin(yaw) * 1, at.y + 0.05, at.z + Math.cos(yaw) * 1);
    run(s, w, secs(3));
    expect(u.aware ?? 0).toBeGreaterThanOrEqual(0.3);
  });
});
